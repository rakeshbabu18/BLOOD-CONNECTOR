# Blood Connector Backend 🩺

The engine powering real-time blood connectivity, donor matching, and emergency broadcasts.

## 🚀 Key Features

### 1. Robust API Architecture
- **Donor System**: Profile management, donation history, and custom blood request creation.
- **Hospital System**: Complete lifecycle management for blood requests (Create → Accept → Complete/Cancel).
- **Common Services**: Shared lookups for verified donors and active requests.

### 2. Emergency SOS Engine
- **Real-time Broadcasting**: Powered by **Socket.io** to notify active donors instantly when a "CRITICAL" request is made.
- **SMS Integration**: Integrated with **Twilio** to send physical text alerts to nearby donors during SOS events.
- **Location-Aware Matching**: Uses MongoDB **2dsphere geospatial indexing** to find donors within a specific radius of the hospital.

### 3. Security & Authentication
- **JWT Authorization**: Custom `verifyToken` middleware ensuring secure access to dashboard-specific routes.
- **Password Hashing**: Secure storage using `bcryptjs`.
- **Role-Based Access Control (RBAC)**: Strict separation between Hospital and Donor capabilities.

## 🛠 Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Real-time**: Socket.io
- **Communication**: Twilio SMS API

## 📁 Folder Structure
- `APIs/`: Route handlers for different entities.
- `Models/`: Mongoose schemas for Users and Blood Requests.
- `Middlewares/`: Authentication and security checks.
- `Services/`: Business logic for SOS and complex auth flows.

## ⚙️ Setup
1. `npm install`
2. Create `.env` from `.env.example`.
3. `npm start` (or `npm run dev` for nodemon).
