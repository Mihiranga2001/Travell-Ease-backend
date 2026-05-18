import mongoose from "mongoose";

const vehicleSchema = new mongoose.Schema(
    {
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "VehicleRentalCompany",
            required: true
        },
        
        type: {
            type: String,
            enum: ["bike", "tuk", "car", "van", "bus"],
            required: true
        },
        
        model: { 
            type: String, 
            required: true 
        },
        
        image: { 
            type: String, 
            default: "" 
        },
        
        pricePerDay: { 
            type: Number, 
            required: true 
        },
        
        seats: { 
            type: Number, 
            required: true 
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

const Vehicle = mongoose.model("Vehicle", vehicleSchema);
export default Vehicle