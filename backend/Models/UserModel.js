import mongoose from "mongoose";

const USER_ROLES = ["DONOR", "HOSPITAL"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

// FIX: Increased to 90 days as per request
export const DONATION_ELIGIBILITY_DAYS = 90;

const isValidCoordinates = (coords) => {
    if (!Array.isArray(coords) || coords.length !== 2) return false;
    const [longitude, latitude] = coords;
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return false;
    return longitude >= -180 && longitude <= 180 && latitude >= -90 && latitude <= 90;
};

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },

        password: {
            type: String,
            required: true,
            minlength: 6,
        },

        role: {
            type: String,
            enum: USER_ROLES,
            required: true,
        },

        bloodGroup: {
            type: String,
            enum: BLOOD_GROUPS,
            required: function () {
                return this.role === "DONOR";
            },
        },

        phoneNumber: {
            type: String,
            required: true,
            trim: true,
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
                validate: {
                    validator: isValidCoordinates,
                    message: "Coordinates must be [longitude, latitude] with valid ranges",
                },
            },
        },

        lastDonationDate: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// FIX: DONATION_ELIGIBILITY_DAYS is now actually used — exposed as a virtual
// so the frontend can show "Eligible in X days" without extra API calls
userSchema.virtual("isEligibleToDonate").get(function () {
    if (!this.lastDonationDate) return true; // Never donated → eligible
    const daysSince = (Date.now() - new Date(this.lastDonationDate)) / (1000 * 60 * 60 * 24);
    return daysSince >= DONATION_ELIGIBILITY_DAYS;
});

userSchema.virtual("daysUntilEligible").get(function () {
    if (!this.lastDonationDate) return 0;
    const daysSince = (Date.now() - new Date(this.lastDonationDate)) / (1000 * 60 * 60 * 24);
    const remaining = DONATION_ELIGIBILITY_DAYS - daysSince;
    return remaining > 0 ? Math.ceil(remaining) : 0;
});

// Geospatial index
userSchema.index({ location: "2dsphere" });

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
