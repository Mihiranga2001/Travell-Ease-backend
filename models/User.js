import mongoose from "mongoose";

export const USER_ROLES = [
  "traveler",
  "hotel_owner",
  "vehicle_company",
  "guide",
  "admin",
];

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

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must contain at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [254, "Email cannot exceed 254 characters"],
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please enter a valid email address",
      ],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must contain at least 6 characters"],
    },

    role: {
      type: String,
      enum: {
        values: USER_ROLES,
        message: "{VALUE} is not a valid user role",
      },
      default: "traveler",
      index: true,
    },

    phoneNumber: {
      type: String,
      trim: true,
      default: "",
      maxlength: [30, "Phone number cannot exceed 30 characters"],
    },

    profilePhoto: {
      type: String,
      trim: true,
      default: "",
    },

    bio: {
      type: String,
      trim: true,
      default: "",
      maxlength: [1000, "Bio cannot exceed 1000 characters"],
    },

    location: {
      type: locationSchema,
      default: () => ({
        latitude: 0,
        longitude: 0,
      }),
    },

    interests: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: [50, "An interest cannot exceed 50 characters"],
        },
      ],
      default: [],
    },

    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },

    isBlocked: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1, isBlocked: 1, isVerified: 1 });

userSchema.set("toJSON", {
  transform(document, returnedObject) {
    delete returnedObject.password;
    return returnedObject;
  },
});

const User = mongoose.model("User", userSchema);

export default User;