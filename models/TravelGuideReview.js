import mongoose from "mongoose";

const travelGuideReviewSchema = new mongoose.Schema(
  {
    guideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TravelGuide",
      required: true,
      index: true,
    },

    travelerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TravelGuideBooking",
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
  },
  {
    timestamps: true,
  }
);

travelGuideReviewSchema.index({
  guideId: 1,
  createdAt: -1,
});

const TravelGuideReview = mongoose.model(
  "TravelGuideReview",
  travelGuideReviewSchema
);

export default TravelGuideReview;
