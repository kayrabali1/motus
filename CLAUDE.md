# Motus App - Project Documentation

## Project Overview
Motus is a fitness application with vision-based activity tracking. It uses a cross-platform mobile frontend built with React Native/Expo and a Google Cloud Platform (GCP) backend using Node.js.

## Tech Stack
- **Frontend Framework**: React Native 0.85.3 with Expo ~56.0.12 (SDK 56).
- **Routing**: Expo Router (~56.2.11) with file-based routing (`src/app`).
- **State Management**: Zustand (`^5.0.14`).
- **Styling / Animations**: React Native Reanimated, CSS-based styling (`global.css`).
- **Backend Framework**: Node.js with Express.js.
- **Database**: Google Cloud Firestore (`@google-cloud/firestore`).
- **Authentication**: Custom JWT-based auth (`jsonwebtoken`, `bcryptjs`).
- **Language**: TypeScript (`src/`) and JavaScript (`backend/`).

## Architecture

### iOS & Android (Frontend)
- The app uses **Expo** to target both iOS and Android from a single codebase.
- **UI Components & Routing**: Housed in `src/app` (screens) and `src/components` (reusable UI).
- **Vision Tracking**: The app uses device cameras to validate and track exercises (e.g., push-ups). Native permissions and worklets are configured for high-performance processing.
- **State**: Centralized in `src/store/useStore.ts` using Zustand.
- **Config**: Configured via `app.json` and `package.json`.

### GCP Backend
- **Server**: Express.js REST API (`backend/server.js`) running on port 8080 by default.
- **Database Connection**: Configured in `backend/db.js` using `@google-cloud/firestore`. Requires `GOOGLE_CLOUD_PROJECT` env variable (defaults to `motus-500519`).
- **Authentication**: Handled via `backend/controllers/authController.js` and `backend/middleware/authMiddleware.js`.
- **Core Endpoints**: 
  - `/api/auth/*` for sign up, sign in, password reset.
  - `/api/workouts/*` for logging and retrieving workouts and stats.
  - `/api/users/profile` for profile updates.

## Directory Structure
```text
Motus/
├── src/                # Frontend source code
│   ├── app/            # Expo Router file-based screens
│   ├── components/     # Reusable React Native components
│   ├── constants/      # App-wide constants (colors, layouts, etc.)
│   ├── hooks/          # Custom React hooks
│   └── store/          # Zustand state management (useStore.ts)
├── backend/            # Express.js REST API backend
│   ├── controllers/    # API endpoint logic (auth, workouts)
│   ├── middleware/     # Express middleware (authMiddleware)
│   ├── db.js           # Firestore initialization
│   ├── server.js       # Express server entry point
│   └── package.json    # Backend dependencies
├── assets/             # Static assets (images, fonts, splash)
├── app.json            # Expo configuration
├── package.json        # Frontend dependencies & scripts
└── AGENTS.md           # Critical constraints for AI agents
```

## Important Constraints & Guidelines
- **CRITICAL - Expo Version**: The project is using **Expo v56.0.0**. Always read the exact versioned docs at `https://docs.expo.dev/versions/v56.0.0/` before writing any code. Expo has changed significantly in recent versions, and using outdated examples will break the build.
- **Camera Permissions**: The app requires camera access to validate exercises. This is configured in `app.json` under `ios.infoPlist` and must be maintained if native configs are adjusted.
- **Types**: Use TypeScript for all frontend modifications (`src/`).

## Development Workflow
1. **Start Mobile App**: Run `npm start`, `npm run ios`, or `npm run android` in the root directory.
2. **Start Backend**: Navigate to `backend/` and run `npm run dev` or `node server.js` (runs on `http://localhost:8080` by default).
3. **Testing**: `npm test` runs Jest tests for the frontend.
4. **Code Quality**: Use `npm run lint` for ESLint.

## Critical Patterns & Conventions
- **Routing**: Follow Expo Router conventions (e.g., `_layout.tsx`, `index.tsx`, `[id].tsx`).
- **Backend API**: All protected routes must use the `authMiddleware` to validate JWTs. Responses should follow standard JSON structures (`{ data: ... }` or `{ error: ... }`).
- **State**: Mutate state using Zustand actions defined within the store slice, avoiding localized state for app-wide data (like auth status or workout sessions).
