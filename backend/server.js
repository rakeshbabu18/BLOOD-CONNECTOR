import exp from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cookieParser from 'cookie-parser';
import { connect } from 'mongoose';
import { commonRouter } from './APIs/commonAPI.js';
import { donorRouter } from './APIs/donorAPI.js';
import { hospitalRouter } from './APIs/hospitalAPI.js';
import { initSocket } from './socket.js';
import { config } from 'dotenv';
import cors from 'cors';
config();

const app = exp();
const port = process.env.PORT || 5000;

// Enable CORS for Express REST API
app.use(cors({
    origin: allowedOrigins,
    credentials: true,
}));

// Wrap express app in a native HTTP server so Socket.io can share it
const httpServer = createServer(app);

// Initialise Socket.io on the same HTTP server
const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true,
    },
});

// Body parser middlewares
app.use(exp.json());
app.use(cookieParser());

// Make `io` available inside route handlers via req.app.get("io")
app.set("io", io);

// Routes
app.use('/common', commonRouter);
app.use('/donor', donorRouter);
app.use('/hospital', hospitalRouter);

// Global error handling middleware
app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || "Internal Server Error" });
});

// Register all socket event listeners
initSocket(io);

// Connect to MongoDB, then start server
async function connection() {
    try {
        await connect(process.env.MONGO_URI || 'mongodb://localhost:27017/bloodconnectordb');
        console.log("MongoDB connected successfully");

        httpServer.listen(port, () => {
            console.log(`Server is listening on port ${port}...`);
        });
    } catch (err) {
        console.error('Error connecting to MongoDB:', err);
        process.exit(1);
    }
}

connection();
