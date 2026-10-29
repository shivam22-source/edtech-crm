# EdTech CRM and Inquiry System

A public inquiry form and an admin dashboard. Visitors submit inquiries. Staff sign in, then filter, search and update the status of each inquiry.

## Live demo

| | |
| --- | --- |
| Frontend (Vercel) | https://frontend-gray-six-91.vercel.app |
| API (Render) | https://edtech-crm-k92p.onrender.com (health check: `/api/health`) |
| Database | Supabase PostgreSQL |

Demo admin account, created for this assessment only:

- Email: `admin@example.com`
- Password: `Shivam847424`

The API runs on a free Render instance that sleeps when idle. The first request after a pause can take up to a minute.

## Features

- Public form: User Type (Parent, Student, School), Category (Scholarship, Concert, Admission, General Query), Name, Email, Phone Number, Message. It validates on the client and on the server, and works from 360px up.
- Admin login with custom JWT authentication. Passwords are hashed with bcrypt, tokens are signed in the backend, and a middleware protects the admin routes. Supabase Auth is not used.
- Protected dashboard with a table of Name, Phone, Email, User Type, Category, Date and Status.
- Filter by Category, filter by User Type, and search by Name or Phone Number. Filters and page number are kept in the URL.
- Pagination, and a status change per inquiry (New, In progress, Resolved).
- Security: parameterized SQL only, zod validation, helmet headers, a CORS allowlist, rate limits on submit and login, a hidden spam-trap field on the form, and the same error message for an unknown email and a wrong password.

## Stack

- Backend: Node.js 20 or newer, Express 5, TypeScript, `pg` with hand-written SQL, zod, bcryptjs, jsonwebtoken (HS256)
- Frontend: React, Vite, TypeScript, React Router, plain CSS
- Database: PostgreSQL on Supabase, reached through the pooler connection string
- Tests: Vitest, Supertest, React Testing Library
- Hosting: Vercel (frontend), Render (backend), Supabase (database)

## Folders

```
schema.sql         database schema (inquiries and admins)
render.yaml        Render service definition for the API
backend/           Express API, scripts, unit and integration tests
frontend/          React app, component tests, vercel.json
scripts/smoke.sh   checks a running API end to end
.github/workflows  CI
```

## Run locally

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

To use Supabase instead of a local database, run `schema.sql` in the Supabase SQL editor and set `DATABASE_URL` to the transaction pooler connection string. URL-encode special characters in the password, for example `@` becomes `%40`.

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

## Testing the JWT auth

The steps below work against the live API. For a local run, use `API=http://localhost:4000`.

```bash
API=https://edtech-crm-k92p.onrender.com

# 1. Log in and copy the token from the response
curl -s -X POST $API/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"Shivam847424"}'

# 2. Call a protected route with the token (expect 200 and a list)
TOKEN=paste-the-token-here
curl -s "$API/api/admin/inquiries?limit=5" -H "Authorization: Bearer $TOKEN"

# 3. Call it with no token (expect 401)
curl -i "$API/api/admin/inquiries"

# 4. Call it with a tampered token (expect 401)
curl -i "$API/api/admin/inquiries" -H "Authorization: Bearer ${TOKEN}x"
```

Tokens are signed with HS256 and expire after 2 hours. The server checks the algorithm, so a token with `alg: none` is rejected.

## API

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | none | 200 when the database answers |
| POST | `/api/inquiries` | none | Create an inquiry, returns 201 with the id |
| POST | `/api/auth/login` | none | Returns a token and its expiry |
| GET | `/api/auth/me` | Bearer | Returns the admin email |
| GET | `/api/admin/inquiries` | Bearer | List with `category`, `userType`, `q`, `page`, `limit` (max 100) |
| PATCH | `/api/admin/inquiries/:id` | Bearer | Change status only |

Errors use `{ "error": { "code", "message", "fields?" } }` with the codes `VALIDATION_ERROR`, `UNAUTHORIZED`, `NOT_FOUND`, `RATE_LIMITED` and `INTERNAL`.

## Database

Two tables, defined in `schema.sql`:

- `inquiries`: user type, category, name, email, phone, message, status, timestamps. CHECK constraints enforce the allowed values and lengths. Indexes support the filters and the name and phone search (`pg_trgm`).
- `admins`: email (unique, case-insensitive) and bcrypt password hash.

Row level security is enabled on both tables with no policies. This blocks Supabase's public REST API, while the backend connects as the database owner and is not affected.

## Tests

```bash
cd backend && npm run lint && npm run typecheck && npm test     # needs the crm_test database
cd frontend && npm run lint && npm run typecheck && npm test
```

Backend tests use `postgres://postgres:postgres@localhost:5432/crm_test` by default. Set `TEST_DATABASE_URL` to use another database. The test run drops and recreates the `public` schema of that database, so never point it at real data.

The suites cover validation boundaries, constraints, auth middleware (missing, malformed, expired, wrong-secret and `alg: none` tokens), filters, search with special characters, SQL injection strings, pagination, status updates, and the form and dashboard behavior. Coverage: `npm run coverage` in either folder.

To check a running API end to end: `ADMIN_EMAIL=... ADMIN_PASSWORD=... scripts/smoke.sh <api-url>`.

## Deployment

1. Supabase: create a project, run `schema.sql` in the SQL editor, copy the transaction pooler connection string.
2. Render: new Web Service from the repo using `render.yaml`. Set `DATABASE_URL`, `JWT_SECRET` and `FRONTEND_ORIGIN`.
3. Seed the admin once from a local machine with the production `DATABASE_URL`: `npm run db:seed-admin` in `backend/`.
4. Vercel: project root `frontend`, framework Vite, set `VITE_API_URL` to the Render URL. `vercel.json` handles the React Router rewrite and security headers.
5. Set `FRONTEND_ORIGIN` on Render to the Vercel URL, with no trailing slash, and redeploy.

Supabase free projects can pause after inactivity.

## Known limits

- Tokens cannot be revoked before they expire (2 hours). A deleted admin stays valid until then.
- The token is kept in `sessionStorage`, so injected script could read it. The app renders no raw HTML.
- Rate limiting is in memory and works for one API instance.
- Offset pagination suits tens of thousands of rows. Past roughly 100,000 rows, switch to keyset pagination on `(created_at, id)`.
