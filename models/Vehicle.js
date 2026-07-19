import mongoose from "mongoose";

const vehicleSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VehicleRentalCompany",
      required: [true, "Vehicle rental company is required"],
      index: true,
    },

    type: {
      type: String,
      enum: {
        values: ["bike", "tuk", "car", "van", "bus"],
        message: "{VALUE} is not a supported vehicle type",
      },
      required: [true, "Vehicle type is required"],
      trim: true,
      lowercase: true,
    },

    model: {
      type: String,
      required: [true, "Vehicle model is required"],
      trim: true,
    },

    image: {
      type: String,
      default: "",
      trim: true,
    },

    pricePerDay: {
      type: Number,
      required: [true, "Price per day is required"],
      min: [0, "Price per day cannot be negative"],
    },

    seats: {
      type: Number,
      required: [true, "Number of seats is required"],
      min: [1, "A vehicle must have at least one seat"],
      validate: {
        validator: Number.isInteger,
        message: "Seats must be a whole number",
      },
    },

    location: {
      latitude: {
        type: Number,
        default: 0,
        min: [-90, "Latitude cannot be less than -90"],
        max: [90, "Latitude cannot be greater than 90"],
      },

      longitude: {
        type: Number,
        default: 0,
        min: [-180, "Longitude cannot be less than -180"],
        max: [180, "Longitude cannot be greater than 180"],
      },
    },

    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },

    isApproved: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Vehicle =
  mongoose.models.Vehicle || mongoose.model("Vehicle", vehicleSchema);

export default Vehicle;