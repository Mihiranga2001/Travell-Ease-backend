import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        
        caption: { 
            type: String, 
            default: "" 
        },
        
        location: { 
            type: String, 
            default: "" 
        },
        
        likesCount: { 
            type: Number, 
            default: 0 
        },
        
        commentsCount: { 
            type: Number, 
            default: 0 
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

const Post = mongoose.model("Post", postSchema);
export default Post