# ATS Resume Analyzer API

Production-oriented Express API for authenticated resume uploads and Gemini-powered ATS analysis. PDF files are written only to `uploads/` during parsing, then deleted in a `finally` block. Extracted text is held in MongoDB for 15 minutes using a TTL index and is deleted as soon as an analysis succeeds.

## Setup

1. Install Node.js 20+ and MongoDB (or use MongoDB Atlas).
2. In this folder, run `npm install`.
3. Copy `.env.example` to `.env`, then set `MONGODB_URI`, a long random `JWT_SECRET`, `GEMINI_API_KEY`, and `CLIENT_URL`.
4. Start with `npm run dev`.

The API will be available at `http://localhost:5000`; use `GET /health` to verify it.

## API

All resume and user routes require `Authorization: Bearer <token>`.

| Method | Endpoint | Body / purpose |
| --- | --- | --- |
| POST | `/auth/register` | `{ name, email, password }` |
| POST | `/auth/login` | `{ email, password }` |
| POST | `/resume/upload` | Multipart: `resume` PDF or DOCX (max 5 MB) |
| POST | `/resume/analyze` | `{ uploadId, jobDescription, jobTitle?, company? }` |
| GET | `/resume/history` | Saved analyses (without full job descriptions) |
| DELETE | `/resume/:id` | Delete one saved analysis |
| GET | `/user/profile` | Current user |

`POST /resume/upload` returns an `upload.id`. Send that value as `uploadId` to `/resume/analyze`. A successful analysis is persisted and the temporary upload record is removed.

Additional platform APIs: `POST /resume/reanalyze`, `POST /resume/improve`, `POST /resume/rewrite`, `POST /resume/editor/save`, and `GET /resume/:id`. Uploading creates a saved resume and its first version. Editor saves create immutable version snapshots and emit Socket.io events when Socket.io is installed.

## React connection example

Keep the JWT in memory where possible (or another secure client-side strategy), then use these calls from your existing components. No Gemini secret is ever sent to the browser.

```js
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

async function api(path, options = {}, token) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }
  });
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
}

export async function uploadAndAnalyze(file, jobDescription, jobTitle, company, token) {
  const form = new FormData();
  form.append('resume', file);
  const upload = await api('/resume/upload', { method: 'POST', body: form }, token);
  return api('/resume/analyze', {
    method: 'POST',
    body: JSON.stringify({ uploadId: upload.upload.id, jobDescription, jobTitle, company })
  }, token);
}
```

Set `VITE_API_URL=http://localhost:5000` in the React app’s `.env`. Add a job-description input in the existing flow before calling `uploadAndAnalyze`, then map `analysis.atsScore`, `analysis.matchPercentage`, and the arrays in the analysis result into the existing display components.

## Notes

- The Gemini service uses the official `@google/genai` SDK and JSON schema output, so the model is constrained to the requested result shape.
- Restrict `CLIENT_URL` to your deployed frontend origin (comma-separated values are accepted), use a managed MongoDB deployment, and set a high-entropy JWT secret before deployment.
- Passwords are bcrypt-hashed; endpoints are helmet-protected, CORS-restricted, rate limited, validated, and return consistent JSON errors.
