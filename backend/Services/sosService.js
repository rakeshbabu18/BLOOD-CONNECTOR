// sosService.js — Emergency SOS broadcast
// Sends a real-time Socket.io alert + attempts Twilio SMS to nearby donors.
// Twilio is optional: if credentials are missing, falls back to socket-only.

import { config } from "dotenv";
config();

import User from "../Models/UserModel.js";
import { emitSOSAlert } from "../socket.js";

function buildSmsBody(request, initiatorName) {
    return (
        `\uD83D\uDEA8 EMERGENCY BLOOD ALERT\n` +
        `Blood: ${request.bloodGroup} | Units: ${request.unitsRequired}\n` +
        `Hospital: ${request.hospitalName}\n` +
        `Patient: ${request.patientName}\n` +
        `Level: ${request.emergencyLevel}\n` +
        `Needed within: ${request.requiredWithinHours}h\n` +
        `Contact: ${request.contactNumber}\n` +
        (request.message ? `Note: ${request.message}\n` : "") +
        `\nTriggered by: ${initiatorName}\nReply STOP to opt out.`
    );
}

export async function broadcastSOS(io, request, initiatorName = "System") {
    const result = { notified: 0, smsAttempted: 0, smsErrors: [] };

    // 1. Real-time socket push to all online donors in the blood-group room
    emitSOSAlert(io, request.bloodGroup, request, initiatorName);
    result.notified++;

    // 2. Find nearby donors (50 km radius) for SMS
    let nearbyDonors = [];
    if (request.location?.coordinates) {
        try {
            nearbyDonors = await User.find({
                role: "DONOR",
                bloodGroup: request.bloodGroup,
                location: {
                    $near: {
                        $geometry: { type: "Point", coordinates: request.location.coordinates },
                        $maxDistance: 50000,
                    },
                },
            }).select("phoneNumber name");
        } catch (err) {
            console.error("[SOS] Geo-query failed:", err.message);
        }
    }

    // 3. Twilio SMS (optional — graceful skip if not configured)
    const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env;
    const twilioConfigured =
        TWILIO_ACCOUNT_SID && !TWILIO_ACCOUNT_SID.startsWith("your_") &&
        TWILIO_AUTH_TOKEN && !TWILIO_AUTH_TOKEN.startsWith("your_") &&
        TWILIO_FROM_NUMBER;

    if (!twilioConfigured) {
        console.warn("[SOS] Twilio not configured — SMS skipped. Socket alert sent.");
        return result;
    }

    let twilioClient;
    try {
        const { default: twilio } = await import("twilio");
        twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    } catch {
        console.warn("[SOS] Twilio package unavailable — run: npm install twilio");
        return result;
    }

    const smsBody = buildSmsBody(request, initiatorName);

    await Promise.allSettled(
        nearbyDonors.map(async (donor) => {
            result.smsAttempted++;
            try {
                await twilioClient.messages.create({
                    body: smsBody,
                    from: TWILIO_FROM_NUMBER,
                    to: donor.phoneNumber,
                });
                console.log(`[SOS] SMS sent to ${donor.name} (${donor.phoneNumber})`);
            } catch (err) {
                const msg = `SMS to ${donor.name} failed: ${err.message}`;
                console.error("[SOS]", msg);
                result.smsErrors.push(msg);
            }
        })
    );

    return result;
}
