# Ridge CRM

A full-stack CRM: leads, contacts, deals with a drag-and-drop pipeline.

**Backend:** Node.js, Express, (Sequelize), JWT auth
**Frontend:** React (Vite), React Router, Axios

## Project structure

```
nodejs-crm/
  server/   -> Express API
  client/   -> React app
```

## 1. Database setup

Install PostgreSQL locally (or use a hosted instance), then create a database:

```sql
CREATE DATABASE crm_db;
```

## 2. Backend setup

```bash
cd server
cp .env.example .env
# edit .env with your DB credentials and a strong JWT_SECRET
npm install
npm run dev
```

The API starts on `http://localhost:5000`. On first run it auto-creates all tables
(`sequelize.sync`). For production, replace this with proper Sequelize migrations.

### Key endpoints

| Method | Route | Description |
|---|---|---|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Login, returns JWT |
| GET | /api/contacts | List contacts (supports `?search=`) |
| POST | /api/contacts | Create contact |
| GET | /api/leads | List leads (supports `?status=`) |
| POST | /api/leads/:id/convert | Convert a lead into a deal |
| GET | /api/deals/pipeline | Deals grouped by stage (Kanban feed) |
| PATCH | /api/deals/:id/stage | Move a deal to a new stage |
| GET | /api/dashboard/summary | Aggregate stats for the overview page |

All routes except `/auth/register` and `/auth/login` require
`Authorization: Bearer <token>`.

## 3. Frontend setup

```bash
cd client
npm install
npm run dev
```

Opens on `http://localhost:5173` and proxies `/api` calls to the backend
(configured in `vite.config.js`).

## 4. First use

1. Go to `http://localhost:5173/register` and create an account.
2. Add a few contacts.
3. Create leads against those contacts, and convert qualified ones into deals.
4. Drag deals across the pipeline board as they progress.

## Data model

```
User 1---* Contact 1---* Lead 1---1 Deal
User 1---* Lead
User 1---* Deal
Contact 1---* Deal
Activity  -> polymorphic notes/tasks attached to a contact, lead, or deal
            (relatedType + relatedId)
```

## Notes for production

- Swap `sequelize.sync({ alter: true })` for versioned migrations
  (`sequelize-cli`).
- Add rate limiting and input validation (e.g. `express-validator`) on
  write endpoints.
- Add role-based restrictions (the `requireAdmin` middleware is scaffolded
  but not yet wired into routes) if you need admin-only actions like
  deleting other reps' records.
- Set a real `CLIENT_ORIGIN` and `JWT_SECRET` in production `.env`.
