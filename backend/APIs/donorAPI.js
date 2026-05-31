import exp from "express";
import User from "../Models/UserModel.js";
import BloodRequest from "../Models/BloodRequestModel.js";
import { verifyToken } from "../Middlewares/verifyToken.js";
import { DONATION_ELIGIBILITY_DAYS } from "../Models/UserModel.js";
import { emitBloodRequestAlert } from "../socket.js";
import { broadcastSOS } from "../Services/sosService.js";

export const donorRouter = exp.Router();

// Get donor profile by ID
donorRouter.get("/profile/:id", verifyToken, async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json({ message: "Profile fetched successfully", user });
    } catch (error) {
        next(error);
    }
});

// Update donor profile
// FIX: Added ownership check — donors can only update their OWN profile
donorRouter.put("/profile-update/:id", verifyToken, async (req, res, next) => {
    try {
        // FIX: Ensure the logged-in user can only edit their own profile
        if (req.params.id !== req.user.id.toString()) {
            return res.status(403).json({ message: "You can only update your own profile" });
        }

        const updates = req.body;

        // Never allow password changes through this route
        delete updates.password;
        // Never allow role changes through this route
        delete updates.role;

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { $set: updates },
            { new: true, runValidators: true }
        ).select("-password");

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({ message: "Profile updated successfully", user: updatedUser });
    } catch (error) {
        next(error);
    }
});

// Get blood requests matching the donor's blood group AND within radius
// Query param: ?radius=10000 (meters, default 10km)
donorRouter.get("/requests", verifyToken, async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user || user.role !== "DONOR") {
            return res.status(403).json({ message: "Only donors can view requests" });
        }

        // Donor must have a stored location to do a proximity search
        if (!user.location || !user.location.coordinates) {
            return res.status(400).json({ message: "Your location is not set. Please update your profile." });
        }

        // Allow frontend to pass a custom radius, default 10km
        const radiusInMeters = parseInt(req.query.radius) || 10000;

        // $near returns results sorted closest-first automatically
        // $maxDistance limits results to within the radius
        const requests = await BloodRequest.find({
            bloodGroup: user.bloodGroup,
            status: "PENDING",
            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: user.location.coordinates, // [longitude, latitude]
                    },
                    $maxDistance: radiusInMeters,
                },
            },
        }).populate("createdBy", "name phoneNumber email");

        res.json({
            message: "Requests fetched",
            count: requests.length,
            radiusInMeters,
            requests,
        });
    } catch (error) {
        next(error);
    }
});

// Accept a blood request
// FIX: Added donor eligibility check before allowing acceptance
donorRouter.post("/requests/:requestId/accept", verifyToken, async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user || user.role !== "DONOR") {
            return res.status(403).json({ message: "Only donors can accept requests" });
        }

        // FIX: Enforce the 90-day eligibility window
        if (user.lastDonationDate) {
            const daysSince =
                (Date.now() - new Date(user.lastDonationDate)) / (1000 * 60 * 60 * 24);
            if (daysSince < DONATION_ELIGIBILITY_DAYS) {
                const daysLeft = Math.ceil(DONATION_ELIGIBILITY_DAYS - daysSince);
                return res.status(400).json({
                    message: `You are not eligible to donate yet. Please wait ${daysLeft} more day(s).`,
                });
            }
        }

        const request = await BloodRequest.findById(req.params.requestId);
        if (!request) {
            return res.status(404).json({ message: "Request not found" });
        }

        // FIX: Users cannot accept their own requests
        if (request.createdBy.toString() === req.user.id.toString()) {
            return res.status(400).json({ message: "You cannot accept your own blood request" });
        }

        if (request.status !== "PENDING") {
            return res.status(400).json({ message: "This request is no longer pending" });
        }

        request.status = "ACCEPTED";
        request.acceptedDonor = req.user.id;
        await request.save();

        // FIX: Update lastDonationDate immediately on acceptance to satisfy requirement
        // and ensure the 90-day rule triggers right away.
        await User.findByIdAndUpdate(req.user.id, { lastDonationDate: new Date() });

        res.json({ message: "Request accepted successfully", request });
    } catch (error) {
        next(error);
    }
});

// Check donor's own eligibility status
donorRouter.get("/eligibility", verifyToken, async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select("-password");

        if (!user || user.role !== "DONOR") {
            return res.status(403).json({ message: "Only donors can check eligibility" });
        }

        res.json({
            message: "Eligibility status fetched",
            isEligible: user.isEligibleToDonate,
            daysUntilEligible: user.daysUntilEligible,
            lastDonationDate: user.lastDonationDate,
        });
    } catch (error) {
        next(error);
    }
});

// Create a new blood request (Allows donors to request blood too)
donorRouter.post("/create-request", verifyToken, async (req, res, next) => {
    try {
        const { bloodGroup, unitsRequired, patientName, contactNumber, emergencyLevel, message, requiredWithinHours } = req.body;
        const user = await User.findById(req.user.id);
        
        if (!user || user.role !== "DONOR") {
            return res.status(403).json({ message: "Only donors can use this endpoint" });
        }
        
        if (!bloodGroup || !unitsRequired || !patientName || !contactNumber) {
            return res.status(400).json({ message: "All required fields must be provided" });
        }

        const newRequest = new BloodRequest({
            bloodGroup, 
            unitsRequired, 
            patientName,
            hospitalName: user.name, // Using donor's name as the requester location
            contactNumber,
            location: user.location, 
            createdBy: req.user.id,
            emergencyLevel: emergencyLevel || "HIGH", 
            message, 
            requiredWithinHours: requiredWithinHours || 6,
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
    } catch (error) { 
        next(error); 
    }
});

// ─── SOS endpoint ────────────────────────────────────────────────────────────
donorRouter.post("/requests/:requestId/sos", verifyToken, async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || user.role !== "DONOR") return res.status(403).json({ message: "Only donors can trigger SOS" });

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

// Get requests created by this donor
donorRouter.get("/my-requests", verifyToken, async (req, res, next) => {
    try {
        const requests = await BloodRequest.find({ createdBy: req.user.id })
            .sort({ createdAt: -1 })
            .populate("acceptedDonor", "name phoneNumber email bloodGroup");

        res.json({ message: "Fetched your requests", requests });
    } catch (error) { 
        next(error); 
    }
});

// Mark a request created by a donor as completed (Confirms donation)
donorRouter.put("/requests/:requestId/complete", verifyToken, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const request = await BloodRequest.findOne({ _id: req.params.requestId, createdBy: userId });
        
        if (!request) return res.status(404).json({ message: "Request not found or unauthorized" });
        if (request.status !== "ACCEPTED") return res.status(400).json({ message: "Only accepted requests can be marked as completed" });

        request.status = "COMPLETED";
        await request.save();

        // Update the donation date of the donor who accepted this request
        if (request.acceptedDonor) {
            await User.findByIdAndUpdate(request.acceptedDonor, { lastDonationDate: new Date() });
        }

        res.json({ message: "Donation marked as completed", request });
    } catch (error) { 
        next(error); 
    }
});

// Get history of donations (where this user was the donor)
donorRouter.get("/donations", verifyToken, async (req, res, next) => {
    try {
        const donations = await BloodRequest.find({ 
            acceptedDonor: req.user.id,
            status: "COMPLETED"
        }).sort({ updatedAt: -1 }).populate("createdBy", "name");

        res.json({ message: "Fetched donation history", donations });
    } catch (error) { 
        next(error); 
    }
});
