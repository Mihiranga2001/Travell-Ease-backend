import ChatMessage from "../models/ChatMessage.js";

export function getMessages(req, res) {

  ChatMessage.find().then((messages) => {
      res.json(messages);
    })
    .catch(() => {
      res.status(500).json({
        message: "Failed to fetch messages"
      });
    });
}

export function createMessage(req, res) {

  const message = new ChatMessage(req.body);

  message.save().then(() => {
      res.json({
        message: "Message sent successfully"
      });
    })
    .catch(() => {
      res.status(500).json({
        message: "Failed to send message"
      });
    });
}