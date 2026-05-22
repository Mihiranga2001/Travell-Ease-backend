import mongoose from "mongoose"

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true
    },

    role: {
      type: String,
      enum: [
        "traveler",
        "hotel_owner",
        "vehicle_company",
        "guide",
        "admin"
      ],
      default: "traveler"
    },

    phoneNumber: {
      type: String,
      default: ""
    },

    profilePhoto: {
      type: String,
      default: ""
    },

    bio: {
      type: String,
      default: ""
    },

    location: {
      latitude: {
        type: Number,
        default: 0
      },

      longitude: {
        type: Number,
        default: 0
      }
    },

    interests: [
      {
        type: String
      }
    ],

    isVerified: {
      type: Boolean,
      default: false
    },

    isBlocked: {
      type: Boolean,
      default: false
    }
  },

  {
    timestamps: true
  }
)

const User = mongoose.model("User",userSchema)

export default User