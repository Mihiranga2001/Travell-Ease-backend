import mongoose from "mongoose";

const destinationSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            required: true
        },

        category: {
            type: String,
            required: true
        },

        images: [{
            type: String
        }],

        location: {
            address: {
                type: String,
                default: ""
            },
            latitude: {
                type: Number,
                required: true
            },
            longitude: {
                type: Number,
                required: true
            },
            country: {
                type: String,
                required: true
            },
            city: {
                type: String,
                required: true
            }
        },

        bestTimeToVisit: {
            type: String,
            default: ""
        },

        entryFee: {
            type: Number,
            default: 0
        },

        rating: {
            type: Number,
            default: 0
        }
    },
    {
        timestamps: true
    }
);

const Destination = mongoose.model("Destination", destinationSchema);

export default Destination;