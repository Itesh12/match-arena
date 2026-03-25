# Math Arena: Deployment Guide

This document outlines the steps to deploy the Math Arena platform to production using **Vercel** for the frontend and a Node.js compatible host for the backend.

## 1. Prerequisites
- A **GitHub** repository containing the source code (already pushed to `https://github.com/Itesh12/match-arena.git`).
- A **MongoDB Atlas** cluster for the database.
- A **Vercel** account for frontend hosting.

---

## 2. Frontend Deployment (Vercel)

1. **Import Project**: 
   - Login to Vercel and click **Add New** > **Project**.
   - Import the `match-arena` repository.
2. **Configure Root Directory**:
   - Set the **Root Directory** to `frontend`.
3. **Framework Preset**:
   - Select **Next.js**.
4. **Environment Variables**:
   - Add the following keys under **Settings > Environment Variables**:
     - `NEXT_PUBLIC_API_URL`: The URL of your deployed backend (e.g., `https://api.match-arena.com`).
     - `NEXT_PUBLIC_SOCKET_URL`: Same as above (Backend URL).
5. **Deploy**:
   - Click **Deploy**. Vercel will build and assign a production URL.

---

## 3. Backend Deployment

You can host the `backend/` directory on platforms like **Render**, **Railway**, or **Heroku**.

1. **Source Control**:
   - Import the `match-arena` repository.
2. **Root Directory**:
   - Set to `backend`.
3. **Build & Start Commands**:
   - Build: `npm install`
   - Start: `node src/index.js`
4. **Environment Variables**:
   - `MONGODB_URI`: Your MongoDB Atlas connection string.
   - `JWT_SECRET`: A long, random string for secure authentication.
   - `CORS_ORIGIN`: The URL of your deployed frontend (e.g., `https://match-arena.vercel.app`).
   - `PORT`: Usually handled automatically by the provider (defaults to `5001`).

---

## 4. Database Setup (MongoDB Atlas)

1. Create a new cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Go to **Network Access** and whitelist `0.0.0.0/0` (or the specific IPs of your Vercel/Backend hosts).
3. Go to **Database Access** and create a user with `readWriteAnyDatabase` permissions.
4. Copy the connection string and use it for the `MONGODB_URI` environment variable.

---

## 5. Post-Deployment Verification

- **Lobby**: Ensure you can sign up and login.
- **Admin**: Log in as an admin and verify you can see the "Admin Center" in the sidebar.
- **Arena**: Create a room, copy the code, and join from another tab to verify real-time socket connectivity.
- **Localization**: Change the language in the dashboard and verify both English and Hindi text appear correctly.
