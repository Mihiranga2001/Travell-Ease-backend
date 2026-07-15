import mongoose from "mongoose";

const touristPlaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Tourist place name is required"],
      trim: true,
    },

    category: {
      type: String,
      required: [true, "Category is required"],
      enum: {
        values: [
          "Historical",
          "Beach",
          "Nature",
          "Religious",
          "Adventure",
          "Wildlife",
          "Mountain",
          "City",
          "Other",
        ],
        message: "{VALUE} is not a valid tourist place category",
      },
    },

    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
    },

    district: {
      type: String,
      trim: true,
      default: "",
    },

    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },

    image: {
      type: String,
      trim: true,
      default: "",
    },

    rating: {
      type: Number,
      min: [0, "Rating cannot be less than 0"],
      max: [5, "Rating cannot be greater than 5"],
      default: 4.5,
    },

    status: {
      type: String,
      enum: {
        values: ["approved", "pending", "rejected"],
        message: "{VALUE} is not a valid status",
      },
      default: "approved",
    },
  },
  {
    timestamps: true,
  }
);

const TouristPlace = mongoose.model("TouristPlace", touristPlaceSchema);

export default TouristPlace;