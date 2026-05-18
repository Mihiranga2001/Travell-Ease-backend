import mongoose from "mongoose";

const travelGuideSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        
        languages: [
            { 
                type: String 
            }
        ],
        
        experience: { 
            type: String, 
            default: "" 
        },
        
        pricePerDay: { 
            type: Number, 
            required: true 
        },
        
        specialties: [
            { 
                type: String 
            }
        ],
        
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

const TravelGuide = mongoose.model("TravelGuide", travelGuideSchema);
export default TravelGuide