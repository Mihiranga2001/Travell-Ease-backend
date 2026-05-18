import mongoose from "mongoose";

const mediaSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        
        postId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post"
        },
        
        mediaType: {
            type: String,
            enum: ["image", "video"],
            required: true
        },
        
        url: { 
            type: String, 
            required: true 
        },
        
        caption: { 
            type: String, 
            default: "" 
        },
        
        aiTags: [
            { 
                type: String 
            }
        ],
        
        isApproved: { 
            type: Boolean, 
            default: false 
        }
    },
    { 
        timestamps: true 
    }
);

const Media = mongoose.model("Media", mediaSchema);
export default Media