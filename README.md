# 🏠 Phòng trọ VN — Transparent Room Rental & Review Platform

A full-stack web platform for searching, listing, and reviewing rental rooms in Vietnam — built with Next.js, NestJS, and AI-powered features for transparent, trustworthy rental experiences.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Database Schema](#database-schema)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)

---

## Overview

Phòng trọ VN solves a real problem in the Vietnamese rental market: the lack of transparency and honest reviews. Unlike existing platforms (Phongtro123, Chotot) that focus only on listings, Phòng trọ VN puts verified reviews at the center — so renters can make informed decisions and landlords are incentivized to maintain quality.

### Target Users:
- 🧑‍🎓 **Students and young professionals** looking for rental rooms
- 🏘️ **Landlords** wanting to reach verified renters
- 👨‍💼 **Admins** managing platform quality and trust

---

## Features

### For Renters
- 🔍 **Advanced search** with filters (price, area, district, amenities, rating)
- 🗺️ **Map-based search** powered by Google Maps API
- ⭐ **Read verified reviews** across 5 categories (cleanliness, security, location, landlord, value)
- 💬 **Real-time chat** with landlords via WebSocket
- ❤️ **Save favorite rooms**
- 📝 **Write reviews** (only after verified contact with landlord)

### For Landlords
- 📢 **Create and manage room listings** with photo upload
- 📊 **Dashboard** with views, contact stats, and review scores
- 💬 **Real-time messaging inbox**
- 🔔 **Email notifications** for new messages and reviews

### AI-Powered Features
- 🤖 **Sentiment analysis** on reviews (positive / negative / neutral)
- 🚨 **Fake listing and spam review detection**
- 💡 **Similar room recommendations** based on browsing history
- 📝 **AI-generated review summaries** per room

---

## Tech Stack

### Frontend
| Technology | Purpose |
| :--- | :--- |
| **Next.js 14 (App Router)** | React framework with SSR/SSG |
| **TailwindCSS** | Utility-first styling |
| **ShadcnUI** | Component library |
| **React Query (TanStack)** | Server state management |
| **Zustand** | Client state management |
| **Socket.io-client** | Real-time chat |
| **Google Maps JS API** | Map and geocoding |

### Backend
| Technology | Purpose |
| :--- | :--- |
| **NestJS** | Node.js framework (modular architecture) |
| **PostgreSQL** | Primary relational database |
| **Prisma ORM** | Type-safe database access |
| **Redis** | Caching and session storage |
| **Socket.io** | WebSocket for real-time chat |
| **JWT + Refresh Token** | Authentication |
| **Passport.js** | Auth strategies |

### External Services
| Service | Purpose |
| :--- | :--- |
| **Google Maps API** | Geocoding + map display |
| **Cloudinary** | Image upload and CDN |
| **Gemini API (free tier)** | AI sentiment + recommendations |
| **SendGrid** | Email notifications |
| **VNPay / MoMo** | Payment gateway (future) |

### DevOps
| Technology | Purpose |
| :--- | :--- |
| **Docker + Docker Compose** | Local development environment |
| **Railway** | Cloud deployment |
| **GitHub Actions** | CI/CD pipeline |

---

## System Architecture

```text
┌─────────────────────────────────────────────────┐
│               Next.js Frontend (Vercel)         │
│   Search │ Room Detail │ Chat │ Dashboard       │
└────────────────────┬────────────────────────────┘
                     │ REST API + WebSocket
┌────────────────────▼────────────────────────────┐
│              NestJS Backend (Railway)           │
│  Auth │ Room │ Review │ Chat │ AI │ Notification│
└──┬──────────┬──────────┬──────────┬─────────────┘
   │          │          │          │
PostgreSQL  Redis    Cloudinary  Gemini API
(Prisma)   (Cache)    (Images)     (AI)
```

---

## Database Schema

```text
User ──────── Room ──────── RoomImage
  │             │
  ├── Review    ├── RoomAmenity ── Amenity
  │             │
  ├── Report    ├── Review
  │             │
  ├── SavedRoom ├── Conversation ── Message
  │             │
  └── Message   └── Report
```

### Key Tables

| Table | Description |
| :--- | :--- |
| **users** | All platform users (Admin / Landlord / Renter) |
| **rooms** | Room listings with location, price, status |
| **room_images** | Multiple images per room |
| **amenities** | Master list of amenities (WiFi, AC, etc.) |
| **room_amenities** | Many-to-many: rooms ↔ amenities |
| **reviews** | Verified reviews with 5-category ratings |
| **conversations** | Chat threads between renter and landlord |
| **messages** | Individual messages in a conversation |
| **saved_rooms** | User's saved/favorited rooms |
| **reports** | User reports on listings or reviews |

---

## Getting Started

### Prerequisites
- Node.js >= 18
- PostgreSQL >= 15
- Redis >= 7
- Docker (recommended)

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/phong-tro-vn.git
cd phong-tro-vn
```

### 2. Start with Docker Compose (recommended)
```bash
docker compose up -d
```
This starts PostgreSQL, Redis, the NestJS backend, and the Next.js frontend automatically.

### 3. Manual Setup (Alternative)

#### Backend:
```bash
cd backend
npm install
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

#### Frontend:
```bash
cd frontend
npm install
npm run dev
```

### 4. Access the App
| Service | URL |
| :--- | :--- |
| **Frontend** | [http://localhost:3000](http://localhost:3000) |
| **Backend API** | [http://localhost:4000](http://localhost:4000) |
| **API Docs (Swagger)** | [http://localhost:4000/api/docs](http://localhost:4000/api/docs) |
| **Prisma Studio** | [http://localhost:5555](http://localhost:5555) |

---

## Environment Variables

### Backend (`/backend/.env`)
```env
# App
NODE_ENV=development
PORT=4000

# Database
DATABASE_URL=postgresql://root:2004@localhost:5432/phong_tro_vn

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Google Maps
GOOGLE_MAPS_API_KEY=your_google_maps_key

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# SendGrid
SENDGRID_API_KEY=your_sendgrid_key
SENDGRID_FROM_EMAIL=noreply@phongtrovn.vn

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

### Frontend (`/frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

---

## Project Structure

```text
phong-tro-vn/
├── frontend/                  # Next.js application
│   ├── app/                   # App Router pages
│   │   ├── (auth)/            # Login, Register pages
│   │   ├── (main)/            # Main layout pages
│   │   │   ├── page.tsx       # Homepage
│   │   │   ├── rooms/         # Search results
│   │   │   ├── rooms/[id]/    # Room detail
│   │   │   ├── post/          # Post a listing
│   │   │   ├── dashboard/     # Landlord dashboard
│   │   │   └── messages/      # Chat inbox
│   ├── components/
│   │   ├── ui/                # ShadcnUI base components
│   │   ├── room/              # Room-specific components
│   │   ├── review/            # Review components
│   │   ├── chat/              # Chat components
│   │   └── map/               # Map components
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utilities, API client
│   ├── stores/                # Zustand stores
│   └── types/                 # TypeScript types
│
├── backend/                   # NestJS application
│   ├── src/
│   │   ├── auth/              # JWT auth, guards, strategies
│   │   ├── users/             # User management
│   │   ├── rooms/             # Room CRUD + search
│   │   ├── reviews/           # Review system
│   │   ├── chat/              # WebSocket chat gateway
│   │   ├── ai/                # Gemini AI integration
│   │   ├── notifications/     # Email notifications
│   │   ├── upload/            # Cloudinary upload
│   │   └── common/            # Shared decorators, filters, pipes
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema
│   │   └── seed.ts            # Seed data (100+ rooms)
│   └── test/                  # E2E tests
│
├── docker-compose.yml
└── README.md
```

---

## API Documentation

Full Swagger documentation is available at `/api/docs` when running the backend.

### Key Endpoints

#### Auth
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/auth/register` | Register new user |
| `POST` | `/auth/login` | Login + get tokens |
| `POST` | `/auth/refresh` | Refresh access token |
| `POST` | `/auth/logout` | Revoke refresh token |

#### Rooms
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/rooms` | Search rooms (with filters + pagination) |
| `GET` | `/rooms/:id` | Get room detail |
| `POST` | `/rooms` | Create listing (Landlord only) |
| `PUT` | `/rooms/:id` | Update listing (Owner only) |
| `DELETE` | `/rooms/:id` | Delete listing (Owner only) |
| `POST` | `/rooms/:id/save` | Save/unsave room |

#### Reviews
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/rooms/:id/reviews` | Get reviews for a room |
| `POST` | `/rooms/:id/reviews` | Submit a review (verified renters only) |
| `DELETE` | `/reviews/:id` | Delete review (Admin only) |

#### Chat
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/conversations` | Get user's conversations |
| `GET` | `/conversations/:id/messages` | Get messages in conversation |
| `WS` | `/chat` | WebSocket namespace for real-time chat |

#### AI
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/rooms/:id/ai-summary` | Get AI summary of room reviews |
| `GET` | `/rooms/:id/similar` | Get AI-recommended similar rooms |

---

## Deployment

### Deploy to Railway (Recommended)
1. Push code to GitHub.
2. Connect Railway to your GitHub repo.
3. Add environment variables in the Railway dashboard.
4. Railway auto-detects the Dockerfile and deploys.

### Deploy with Docker
```bash
# Build and run production containers
docker-compose -f docker-compose.prod.yml up -d
```

### CI/CD Pipeline (GitHub Actions)
The `.github/workflows/deploy.yml` file automatically:
- Runs tests on every pull request.
- Builds Docker images on merge to `main`.
- Deploys to Railway on a successful build.
