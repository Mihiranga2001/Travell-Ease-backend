import mongoose from "mongoose";

const touristPlaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      required: true,
      enum: [
        "Historical",
        "Beach",
        "Nature",
        "Relious",
        "Adventure",
        "Wildlife",
        "Mountain",
        "City",
        "Other",
      ],
    },

    location: {
      type: String,
      required: true,
      trim: true,
    },

    district: {
      type: String,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    image: {
      type: String,
      default: "",
    },

    rating: {
      type: Number,
      default: 4.5,
    },

    status: {
      type: String,
      enum: ["approved", "pending", "rejected"],
      default: "approved",
    },
  },
  { timestamps: true }
);

const TouristPlace = mongoose.model("TouristPlace", touristPlaceSchema);

export default TouristPlace;