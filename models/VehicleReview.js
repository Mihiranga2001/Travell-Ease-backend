import mongoose from "mongoose";

const vehicleReviewSchema = new mongoose.Schema(
  {
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
      ref: "VehicleBooking",
      required: true,
      unique: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: "Rating must be a whole number",
      },
    },
    comment: {
      type: String,
      trim: true,
      default: "",
      maxlength: 3000,
    },
    companyReply: {
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
  {
    timestamps: true,
    versionKey: false,
  }
);

vehicleReviewSchema.index({ companyId: 1, createdAt: -1 });
vehicleReviewSchema.index({ vehicleId: 1, isVisible: 1, createdAt: -1 });

const VehicleReview =
  mongoose.models.VehicleReview ||
  mongoose.model("VehicleReview", vehicleReviewSchema);

export default VehicleReview;
