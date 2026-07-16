import express from "express";
import mongoose from "mongoose";
import userRouter from "./Routes/userRouter.js";
import touristPlaceRouter from "./Routes/touristPlaceRouter.js";
import hotelRouter from "./Routes/hotelRouter.js";
import jwt from "jsonwebtoken";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const mongoURI = process.env.MONGO_URI;

mongoose
  .connect(mongoURI)
  .then(() => {
    console.log("Connected to the MongoDB database");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });

app.use(cors());
app.use(express.json());

/*
  Global token-reading middleware.

  This checks the token when it is available and places
  the decoded token information inside req.user.
*/
app.use((req, res, next) => {
  const authorizationHeader = req.header("Authorization");

  if (!authorizationHeader) {
    return next();
  }

  if (!authorizationHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Invalid authorization header",
    });
  }

  const token = authorizationHeader.replace("Bearer ", "").trim();

  if (!token) {
    return res.status(401).json({
      message: "Authentication token is missing",
    });
  }

  try {
    const decodedUser = jwt.verify(
      token,
      process.env.JWT_SECRET_KEY
    );

    req.user = decodedUser;

    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Token has expired",
      });
    }

    return res.status(401).json({
      message: "Invalid token",
    });
  }
});

app.use("/api/users", userRouter);
app.use("/uploads", express.static("uploads"));
app.use("/api/places", touristPlaceRouter);
app.use("/api/hotels", hotelRouter);

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});