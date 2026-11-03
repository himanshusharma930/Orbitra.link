# IMPLEMENTATION PLAN: Deep Integration of Device Farm with Orbitra

This plan outlines the sequential phases to implement the deep integration between Device Farm (`muse-df`) and Orbitra / Lovley Tracker.

---

## Phase 1: Repository & Subsystem Setup
- [ ] Step 1.1: Create `/app/cps` directory and copy core Python runtime scripts (`run.py`, `server.py`, `local_proxy.py`, `fingerprint.py`, `geo.py`, `profiles.py`, `db.py`) from `/tmp/file_attachments/muse-df/`.
- [ ] Step 1.2: Copy the FastAPI application directory from `/tmp/file_attachments/muse-df/api` into `/app/cps/api/`.
- [ ] Step 1.3: Place `requirements.txt` in `/app/cps/` and install python dependencies (`fastapi`, `uvicorn`, `playwright`, `python-jose`, `httpx`).
- [ ] Step 1.4: Establish `/app/data/cps/` for persistent runtime files (`visits.db`, `campaigns.json`, `iplist.json`).
- [ ] Step 1.5: Update `/app/.gitignore` to ignore SQLite databases and log files in `/app/data/cps/`.

## Phase 2: Security & Authentication Bridging
- [ ] Step 2.1: Implement `FARM_TOKEN` enforcement in `/app/cps/server.py` to prevent unauthenticated access to port 8090.
- [ ] Step 2.2: Refactor `/app/cps/api/config.py` to use Orbitra's `app_key` secret for JWT verification.
- [ ] Step 2.3: Implement SSO token generator in Orbitra's `session_bootstrap.php` / `api.php`.
- [ ] Step 2.4: Integrate Orbitra IP Access Whitelist checks in Device Farm API routers.

## Phase 3: Core Gateway & Database Migration
- [ ] Step 3.1: Create `/app/core/CpsGateway.php` with typed HTTP client and SQLite query methods.
- [ ] Step 3.2: Implement database Migration 55 in `/app/config.php` adding `device_farm_enabled` and `cps_config_json` to `campaigns`.
- [ ] Step 3.3: Implement `/app/tests/cps_gateway_test.php` unit test validating `CpsGateway` methods.

## Phase 4: API Routing & Callback Automation
- [ ] Step 4.1: Add `cps_*` action endpoints in `/app/api.php` (`cps_status`, `cps_trigger_batch`, `cps_visits_log`, `cps_campaigns`).
- [ ] Step 4.2: Implement callback handler `cps_visit_callback` in `api.php` to link completed device visits with Orbitra `clicks` rows.
- [ ] Step 4.3: Add post-visit callback POST dispatch in `/app/cps/run.py`.

## Phase 5: Browser Anti-Detect & Verification Workflows
- [ ] Step 5.1: Synchronize device taxonomies between `core/Device.php` and `cps/profiles.py`.
- [ ] Step 5.2: Implement human interaction emulation (jitter scroll, dwell time, CTA click) in `cps/run.py`.
- [ ] Step 5.3: Add automated LeadForge form submission emulation in `cps/run.py`.
- [ ] Step 5.4: Bind `cps/geo.py` to Orbitra's local geo databases (`/app/var/geoip/`).

## Phase 6: Frontend UI & Live noVNC Canvas
- [ ] Step 6.1: Add `cps` ("CPS & Rotation") module tab to the Suite Switcher in `/app/frontend/src/components/Navbar.jsx`.
- [ ] Step 6.2: Create `CpsDashboard.jsx`, `CpsLiveViewer.jsx`, and `CpsVisitsLog.jsx` in `/app/frontend/src/pages/Cps/`.
- [ ] Step 6.3: Add English and Russian translation keys to `/app/frontend/src/locales/en.json` and `ru.json`.
- [ ] Step 6.4: Run `npm run check:i18n` to verify translation parity.
- [ ] Step 6.5: Compile frontend bundle with `npm run build`.

## Phase 7: Deployment, Process Daemons & Verification
- [ ] Step 7.1: Add Nginx reverse proxy configuration in `/app/core/nginx_config.php` for `/cps-api/` and `/vnc/`.
- [ ] Step 7.2: Provide Systemd / Docker service definitions for background execution.
- [ ] Step 7.3: Execute full PHP test suite (`php /app/tests/cps_gateway_test.php`) and verify zero regressions.
