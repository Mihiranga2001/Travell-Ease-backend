import mongoose from "mongoose";

const vehicleRentalCompanySchema = new mongoose.Schema(
  {
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    
    companyName: { 
        type: String, 
        required: true 
    },

    address: { 
        type: String, 
        default: "" 
    },

    contactNumber: { 
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
    isApproved: { 
        type: Boolean, 
        default: false 
    }
  },
  { 
    timestamps: true 
  }
);

const VehicleRentalCompany = mongoose.model("VehicleRentalCompany", vehicleRentalCompanySchema);
export default VehicleRentalCompany