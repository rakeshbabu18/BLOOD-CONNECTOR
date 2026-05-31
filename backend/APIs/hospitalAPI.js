import exp from "express";
import User from "../Models/UserModel.js";
import BloodRequest from "../Models/BloodRequestModel.js";
import { verifyToken } from "../Middlewares/verifyToken.js";
import { emitBloodRequestAlert } from "../socket.js";
import { broadcastSOS } from "../Services/sosService.js";

export const hospitalRouter = exp.Router();

// Create a new blood request
hospitalRouter.post("/create-request", verifyToken, async (req, res, next) => {
    try {
        const { bloodGroup, unitsRequired, patientName, contactNumber, emergencyLevel, message, requiredWithinHours } = req.body;
        const user = await User.findById(req.user.id);
        if (!user || user.role !== "HOSPITAL") return res.status(403).json({ message: "Only hospitals can create blood requests" });
        if (!bloodGroup || !unitsRequired || !patientName || !contactNumber) return res.status(400).json({ message: "All required fields must be provided" });

        const newRequest = new BloodRequest({
            bloodGroup, unitsRequired, patientName,
            hospitalName: user.name, contactNumber,
            location: user.location, createdBy: req.user.id,
            emergencyLevel, message, requiredWithinHours,
        });
        await newRequest.save();

        const io = req.app.get("io");
        let sosResult = null;
        if (io) {
            if (emergencyLevel === "CRITICAL") {
                sosResult = await broadcastSOS(io, newRequest, user.name);
            } else {
                emitBloodRequestAlert(io, bloodGroup, newRequest);
            }
        }

        res.status(201).json({ message: "Blood request created successfully", request: newRequest, sosResult });
    } catch (error) { next(error); }
});

// ─── SOS endpoint ────────────────────────────────────────────────────────────
// POST /hospital/requests/:requestId/sos
// Escalates to CRITICAL, fires socket "hospital:sos" to all online matching donors,
// and sends Twilio SMS to nearby donors (within 50 km). Hospital-owner only.
hospitalRouter.post("/requests/:requestId/sos", verifyToken, async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || user.role !== "HOSPITAL") return res.status(403).json({ message: "Only hospitals can trigger SOS" });

        const request = await BloodRequest.findOne({ _id: req.params.requestId, createdBy: req.user.id });
        if (!request) return res.status(404).json({ message: "Request not found or unauthorized" });
        if (!["PENDING", "ACCEPTED"].includes(request.status)) return res.status(400).json({ message: "SOS can only be sent for PENDING or ACCEPTED requests" });

        request.emergencyLevel = "CRITICAL";
        await request.save();

        const io = req.app.get("io");
        const sosResult = await broadcastSOS(io, request, user.name);

        res.json({ message: "SOS broadcast successfully", sosResult, request });
    } catch (error) { next(error); }
});

// View all requests created by this hospital
hospitalRouter.get("/my-requests", verifyToken, async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || user.role !== "HOSPITAL") return res.status(403).json({ message: "Only hospitals can view their requests" });

        const requests = await BloodRequest.find({ createdBy: req.user.id })
            .sort({ createdAt: -1 })
            .populate("acceptedDonor", "name phoneNumber email bloodGroup");

        res.json({ message: "Fetched requests", requests });
    } catch (error) { next(error); }
});

// Mark a request as completed
hospitalRouter.put("/requests/:requestId/complete", verifyToken, async (req, res, next) => {
    try {
        const request = await BloodRequest.findOne({ _id: req.params.requestId, createdBy: req.user.id });
        if (!request) return res.status(404).json({ message: "Request not found or unauthorized" });
        if (request.status !== "ACCEPTED") return res.status(400).json({ message: "Only accepted requests can be marked as completed" });

        request.status = "COMPLETED";
        await request.save();

        if (request.acceptedDonor) await User.findByIdAndUpdate(request.acceptedDonor, { lastDonationDate: new Date() });

        res.json({ message: "Request marked as completed", request });
    } catch (error) { next(error); }
});

// Cancel a pending or accepted request
hospitalRouter.put("/requests/:requestId/cancel", verifyToken, async (req, res, next) => {
    try {
        const request = await BloodRequest.findOne({ _id: req.params.requestId, createdBy: req.user.id });
        if (!request) return res.status(404).json({ message: "Request not found or unauthorized" });
        if (!["PENDING", "ACCEPTED"].includes(request.status)) return res.status(400).json({ message: "Only pending or accepted requests can be cancelled" });

        request.status = "CANCELLED";
        await request.save();

        res.json({ message: "Request cancelled", request });
    } catch (error) { next(error); }
});
