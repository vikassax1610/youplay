import { asyncHandler } from "../utils/asyncHandler.js";
import apiError from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import apiResponse from "../utils/apiResponse.js";
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
    $or: [{ email }, { userName }], // checking between two value user exist or not
  });
  if (existedUser) {
    throw new apiError(409, "User already existed");
  }
  const avatarLocalPath = req.file?.avatar[0]?.path;
  const coverImageLocalPath = req.file?.coverImage[0]?.path;
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
export default registerUser;
