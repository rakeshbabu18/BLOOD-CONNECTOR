# Blood Connector Frontend 🩸

A high-performance, real-time interface for managing life-saving blood donations.

## ✨ Features

### 1. Intuitive Dashboards
- **Donor Dashboard**: 
  - Track eligibility (days until next donation).
  - View nearby blood requests in real-time.
  - One-click "Accept" and "Complete" workflows.
  - Receive loud, visual SOS alerts for critical emergencies.
- **Hospital Dashboard**:
  - Request management board with live status updates.
  - "SOS" trigger to broadcast critical needs to the entire network.
  - Real-time statistics on pending and completed requests.

### 2. Smart User Experience
- **Geolocation Integration**: Automatically captures precise location during registration for proximity matching.
- **Responsive Navigation**: Mobile-first navbar with a smooth dropdown menu for smaller screens.
- **Dynamic Theming**: Custom "Emergency Red" design system with smooth animations and high-contrast accessibility.

### 3. Advanced Connectivity
- **Socket.io Integration**: Native `io` listeners for instant notifications without page refreshes.
- **Centralized API Hub**: Integrated `api.js` for seamless transition between local development and production deployments.4. **SPA Routing Support**: Includes `vercel.json` for proper URL rewrites, preventing 404 errors on page refreshes.
## 🛠 Tech Stack
- **Core**: React 19
- **Build Tool**: Vite
- **Routing**: React Router DOM v7
- **Notifications**: React Hot Toast
- **Styling**: Tailwind CSS & CSS-in-JS

## 📁 Folder Structure
- `components/`: UI modules including Dashboards, Login, and Navbar.
- `api.js`: Centralized endpoint configuration.
- `index.css`: Global design system and custom animations (e.g., `sosRing`).

## ⚙️ Setup
1. `npm install`
2. Create `.env` with `VITE_API_URL`.
3. `npm run dev`
