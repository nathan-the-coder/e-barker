# E-Barker User Manual

A comprehensive guide for using the E-Barker Digital Dispatching & Terminal Fee Monitoring System.

---

## Table of Contents
1. [Getting Started](#getting-started)
2. [For Dispatchers](#for-dispatchers)
3. [For Drivers](#for-drivers)
4. [For Admins (TODA Officers)](#for-admins)
5. [Common Tasks](#common-tasks)
6. [Troubleshooting](#troubleshooting)

---

## Getting Started

### System Requirements
- **Device**: Smartphone, tablet, or computer with internet access
- **Browser**: Chrome, Firefox, Safari, or Edge (latest version)
- **Internet**: Stable connection required

### Accessing the System
1. Open your web browser
2. Navigate to: `http://your-terminal-domain.com` (or `http://localhost:5173` for development)
3. You'll see the E-Barker landing page

### First-Time Login
- Contact your TODA officer to get your account credentials
- Use the credentials provided to log in at `/login.html`
- Change your password after first login (recommended)

---

## For Dispatchers

### Dashboard Overview

When you log in as a Dispatcher, you'll see the **Dispatcher Dashboard** with:

1. **Stats Card (Top-Left)**: Shows today's collected terminal fees (e.g., "₱450.00")
2. **System Actions (Middle-Left)**: 
   - "Register New Trip" button (for manual trip registration)
   - "View Full Log" button (redirects to reports)
3. **Recently Dispatched (Bottom-Left)**: Shows last 5 dispatched drivers
4. **Active Queue (Right Side)**: Lists all waiting drivers in FIFO order

### Dispatching a Driver

**Step-by-Step:**

1. **Wait for a passenger** to arrive at the terminal
2. **Look at the "Active Queue" section** - the driver at the top with "NEXT IN LINE" badge is first in line
3. **Click "DISPATCH NOW"** button next to that driver
4. **Confirm the dispatch** in the popup dialog
5. **System automatically**:
   - Changes driver status to "On-Trip"
   - Logs ₱10.00 (or configured amount) to transactions
   - Updates the "Recently Dispatched" buffer
   - Updates today's total collections

**Example:**
```
Passenger arrives → You click "DISPATCH NOW" on Ricardo Dalisay (NEXT IN LINE)
→ System logs ₱10.00 fee → Ricardo's status changes to "On-Trip"
```

### Monitoring Active Trips

- The **"Recently Dispatched"** section shows drivers currently on trips
- Drivers automatically re-enter the queue when they return and click "Complete Trip"
- You can see their dispatch time to estimate return

### Viewing Financial Reports

1. Click **"View Full Log"** on the dashboard
2. Or navigate to `/reports.html`
3. Select date range (start and end date)
4. Click **"Apply Filter"**
5. View:
   - **Total Collections** card (top-right)
   - **Daily Collections** chart (bar graph)
   - **Queue Statistics** chart (doughnut chart)
   - **Transaction History** table (detailed list)

### Registering a New Trip (Manual)

If a driver doesn't use the mobile check-in:

1. Click **"Register New Trip"** on the dashboard
2. *[Feature to be fully implemented - currently shows alert]*

---

## For Drivers

### Accessing the Driver Portal

1. Login with your credentials at `/login.html`
2. You'll be automatically redirected to `/driver.html` (Driver Portal)

### Checking In (Joining the Queue)

**When you arrive at the terminal:**

1. Open E-Barker on your smartphone
2. Login with your credentials
3. Click **"Join Queue"** button
4. **System will**:
   - Add you to the queue with current timestamp
   - Show your position (e.g., "3rd in line")
   - Display your check-in time
   - Change your status to "Waiting"

**Note:** You cannot join the queue if you're already waiting or on a trip!

### Monitoring Your Position

After joining the queue, you'll see:

- **"Position in queue: X"** - Your place in line
- **"Checked in: HH:MM:SS"** - When you joined
- Your status: **"Waiting in queue"**

### When Dispatched

**When the dispatcher clicks "Dispatch" for you:**

1. Your status changes to **"On Trip"**
2. You'll see an alert: "You are on a trip!"
3. Proceed with your passengers to the destination
4. **Remember:** You must return to the terminal to complete the trip!

### Completing a Trip

**When you return to the terminal:**

1. Open E-Barker on your smartphone
2. You'll see the **"Complete Trip"** button (status = "On Trip")
3. Click **"Complete Trip"**
4. **System automatically**:
   - Changes your status to "Completed"
   - Re-enters you at the **bottom of the queue** (new "Waiting" entry)
   - Updates your position in line

### Example Driver Workflow

```
1. Arrive at terminal → Click "Join Queue" → Status: "Waiting" (Position: 3rd)
2. Wait... (passenger arrives, dispatcher clicks dispatch)
3. Status changes to "On Trip" → Drive passengers to destination
4. Return to terminal → Click "Complete Trip"
5. Status: "Waiting" (re-entered at bottom, Position: 5th)
```

---

## For Admins (TODA Officers)

### Accessing the Admin Panel

1. Login with your Admin credentials at `/login.html`
2. You'll be redirected to `/admin.html`

### Managing Drivers

**Viewing All Drivers:**
- The "Drivers" tab shows all registered drivers
- See their name, username, assigned body number, and contact info

**Adding a New Driver:**
1. Click **"Add New Driver"** button
2. Fill in the form:
   - Username (unique)
   - Email (unique)
   - Password (secure)
   - Name (full name)
   - Phone number
   - Role: Select "driver"
3. Click **"Save"**
4. Driver can now login with these credentials

**Editing a Driver:**
1. Click **"Edit"** button next to the driver
2. Update information in the modal
3. Click **"Save"**

**Deactivating a Driver:**
1. Click **"Deactivate"** button next to the driver
2. Confirm the action
3. Driver's role changes to "inactive" and they can no longer login

### Managing Vehicles (PUV Vans)

**Viewing All Vehicles:**
- The "Vehicles" tab shows all registered PUV vans
- See body number, plate number, model, year, vehicle type, and assigned driver

**Adding a New Vehicle:**
1. Click **"Add New Vehicle"** button
2. Fill in:
   - Body Number (unique, e.g., "001")
   - Plate Number (unique, e.g., "ABC-1234")
   - Model (e.g., "Toyota HiAce")
   - Year (e.g., 2022)
   - Vehicle Type (PUV Van, Mini Bus, Jeepney)
3. Click **"Save"**

**Assigning a Vehicle to a Driver:**
1. Click **"Edit"** on the vehicle
2. Select a driver from the dropdown
3. Click **"Save"**
4. The vehicle now appears next to the driver's name in the queue

**Deactivating a Vehicle:**
1. Click **"Deactivate"** button
2. Confirm - vehicle is marked as inactive (not deleted)

### Generating Financial Reports

**Daily Report:**
1. Go to "Reports" tab
2. Select **"Daily"** from Report Type
3. Choose today's date
4. Click **"Generate"**
5. See total revenue for today

**Weekly Report:**
1. Select **"Weekly"** from Report Type
2. Choose any date within the week
3. System auto-calculates Monday-Sunday range
4. Click **"Generate"**
5. See total revenue for the week

**Monthly Report:**
1. Select **"Monthly"** from Report Type
2. Choose any date within the month
3. System auto-calculates 1st to last day of month
4. Click **"Generate"**
5. See total revenue for the month

**Understanding the Report:**
- **Total Revenue**: Sum of all terminal fees collected
- **Total Transactions**: Number of dispatched trips
- **Transaction History Table**: Detailed list with date, driver, queue ID, and amount

---

## Common Tasks

### How to Change Password (Driver/Dispatcher)

*Currently, password change is done by Admin. Self-service password change will be added in future updates.*

**For Admin:** Edit the user and update the password in the Admin Panel.

### How to Check Today's Collections (Dispatcher)

1. Login to Dispatcher Dashboard
2. Look at **"Collected Fees (Today)"** card (top-left)
3. The amount shown is today's total collections (e.g., "₱450.00")

### How to See Who's Next in Line (Dispatcher)

1. Look at **"Active Queue (FIFO)"** section (right side)
2. The driver with **"NEXT IN LINE"** green badge is first
3. Their position is automatically determined by check-in time (FIFO)

### How to Check My Position (Driver)

1. Login to Driver Portal
2. Your position is shown under **"Position in queue"** (e.g., "3rd in line")
3. Refresh the page or wait for auto-refresh (every 30 seconds)

### How to View Weekly Revenue (Admin)

1. Go to Admin Panel (`/admin.html`)
2. Click **"Reports"** tab
3. Select **"Weekly"** report type
4. Choose a date within the week
5. Click **"Generate"**
6. View the total revenue and transaction list

---

## Troubleshooting

### Login Issues

**Problem**: "Invalid credentials" error
**Solution**:
- Double-check your email/username and password
- Ensure Caps Lock is off
- Contact Admin to reset your password

**Problem**: Page doesn't load after login
**Solution**:
- Check your internet connection
- Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
- Try a different browser

### Queue Issues

**Problem**: "Driver already in queue" error
**Solution**:
- You're already waiting or on a trip
- Check your status on the Driver Portal
- If "On Trip", you must return and click "Complete Trip"

**Problem**: Can't see new drivers in queue
**Solution**:
- Dispatcher Dashboard auto-refreshes every 10 seconds
- Manually refresh the page (F5)

### Payment/Fee Issues

**Problem**: Fee amount seems wrong
**Solution**:
- Default fee is ₱10.00 per trip
- Contact Admin to verify the configured fee amount
- Check the Reports page for detailed transaction history

### General Tips

1. **Always logout** when finished (click "Logout" button)
2. **Don't share your password** with others
3. **Complete your trip** when you return to terminal
4. **Refresh the page** if something seems stuck
5. **Contact your TODA officer** for account issues

---

## FAQ (Frequently Asked Questions)

**Q: Can I use E-Barker without internet?**
A: No, internet connection is required. Offline mode is planned for future updates.

**Q: Can I login from multiple devices?**
A: Yes, but it's not recommended. Use one device at a time.

**Q: How do I know if I'm next in line?**
A: Check the Driver Portal - your position is displayed. The Dispatcher also has a "NEXT IN LINE" badge.

**Q: What if I forgot to "Complete Trip"?**
A: You won't be able to join the queue again. Contact the Dispatcher to manually update your status.

**Q: Can I change my assigned vehicle?**
A: Only Admin/Terminal managers can assign vehicles to drivers.

**Q: Is my data safe?**
A: Yes, E-Barker uses JWT authentication and password hashing (bcrypt) for security.

---

## Contact & Support

For technical support or account issues, contact:
- **TODA Officer**: [Your TODA Contact]
- **System Admin**: [Admin Email/Phone]
- **Technical Issues**: [Developer Contact]

---

**Thank you for using E-Barker! Together, we're making terminal operations fairer and more transparent. 🚺**
