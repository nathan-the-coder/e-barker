# E-Barker Capstone Defense Tips & Concepts

A comprehensive guide to help you confidently defend your E-Barker Terminal Dispatch System during your capstone presentation.

---

## Table of Contents
1. [System Overview (Your Elevator Pitch)](#system-overview)
2. [Key Concepts to Master](#key-concepts-to-master)
3. [Architecture & Design Decisions](#architecture--design-decisions)
4. [Common Panelist Questions (with Answers)](#common-panelist-questions)
5. [Demo Strategy](#demo-strategy)
6. [Limitations & Future Enhancements](#limitations--future-enhancements)
7. [Technical Deep Dives](#technical-deep-dives)
8. [Presentation Tips](#presentation-tips)

---

## System Overview

### Your 30-Second Elevator Pitch
> "E-Barker is a web-based terminal dispatch management system designed for PUV vans operating in Baggao, Cagayan. It digitizes the traditional 'Barker' system using a First-In-First-Out (FIFO) queue algorithm. The system has three user roles: **Admins** who manage the system, **Dispatchers** who manage the queue and collect fees, and **Drivers** who join queues via mobile interface. Key features include real-time queue updates, automated fee collection tracking (₱10.00 per dispatch), and a recently dispatched buffer for monitoring. The system uses a MERN stack (MongoDB, Express, React, Node.js) with Vite for fast development, and JWT-based authentication with optional Google OAuth login."

### Key Statistics to Mention
- **Queue Algorithm**: FIFO (First-In-First-Out) - ensures fairness
- **Response Time**: Real-time updates every 30 seconds (drivers) / 10 seconds (dispatchers)
- **User Roles**: 3 (Admin, Dispatcher, Driver)
- **Core Collections**: 5 (users, queues, transactions, vehicles, settings)
- **Fee Collection**: Automated ₱10.00 logging on dispatch (configurable via settings)
- **Service Area**: Baggao, Cagayan to Tuguegarao City and other Cagayan destinations

---

## Key Concepts to Master

### 1. FIFO (First-In-First-Out) Algorithm
**What it is**: A queue data structure where the first element added is the first to be removed.

**Why it matters for E-Barker**:
- Ensures fairness - drivers who arrive first get dispatched first
- Prevents favoritism or bribery (common in traditional Barker systems)
- Mathematically proven fair allocation system

**Code Implementation** (`backend/routes/queue.js`):
```javascript
// MongoDB query with Mongoose
const queue = await Queue.find({ status: 'Waiting' })
  .populate('driverId', 'name email')
  .sort({ checkInTime: 1 })  // FIFO: oldest first (ascending)
  .exec();
```
This MongoDB query sorts by `checkInTime` in ascending order, ensuring the oldest entry (first to arrive) is selected first.

**What to say**: *"We implemented FIFO using MongoDB sorting with Mongoose. The `.sort({ checkInTime: 1 })` guarantees O(n log n) sorting efficiency. This eliminates human bias in traditional terminal dispatching."*

---

### 2. MERN Stack Architecture (MongoDB, Express, React, Node.js)

**MongoDB (Database)**:
- `users` collection - stores user credentials and roles
- `queues` collection - manages driver queue states
- `transactions` collection - logs fee collections
- `vehicles` collection - PUV van registry
- `settings` collection - configurable system settings

**React Frontend (View)**:
- React 19 components with Vite for fast development
- Bootstrap 5.3.8 for responsive UI
- Role-based routing with React Router v7
- Custom `useAuth` hook for authentication state

**Express Backend (Controller)**:
- `auth.js` - handles login/register with JWT
- `queue.js` - manages queue operations with FIFO
- `transactions.js` - handles fee logging
- `users.js` - user management (admin only)
- `vehicles.js` - PUV van management

**What to say**: *"We used the MERN stack for modern web development. MongoDB provides flexible schemas with Mongoose ODM, React enables component reusability, and Express handles our REST API efficiently."*

---

### 3. JWT (JSON Web Tokens) Authentication

**How it works**:
1. User logs in with email/password (or Google OAuth)
2. Backend validates credentials
3. Backend generates a signed JWT token (contains user ID, email, role)
4. Frontend stores token in localStorage
5. Token is sent with every API request in the Authorization header
6. Backend middleware verifies token signature and role

**Why JWT over Sessions**:
- **Stateless**: No server-side session storage needed
- **Scalable**: Works across multiple servers (Vercel serverless)
- **Mobile-friendly**: Easy to use with mobile apps
- **Standardized**: Industry-standard token format

**Security features**:
- Tokens expire in 24 hours (configurable in middleware/auth.js)
- Contains non-sensitive data only (no passwords)
- Signed with secret key (prevents tampering)
- Role-based access control (RBAC) middleware

**What to say**: *"We chose JWT over traditional sessions because it's stateless and scalable for serverless deployment on Vercel. The token contains the user role, enabling efficient role-based access control."*

---

### 4. Role-Based Access Control (RBAC)

**Implementation** (`backend/middleware/auth.js`):
```javascript
export const requireRole = (roles) => {
  return async (req, res, next) => {
    if (!roles.includes(req.userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};
```

**Roles**:
- **Admin**: Full system access (user CRUD, vehicle management, reports)
- **Dispatcher**: Can view queue, dispatch drivers, view transactions
- **Driver**: Can only join queue, view own status, complete trips

**Frontend Protection** (`frontend/src/App.jsx`):
```javascript
<Route 
  path="/admin" 
  element={user?.role === 'admin' ? <AdminPage /> : <Navigate to="/" replace />} 
/>
```

**What to say**: *"We implemented RBAC on both backend and frontend. A driver cannot access the dispatcher dashboard even if they know the URL, because both the backend middleware and React Router check their role before processing requests."*

---

### 5. State Management (Queue States)

**Four States**:
1. **Waiting**: Driver is in the queue, waiting to be dispatched
2. **On-trip**: Driver has been dispatched, currently on a trip
3. **Completed**: Trip is finished, driver automatically re-enters queue
4. **Offline**: Driver is inactive (optional state)

**State Transition Logic**:
```
Waiting → On-trip (Dispatcher clicks "Dispatch")
On-trip → Completed (Driver clicks "Complete Trip")
Completed → Waiting (Automatic re-entry via new queue entry)
```

**What to say**: *"The queue state machine ensures no driver can skip the system. They must progress sequentially: Waiting → On-trip → Completed. This prevents drivers from rejoining the queue while on a trip."*

---

## Architecture & Design Decisions

### Why MERN Stack (MongoDB, Express, React, Node.js)?

We chose the MERN stack because:
1. **JavaScript everywhere**: Frontend (React) and backend (Node.js) both use JavaScript
2. **Modern development**: Vite provides lightning-fast HMR (Hot Module Replacement)
3. **Flexible data modeling**: MongoDB with Mongoose allows schema evolution
4. **Component reusability**: React components with hooks (useState, useEffect)
5. **Industry relevance**: MERN is widely used in modern web development

**What to say**: *"We chose MERN stack for consistency (JavaScript full-stack), modern development experience with Vite, and flexible data modeling with MongoDB. React's component architecture makes our UI modular and maintainable."*

---

### Why MongoDB (not MySQL)?

1. **Flexible Schema**: Easy to add fields without migrations
2. **JSON-native**: Data structure matches JavaScript objects
3. **Mongoose ODM**: Provides schema validation and relationships
4. **Cloud-ready**: MongoDB Atlas for serverless deployment on Vercel
5. **Scalable**: Horizontal scaling capabilities for future growth

**What to say**: *"We chose MongoDB with Mongoose ODM for flexible schema design and seamless integration with our Node.js backend. The document model fits our data structure well - users have many queue entries, and transactions reference both users and queue entries."*

---

### Why JWT with Role-Based Access Control (RBAC)?

1. **Stateless authentication**: No server-side session storage needed
2. **Serverless-ready**: Works perfectly with Vercel deployment
3. **Role embedded in token**: Efficient access control without database lookups
4. **Industry standard**: JWT is widely used in modern web APIs
5. **Frontend integration**: Custom `useAuth` hook simplifies auth state management

**What to say**: *"We implemented JWT with RBAC to demonstrate understanding of modern authentication. The token contains the user role, enabling efficient access control. Our custom `useAuth` hook makes authentication seamless across all React components."*

---

## Common Panelist Questions

### Q1: "How do you ensure queue fairness?"
**Answer**: *"We use a FIFO (First-In-First-Out) algorithm implemented via MongoDB sorting by `checkInTime`. The query `Queue.find({ status: 'Waiting' }).sort({ checkInTime: 1 })` guarantees that the driver who checked in first is always dispatched first. This eliminates human bias and ensures mathematical fairness."*

**Follow-up**: "What if two drivers check in at the exact same time?"
**Answer**: *"MongoDB will sort by `checkInTime` and then by `_id` (ObjectId contains timestamp), ensuring deterministic ordering. We also have a unique index on driverId + status to prevent duplicates."*

---

### Q2: "How do you prevent a driver from joining the queue multiple times?"
**Answer**: *"Before allowing a join, we run a duplicate check: `Queue.findOne({ driverId, status: { $in: ['Waiting', 'On-trip'] })`. If a record exists, we reject the join request with a 400 error. This prevents queue manipulation."*

**Code reference** (`backend/routes/queue.js`):
```javascript
const existing = await Queue.findOne({
  driverId: driver_id,
  status: { $in: ['Waiting', 'On-trip'] }
});
if (existing) {
  return res.status(400).json({ error: 'Driver already in queue' });
}
```

---

### Q3: "How do you handle concurrent dispatches? (Race conditions)"
**Answer**: *"We use MongoDB's document-level atomic operations. When dispatching, we use `findByIdAndUpdate` which is atomic. Additionally, we check that the status is 'Waiting' before updating to 'On-trip'. If two dispatchers click simultaneously, only one will succeed because the first update changes the status, and the second will fail the status check."*

---

### Q4: "Why is the fee fixed at ₱10.00? Can it be changed?"
**Answer**: *"The fee is configurable via the `settings` collection in MongoDB. In `backend/routes/queue.js`, we fetch the fee with `Setting.findOne({ key: 'terminal_fee' })`. If not found, it defaults to ₱10.00. An admin can update this via the settings API. This demonstrates dynamic configuration vs hardcoded values."*

---

### Q5: "How do you handle offline scenarios? What if the internet disconnects?"
**Answer**: *"The current system requires an internet connection as it's a web application. However, we could implement offline support using:
1. Service Workers for caching static assets
2. IndexedDB for local queue state
3. Background Sync API to sync changes when connection returns
This was out of scope for the capstone but is a valid future enhancement."*

---

### Q6: "How do you secure the system against common attacks?"
**Answer**: *"We implemented several security measures:
1. **Password hashing**: Using bcryptjs with salt rounds (not plain text)
2. **JWT signatures**: Tokens are signed with a secret key to prevent tampering
3. **Input validation**: All inputs are validated on both frontend and backend
4. **NoSQL injection protection**: Mongoose ODM provides schema validation
5. **CORS**: Configured to only allow requests from the frontend origin
6. **Role checks**: Backend middleware (`requireRole`) verifies user role for every protected endpoint
7. **Token expiration**: JWT tokens expire in 24 hours"*

---

### Q7: "Can you explain the recently dispatched buffer?"
**Answer**: *"The recently dispatched buffer shows the last 5 drivers who were dispatched (status = 'On-trip'). It uses: `Queue.find({ status: 'On-trip' }).sort({ dispatchTime: -1 }).limit(5)`. This helps dispatchers monitor active trips and estimate when drivers will return."*

**What to demonstrate**: Show the "Recently Dispatched" section on the dispatcher dashboard in `frontend/src/pages/DispatcherDashboard.jsx`.

---

### Q8: "How would you scale this system for multiple terminals?"
**Answer**: *"Currently, the system serves one terminal. To scale:
1. Add a `terminalId` field to the `queues` and `transactions` collections
2. Modify queries to filter by terminal: `{ terminalId: terminalId }`
3. Deploy multiple backend instances on Vercel (serverless auto-scales)
4. Use MongoDB Atlas for database scaling
5. Consider Redis for caching queue states (if needed)"*

---

### Q9: "Why did you use React + Bootstrap instead of vanilla JS or other frameworks?"
**Answer**: *"React provides:
1. **Component reusability**: `useAuth` hook used across all pages
2. **State management**: `useState` and `useEffect` for reactive UI updates
3. **Declarative UI**: JSX makes UI predictable and easier to debug
4. **Vite**: Lightning-fast development with HMR (<50ms updates)
5. **Bootstrap 5**: Rapid development with responsive, mobile-first components
We customized it with `style.css` for project-specific styling."*

---

### Q10: "How do you test your system?"
**Answer**: *"We tested through:
1. **Manual testing**: Registering users, joining queues, dispatching
2. **API testing**: Using tools like Postman/curl to test endpoints
3. **Browser testing**: Chrome DevTools for React debugging
4. **Database verification**: Checking MongoDB Atlas directly to verify data integrity
5. **Vercel deployment**: Testing in production-like environment
For a production system, we'd add unit tests (Jest), integration tests, and end-to-end tests (Cypress)."*

---

## Demo Strategy

### 1. Prepare Demo Data
Use MongoDB Atlas or local MongoDB. Optionally seed with:
```javascript
// In MongoDB shell or Compass
use e_barker
db.users.insertMany([...]) // Add test users
```

### 2. Recommended Demo Flow (10-15 minutes)

**Introduction (2 mins)**:
- Show the problem: Traditional Barker system issues (favoritism, no records)
- Present solution: E-Barker digital system with MERN stack

**Live Demo (8 mins)**:

1. **Open Landing Page** (`http://localhost:5173/`)
   - Show features section
   - Click "Get Started" → Login page

2. **Register as Driver**
   - Fill registration form
   - Show role selection (driver vs dispatcher vs admin)
   - Submit → Redirect to driver portal

3. **Driver Portal** (`/driver`)
   - Click "Join Queue"
   - Show position in queue (real-time updates)
   - Open new tab as Dispatcher

4. **Dispatcher Dashboard** (`/dashboard`)
   - Show FIFO queue (driver appears in order)
   - Click "DISPATCH NOW"
   - Show fee update (₱10.00 logged, configurable)
   - Show "Recently Dispatched" buffer (last 5)

5. **Admin Panel** (`/admin`)
   - Show user management
   - Show tricycle registry
   - Show settings configuration

6. **Complete the Loop**
   - Back to Driver tab
   - Show status changed to "On Trip"
   - Click "Complete Trip"
   - Show driver automatically re-enters queue

**Conclusion (2 mins)**:
- Highlight fairness (FIFO with MongoDB sorting)
- Show automated fee collection with configurable settings
- Mention real-time updates with React state management
- Show role-based access control (RBAC)

---

### 3. Backup Plan (If Internet/System Fails)
1. **Screenshots/video**: Record a demo video beforehand
2. **Slide deck**: Show code snippets and architecture diagrams
3. **Explain concepts**: Walk through the FIFO algorithm on whiteboard
4. **Show database**: Open MongoDB Atlas and show collections
5. **Show code**: Highlight key files like `backend/routes/queue.js` and `frontend/src/App.jsx`

---

## Limitations & Future Enhancements

### Current Limitations (Be Honest!)

1. **Single Terminal**: Only supports one terminal location
   - *Enhancement*: Add multi-terminal support with `terminalId` field

2. **No Offline Mode**: Requires constant internet
   - *Enhancement*: Implement Service Workers + IndexedDB sync

3. **Basic UI**: Functional but not polished
   - *Enhancement*: Add animations, better notifications, sound alerts

4. **No SMS/Email Notifications**: Drivers must check manually
   - *Enhancement*: Integrate Twilio/SendGrid for automated notifications

5. **Simple Fee Structure**: Only ₱10.00 flat rate (but configurable!)
   - *Enhancement*: Dynamic pricing based on time of day/distance

6. **No Analytics Dashboard**: Limited reporting
   - *Enhancement*: Add Chart.js charts for daily/weekly/monthly reports (already in `/reports` page!)

7. **No Native Mobile App**: Web-only (responsive but not native)
   - *Enhancement*: Build React Native or Flutter mobile app

---

### Future Enhancements (Show Vision!)

1. **GPS Integration**: Track driver locations in real-time (Google Maps API already integrated in `/maps` page)
2. **Cashless Payments**: Integrate GCash/Maya for fee payment
3. **AI Demand Prediction**: Predict peak hours and adjust queue management
4. **Multi-language Support**: Tagalog/Cebuano for drivers
5. **Enhanced Admin Panel**: Super-admin to manage terminals, users, fees (already exists at `/admin`)
6. **Audit Logs**: Track all system actions for accountability
7. **API Documentation**: Swagger/OpenAPI for third-party integrations
8. **Real-time Updates**: WebSocket/Socket.io for instant queue updates (currently polling every 30s)

**What to say**: *"While the current system fulfills the capstone requirements with MERN stack, we've identified several enhancements for future iterations, including GPS tracking, cashless payments, and real-time WebSocket updates."*

---

## Technical Deep Dives

### Database Schema Explanation (MongoDB + Mongoose)

```javascript
// User Model (backend/models/User.js)
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  name: { type: String, required: true },
  phone: String,
  role: { type: String, enum: ['admin', 'dispatcher', 'driver'], default: 'driver' },
  googleId: String,
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' }
}, { timestamps: true });

// Queue Model (backend/models/Queue.js)
const queueSchema = new mongoose.Schema({
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  currentLocation: String,
  destination: String,
  checkInTime: { type: Date, default: Date.now },
  dispatchTime: Date,
  estimatedArrivalTime: Number,
  completedTime: Date,
  status: { type: String, enum: ['Waiting', 'On-trip', 'Completed', 'Offline'], default: 'Waiting' },
  dispatcherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Transaction Model (backend/models/Transaction.js)
const transactionSchema = new mongoose.Schema({
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  queueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Queue' },
  dispatcherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  feeAmount: { type: Number, default: 10.00 },
  feeType: { type: String, default: 'terminal_fee' }
}, { timestamps: true });
```

**Key Relationships** (using Mongoose populate):
- One user can have many queue entries (1:N) - populated via `driverId`
- One queue entry generates one transaction (1:1) - linked via `queueId`
- One user can have one vehicle (1:1) - linked via `vehicleId`

---

### API Endpoint Reference

**Authentication** (no auth required):
- `POST /api/auth/register` - Create new user
- `POST /api/auth/login` - Email/password login
- `POST /api/auth/google` - Google OAuth login
- `GET /api/auth/me` - Get current user (requires JWT)

**Queue Management** (JWT + role required):
- `GET /api/queue/active` - Get waiting queue (FIFO order) - dispatcher/admin
- `GET /api/queue/recent` - Get last 5 dispatched - dispatcher/admin
- `GET /api/queue/my-status?driver_id=X` - Driver checks own status - driver
- `POST /api/queue/join` - Driver joins queue - driver only
- `POST /api/queue/dispatch/:id` - Dispatcher dispatches driver - dispatcher/admin
- `POST /api/queue/complete/:id` - Driver completes trip - driver only
- `GET /api/queue/history` - Queue history with filters - dispatcher/admin
- `GET /api/queue/stats` - Queue statistics - dispatcher/admin
- `GET /api/queue/traffic` - Google Maps traffic data - dispatcher/admin

**Transactions** (JWT + role required):
- `GET /api/transactions/today` - Get today's collections - dispatcher/admin
- `GET /api/transactions?date=YYYY-MM-DD` - Get by date - dispatcher/admin
- `GET /api/transactions/range` - Get by date range - dispatcher/admin

**Users** (JWT + role required):
- `GET /api/users` - List all users - dispatcher/admin
- `GET /api/users/:id` - Get single user - dispatcher/admin
- `POST /api/users` - Create user - admin only
- `PUT /api/users/:id` - Update user - admin only
- `DELETE /api/users/:id` - Deactivate user - admin only

**Vehicles** (JWT required):
- `GET /api/vehicles` - List all PUV vans - all roles
- `POST /api/vehicles` - Add vehicle - admin only
- `PUT /api/vehicles/:id` - Update vehicle - admin only
- `POST /api/vehicles/:id/assign` - Assign to driver - admin/dispatcher

**Settings** (JWT required):
- `GET /api/settings` - Get all settings - all roles
- `PUT /api/settings/:key` - Update setting - admin only

---

## Presentation Tips

### Do's ✅
1. **Practice your demo** - Run through it 5+ times
2. **Know your code** - Be able to open any file and explain it
3. **Use diagrams** - Draw the FIFO flow on whiteboard
4. **Show enthusiasm** - You built this, be proud!
5. **Be honest about limitations** - Panelists respect honesty
6. **Prepare for "What if" questions** - Think about edge cases
7. **Have backup slides** - Code snippets, database schema, API docs

### Don'ts ❌
1. **Don't read from slides** - Speak naturally
2. **Don't rush the demo** - Explain each step
3. **Don't pretend to know something you don't** - Say "I'll research that"
4. **Don't blame tools/technologies** - Take responsibility
5. **Don't exceed time limit** - Practice with a timer
6. **Don't panic if demo fails** - Have backup plan ready
7. **Don't argue with panelists** - Listen and acknowledge

### Body Language
- **Eye contact**: Look at panelists, not just the screen
- **Confident posture**: Stand/sit straight
- **Hand gestures**: Use hands to emphasize points
- **Smile**: Shows confidence and enthusiasm

### Handling Difficult Questions
**If you don't know the answer**:
> *"That's an excellent question. In the current implementation, we haven't addressed that specific scenario. However, I would approach it by [explain your thought process]. I'll definitely research this further."*

**If they challenge your design choice**:
> *"That's a valid point. We considered that approach, but chose [your approach] because [your reasoning]. However, your suggestion of [their approach] has merits, particularly for [use case]."*

---

## Key Files to Bookmark (Quick Reference)

| File | Purpose | Key Concept |
|------|---------|-------------|
| `backend/routes/queue.js` | Queue logic | FIFO MongoDB query |
| `backend/routes/auth.js` | Authentication | JWT generation |
| `backend/middleware/auth.js` | Security | Role-based access (RBAC) |
| `frontend/src/pages/DriverPage.jsx` | Driver logic | Queue joining |
| `frontend/src/pages/DispatcherDashboard.jsx` | Dashboard logic | Real-time updates |
| `frontend/src/hooks/useAuth.jsx` | Auth hook | React auth state |
| `backend/models/Queue.js` | Database | Mongoose schema |
| `frontend/src/utils/api.js` | API calls | Frontend-backend bridge |

---

## Final Checklist Before Defense

- [ ] System runs without errors (`node backend/index.js` + `pnpm dev:frontend`)
- [ ] MongoDB Atlas connected (or local MongoDB running)
- [ ] Demo script practiced 5+ times
- [ ] Backup screenshots/video prepared
- [ ] Code printed/highlighted for quick reference
- [ ] Known limitations memorized
- [ ] Future enhancements list ready
- [ ] Business cards/resume ready (if allowed)
- [ ] Dressed professionally
- [ ] Arrived 30 minutes early
- [ ] Tested auth flow (register, login, role-based redirect)
- [ ] Verified all protected routes return 401 without token

---

## Sample Defense Script (15-minute version)

**[0:00-2:00] Introduction**
"Good morning/afternoon panelists. I'm [Name], and I'll be presenting E-Barker, a web-based terminal dispatch management system. 

[Show landing page]
Traditional Barker systems in the Philippines rely on human discretion, which can lead to favoritism and lack of transparency. E-Barker digitizes this process using a FIFO queue algorithm, ensuring fairness and accountability.

The system serves two user types: Dispatchers who manage the queue, and Drivers who join queues via mobile. Key features include real-time queue updates, automated fee collection, and role-based access control."

**[2:00-5:00] Architecture Overview**
[Show system design diagram or draw on whiteboard]
"We used a three-tier architecture: Frontend using vanilla JavaScript and Bootstrap, Backend with Node.js and Express, and MySQL database.

[Open backend/routes/queue.js]
The core of our system is the FIFO algorithm. When retrieving the active queue, we use this SQL query..."

**[5:00-12:00] Live Demo**
[Run through demo flow - see Demo Strategy section]

**[12:00-14:00] Technical Decisions**
"One question that often comes up is why we chose JWT over sessions or Firebase Auth. [Explain JWT benefits]

Another key decision was using MySQL for ACID compliance, especially important for financial transactions."

**[14:00-15:00] Conclusion**
"To summarize, E-Barker successfully digitizes terminal dispatch operations with:
- FIFO fairness algorithm
- Automated fee collection (₱10.00 per dispatch)
- Role-based security
- Real-time updates

Limitations include single-terminal support and no offline mode, but future enhancements like GPS tracking and cashless payments are planned.

Thank you, and I'm ready for your questions."

---

**Good luck with your defense! Remember: You built this system, you know it better than anyone else in the room. Be confident! 🚀**
