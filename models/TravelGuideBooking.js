import mongoose from "mongoose";

const travelGuideBookingSchema = new mongoose.Schema(
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
      index: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    numberOfDays: {
      type: Number,
      required: true,
      min: 1,
    },

    pricePerDay: {
      type: Number,
      required: true,
      min: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "approved",
        "rejected",
        "completed",
        "cancelled",
      ],
      default: "pending",
      index: true,
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "refunded"],
      default: "pending",
      index: true,
    },

    specialRequests: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1500,
    },

    guideNote: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

travelGuideBookingSchema.index({
  guideId: 1,
  createdAt: -1,
});

const TravelGuideBooking = mongoose.model(
  "TravelGuideBooking",
  travelGuideBookingSchema
);

export default TravelGuideBooking;
