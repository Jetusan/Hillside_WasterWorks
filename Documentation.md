# Hillside Water Billing System

## Tech Stack
- Electron + React + TypeScript
- SQLite (sql.js)
- bcryptjs for authentication

## Folder Structure
- `src/main/database/` - Database layer
- `src/main/services/` - Business logic
- `src/main/ipc/` - IPC handlers
- `src/renderer/` - React frontend
- `src/shared/` - Shared types

## Key Files
- Database: `src/main/database/index.ts`
- Preload: `src/main/preload.js`
- IPC: `src/main/ipc/index.ts`

## Current Status
- ✅ Authentication working
- ✅ Customer CRUD working
- ✅ Billing creation working
- ✅ Payments processing working

## Further Analysis
For a comprehensive architectural overview and recommendations for future improvements (like database optimizations), please see `system_analysis.md`.