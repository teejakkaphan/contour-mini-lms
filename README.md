## Local setup

Need Node.js 24, pnpm 12, the Supabase CLI, and a running Docker-compatible container runtime. See the [pnpm installation guide](https://pnpm.io/installation) for setup instructions.

1. From the repository root, install dependencies and start Supabase.

   ```bash
   pnpm install --frozen-lockfile
   supabase start
   ```

   You can also start Supabase with `pnpx supabase start`.

2. Copy `.env.example` to `.env.local`. Set `NEXT_PUBLIC_SUPABASE_URL` to the local **API URL** and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the local **publishable key** shown by `supabase status`.

3. Run `pnpm dev` and open `http://127.0.0.1:3000`. This origin matches the configured Supabase Auth site URL.

Public signup creates a **student** account automatically. Local email confirmation is disabled, so a new student can book immediately after signup.

To sign in as an admin, use the credentials below.

| Field | Value |
| --- | --- |
| Email | `admin@admin.com` |
| Password | `123456` |

A fresh local stack seeds the admin account from [`supabase/seed.sql`](supabase/seed.sql). The seeded credentials are for local demo data only.

## Implementation summary

- **Authentication and profile.**
  - The signup form uses a Next.js API to validate input and create an account through Supabase Auth. Login and logout use the Supabase browser client. `GET /api/consultations` API uses the signed-in user’s session, and PostgreSQL row-level security enforces which bookings they can read or update.
- **Student workflow.**
  - The dashboard shows the student’s consultations using `GET /api/consultations`. The booking form collects the reason and appointment time, and the API reads the student’s name from their profile.
  - Students can reschedule or cancel eligible bookings from the table using `PATCH /api/consultations/:id`. The reschedule page uses `GET /api/consultations/:id` to display the current booking details.
- **Admin workflow.**
  - The same dashboard shows read-only admins consultations across all students. The dashboard uses `GET /api/me/permissions` to determine whether to show the booking button. Read-only admins do not see it.
- **API client.**
  - I put client-side calls to the Next.js API in a shared client under `lib/api`. This keeps success and error handling consistent and reduces repeated response type definitions.
- **API endpoints.**
  - The API endpoints connect the frontend to the database.
  - `POST /api/auth/signup` validates signup details, creates a Supabase Auth account, and saves the user’s name.
  - `GET /api/me` returns the signed-in user’s first name, last name, and email.
  - `GET /api/me/permissions` returns the signed-in user’s effective permission keys.
  - `GET /api/consultations` lists visible consultations with the students’ current profile names and includes the update permission on eligible rows.
  - `POST /api/consultations` accepts a reason and scheduled time. It creates a consultation owned by the signed-in user.
  - `GET /api/consultations/:id` returns one visible consultation with its student’s current profile name and row-level permissions.
  - `PATCH /api/consultations/:id` updates a consultation’s scheduled time, status, or both. Cancellation sets the status to `cancelled`.
- **Database design.**
  - Supabase Auth manages accounts in `auth.users`. An Auth trigger syncs the account’s first and last names to `public.profiles`. Each consultation references its owner’s profile through `student_id` and stores its reason, scheduled time, and status. Consultation reads join to the profile to show the current name.
  - The private `user_roles` table links accounts to roles, and `roles_permission` links roles to permissions. A user can hold multiple roles, and roles can share permissions. The `public.current_user_permissions` view exposes the signed-in user’s combined grants to the API. The schema, grants, and access policies are versioned in [`supabase/migrations`](supabase/migrations).
  - We have Profile table due to Supabase manages `auth.users` and keeps it outside the Data API. And for security concern, this table will exposes just the first and last names needed for visible bookings, while Supabase continues to manage account data.
- **Test.**
  - I used TDD for this assignment. Run `pnpm test` to run the Vitest suite, which includes unit and React component tests.

## Justifications and assumptions

- **Authorization belongs at the database boundary.**
  - Role assignments and grants live in private tables. Postgres row-level security checks the signed-in user’s permissions and booking ownership on each query. Profile reads are limited to the caller’s own profile and profiles associated with bookings they can already see. The frontend uses permission data to show controls, and the database enforces access when a request is submitted.
- **Students book for themselves.**
  - The creation handler gets the booking owner’s UUID from the verified session. Students enter their names at signup, and profile name edits are reflected on existing bookings.
- **Times use the browser’s local timezone.**
  - The app submits an ISO timestamp and stores it in PostgreSQL as `timestamptz`. The dashboard and reschedule views convert it to local time for display.
- **Cancellation keeps the booking in history.**
  - Cancellation changes the status to `cancelled`, and the dashboard hides editing controls for cancelled rows. New bookings start as `incomplete`. The PATCH API accepts `complete`, `incomplete`, and `cancelled` updates, and the dashboard currently displays completion status without a toggle.
- **Scheduling is a simple booking request.**
  - Tutor assignment, calendar availability, and collision checks are outside the assessment requirements.
