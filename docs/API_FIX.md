# API Connection Fix - "Unexpected token '<' Error"

## Error Explanation
```
Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

This means the frontend is receiving an HTML page (like a 404 error) instead of JSON from the API.

---

## 🔧 Quick Fix Options

### Option 1: Local Development (Frontend + Backend)

#### Step 1: Start MongoDB
```bash
# Option A: Local MongoDB
sudo systemctl start mongod

# Option B: MongoDB Atlas (set in backend/.env)
# MONGODB_URI=mongodb+srv://...
```

#### Step 2: Start Backend
```bash
cd /home/nathaniel/Work/e-barker/backend
npm run dev
# Should show: "Server running on port 3000" + "MongoDB connected"
```

#### Step 3: Start Frontend (new terminal)
```bash
cd /home/nathaniel/Work/e-barker/frontend
pnpm dev
# Should show: "Vite ready on http://localhost:5173"
```

#### Step 4: Verify Connection
Open browser console at `http://localhost:5173`:
- ✅ Should see: `API Request: http://localhost:3000/api/auth/register`
- ✅ Should see: `API Response: {"token":"..."}` (JSON)

---

### Option 2: Vercel Deployment (Production)

#### Step 1: Deploy Backend to Vercel
```bash
cd /home/nathaniel/Work/e-barker/backend
vercel --prod --name e-barker-api
```

#### Step 2: Set Environment Variables in Vercel Dashboard
Go to: https://vercel.com → **e-barker-api** → **Settings** → **Environment Variables**

Add these variables:

| Key | Value | Environment |
|-----|-------|-------------|
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/e-barker` | Production, Preview, Development |
| `JWT_SECRET` | `your-super-secret-jwt-key-here` | Production, Preview, Development |

#### Step 3: Deploy Frontend to Vercel
```bash
cd /home/nathaniel/Work/e-barker/frontend
vercel --prod --name e-barker-app
```

#### Step 4: Set Frontend Environment Variable
Go to: https://vercel.com → **e-barker-app** → **Settings** → **Environment Variables**

| Key | Value | Environment |
|-----|-------|-------------|
| `VITE_API_URL` | `https://e-barker-api.vercel.app/api` | Production, Preview, Development |

#### Step 5: Redeploy Frontend (to pick up env var)
```bash
vercel --prod
```

---

## 🐛 Debugging Steps

### Check 1: Is backend running?
```bash
curl http://localhost:3000/api/health
# ✅ Should return: {"status":"ok","message":"E-Barker API is running"}
# ❌ If connection refused → backend not running
```

### Check 2: Is VITE_API_URL correct?
```bash
cd /home/nathaniel/Work/e-barker/frontend
cat .env
# ✅ Should show: VITE_API_URL=http://localhost:3000/api (local)
# ✅ Or: VITE_API_URL=https://e-barker-api.vercel.app/api (production)
```

### Check 3: Check browser console
1. Open `http://localhost:5173` (or your Vercel URL)
2. Press F12 → Console tab
3. Try to register
4. Look for: `API Request: ...` message
   - ✅ Should show backend URL
   - ❌ If shows `undefined` or frontend URL → env var not set

### Check 4: Network tab
1. Press F12 → Network tab
2. Try to register
3. Click the failed request
4. Check the **Response** tab
   - ✅ Should show JSON: `{"error":"..."}` or `{"token":"..."}`
   - ❌ If shows `<!DOCTYPE html>` → hitting wrong URL (likely 404 page)

---

## 🔍 Common Mistakes

### Mistake 1: VITE_API_URL points to frontend
```bash
# ❌ WRONG - points to frontend
VITE_API_URL=http://localhost:5173

# ✅ CORRECT - points to backend
VITE_API_URL=http://localhost:3000/api
```

### Mistake 2: Forgot `/api` suffix
```bash
# ❌ WRONG
VITE_API_URL=http://localhost:3000

# ✅ CORRECT
VITE_API_URL=http://localhost:3000/api
```

### Mistake 3: Backend not deployed/running
```bash
# Check if backend is running
curl http://localhost:3000/api/health

# If using Vercel, check deployment logs
vercel logs e-barker-api
```

### Mistake 4: Environment variable not picked up
```bash
# Vite requires restart to pick up new .env values
cd /home/nathaniel/Work/e-barker/frontend
# Stop dev server (Ctrl+C)
pnpm dev  # Restart
```

---

## ✅ Verification Checklist

- [ ] Backend is running (local: `npm run dev` / Vercel: check dashboard)
- [ ] MongoDB is connected (check backend console logs)
- [ ] `VITE_API_URL` is set correctly in frontend
- [ ] Frontend restarted after changing `.env`
- [ ] Browser console shows correct API URL in requests
- [ ] Network tab shows JSON response (not HTML)

---

## 🚀 Quick Test

### Test Backend Directly
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","username":"testuser","name":"Test User","role":"driver"}'
```

**Expected Response (JSON):**
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI...",
  "user": {...}
}
```

**If you get HTML response:**
- Backend not running → start it
- URL wrong → check `VITE_API_URL`
- Route not found → check backend routes

---

## 📝 Summary

The error happens because:
1. Frontend tries to call API
2. API URL is wrong or backend is down
3. Server returns 404 HTML page
4. Frontend tries to parse HTML as JSON → Error!

**Fix:** Ensure backend is running and `VITE_API_URL` points to it correctly.
