# E-Barker Modification Guide

A beginner-friendly guide to understanding and modifying the E-Barker Terminal Dispatch System.

## Table of Contents
1. [Understanding the System](#understanding-the-system)
2. [Project Structure Overview](#project-structure-overview)
3. [How Data Flows Through the System](#how-data-flows-through-the-system)
4. [Common Modifications](#common-modifications)
5. [Adding New Features](#adding-new-features)
6. [Troubleshooting](#troubleshooting)

---

## Understanding the System

### What is E-Barker?
E-Barker is a web application that manages tricycle/jeepney terminal queues. Think of it like a digital line management system at a bus station.

**Key Concepts:**
- **Queue**: A line of drivers waiting to get passengers
- **FIFO**: First In, First Out - the first driver to join the queue is the first to be dispatched
- **Dispatch**: Sending a driver off with passengers
- **Roles**: Dispatchers (manage the queue) and Drivers (join the queue)

### The System Design in Simple Terms

```
[Driver Clicks "Join Queue"]
        ↓
[Frontend sends request to Backend]
        ↓
[Backend saves to Database]
        ↓
[Dispatcher sees updated queue on Dashboard]
        ↓
[Dispatcher clicks "Dispatch"]
        ↓
[Backend updates status + logs ₱10 fee]
        ↓
[Driver status changes to "On Trip"]
```

---

## Project Structure Overview

```
e-barker/
├── backend/                 # The "brain" - handles data and logic
│   ├── index.js            # Server entry point (starts the API)
│   ├── config/
│   │   └── database.js    # Database connection settings
│   ├── routes/            # API endpoints (URLs your frontend calls)
│   │   ├── auth.js        # Login/role management
│   │   ├── queue.js       # Queue operations (join, dispatch, complete)
│   │   └── transactions.js # Fee collection records
│   ├── middleware/
│   │   └── auth.js        # Security checks
│   └── database/
│       └── schema.sql     # Database structure (tables)
│
└── frontend/               # What users see in their browser
    ├── index.html         # Landing page (home page)
    ├── login.html         # Login/register page
    ├── driver.html        # Driver's mobile interface
    ├── dispatcher_dashboard.html  # Dispatcher's control panel
    └── src/
        ├── main.js        # Landing page logic
        ├── login.js       # Login handling
        ├── driver.js      # Driver page logic
        ├── dispatcher.js  # Dashboard logic
        ├── auth.js        # Firebase authentication wrapper
        ├── api.js         # Backend API communication
        └── assets/
            └── css/
                └── style.css  # Custom styles
```

### Quick Reference: Which file does what?

| I want to change... | Edit this file... |
|---------------------|-------------------|
| Landing page content | `frontend/index.html` |
| Login page appearance | `frontend/login.html` |
| Driver page layout | `frontend/driver.html` |
| Dashboard layout | `frontend/dispatcher_dashboard.html` |
| How driver page works | `frontend/src/driver.js` |
| How dashboard works | `frontend/src/dispatcher.js` |
| Colors/styling | `frontend/src/assets/css/style.css` |
| API endpoints | `backend/routes/*.js` |
| Database structure | `backend/database/schema.sql` |
| Queue logic | `backend/routes/queue.js` |

---

## How Data Flows Through the System

### Example: Driver Joins Queue

1. **Driver clicks "Join Queue"** on `driver.html`
2. **JavaScript in `driver.js`** catches the click:
   ```javascript
   document.getElementById('join-queue-btn').addEventListener('click', async () => {
     await queueAPI.join(driverId);  // Send to backend
   });
   ```
3. **`api.js`** sends HTTP request to backend:
   ```javascript
   join: (driverId) => apiRequest('/queue/join', {
     method: 'POST',
     body: JSON.stringify({ driver_id: driverId })
   })
   ```
4. **Backend `queue.js`** receives the request:
   ```javascript
   router.post('/join', async (req, res) => {
     // Check if driver already in queue
     // Insert new record into database
     // Send back success response
   });
   ```
5. **Database** stores the new queue entry
6. **Response** goes back to frontend → Driver sees updated status

### Visual Flow Diagram

```
Browser (Frontend)  →  HTTP Request  →  Backend API  →  Database
     ↑                                           ↓
     └────────────── HTTP Response ←────────────────┘
```

---

## Common Modifications

### 1. Change the Terminal Fee (currently ₱10.00)

**Step 1**: Open `backend/routes/queue.js`
**Step 2**: Find the `dispatch` function (around line 83)
**Step 3**: Change this line:
```javascript
await pool.query(
  'INSERT INTO transactions (driver_id, queue_id, fee_amount) VALUES (?, ?, ?)',
  [queueEntry[0].driver_id, id, 10.00]  // ← Change 10.00 to your amount
);
```
To:
```javascript
await pool.query(
  'INSERT INTO transactions (driver_id, queue_id, fee_amount) VALUES (?, ?, ?)',
  [queueEntry[0].driver_id, id, 15.00]  // ← New fee is ₱15
);
```

**Step 4**: Restart the backend (`Ctrl+C` then `node index.js`)

---

### 2. Add a New Field to the Queue (e.g., Tricycle Plate Number)

**Step 1**: Update database schema in `backend/database/schema.sql`:
```sql
CREATE TABLE IF NOT EXISTS queue (
    id INT PRIMARY KEY AUTO_INCREMENT,
    driver_id INT NOT NULL,
    plate_number VARCHAR(20),  -- ← Add this new line
    check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- ... rest of fields
);
```

**Step 2**: Apply changes to database:
```bash
mysql -u root -p e_barker < backend/database/schema.sql
```

**Step 3**: Update backend to accept the new field in `backend/routes/queue.js`:
```javascript
router.post('/join', async (req, res) => {
  const { driver_id, plate_number } = req.body;  // ← Add plate_number
  
  // Update query to include plate_number
  const [result] = await pool.query(
    'INSERT INTO queue (driver_id, plate_number, status) VALUES (?, ?, ?)',
    [driver_id, plate_number, 'waiting']  // ← Add plate_number
  );
});
```

**Step 4**: Update frontend `driver.html` to include plate number input:
```html
<div class="mb-3">
  <label class="form-label">Plate Number</label>
  <input type="text" class="form-control" id="plate-number">
</div>
```

**Step 5**: Update `frontend/src/driver.js` to send the new field:
```javascript
document.getElementById('join-queue-btn').addEventListener('click', async () => {
  const plateNumber = document.getElementById('plate-number').value;
  await queueAPI.join(driverId, plateNumber);  // Update API call
});
```

---

### 3. Change Colors/Theme

**Option A**: Change Bootstrap theme (easy!)
1. Open any HTML file (e.g., `frontend/index.html`)
2. Find the Bootstrap CDN link:
   ```html
   <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootswatch@5.3.8/dist/yeti/bootstrap.min.css" />
   ```
3. Replace `yeti` with any Bootswatch theme: `cerulean`, `cosmo`, `cyborg`, `darkly`, `flatly`, `journal`, `litera`, `lumen`, `lux`, `materia`, `minty`, `morph`, `pulse`, `quartz`, `sandstone`, `simplex`, `sketchy`, `slate`, `solar`, `spacelab`, `superhero`, `united`, `vapor`, `yeti`, `zephyr`

**Option B**: Add custom CSS in `frontend/src/assets/css/style.css`:
```css
/* Change primary color */
.btn-primary {
  background-color: #ff0000;  /* Red buttons */
  border-color: #ff0000;
}

/* Change navbar color */
.navbar-dark {
  background-color: #333 !important;
}
```

---

### 4. Add a New Page (e.g., Admin Reports)

**Step 1**: Create new HTML file `frontend/admin.html`:
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Admin - E-Barker</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootswatch@5.3.8/dist/yeti/bootstrap.min.css" />
</head>
<body>
  <nav class="navbar navbar-dark bg-dark">
    <div class="container">
      <a class="navbar-brand" href="/">E-Barker</a>
    </div>
  </nav>
  <div class="container mt-4">
    <h1>Admin Reports</h1>
    <!-- Your content here -->
  </div>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
```

**Step 2**: Create JavaScript file `frontend/src/admin.js` (if needed)

**Step 3**: Add backend API endpoint in `backend/routes/transactions.js`:
```javascript
// Get monthly report
router.get('/monthly', async (req, res) => {
  const { month, year } = req.query;
  // Query database for monthly data
  // Send response
});
```

**Step 4**: Add link to the page in navigation (e.g., in `index.html`)

---

### 5. Add Role-Based Access (Only Dispatchers Can Access Certain Pages)

**Already implemented!** But here's how it works:

In `frontend/src/login.js`:
```javascript
if (data.user.role === 'dispatcher') {
  window.location.href = '/dispatcher_dashboard.html';
} else {
  window.location.href = '/driver.html';
}
```

To add a new role (e.g., "admin"):

**Step 1**: Update database enum in `backend/database/schema.sql`:
```sql
role ENUM('dispatcher', 'driver', 'admin') DEFAULT 'driver',
```

**Step 2**: Update login.js redirect logic:
```javascript
if (data.user.role === 'admin') {
  window.location.href = '/admin.html';
} else if (data.user.role === 'dispatcher') {
  window.location.href = '/dispatcher_dashboard.html';
} else {
  window.location.href = '/driver.html';
}
```

---

## Adding New Features

### Example: Send SMS Notification When Dispatched

**Step 1**: Choose an SMS provider (e.g., Twilio, Semaphore)

**Step 2**: Install the package:
```bash
cd backend
pnpm add twilio
```

**Step 3**: Add SMS logic to `backend/routes/queue.js` in the `dispatch` function:
```javascript
import twilio from 'twilio';

router.post('/dispatch/:id', async (req, res) => {
  // ... existing dispatch logic ...

  // Send SMS to driver
  const client = twilio(accountSid, authToken);
  await client.messages.create({
    body: 'You have been dispatched! Please proceed to your tricycle.',
    to: driverPhoneNumber,
    from: '+1234567890'
  });

  // ... rest of the logic
});
```

**Step 4**: Store driver phone numbers in the database (add column to users table)

---

### Example: Add Search Functionality to Queue

**Step 1**: Add search input to `dispatcher_dashboard.html`:
```html
<input type="text" class="form-control" id="search-input" placeholder="Search by name or body #">
```

**Step 2**: Update `frontend/src/dispatcher.js` to filter queue:
```javascript
document.getElementById('search-input').addEventListener('input', (e) => {
  const searchTerm = e.target.value.toLowerCase();
  const filteredQueue = queueData.filter(entry => 
    entry.driver_name.toLowerCase().includes(searchTerm) ||
    entry.driver_id.toString().includes(searchTerm)
  );
  displayQueue(filteredQueue);  // Update display function
});
```

---

## Troubleshooting

### "Cannot connect to backend" / API requests fail

**Check:**
1. Is backend running? Run `cd backend && node index.js`
2. Check console for errors: `console.log('Backend started on port', PORT);`
3. Is frontend calling correct URL? Check `frontend/src/api.js`:
   ```javascript
   const API_BASE_URL = 'http://localhost:3000/api';  // ← Must match backend port
   ```

### "Firebase not initialized" / Login not working

**Check:**
1. Did you update `frontend/src/firebase-config.js` with your Firebase project credentials?
2. Open browser console (F12) → Check for errors
3. Verify Firebase project has Authentication enabled with Email/Password and Google

### Database connection errors

**Check:**
1. Is MySQL running? `sudo systemctl status mysql`
2. Check `.env` file in backend has correct credentials:
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=e_barker
   ```
3. Can you connect manually? `mysql -u root -p e_barker`

### Changes not showing up

**Try:**
1. Hard refresh browser: `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)
2. Restart frontend dev server: `Ctrl+C` then `pnpm dev`
3. Restart backend: `Ctrl+C` then `node index.js`
4. Clear browser cache

### "CORS error" in console

**Fix:** Backend already has CORS enabled. If still having issues, check `backend/index.js`:
```javascript
import cors from 'cors';
app.use(cors());  // ← This allows frontend to call backend
```

---

## Quick Reference: Common Tasks

### Change how often dashboard refreshes
Edit `frontend/src/dispatcher.js`, find:
```javascript
setInterval(() => {
  loadActiveQueue();
  loadRecentDispatches();
}, 10000);  // ← Change 10000 (milliseconds) to desired interval
```

### Change how many "recently dispatched" to show
Edit `backend/routes/queue.js`, find:
```javascript
LIMIT 5  // ← Change to desired number
```

### Add a new API endpoint
1. Create route in appropriate file in `backend/routes/`
2. Add function in `frontend/src/api.js`
3. Call it from your frontend JavaScript

### Modify database
1. Edit `backend/database/schema.sql`
2. Run: `mysql -u root -p e_barker < backend/database/schema.sql`
3. Update backend routes to use new fields

---

## Getting Help

1. **Check browser console** (F12) for JavaScript errors
2. **Check backend terminal** for server errors
3. **Check Network tab** (F12 → Network) to see API requests/responses
4. **Read error messages carefully** - they usually tell you exactly what's wrong

### Useful Commands

```bash
# Check if backend is running
curl http://localhost:3000/api/health

# Check MySQL is running
mysql -u root -p -e "USE e_barker; SHOW TABLES;"

# View backend logs
cd backend && node index.js

# View frontend in browser
cd frontend && pnpm dev
```

---

## Summary

- **Frontend** (HTML/JS): What users see and interact with
- **Backend** (Node.js): Handles logic and talks to database
- **Database** (MySQL): Stores all the data
- **API**: The bridge between frontend and backend

When modifying:
1. Identify which part you need to change
2. Make the change
3. Test it
4. Repeat

Remember: Small changes, test often!
