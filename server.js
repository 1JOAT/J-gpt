import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));


const app = express();
const port = process.env.PORT || 3000;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(express.json());
app.use(cors({
  origin: '*',  
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'], 
}));

const chatMessageSchema = new mongoose.Schema({
    role: {
      type: String,
      required: true,
      enum: ["user", "model"],
    },
    text: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  });
  
  const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);
  
  app.post("/chat", async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) return res.status(400).json({ error: "Prompt is required" });
  
      // Fetch the last 10 messages from the DB (for context), sorted in ascending order
      let historyMessages = await ChatMessage.find({}).sort({ createdAt: 1 }).limit(200).exec();
  
  
      // Format history for the Gemini API: each message must have role and parts as an array of objects
      const formattedHistory = historyMessages.map((msg) => ({
        role: msg.role,
        parts: [{ text: msg.text }],
      }));
  
      // Start the chat session with the formatted history as context
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const chat = model.startChat({ history: formattedHistory });
  
      // Send the new message to Gemini
      const result = await chat.sendMessage(prompt);
      const responseText = result.response.text();
  
      // Save the new user and bot messages in the database
      const userMessage = new ChatMessage({ role: "user", text: prompt });
      const botMessage = new ChatMessage({ role: "model", text: responseText });
      await userMessage.save();
      await botMessage.save();
  
      res.json({ response: responseText });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Something went wrong" });
    }
  });

  app.get("/chat/history", async (req, res) => {
    try {
      const historyMessages = await ChatMessage.find({}).sort({ createdAt: 1 }).limit(200).exec();
      res.json({ history: historyMessages });
    } catch (error) {
      console.error("Error fetching chat history:", error);
      res.status(500).json({ error: "Failed to load chat history" });
    }
  });

  app.delete("/chat/clear", async (req, res) => {
    try {
      await ChatMessage.deleteMany({});
      res.json({ message: "Chat history cleared" });
    } catch (error) {
      console.error("Error clearing chat history:", error);
      res.status(500).json({ error: "Failed to clear chat history" });
    }
  });
  
  
  
  app.listen(port, () => console.log(`Server running on http://localhost:${port}`));