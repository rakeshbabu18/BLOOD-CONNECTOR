import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../Models/UserModel.js"; // FIX: was "../models/userModel.js" (wrong case)

/**
 * Register a new user.
 * NOTE: Password must be PLAIN TEXT here — this function handles hashing.
 * Do NOT pre-hash before calling this.
 */
export const register = async (userObj) => {
    const userDoc = new User(userObj);

    // Validate before hashing so validation errors surface cleanly
    await userDoc.validate();

    userDoc.password = await bcrypt.hash(userDoc.password, 10);

    const createdUser = await userDoc.save();

    const newUser = createdUser.toObject();
    delete newUser.password;

    return newUser;
};

/**
 * Login a user and return a signed JWT + sanitized user object.
 */
export const login = async (email, password) => {
    const userDoc = await User.findOne({ email });

    if (!userDoc) {
        throw new Error("Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(password, userDoc.password);
    if (!isPasswordValid) {
        throw new Error("Invalid email or password");
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET is not defined in environment variables");
    }

    const token = jwt.sign({ id: userDoc._id }, secret, { expiresIn: "1d" });

    // FIX: removed duplicate toObject() call (dead `user` variable)
    const sanitizedUser = userDoc.toObject();
    delete sanitizedUser.password;

    return { token, user: sanitizedUser };
};
