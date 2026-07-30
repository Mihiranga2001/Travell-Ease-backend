import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import cors from "cors";
import dotenv from "dotenv";

import userRouter from "./Routes/userRouter.js";
import touristPlaceRouter from "./Routes/touristPlaceRouter.js";
import hotelRouter, {
  hotelBookingRouter,
  hotelReviewRouter,
} from "./Routes/hotelRouter.js";
import vehicleRouter, {
  vehicleBookingRouter,
  vehicleReviewRouter,
} from "./Routes/vehicleRouter.js";
import travelGuideRouter from "./Routes/travelGuideRouter.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const mongoURI = process.env.MONGO_URI;

if (!mongoURI) {
  console.error("MONGO_URI is missing from the .env file");
  process.exit(1);
}

if (!process.env.JWT_SECRET_KEY) {
  console.error("JWT_SECRET_KEY is missing from the .env file");
  process.exit(1);
}

mongoose
  .connect(mongoURI)
  .then(() => console.log("Connected to the MongoDB database"))
  .catch((error) => {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  });

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/*
  Optional global authentication.
  Public routes continue without a token. Protected routes check req.user.
*/
app.use((req, res, next) => {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader) {
    return next();
  }

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      success: false,
      message: "Authorization header must use the Bearer token format",
    });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET_KEY);
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message:
        error.name === "TokenExpiredError"
          ? "Authentication token has expired"
          : "Invalid authentication token",
    });
  }
});

app.use("/uploads", express.static("uploads"));

app.use("/api/users", userRouter);
app.use("/api/places", touristPlaceRouter);

app.use("/api/hotels", hotelRouter);
app.use("/api/bookings", hotelBookingRouter);
app.use("/api/reviews", hotelReviewRouter);

app.use("/api/vehicles", vehicleRouter);
app.use("/api/vehicle-bookings", vehicleBookingRouter);
app.use("/api/vehicle-reviews", vehicleReviewRouter);

app.use("/api/travel-guides", travelGuideRouter);

app.get("/api/health", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Travel Ease server is running",
  });
});

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use((error, req, res, next) => {
  console.error("Unhandled server error:", error);
  return res.status(error.status || 500).json({
    success: false,
    message: error.message || "Internal server error",
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
