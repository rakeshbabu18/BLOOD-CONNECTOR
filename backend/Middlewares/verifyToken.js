import jwt from 'jsonwebtoken';
import {config} from 'dotenv';
config();

export const verifyToken = (req, res, next) => {
    // Get token from cookies or authorization header
    const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);

    if (!token) {
        return res.status(401).json({ message: "Access denied. No token provided." });
    }

    try {
        const secret = process.env.JWT_SECRET;
        const decoded = jwt.verify(token, secret);
        req.user = decoded; // Contains id from jwt.sign({ id: userDoc._id })
        next();
    } catch (error) {
        return res.status(403).json({ message: "Invalid or expired token." });
    }
};