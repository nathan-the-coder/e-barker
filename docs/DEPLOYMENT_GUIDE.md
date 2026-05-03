# E-Barker Vercel Deployment Guide

Step-by-step guide to deploy both frontend and backend to Vercel with MongoDB Atlas.

---

## Prerequisites

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login
```

---

## 1. Set Up MongoDB Atlas

### Create Atlas Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Create a **free tier cluster** (M0 Sandbox - always free)
3. **Configure Network Access**:
   - Go to **Network Access** → **Add IP Address**
   - Select **Allow Access from Anywhere** (`0.0.0.0/0`)
   - *This allows Vercel's dynamic IPs to connect*

### Create Database User
1. Go to **Database Access** → **Add New Database User**
2. Set username: `ebarker-user`
3. Set password: `your-secure-password`
4. Role: **Read and write to any database**

### Get Connection String
1. Go to **Clusters** → **Connect**
2. Choose **Drivers**
3. Copy the connection string:
   ```
   mongodb+srv://ebarker-user:<password>@cluster0.mongodb.net/e_barker?retryWrites=true&w=majority
   ```
4. Replace `<password>` with your actual password

---

## 2. Deploy Backend to Vercel

### Navigate to Backend Directory
```bash
cd /home/nathaniel/Work/e-barker/backend
```

### Initialize Vercel Project
```bash
vercel --prod --name e-barker-api
```

- Select: **Yes** (link to existing project or create new)
- Select: **No** for settings detection (we have `vercel.json`)

### Add Environment Variables in Vercel Dashboard

Go to [Vercel Dashboard](https://vercel.com/dashboard) → **e-barker-api** → **Settings** → **Environment Variables**

Add these variables:

| Key | Value | Environment |
|-----|-------|-------------|
| `MONGODB_URI` | `mongodb+srv://ebarker-user:password@cluster0.mongodb.net/e_barker` | Production, Preview |
| `JWT_SECRET` | `your-super-secret-jwt-key-12345` | Production, Preview |
| `GOOGLE_CLIENT_ID` | `123456789.apps.googleusercontent.com` | Production, Preview |
| `GOOGLE_CLIENT_SECRET` | `GOOGLE_CLIENT_SECRET` | Production, Preview |

### Redeploy After Adding Variables
```bash
vercel --prod
```

**Your backend URL:** `https://e-barker-api.vercel.app`

---

## 3. Deploy Frontend to Vercel

### Navigate to Frontend Directory
```bash
cd /home/nathaniel/Work/e-barker/frontend
```

### Initialize Vercel Project
```bash
vercel --prod --name e-barker-app
```

### Add Environment Variable

In Vercel Dashboard → **e-barker-app** → **Settings** → **Environment Variables**

| Key | Value | Environment |
|-----|-------|-------------|
| `VITE_API_URL` | `https://e-barker-api.vercel.app` | Production, Preview |

### Update Frontend API URL

Update `frontend/src/api.js` line 1:

```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
```

### Redeploy
```bash
vercel --prod
```

**Your frontend URL:** `https://e-barker-app.vercel.app`

---

## 4. Update Google OAuth Settings

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services** → **Credentials**
3. Edit your **OAuth 2.0 Client ID**
4. Add to **Authorized JavaScript origins**:
   ```
   https://e-barker-app.vercel.app
   ```
5. **Authorized redirect URIs** can remain empty (using popup flow)

---

## 5. Initialize Database (Optional)

To seed initial data:

```bash
# Temporarily update backend/.env
MONGODB_URI=your_mongodb_atlas_uri

# Run a seed script (create one if needed)
node seed.js
```

Or manually create data through the Admin Panel at `https://e-barker-app.vercel.app/admin.html`

---

## 6. Test Deployment

### Test Backend
```bash
curl https://e-barker-api.vercel.app/api/health
# Should return: {"status":"ok","message":"E-Barker API is running"}
```

### Test Frontend
1. Visit `https://e-barker-app.vercel.app`
2. Click "Get Started" → Login
3. Test driver check-in, dispatcher dispatch, etc.

---

## 7. Custom Domain (Optional)

### For Frontend
1. Vercel Dashboard → **e-barker-app** → **Settings** → **Domains**
2. Add your domain: `ebarker.com`
3. Follow DNS configuration instructions

### For Backend
1. Vercel Dashboard → **e-barker-api** → **Settings** → **Domains**
2. Add: `api.ebarker.com`

Update frontend environment variable `VITE_API_URL` to new backend URL.

---

## Quick Reference

| Service | Vercel Project Name | URL |
|---------|---------------------|-----|
| Backend | `e-barker-api` | `https://e-barker-api.vercel.app` |
| Frontend | `e-barker-app` | `https://e-barker-app.vercel.app` |

---

## Troubleshooting

### "Cannot connect to MongoDB"
- Check IP whitelist (should be `0.0.0.0/0`)
- Verify `MONGODB_URI` in Vercel environment variables
- Check username/password in connection string

### "CORS error"
- Backend should have `cors()` middleware (already configured)
- Check if frontend is sending requests to correct backend URL

### "Environment variable not found"
- Redeploy after adding environment variables
- Check variable names (case-sensitive)
- Ensure variables are added to correct environment (Production)

### "Google Sign-In not working"
- Verify OAuth client ID in Google Cloud Console
- Add Vercel domain to authorized origins
- Check browser console for errors

---

## Useful Commands

```bash
# View logs
vercel logs

# List deployments
vercel list

# Remove deployment
vercel remove e-barker-api

# Promote preview to production
vercel promote <url>
```

---

**Your E-Barker system is now live on Vercel! 🚀**
