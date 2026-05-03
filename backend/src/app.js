import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import cors from "cors";

import {createServer} from "node:http";   /// Creates an HTTP server
import { Server } from "socket.io";       // Used for real-time communication with WebSockets 
import {connectToSocket} from "./controllers/socketManager.js";
import  userRoutes from "./routes/users.routes.js";
import authRoutes from "./routes/auth.routes.js";
import meetingRoutes from "./routes/meeting.routes.js";

const app=express();
app.use(cors());
app.use(express.json({limit:"40kb"}));
app.use(express.urlencoded({limit:"40kb" ,extended:true}));

app.use("/api/v1/users",userRoutes);   ///All routes inside users.routes.js are now prefixed with /api/v1/users.
app.use("/api/auth", authRoutes);
app.use((req, res, next) => {
  console.log("REQUEST HIT:", req.method, req.url);
  next();
});
app.use("/api/meeting", meetingRoutes);

const server=createServer(app);
const io = connectToSocket(server);
app.set("port",process.env.PORT || 8000);

app.get ("/home",(req,res)=>{
    res.send("hello world")
})

const start = async()=>{
    app.set("mongo_user")
    /// database connection setting
    const connectionDb =await mongoose.connect("mongodb+srv://ashleshaZoom:ashleshaZoom123@zoomclonecluster.u42a7.mongodb.net/?retryWrites=true&w=majority&appName=ZoomCloneCluster");
    console.log(`mongo connected DB host:${connectionDb.connection.host}`)

    server.listen(app.get("port"),()=>{
        console.log("listening your port on 8000")
    });
}
start();