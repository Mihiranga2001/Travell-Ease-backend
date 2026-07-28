import mongoose from "mongoose";

const roomTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Room type name is required"],
      trim: true,
      maxlength: [100, "Room type name cannot exceed 100 characters"],
    },
    pricePerNight: {
      type: Number,
      required: [true, "Price per night is required"],
      min: [0, "Price per night cannot be negative"],
    },
    capacity: {
      type: Number,
      required: [true, "Room capacity is required"],
      min: [1, "Room capacity must be at least 1"],
      validate: {
        validator: Number.isInteger,
        message: "Room capacity must be a whole number",
      },
    },
    images: {
      type: [{ type: String, trim: true }],
      default: [],
    },
    totalRooms: {
      type: Number,
      required: [true, "Total rooms is required"],
      default: 1,
      min: [1, "Total rooms must be at least 1"],
      validate: {
        validator: Number.isInteger,
        message: "Total rooms must be a whole number",
      },
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const locationSchema = new mongoose.Schema(
  {
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
  { _id: false }
);

const hotelSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Hotel owner is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Hotel name is required"],
      trim: true,
      minlength: [2, "Hotel name must contain at least 2 characters"],
      maxlength: [150, "Hotel name cannot exceed 150 characters"],
    },
    description: {
      type: String,
      required: [true, "Hotel description is required"],
      trim: true,
      minlength: [10, "Description must contain at least 10 characters"],
      maxlength: [3000, "Description cannot exceed 3000 characters"],
    },
    address: {
      type: String,
      trim: true,
      default: "",
      maxlength: [500, "Address cannot exceed 500 characters"],
    },
    location: {
      type: locationSchema,
      default: () => ({ latitude: 0, longitude: 0 }),
    },
    images: {
      type: [{ type: String, trim: true }],
      default: [],
    },
    roomTypes: {
      type: [roomTypeSchema],
      required: [true, "At least one room type is required"],
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: "At least one room type is required",
      },
    },
    contactNumber: {
      type: String,
      trim: true,
      default: "",
      maxlength: [30, "Contact number cannot exceed 30 characters"],
    },
    rating: {
      type: Number,
      default: 0,
      min: [0, "Rating cannot be less than 0"],
      max: [5, "Rating cannot be greater than 5"],
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Kept for compatibility with your existing frontend and database.
    isApproved: {
      type: Boolean,
      default: false,
      index: true,
    },

    // This fixes the old problem where "pending" and "rejected" were both false.
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: "",
      maxlength: [500, "Rejection reason cannot exceed 500 characters"],
    },
  },
  { timestamps: true }
);

hotelSchema.pre("validate", function syncApprovalFields(next) {
  if (this.isModified("approvalStatus")) {
    this.isApproved = this.approvalStatus === "approved";
  } else if (this.isModified("isApproved")) {
    this.approvalStatus = this.isApproved ? "approved" : "pending";
  } else if (!this.approvalStatus) {
    this.approvalStatus = this.isApproved ? "approved" : "pending";
  }

  next();
});

hotelSchema.index({ name: "text", address: "text" });
hotelSchema.index({ approvalStatus: 1, isAvailable: 1 });
hotelSchema.index({ ownerId: 1, createdAt: -1 });

const Hotel = mongoose.models.Hotel || mongoose.model("Hotel", hotelSchema);

export default Hotel;
