Project snapshot

- Small dashboard: React frontend (Create React App + Tailwind/DaisyUI) talking to a Flask backend that serves cleaned Titanic data from `backend/train.csv`.
- Frontend lives in `frontend/` and backend in `backend/`.

Quick run/dev commands

- Start backend (from repository root or `backend/`):
  - python backend/app.py
  - Backend listens on http://localhost:5000 (endpoints listed below). Make sure your current working directory contains `train.csv` (the `backend/` folder).
- Start frontend (from `frontend/`):
  - npm install
  - npm start
  - Frontend runs on http://localhost:3000 and expects the backend at http://localhost:5000 (see `API_BASE` constants in `frontend/src/*`).

Architecture & data flows (what an agent must know)

- Backend: `backend/app.py` (source of truth for API contract)
  - Loads `train.csv` with pandas, runs `clean_titanic_data(df)` and exposes JSON endpoints.
  - Key endpoints (used across the frontend):
    - GET `/api/test` -> health message and data shape
    - GET `/api/head` -> first 5 rows of cleaned data as list of records
    - GET `/api/info` -> { columns, shape, missing_values, data_types }
    - GET `/api/summary` -> result of `DataFrame.describe()` for numeric columns
    - GET `/api/survival_rates` -> { by_class, by_sex, by_embarked } (float rates 0..1)
    - GET `/api/correlation` -> numeric correlation matrix as nested object
  - Uses `flask_cors.CORS(app)` so the frontend on :3000 can call :5000 without extra proxy config.

- Frontend: `frontend/src/` (React components)
  - `API_BASE` constant is hard-coded as `http://localhost:5000/api` in multiple files (`App.js`, `components/*`). Update all copies when changing the backend host or add a single config file.
  - Components of note:
    - `SummaryCards.js` fetches `/api/summary` and expects numeric summary structure (e.g., `summary.Age.mean`).
    - `SurvivalCharts.js` fetches `/api/survival_rates` and transforms the returned objects into Recharts-friendly arrays.
    - `CorrelationHeatmap.js` expects `/api/correlation` as nested objects and reads numeric values (calls `.toFixed(2)`).
    - `DataTable.js` fetches `/api/head` and uses keys in the first record to generate table columns.
  - UI uses Tailwind CSS + DaisyUI classes; be careful when changing class names used for layout/spacing.

Project-specific conventions and gotchas

- Data contract is authoritative in `backend/app.py`. Frontend assumes the exact JSON shapes listed above — changing backend keys will likely break multiple components.
- Backend reads `train.csv` at import-time and keeps `cleaned_df` in memory. Long-running stateful changes to the DataFrame will persist across requests in the running process.
- When adding endpoints, ensure returned values are JSON-serializable (primitive, dict, list); pandas types should be converted (e.g., use `.to_dict()` or cast to int/float/str).
- Multiple files define the same `API_BASE` string. For cross-cutting changes, update every `frontend/src/*.js` file or centralize into a new `src/config.js` and import it.

Examples for common AI-agent tasks

- Add a new backend endpoint that returns average fare by `Pclass`:
  - Edit `backend/app.py`, compute `cleaned_df.groupby('Pclass')['Fare'].mean().to_dict()` and return it at `/api/avg_fare_by_class`.
  - Update `frontend/src/SurvivalCharts.js` (or create a new component) to call `/api/avg_fare_by_class` and render with Recharts.

- Change the backend port or host:
  - Update the `app.run(..., port=XXXX)` in `backend/app.py` and update every `API_BASE` constant in `frontend/src/*`.

Testing and debugging

- Backend quick checks:
  - Use the browser or curl to hit `http://localhost:5000/api/test` and `.../api/head` to validate responses.
  - Run `python backend/app.py` and inspect printed Flask logs for errors; stack traces are shown when `debug=True`.
- Frontend quick checks:
  - `npm start` in `frontend/` opens the app; console errors usually indicate a mismatch in the JSON contract or a missing field.

Where to look first when things break

- If frontend shows a connection error: confirm Flask is running and CORS is enabled (`backend/app.py`).
- If a component crashes with undefined fields: inspect the corresponding backend endpoint (`backend/app.py`) and confirm returned JSON keys (e.g., `summary.Age.mean` used by `SummaryCards.js`).

Small maintenance tips for agents

- Prefer editing the backend API contract first, then update frontend code to match — the backend is the canonical source.
- Keep `API_BASE` centralized if you plan multiple edits; currently it is duplicated across files.
- Mind pandas-to-JSON conversions: use `.to_dict()` and convert numpy types to native Python types when necessary.

If something's missing or you want a different style (more/less detail), tell me which parts to expand (e.g., endpoint examples, sample JSON payloads, or how to run in Docker).  
