# EdTech CRM and Inquiry System

A public inquiry form, an admin login, and a protected dashboard where staff filter, search and triage inquiries.

## Stack

- Backend: Node.js 20 or newer, Express 5, TypeScript, `pg` with hand-written SQL, zod, bcryptjs, JWT (HS256)
- Frontend: React, Vite, TypeScript, React Router, plain CSS
- Database: PostgreSQL (Supabase in production). Supabase Auth is not used.
- Tests: Vitest, Supertest, React Testing Library

## Folders

```
schema.sql        database schema (inquiries and admins)
render.yaml       Render service definition for the API
backend/          Express API, scripts, unit and integration tests
frontend/         React app, component tests, vercel.json
scripts/smoke.sh  checks a running API end to end
.github/workflows CI
```

## Local setup

1. Install Node.js 20 or newer and PostgreSQL 16 (the `pg_trgm` extension is part of the standard install).
2. Create a database: `createdb crm_dev`, and a second one for tests: `createdb crm_test`.
3. Backend:
   ```bash
   cd backend
   npm install
   cp .env.example .env      # then edit DATABASE_URL, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
   npm run db:apply          # runs ../schema.sql
   npm run db:seed-admin     # creates or updates the admin from ADMIN_EMAIL and ADMIN_PASSWORD
   npm run db:seed-demo -- 100   # optional: 100 fake inquiries
   npm run dev               # http://localhost:4000
   ```
4. Frontend, in a second terminal:
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   npm run dev               # http://localhost:5173
   ```

`schema.sql` is not safe to run twice. A second run fails with an "already exists" error and changes nothing.
`ADMIN_PASSWORD` must have at least 12 characters. `seed-admin` can be run again to reset the password.

## Environment variables

Backend (`backend/.env`):

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Postgres connection string. For Supabase use the pooler string. |
| `JWT_SECRET` | At least 32 characters. The server refuses to start otherwise. |
| `JWT_EXPIRES_IN` | Default `2h` |
| `FRONTEND_ORIGIN` | Exact frontend URL with no trailing slash. Used for CORS. |
| `PORT`, `NODE_ENV`, `LOG_LEVEL` | Render supplies `PORT` |
| `DB_POOL_MAX` | Default 10 |
| `BCRYPT_COST` | Default 12 |
| `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_SUBMIT_MAX`, `RATE_LIMIT_LOGIN_MAX` | Per-IP, in memory |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Used by `seed-admin` only |

Frontend (`frontend/.env`): `VITE_API_URL`, the public URL of the API.

## Tests

```bash
cd backend && npm run lint && npm run typecheck && npm test     # needs the crm_test database
cd frontend && npm run lint && npm run typecheck && npm test
```

Backend tests use `postgres://postgres:postgres@localhost:5432/crm_test` by default. Set `TEST_DATABASE_URL` to use another database. The test run drops and recreates the `public` schema of that database, so never point it at real data.

Coverage: `npm run coverage` in either folder.

## Testing the JWT auth with curl

```bash
API=http://localhost:4000

# 1. Log in and copy the token
curl -s -X POST $API/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"YOUR_ADMIN_PASSWORD"}'

# 2. Call a protected route with the token
TOKEN=paste-the-token-here
curl -s "$API/api/admin/inquiries?limit=5" -H "Authorization: Bearer $TOKEN"

# 3. Call it with no token (expect 401)
curl -i "$API/api/admin/inquiries"

# 4. Call it with a tampered token (expect 401)
curl -i "$API/api/admin/inquiries" -H "Authorization: Bearer ${TOKEN}x"
```

## API

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | none | 200 when the database answers |
| POST | `/api/inquiries` | none | Create an inquiry, returns 201 with the id |
| POST | `/api/auth/login` | none | Returns a token and its expiry |
| GET | `/api/auth/me` | Bearer | Returns the admin email |
| GET | `/api/admin/inquiries` | Bearer | List with `category`, `userType`, `q`, `page`, `limit` |
| PATCH | `/api/admin/inquiries/:id` | Bearer | Change status only |

Errors use `{ "error": { "code", "message", "fields?" } }`.

## Deployment

1. Supabase: create a project, run `schema.sql` in the SQL editor, copy the pooler connection string.
2. Render: new Web Service from the repo using `render.yaml`. Set `DATABASE_URL`, `JWT_SECRET` and `FRONTEND_ORIGIN`.
3. Seed the admin once from a local machine with the production `DATABASE_URL`: `npm run db:seed-admin` in `backend/`.
4. Vercel: project root `frontend`, framework Vite, set `VITE_API_URL` to the Render URL. `vercel.json` handles the React Router rewrite and security headers.
5. Set `FRONTEND_ORIGIN` on Render to the Vercel URL and redeploy.
6. Check the live API: `ADMIN_EMAIL=... ADMIN_PASSWORD=... scripts/smoke.sh https://your-api.onrender.com`

Render free services sleep when idle, so the first request after a pause can be slow. Supabase free projects can pause after inactivity.

## Live links and demo login

- Frontend (Vercel): https://frontend-gray-six-91.vercel.app
- API (Render): https://edtech-crm-k92p.onrender.com (health check: `/api/health`)
- Database: Supabase PostgreSQL

The API runs on a free Render instance that sleeps when idle. The first request after a pause can take up to a minute.

Demo admin account, created for this assessment only:

- Email: `admin@example.com`
- Password: `Shivam847424`

## Known limits

- Tokens cannot be revoked before they expire (2 hours). A deleted admin stays valid until then.
- The token is kept in `sessionStorage`, so injected script could read it. The app renders no raw HTML.
- Rate limiting is in memory and works for one API instance.
