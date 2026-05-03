# E-Barker: Digital Dispatching & Terminal Fee Monitoring System (React + Vite Version)

A comprehensive React-based web application built with Vite, Bootstrap 5, and MongoDB Atlas for managing PUV van terminal operations in Baggao, Cagayan.

---

## 🆕️ Complete Rewrite: React + Vite + Bootstrap

This version has been **completely converted** from vanilla JavaScript to **React 19** with:
- **Vite** for lightning-fast development
- **React Router v7** for client-side routing
- **Bootstrap 5.3.8** (via CDN) for responsive UI
- **Chart.js** for data visualization
- **JWT Authentication** with React hooks

---

## 📋 Table of Contents
1. [Features](#features)
2. [Project Structure (React)](#project-structure)
3. [Installation Guide](#installation-guide)
4. [User Roles](#user-roles)
5. [React Components](#react-components)
6. [API Integration](#api-integration)
7. [Deployment (Vercel + MongoDB Atlas)](#deployment)
8. [Documentation](#documentation)

---

## ✅ Features

### For Dispatchers
- ✅ **Live Queue Dashboard** - FIFO-ordered queue with React state management
- ✅ **One-Click Dispatch** - Dispatch next driver instantly
- ✅ **Recently Dispatched** - Monitor last 5 trips (React state)
- ✅ **Fee Collection Stats** - Real-time revenue with Chart.js
- ✅ **Auto-Refresh** - 10-second intervals with `setInterval`

### For Drivers
- ✅ **Mobile-First Design** - Responsive React components
- ✅ **Queue Check-In** - Join queue with one click
- ✅ **Position Tracking** - See place in line (React state)
- ✅ **Trip Status** - Real-time status updates
- ✅ **Auto Re-Entry** - Automatically rejoin queue after trip

### For Admins
- ✅ **Admin Panel** - Full CRUD with React forms
- ✅ **User Management** - Add/edit/deactivate users
- ✅ **Vehicle Registry** - PUV Van database management
- ✅ **Financial Reports** - Daily/weekly/monthly with Chart.js
- ✅ **Settings Management** - Configure system settings

### Technical Features
- ✅ **React 19** with hooks (`useState`, `useEffect`, `useCallback`)
- ✅ **React Router v7** - Client-side routing with protection
- ✅ **Custom `useAuth` Hook** - JWT authentication management
- ✅ **Bootstrap 5.3.8** - Responsive UI components
- ✅ **Vite 8** - Fast HMR and build tool
- ✅ **MongoDB Atlas** - Cloud NoSQL database
- ✅ **Mongoose ODM** - Schema-based data modeling

---

## 📁 Project Structure (React)

```
e-barker/
├── backend/                    # Node.js + Express + MongoDB
│   ├── models/              # Mongoose schemas
│   │   ├── User.js
│   │   ├── Queue.js
│   │   ├── Transaction.js
│   │   ├── Vehicle.js
│   │   └── Setting.js
│   ├── routes/              # API endpoints
│   │   ├── auth.js
│   │   ├── queue.js
│   │   ├── transactions.js
│   │   ├── settings.js
│   │   ├── vehicles.js      # PUV Van management
│   │   ├── users.js
│   │   └── fares.js
│   ├── config/database.js   # Mongoose connection
│   ├── middleware/auth.js    # JWT middleware
│   ├── index.js            # Express app (Vercel-ready)
│   └── vercel.json         # Vercel config
│
└── frontend/                   # React + Vite
    ├── src/
    │   ├── components/      # Reusable React components
    │   ├── pages/           # Page components
    │   │   ├── LandingPage.jsx
    │   │   ├── LoginPage.jsx
    │   │   ├── DriverPage.jsx
    │   │   ├── DispatcherDashboard.jsx
    │   │   ├── AdminPage.jsx
    │   │   ├── ReportsPage.jsx
    │   │   └── MapsPage.jsx
    │   ├── hooks/
    │   │   └── useAuth.jsx   # Custom auth hook
    │   ├── utils/
    │   │   └── api.js        # API wrapper
    │   ├── App.jsx            # Main app with routing
    │   ├── main.jsx           # React root + Bootstrap import
    │   └── assets/css/style.css
    ├── index.html              # HTML entry point
    ├── vite.config.js         # Vite configuration
    ├── vercel.json            # Vercel config (with rewrites)
    └── package.json           # React dependencies
```

---

## 🚀 Installation Guide

### Step 1: Clone & Install

```bash
cd e-barker

# Backend
cd backend
pnpm install  # Installs: express, mongoose, bcryptjs, jsonwebtoken

# Frontend
cd ../frontend
pnpm install  # Installs: react, react-dom, react-router-dom, bootstrap, chart.js
```

### Step 2: MongoDB Atlas Setup

1. Create account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas/register)
2. Create **M0 Sandbox** cluster (free)
3. **Network Access** → **Allow from Anywhere** (`0.0.0.0/0`)
4. **Database Access** → Create user with password
5. **Connect** → **Drivers** → Copy connection string

### Step 3: Configure Environment

**Backend** (`backend/.env`):
```env
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/e_barker
JWT_SECRET=your-super-secret-jwt-key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

**Frontend** (`frontend/.env`):
```env
VITE_API_URL=http://localhost:3000/api
```

### Step 4: Run Development Servers

```bash
# Terminal 1: Backend
cd backend
node index.js
# → "MongoDB connected successfully"

# Terminal 2: Frontend
cd frontend
pnpm dev
# → "Vite dev server running on http://localhost:5173"
```

---

## 👥 User Roles

### React Router Protection

```javascript
// In App.jsx
<Route 
  path="/dashboard" 
  element={user?.role === 'dispatcher' || user?.role === 'admin' 
    ? <DispatcherDashboard /> 
    : <Navigate to="/" />} 
/>
```

### 1. Admin (Terminal Manager)
- **Access**: Full system access via `AdminPage.jsx`
- **Features**: User CRUD, vehicle management, reports

### 2. Dispatcher (Baggao Terminal)
- **Access**: `DispatcherDashboard.jsx`
- **Features**: Queue management, dispatch to Tuguegarao and other Cagayan destinations, fee tracking

### 3. Driver (PUV Van)
- **Access**: `DriverPage.jsx`
- **Features**: Check-in, position tracking, trip completion
- **Routes**: Baggao to Tuguegarao City and other Cagayan locations

---

## ⚛️ React Components

### Custom Hook: `useAuth`

```javascript
// hooks/useAuth.jsx
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('auth_token'));

  // Auto-check auth on token change
  useEffect(() => {
    if (token) {
      fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setUser(data.user))
        .finally(() => setLoading(false));
    }
  }, [token]);

  const login = (userData, authToken) => {
    localStorage.setItem('auth_token', authToken);
    setToken(authToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  };

  return { user, loading, token, login, logout };
}
```

### Page Components

| Component | File | Route | Purpose |
|-----------|------|-------|---------|
| `LandingPage` | `pages/LandingPage.jsx` | `/` | Marketing page |
| `LoginPage` | `pages/LoginPage.jsx` | `/login` | Login/register form |
| `DriverPage` | `pages/DriverPage.jsx` | `/driver` | Driver portal |
| `DispatcherDashboard` | `pages/DispatcherDashboard.jsx` | `/dashboard` | Dispatch management |
| `AdminPage` | `pages/AdminPage.jsx` | `/admin` | Admin panel |
| `ReportsPage` | `pages/ReportsPage.jsx` | `/reports` | Financial reports |
| `MapsPage` | `pages/MapsPage.jsx` | `/maps` | Google Maps integration |

---

## 🔌 API Integration

### API Wrapper (`utils/api.js`)

```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('auth_token');
  
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers
    }
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
};

// Usage in components
export const queueAPI = {
  getActive: () => apiRequest('/queue/active'),
  join: (driverId) => apiRequest('/queue/join', {
    method: 'POST',
    body: JSON.stringify({ driver_id: driverId })
  })
};
```

### Using in Components

```javascript
// DriverPage.jsx
import { queueAPI } from '../utils/api';

function DriverPage() {
  const [queueStatus, setQueueStatus] = useState(null);
  
  const loadData = async () => {
    const [status, queue] = await Promise.all([
      queueAPI.getMyStatus(user.id),
      queueAPI.getActive()
    ]);
    setQueueStatus(status.status);
    setActiveQueue(queue.queue || []);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);
}
```

---

## 🚀 Deployment (Vercel + MongoDB Atlas)

### Backend (Vercel Serverless)

```bash
cd backend
vercel --prod --name e-barker-api
```

**Environment Variables** (Vercel Dashboard):
- `MONGODB_URI` - MongoDB Atlas connection string
- `JWT_SECRET` - JWT signing key
- `GOOGLE_CLIENT_ID` - Google OAuth ID

### Frontend (Vercel Static)

```bash
cd frontend
vercel --prod --name e-barker-app
```

**Environment Variables:**
- `VITE_API_URL` = `https://e-barker-api.vercel.app`

### MongoDB Atlas

- **Free M0 Cluster** - Always free tier
- **Network Access** - Set to `0.0.0.0/0` (allow anywhere)
- **Database User** - Create with read/write permissions

---

## 📚 Documentation

All documentation updated for React version:

| File | Purpose |
|------|---------|
| `README.md` | **This file** - Complete React project docs |
| `DEFENCE_TIPS.md` | Capstone defense guide (React-specific Q&A) |
| `USER_MANUAL.md` | End-user guide for all roles |
| `API_DOCUMENTATION.md` | Complete API reference |
| `PROJECT_SUMMARY.md` | Final completion summary |
| `DEPLOYMENT_GUIDE.md` | Vercel + MongoDB Atlas deployment |

---

## 🎓 Key Concepts for Defense (React Version)

### 1. Why React?
- **Component Reusability** - `useAuth` hook used across all pages
- **State Management** - `useState` for UI updates
- **Side Effects** - `useEffect` for API calls and intervals
- **Declarative UI** - JSX makes UI predictable

### 2. Why Vite over CRA?
- **Faster HMR** - Hot Module Replacement in <50ms
- **Modern Build** - Uses Rollup under the hood
- **Less Config** - Works out of the box with React

### 3. FIFO Algorithm (Still Core)
```javascript
// Backend still uses MongoDB sorting
Queue.find({ status: 'Waiting' }).sort({ checkInTime: 1 });
```

### 4. JWT Authentication (React Hook)
```javascript
const { user, login, logout } = useAuth();
// Available in any component!
```

---

## 🎉 Project Status: COMPLETE (React Version)

✅ **Frontend**: Fully converted to React + Vite + Bootstrap  
✅ **Backend**: MongoDB Atlas with Mongoose ODM  
✅ **Auth**: Custom JWT with `useAuth` hook  
✅ **Routing**: React Router v7 with role protection  
✅ **UI**: Bootstrap 5.3.8 responsive components  
✅ **Deployment**: Ready for Vercel + MongoDB Atlas  
✅ **Documentation**: All files updated for React  

---

**Good luck with your capstone defense! 🎓🚀**  
*You now have a modern React application that demonstrates current industry practices!*
