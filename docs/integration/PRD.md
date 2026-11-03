# PRD: Deep Integration of Device Farm (muse-df) with Orbitra / Lovley Tracker

## 1. Executive Summary & Vision
This document specifies the deep architectural, operational, and user-experience integration of the **Device Farm (muse-df)** anti-detect browser automation system with the **Orbitra / Lovley Tracker** platform. The resulting unified suite allows performance marketers and automation engineers to seamlessly execute, monitor, and verify residential-proxy traffic campaigns, landing page flows, lead generation pipelines, and conversion attribution loops from a single unified interface.

---

## 2. Feature Inventory & Acceptance Criteria

### FEAT-001: Unified Runtime & Gateway Bridge
- **Description:** Expose the Python Device Farm control engine (`server.py`, `run.py`, `local_proxy.py`) and FastAPI service (`api/main.py`) to the Orbitra PHP backend via a typed gateway client (`/app/core/CpsGateway.php`).
- **User Story:** As an operator, I can manage and monitor Device Farm batches directly through the Orbitra dashboard without configuring separate ports, keys, or standalone dashboards.
- **Acceptance Criteria:**
  - `CpsGateway` communicates over local socket / HTTP (`http://127.0.0.1:8090` and `http://127.0.0.1:8000`) with bounded timeouts.
  - Device Farm runtime files reside in `/app/cps/` with runtime data persisted under `/app/data/cps/`.
  - All inter-process communication is protected by a cryptographically secure `FARM_TOKEN`.

### FEAT-002: Unified Authentication & Role-Based Access Control
- **Description:** Single Sign-On (SSO) bridging Orbitra’s session cookies (`ORBITRASESSID`) and `X-Api-Key` headers into Device Farm’s FastAPI service.
- **User Story:** As an admin, logging into the Orbitra web panel automatically authenticates me to the Device Farm control plane and live viewer without a secondary login prompt.
- **Acceptance Criteria:**
  - FastAPI auth middleware validates requests using Orbitra's `app_key` / JWT secret.
  - Unauthenticated access to port 8090 (`server.py`) is completely rejected.
  - Orbitra's IP Access List (`orbitraAdminIpAllowed`) applies universally to Device Farm endpoints.

### FEAT-003: Campaign & Stream Target Binding
- **Description:** Direct synchronization between Orbitra campaigns/streams and Device Farm synthetic traffic injection tasks.
- **User Story:** As a media buyer, I can select an existing Orbitra campaign or stream and trigger automated test batches with specific device profiles and residential proxy geos.
- **Acceptance Criteria:**
  - Orbitra `campaigns` table includes a `device_farm_enabled` flag and `cps_config_json` schema.
  - Device Farm `campaigns.json` stores `orbitra_campaign_id`, `orbitra_stream_id`, and `orbitra_token`.
  - Batch visits automatically populate Orbitra subids and match configured stream filters.

### FEAT-004: Bi-Directional Click & Postback Verification Loop
- **Description:** Closed-loop verification of click redirects, cloak rules, landing page CTA clicks, and postback attribution.
- **User Story:** As a QA engineer, I can execute automated runs to verify that CloakDetector correctly serves safe vs money pages, and that landing `{offer}` clicks record accurate conversions.
- **Acceptance Criteria:**
  - Playwright visitor script in `run.py` can emulate human browsing (jitter scrolling, dwell time, CTA link clicks).
  - Lead submission emulation automatically fills and posts LeadForge forms to verify conversion receipt.
  - Navigation outcomes and generated `click_id` values are posted back to Orbitra via `cps_visit_callback`.

### FEAT-005: Residential Proxy & Geo Intelligence Unification
- **Description:** Unify NodeMaven, ProxyEmpire, and DataImpulse proxy pool settings with Orbitra's local geo databases (GeoLite2, IP2Location, Sypex).
- **User Story:** As an operator, I can configure proxy credentials and country targeting in Orbitra Settings, and verify proxy exit IPs against Orbitra's local geo lookup.
- **Acceptance Criteria:**
  - Proxy provider credentials managed in Orbitra's `settings` table and synced to Device Farm env/config.
  - Device Farm `geo.py` leverages local GeoLite2/IP2Location `.mmdb` and `.bin` databases when resolving proxy exit IPs.
  - `local_proxy.py` byte metering reports bandwidth consumption per campaign into Orbitra cost tracking.

### FEAT-006: Frontend Suite Switcher & noVNC Live Stream Viewer
- **Description:** Expand the primary Suite Switcher in `Navbar.jsx` with a 4th module: **"CPS & Rotation"**, embedding the live noVNC display and control views.
- **User Story:** As an operator, I can switch between Tracker, LeadForge, CRM, and CPS, watching emulated devices execute live in a real-time browser canvas.
- **Acceptance Criteria:**
  - Suite Switcher contains `leadforge`, `tracker`, `crm`, and `cps` tabs with responsive icons.
  - Embedded noVNC HTML5 canvas connects to port 6080 with seamless WebSocket proxying.
  - Complete English and Russian localization parity verified with `npm run check:i18n`.
