// socket.js — Central socket event manager

const onlineUsers = new Map();

export const initSocket = (io) => {
    io.on("connection", (socket) => {
        console.log(`Socket connected: ${socket.id}`);

        socket.on("donor:online", ({ userId, bloodGroup }) => {
            if (!userId || !bloodGroup) return;
            onlineUsers.set(userId, socket.id);
            socket.join(bloodGroup);
            console.log(`Donor ${userId} is online, joined room: ${bloodGroup}`);
        });

        socket.on("disconnect", () => {
            for (const [userId, socketId] of onlineUsers.entries()) {
                if (socketId === socket.id) {
                    onlineUsers.delete(userId);
                    console.log(`Donor ${userId} went offline`);
                    break;
                }
            }
            console.log(`Socket disconnected: ${socket.id}`);
        });
    });
};

// Emit normal blood request alert to matching blood-group room
export const emitBloodRequestAlert = (io, bloodGroup, requestData) => {
    io.to(bloodGroup).emit("hospital:new-request", {
        message: `Urgent! ${bloodGroup} blood needed at ${requestData.hospitalName}`,
        request: requestData,
    });
    console.log(`Alert emitted to room: ${bloodGroup}`);
};

// Emit SOS broadcast to matching blood-group room (called from broadcastSOS in sosService)
export const emitSOSAlert = (io, bloodGroup, requestData, initiatorName) => {
    io.to(bloodGroup).emit("hospital:sos", {
        type: "SOS",
        message: `🚨 URGENT SOS — ${bloodGroup} blood critically needed at ${requestData.hospitalName}!`,
        request: requestData,
        initiator: initiatorName,
        timestamp: new Date().toISOString(),
    });
    console.log(`SOS emitted to room: ${bloodGroup}`);
};

export { onlineUsers };
