# Deploy to Vercel

## 1. Push repository to GitHub

From the repository folder:

```bash
git init
git add .
git commit -m "Initial MBS Practice Simulator v0.1"
git branch -M main
git remote add origin <YOUR_GITHUB_REPOSITORY_URL>
git push -u origin main
```

## 2. Import in Vercel

- Open Vercel.
- Choose **Add New → Project**.
- Import the GitHub repository.
- Framework preset: **Vite**.
- Build command: `npm run build`.
- Output directory: `dist`.
- Deploy.

`vercel.json` already contains the expected Vite build settings.

## 3. Supabase

Supabase is optional for local/single-browser practice. For team rooms:

- Create a Supabase project.
- Run `supabase/schema.sql` once in SQL Editor.
- Copy Project URL + public anon/publishable key.
- Enter both from **Room & Setup** inside the deployed simulator.

Do not put `service_role` credentials in Vercel or the browser client for this v0.1 design.
