import mongoose from "mongoose";

const travelGuideSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    languages: {
      type: [
        {
          type: String,
          trim: true,
        },
      ],
      default: [],
    },

    experience: {
      type: String,
      trim: true,
      default: "",
    },

    pricePerDay: {
      type: Number,
      required: true,
      min: 0,
    },

    specialties: {
      type: [
        {
          type: String,
          trim: true,
        },
      ],
      default: [],
    },

    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },

    isApproved: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const TravelGuide = mongoose.model(
  "TravelGuide",
  travelGuideSchema
);

export default TravelGuide;