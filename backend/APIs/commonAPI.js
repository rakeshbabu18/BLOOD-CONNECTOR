import exp from "express";
import { register, login } from "../Services/authService.js";

export const commonRouter = exp.Router();

// Register as a donor or hospital
// Delegates entirely to authService.register() — it handles hashing
commonRouter.post("/register", async (req, res, next) => {
    try {
        const {
            name,
            email,
            password,
            role,
            phoneNumber,
            bloodGroup,
            location,
            lastDonationDate,
        } = req.body;

        // Basic field validation
        if (!name || !email || !password || !role || !phoneNumber || !location?.coordinates) {
            return res.status(400).json({ message: "All required fields must be provided" });
        }

        // Phone number validation (10 digits)
        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(phoneNumber)) {
            return res.status(400).json({ message: "Phone number must be exactly 10 digits" });
        }

        if (!["DONOR", "HOSPITAL"].includes(role)) {
            return res.status(400).json({ message: "Role must be either DONOR or HOSPITAL" });
        }

        if (role === "DONOR" && !bloodGroup) {
            return res.status(400).json({ message: "Blood group is required for donors" });
        }

        // FIX: Call authService.register() — do NOT hash here.
        // authService handles hashing internally. Hashing before calling it
        // would result in the password being hashed twice.
        const newUser = await register({
            name,
            email,
            password, // plain text — authService hashes it
            role,
            phoneNumber,
            bloodGroup,
            location,
            lastDonationDate,
        });

        res.status(201).json({ message: "User registered successfully", user: newUser });
    } catch (error) {
        // Mongoose duplicate key (email already exists)
        if (error.code === 11000) {
            return res.status(400).json({ message: "Email already in use" });
        }
        next(error);
    }
});

// Login
commonRouter.post("/login", async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const { token, user } = await login(email, password);

        // Save token as HTTP-only cookie
        res.cookie("token", token, {
            httpOnly: true ,
            secure: true,
            sameSite: "none",
            maxAge: 24 * 60 * 60 * 1000, // 1 day in ms
        });

        const userResponse = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
        };

        res.json({ message: "Login successful", user: userResponse });
    } catch (err) {
        // Surface auth errors as 401, not 500
        if (err.message === "Invalid email or password") {
            return res.status(401).json({ message: err.message });
        }
        next(err);
    }
});

// Logout — clear the cookie
commonRouter.post("/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ message: "Logged out successfully" });
});
