import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./config/mongodb.js";
import connectCloudinary from "./config/cloudinary.js";
import adminRouter from "./routes/adminRoute.js";
import doctorRouter from "./routes/doctorRoute.js";
import userRouter from "./routes/userRoute.js";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import chatRouter from "./routes/chatRoute.js";
import jwt from "jsonwebtoken";
import Chat from "./models/chatModel.js";

// app config
const app = express();
const port = process.env.PORT || 4000;
connectDB();
connectCloudinary();

// Use this array for allowed origins
const allowedOrigins = [
  'http://localhost:5173', 
  'http://localhost:5174'
];

// middlewares
app.use(express.json());
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// api end point
app.use("/api/admin", adminRouter);
app.use("/api/doctor", doctorRouter);
app.use("/api/user", userRouter);
app.use("/api/chat", chatRouter);

app.get("/", (req, res) => {
  res.send("Api working...");
});

// --- Socket.IO setup ---
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) || 
        origin.includes("localhost:5173") || 
        origin.includes("localhost:5174")
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Socket.IO authentication middleware
io.use((socket, next) => {
  // Unified token handling
  const token = 
    socket.handshake.auth.token || 
    socket.handshake.headers.token ||
    socket.handshake.auth.dtoken || 
    socket.handshake.headers.dtoken;

  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return next(new Error("Authentication error"));
      socket.decoded = decoded;
      next();
    });
  } else {
    next(new Error("Authentication error"));
  }
});

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Join appointment room
  socket.on("join-appointment", (appointmentId) => {
    socket.join(appointmentId);
    console.log(`User joined appointment: ${appointmentId}`);
  });

  // Handle messages
  socket.on("send-message", async (data) => {
    try {
      // Save message to DB
      const newMessage = new Chat({
        appointmentId: data.appointmentId,
        senderId: socket.decoded.id, // Use authenticated ID
        senderType: data.senderType,
        message: data.message,
      });
      await newMessage.save();

      // Broadcast to room
      io.to(data.appointmentId).emit("receive-message", newMessage);
      
      // Send notification
      const receiverType = data.senderType === 'doctor' ? 'patient' : 'doctor';
      io.emit("send-notification", {
        receiverId: receiverType === 'doctor' ? data.appointmentData.docId : data.appointmentData.userId,
        type: "new-message",
        message: `New message from ${socket.decoded.name}`,
        appointmentId: data.appointmentId
      });
    } catch (error) {
      console.error("Error saving message:", error);
    }
  });

  // Handle notifications
  socket.on("send-notification", (data) => {
    io.to(data.receiverId).emit("receive-notification", data);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

server.listen(port, () => console.log("Server started", port));