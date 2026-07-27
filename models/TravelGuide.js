import mongoose from "mongoose";

const notificationSettingsSchema =
  new mongoose.Schema(
    {
      bookingRequests: {
        type: Boolean,
        default: true,
      },
      bookingUpdates: {
        type: Boolean,
        default: true,
      },
      reviewAlerts: {
        type: Boolean,
        default: true,
      },
    },
    {
      _id: false,
    }
  );

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
          maxlength: 60,
        },
      ],
      default: [],
    },

    experience: {
      type: String,
      trim: true,
      default: "",
      maxlength: 3000,
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
          maxlength: 100,
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

    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },

    availabilityNote: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },

    notificationSettings: {
      type: notificationSettingsSchema,
      default: () => ({}),
    },

    isApproved: {
      type: Boolean,
      default: false,
      index: true,
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
