import { asyncHandler } from "../utils/asyncHandler.js";
import apiError from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import apiResponse from "../utils/apiResponse.js";

const generateAccessTokenAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new apiError(
      400,
      "Something went wrong while generating refresh token and access token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { userName, email, fullName, password } = req.body;
  console.log("email", email);

  if (fullName === "") {
    throw new apiError(400, "Full Name is required");
  }
  if (userName === "") {
    throw new apiError(400, "User Name is required");
  }
  if (email === "" && email.includes("@") === false) {
    throw new apiError(400, "Email is required");
  }
  if (password === "") {
    throw new apiError(400, "Password is required");
  }

  const existedUser = await User.findOne({
    $or: [{ email }, { userName }], //checking between two value user exist or not
  });

  if (existedUser) {
    throw new apiError(409, "User already existed");
  }

  // ✅ Fixed: Use req.files instead of req.file
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }
  console.log("req.files:", req.files);
  console.log("req.body:", req.body);
  console.log("avatarLocalPath:", avatarLocalPath); // Add this for debugging

  if (!avatarLocalPath) {
    throw new apiError(400, "Avatar is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new apiError(400, "Avatar is required");
  }

  const user = await User.create({
    avatar: avatar.url,
    fullName,
    userName: userName.toLowerCase(),
    email,
    coverImage: coverImage?.url || "",
    password,
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new apiError(500, "Something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(new apiResponse(200, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { userName, password, email } = req.body;

  if (!userName || !email) {
    throw new apiError(400, "Email or User name is required");
  }
  const user = await User.findOne({
    $or: [{ email }, { userName }],
  });
  if (!user) {
    throw new apiError(400, "User does not exist");
  }
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new apiError(401, "Password is  incorrect");
  }

  const { refreshToken, accessToken } =
    await generateAccessTokenAndRefreshToken(user._id);
  const loggedInUser = await User.findById(user._id).select(
    "-password , -refreshToken"
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new apiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshToken: undefined },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new apiResponse(200, {}, "User logged out successfully"));
});

export default { registerUser, loginUser, logoutUser };
