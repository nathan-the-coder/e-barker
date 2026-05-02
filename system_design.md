The system design for E-Barker translates the functional needs of a tricycle terminal into a structured technical architecture. Below is the detailed design covering the architectural pattern, data flow, and interface logic.

## 1. Architectural Pattern: MERN Stack (MongoDB, Express, React, Node.js)

The system follows a modern MERN stack architecture:

* **Model (Database)**: MongoDB with Mongoose ODM handles persistent storage of drivers, queue positions, and money logs.
* **View (User Interface)**: React 19 + Vite with Bootstrap 5 components that change based on who is logged in (Dispatcher vs. Driver).
* **Controller (Logic)**: Express.js routes (queue.js, auth.js, etc.) that process actions and update the Model.
* **Authentication**: JWT (JSON Web Tokens) with role-based access control (RBAC).

------------------------------
## 2. System Sequence Diagram (The Logic Flow)

### Driver Check-in:
* Driver → Clicks "Join Queue" on Mobile Web App.
* System → Validates if Driver is already Waiting or On-trip.
* Database → Creates new record in queue with current timestamp.
* System → Returns queue position to driver.

### Dispatching:
* Dispatcher → Views Dashboard (auto-sorted by checkInTime - FIFO).
* System → Identifies the "First-In" driver.
* Dispatcher → Clicks "Dispatch".
* Database → 1. Updates queue.status to On-trip. 2. Inserts ₱10.00 (configurable) into transactions.

### Completion:
* Driver → Returns to terminal and clicks "Complete Trip".
* Database → Sets previous trip to Completed and automatically adds a new Waiting entry at the end of the line.

------------------------------
## 3. Data Dictionary (Entity Details)

| Entity | Attribute | Data Type | Description |
|---|---|---|---|
| User | role | String (ENUM) | Determines if the user sees the Admin/Dispatcher UI or the Driver UI. |
| Queue | checkInTime | Date | The key for FIFO logic; determines the queue rank. |
| Queue | status | String (ENUM) | Waiting, On-trip, Completed, or Offline. |
| Transaction | feeAmount | Decimal | Standardized terminal fee (default: ₱10.00). |

------------------------------
## 4. Component Design: The FIFO Algorithm (The "Brain")

The core "intelligence" of the system ensures fairness using MongoDB sorting:

```javascript
// Backend: Queue.find({ status: 'Waiting' }).sort({ checkInTime: 1 })
// Frontend: Queue displayed in FIFO order automatically
```

### The "Recently Dispatched" Buffer
The system maintains a buffer showing the last 5 dispatched drivers:

```javascript
Queue.find({ status: 'On-trip' }).sort({ dispatchTime: -1 }).limit(5)
```

------------------------------
## 5. Security & Validation Design

* **JWT Authentication**: Upon login, a signed JWT token is stored in localStorage. The token contains userId, email, and role.
* **Role-Based Access Control (RBAC)**: Backend middleware (`requireRole`) checks user role before processing requests. If a Driver tries to access the Dispatcher dashboard API, they receive a 403 Forbidden error.
* **Duplicate Prevention**: Before allowing "Join Queue," the system checks: `Queue.findOne({ driverId, status: { $in: ['Waiting', 'On-trip'] } })`.
* **Password Security**: Passwords are hashed using bcrypt with salt rounds before storage.
* **Input Validation**: All inputs are validated on both frontend and backend.

------------------------------
## 6. Visual Workflow (State Diagram)

**Waiting → On-trip → Completed → Waiting (auto-reentry)**

This lifecycle ensures that no driver can bypass the system; they must progress sequentially through each state before re-entering the queue.

------------------------------
## 7. Technology Stack Summary

| Component | Technology | Purpose |
|---|---|---|
| Frontend | React 19 + Vite | User interface and SPA routing |
| UI Framework | Bootstrap 5.3.8 | Responsive design |
| State Management | React Hooks (useState, useEffect) | Component state |
| Backend | Node.js + Express | REST API server |
| Database | MongoDB Atlas | Cloud NoSQL database |
| ODM | Mongoose | Schema-based data modeling |
| Auth | JWT + bcryptjs | Secure authentication |
| Charts | Chart.js | Financial reports visualization |
| Deployment | Vercel | Serverless deployment |

