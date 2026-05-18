import mongoose from "mongoose";

const hotelSchema = new mongoose.Schema(
    {
        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        
        name: { 
            type: String,
            required: true, 
            trim: true 
        },
        
        description: { 
            type: String, 
            required: true 
        },
        address: { 
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
        
        images: [
            { type: String 

            }
        ],
        roomTypes: [
            {
                name: String,
                pricePerNight: Number,
                capacity: Number
            }
        ],
        
        contactNumber: { 
            type: String, 
            default: "" 
        },
        
        rating: { 
            type: Number, 
            default: 0 
        },
        
        isAvailable: { 
            type: Boolean, 
            default: true 
        },
        
        isApproved: { 
            type: Boolean, 
            default: false 
        }
    },
    {
    timestamps: true
    }
);

const Hotel = mongoose.model("Hotel", hotelSchema);
export default Hotel