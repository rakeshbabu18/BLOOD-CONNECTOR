import mongoose from "mongoose";

const bloodRequestSchema = new mongoose.Schema(
    {
        bloodGroup: {
            type: String,
            required: true,
            enum: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"],
        },

        unitsRequired: {
            type: Number,
            required: true,
            min: 1,
        },

        patientName: {
            type: String,
            required: true,
            trim: true,
        },

        hospitalName: {
            type: String,
            required: true,
            trim: true,
        },

        contactNumber: {
            type: String,
            required: true,
        },

        location: {
            type: {
                type: String,
                enum: ["Point"],
                default: "Point",
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
                required: true,
            },
        },

        status: {
            type: String,
            enum: ["PENDING", "ACCEPTED", "COMPLETED", "CANCELLED"],
            default: "PENDING",
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        donorsNotified: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],

        acceptedDonor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        emergencyLevel: {
            type: String,
            enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
            default: "HIGH",
        },

        message: {
            type: String,
            trim: true,
        },

        requiredWithinHours: {
            type: Number,
            default: 6,
        },
    },
    {
        timestamps: true,
    }
);

// Geospatial index for nearby search
bloodRequestSchema.index({ location: "2dsphere" });

const BloodRequest =
    mongoose.models.BloodRequest ||
    mongoose.model("BloodRequest", bloodRequestSchema);

export default BloodRequest;
