import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        bookingType: {
            type: String,
            enum: ["hotel", "vehicle", "guide"],
            required: true
        },
        
        targetId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        
        startDate: { 
            type: Date, 
            required: true 
        },
        
        endDate: { 
            type: Date, 
            required: true 
        },
        
        totalAmount: { 
            type: Number, 
            required: true 
        },
        
        bookingStatus: {
            type: String,
            enum: ["pending", "confirmed", "cancelled", "completed"],
            default: "pending"
        },
        
        paymentStatus: {
            type: String,
            enum: ["pending", "paid", "failed", "refunded"],
            default: "pending"
        }
    },
    { 
        timestamps: true 
    }
);

const Booking = mongoose.model("Booking", bookingSchema);
export default Booking