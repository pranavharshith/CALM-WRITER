# Deployment Guide – Calm Story Platform

## Local Development

### Prerequisites
- Node.js v18+
- npm
- MongoDB (local or Atlas)

### Backend
```
cd backend
cp .env.example .env # edit if needed
npm install
npm run dev # uses nodemon, starts server at :4000
```
- The backend expects a `.env` file with (`MONGO_URL`, `PORT`, `ADMIN_SECRET`)

### Frontend
```
cd frontend
npm install
npm start
```
- Connects to backend at `/`, proxy set in development (configure in React if needed)


## Cloud Deployment (Optional)
- Use services like Render, Railway, Heroku for Express backend
- Use Vercel, Netlify for React frontend
- Use MongoDB Atlas for managed DB
- Set environment variables in your service UI
- Point frontend env/proxy to backend

## Notes
- No analytics, tracking, or metrics scripts
- Calm, anonymous-first

