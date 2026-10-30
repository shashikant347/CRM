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
| GET | /api/leads/import/assignees | List sales reps for an admin spreadsheet import |
| POST | /api/leads/import | Validate and import up to 500 lead rows (admin only) |
| POST | /api/leads/:id/convert | Convert a lead into a deal |
| GET | /api/deals/pipeline | Deals grouped by stage (Kanban feed) |
| PATCH | /api/deals/:id/stage | Move a deal to a new stage |
| GET | /api/dashboard/summary | Aggregate stats for the overview page |
| GET, POST | /api/chat/team/messages | Read or send a team-room message (signed-in users) |
| GET | /api/chat/inbox | List customer support conversations (signed-in users) |
| GET, POST | /api/chat/inbox/:id/messages | Read or reply to a customer conversation (signed-in users) |
| PATCH | /api/chat/inbox/:id | Open or close a customer conversation (signed-in users) |
| POST | /api/chat/customer/conversations | Start a customer chat from `/support` |
| GET, POST | /api/chat/customer/conversations/:id/messages | Read or send a customer message using its private chat token |

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
5. Open **Chat** to message the team or answer customer support chats. Customers can start
   a conversation at `http://localhost:5173/support`; the link is also available on the sign-in page.

Team chat and the customer inbox refresh every few seconds. Customer chat sessions use a
private browser token, so customers do not need a CRM account. The chat tables are created
alongside the other Sequelize models when the server starts.

### Record ownership and Excel lead import

Sales reps see only their own leads, plus contacts and deals connected to their owned
records. Activities and meetings are scoped to records they can access. Reps can only
edit or delete records they own; admins can view and manage all CRM records.

Admins can open **Leads → Assign leads from Excel**, download the template, and upload
an `.xlsx` or `.csv` file. Each data row represents one lead and must include
`Customer Name`, `Email`, `Phone`, `Company`, `Lead Title`, `Source`, `Estimated Value`,
and `Sales Email`. The sales email assigns the new lead to a registered sales rep.
Existing contacts with that email are reused when already assigned to the same rep;
contacts assigned to another rep are not reassigned and that row is reported as an error.
Rows are imported independently, so valid rows can succeed while invalid rows are listed
for correction.

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
- Admin registration and sales-rep account provisioning should be controlled in production.
- Set a real `CLIENT_ORIGIN` and `JWT_SECRET` in production `.env`.
- Public chat rate limits are in-memory and per-process. Configure trusted proxy
  handling and use a shared rate-limit store when deploying behind a proxy or
  running multiple server instances.
