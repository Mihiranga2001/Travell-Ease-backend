import mongoose from "mongoose";

const hotelBookingSchema = new mongoose.Schema(
  {
    travelerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Traveler is required"],
      index: true,
    },
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: [true, "Hotel is required"],
      index: true,
    },
    roomTypeIndex: {
      type: Number,
      required: [true, "Room type is required"],
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Room type index must be a whole number",
      },
    },
    roomTypeName: {
      type: String,
      required: true,
      trim: true,
    },
    checkInDate: {
      type: Date,
      required: [true, "Check-in date is required"],
      index: true,
    },
    checkOutDate: {
      type: Date,
      required: [true, "Check-out date is required"],
      index: true,
    },
    numberOfRooms: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Number of rooms must be a whole number",
      },
    },
    guests: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Guest count must be a whole number",
      },
    },
    pricePerNight: {
      type: Number,
      required: true,
      min: 0,
    },
    totalNights: {
      type: Number,
      required: true,
      min: 1,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled", "completed"],
      default: "pending",
      index: true,
    },
    specialRequests: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },
    ownerMessage: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },
  },
  { timestamps: true }
);

hotelBookingSchema.index({ hotelId: 1, roomTypeIndex: 1, checkInDate: 1, checkOutDate: 1 });
hotelBookingSchema.index({ hotelId: 1, status: 1, createdAt: -1 });

const HotelBooking =
  mongoose.models.HotelBooking ||
  mongoose.model("HotelBooking", hotelBookingSchema);

export default HotelBooking;
