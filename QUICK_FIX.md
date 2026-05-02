# Quick Fix: "Unexpected token '<'" Error

## What This Error Means
```
Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

**Translation:** Your frontend is hitting an HTML page (probably 404) instead of the JSON API.

---

## 🚀 Fastest Solution (3 steps)

### 1. Get MongoDB Atlas (5 minutes)
1. Go to https://www.mongodb.com/cloud/atlas/register
2. Create **free M0 cluster**
3. **Network Access** → Add IP → `0.0.0.0/0` (allow anywhere)
4. **Database Access** → Add user → `ebarker-user` / `password123`
5. **Connect** → Drivers → Copy connection string:
   ```
   mongodb+srv://ebarker-user:password123@cluster0.mongodb.net/e_barker
   ```

### 2. Update Backend `.env`
```bash
cd /home/nathaniel/Work/e-barker/backend
nano .env
```

**Replace the database section with:**
```env
# Database - Use MongoDB Atlas
MONGODB_URI=mongodb+srv://ebarker-user:password123@cluster0.mongodb.net/e_barker

# Keep the rest (JWT_SECRET, GOOGLE_CLIENT_ID, etc.)
```

### 3. Deploy Backend to Vercel
```bash
cd /home/nathaniel/Work/e-barker/backend
vercel --prod --name e-barker-api
```

**In Vercel Dashboard** → **e-barker-api** → **Settings** → **Environment Variables**:
- Add `MONGODB_URI` = (your Atlas connection string)
- Add `JWT_SECRET` = `your-secret-key`

### 4. Deploy Frontend
```bash
cd /home/nathaniel/Work/e-barker/frontend
vercel --prod --name e-barker-app
```

**In Vercel Dashboard** → **e-barker-app** → **Settings** → **Environment Variables**:
- Add `VITE_API_URL` = `https://e-barker-api.vercel.app/api`

**Redeploy frontend:**
```bash
vercel --prod
```

---

## 🧪 Test It

### Visit: `https://e-barker-app.vercel.app`
1. Click "Register"
2. Fill in details
3. Submit

**✅ Should work now!**

---

## 🐛 Still Not Working?

### Check Backend Health
```bash
curl https://e-barker-api.vercel.app/api/health
```

**Expected:**
```json
{"status":"ok","message":"E-Barker API is running","dbState":"connected"}
```

**If you get HTML or error:**
- Check Vercel deployment logs: `vercel logs e-barker-api`
- Verify `MONGODB_URI` is set in Vercel dashboard
- Make sure Atlas Network Access is `0.0.0.0/0`

### Check Frontend Env Var
```bash
cd /home/nathaniel/Work/e-barker/frontend
vercel env ls
```

**Should show:**
```
VITE_API_URL=https://e-barker-api.vercel.app/api
```

---

## 📝 Summary

| Problem | Solution |
|---------|----------|
| Backend not running | Deploy to Vercel or run `npm run dev` locally |
| MongoDB not connected | Use MongoDB Atlas (cloud) instead of local |
| `VITE_API_URL` wrong | Set to `https://e-barker-api.vercel.app/api` |
| Environment vars not set | Add in Vercel dashboard, then redeploy |

**The error happens because the backend can't connect to MongoDB locally, so it crashes and returns HTML instead of JSON.**

**Fix = MongoDB Atlas + Vercel deployment** ✅
