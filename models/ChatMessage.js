import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
    {
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        
        receiverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        
        messageType: {
            type: String,
            enum: ["text", "image", "tip"],
            default: "text"
        },
        
        text: { 
            type: String, 
            default: "" 
        },
        
        imageUrl: { 
            type: String, 
            default: "" 
        },
        
        isRead: { 
            type: Boolean, 
            default: false 
        }
    },
    { 
        timestamps: true 
    }
);

const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);
export default ChatMessage