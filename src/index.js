import connectDB from "./db/index.js";
import app from "./app.js"
import "dotenv/config";
const port = process.env.PORT || 8000;
connectDB()
  .then(() => {
    app.listen(port);
    console.log(`Server is running at ${port}`);
  })
  .catch((err) => console.log("mongoDB connection failed", err));
