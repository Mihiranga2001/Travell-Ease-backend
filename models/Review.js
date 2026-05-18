import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        targetType: {
            type: String,
            enum: ["destination", "hotel", "guide"],
            required: true
        },
        
        targetId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        
        comment: { 
            type: String, 
            required: true 
        },
        
        sentiment: {
            type: String,
            enum: ["positive", "neutral", "negative"],
            default: "neutral"
        },
        
        isFake: { 
            type: Boolean, 
            default: false 
        }
    
    },
    { 
        timestamps: true 
    }
);

const Review = mongoose.model("Review", reviewSchema);
export default Review