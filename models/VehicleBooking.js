import mongoose from "mongoose";

const vehicleBookingSchema = new mongoose.Schema(
  {
    travelerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Traveler is required"],
      index: true,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: [true, "Vehicle is required"],
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Vehicle company is required"],
      index: true,
    },
    startDate: {
      type: Date,
      required: [true, "Rental start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "Rental end date is required"],
    },
    totalDays: {
      type: Number,
      required: true,
      min: 1,
    },
    passengers: {
      type: Number,
      default: 1,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Passengers must be a whole number",
      },
    },
    pricePerDay: {
      type: Number,
      required: true,
      min: 0,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    pickupLocation: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },
    dropoffLocation: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },
    specialRequests: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
    },
    companyMessage: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "completed", "cancelled"],
      default: "pending",
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

vehicleBookingSchema.index({ companyId: 1, status: 1, createdAt: -1 });
vehicleBookingSchema.index({ travelerId: 1, createdAt: -1 });
vehicleBookingSchema.index({ vehicleId: 1, startDate: 1, endDate: 1, status: 1 });

const VehicleBooking =
  mongoose.models.VehicleBooking ||
  mongoose.model("VehicleBooking", vehicleBookingSchema);

export default VehicleBooking;
