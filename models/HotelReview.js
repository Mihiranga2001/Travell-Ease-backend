import mongoose from "mongoose";

const hotelReviewSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    travelerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HotelBooking",
      required: true,
      unique: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
    },
    ownerReply: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
    },
    isVisible: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

hotelReviewSchema.index({ hotelId: 1, createdAt: -1 });

const HotelReview =
  mongoose.models.HotelReview ||
  mongoose.model("HotelReview", hotelReviewSchema);

export default HotelReview;
