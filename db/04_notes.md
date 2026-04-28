# Supabase setup notes (no Supabase Auth)

1) Create a new Supabase project.
2) Open SQL editor and run files in order:
   - 01_schema.sql
   - 02_views.sql
   - 03_seed.sql (optional)

Environment variables for the app:
- NEXT_PUBLIC_SUPABASE_URL = your project URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY = anon key
- SUPABASE_URL = same URL (for server utilities if needed)
- SUPABASE_SERVICE_ROLE_KEY = service_role key (only on server, never exposed to client)

Auth & RLS:
- This app currently uses a custom `users` table with plaintext passwords (same as in your code). Keep RLS disabled.
- If you later migrate to Supabase Auth:
  - Enable RLS on tables and write policies tied to `auth.uid()`
  - Replace custom login with `supabase.auth.*`

Admin features:
- View `user_report_counts` for per-user totals and last report timestamp
- Drill down by selecting a user on the admin page to see their reports

Security notes:
- Do not use plaintext passwords in production. Consider hashing (e.g., bcrypt) if you keep custom auth.
- Keep the service role key only on server-side.

PPTX backend integration:
- Backend in `backend/` (FastAPI). Install deps and run:
  - `python -m venv .venv && . .venv/Scripts/activate && pip install -r requirements.txt`
  - `uvicorn app:app --host 0.0.0.0 --port 8000 --reload`
- Env in Next.js:
  - `NEXT_PUBLIC_PPTX_API_URL=http://localhost:8000`
- Optional: set `PPTX_TEMPLATE_PATH` for backend, otherwise it uses `public/templates/report_template.pptx`.
