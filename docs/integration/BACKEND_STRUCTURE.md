# ARCHITECTURE & BACKEND STRUCTURE: Device Farm (muse-df) & Orbitra Tracker

## 1. Process Architecture & Topology

```
+--------------------------------------------------------------------------+
|                              Host / Server                               |
|                                                                          |
|   +-----------------------+                    +---------------------+   |
|   |      Nginx (80/443)   |                    |   Xvfb Display :99  |   |
|   |  /          -> PHP-FPM|                    |   fluxbox + x11vnc  |   |
|   |  /cps-api/  -> :8000  |                    |   websockify (:6080)|   |
|   |  /vnc/      -> :6080  |                    +----------+----------+   |
|   +-----------+-----------+                               ^              |
|               |                                           |              |
|               v                                           | (headful)    |
|   +-----------------------+                    +----------+----------+   |
|   | Orbitra PHP Engine    |                    |  Device Farm Engine |   |
|   | (api.php / click.php) |                    |  (server.py :8090)  |   |
|   |                       |  HTTP / Unix Sock  |  (run.py Playwright)|   |
|   |    CpsGateway.php     +------------------->+  (local_proxy.py)   |   |
|   +-----------+-----------+                    +----------+----------+   |
|               |                                           ^              |
|               |                                           |              |
|               v                                           |              |
|   +-----------------------+                    +----------+----------+   |
|   | SQLite: orbitra_db    |                    | SQLite: visits.db   |   |
|   | (WAL mode, busy=5000) |                    | (WAL mode, busy=5000|   |
|   +-----------------------+                    +---------------------+   |
+--------------------------------------------------------------------------+
```

---

## 2. Gateway Client Contract (`/app/core/CpsGateway.php`)

```php
namespace Orbitra\Core;

class CpsGateway
{
    private string $controlUrl;
    private string $apiUrl;
    private string $farmToken;
    private string $visitsDbPath;

    public function __construct(?string $controlUrl = null, ?string $apiUrl = null, ?string $farmToken = null);

    // Status & Health
    public function getStatus(): array; // { "running": int, "done": int, "last": array }
    public function isHealthy(): bool;

    // Execution Controls
    public function triggerBatch(int $batchSize = 6, ?array $overrideConfig = null): array;
    public function stopBatch(): array;

    // Data Queries
    public function getVisits(int $limit = 50, int $offset = 0, array $filters = []): array;
    public function getCampaignStats(): array;

    // Proxy & Settings
    public function getProxyStatus(): array;
    public function updateSettings(array $settings): bool;
}
```

---

## 3. Database Schema Extensions

### Migration 55: CPS Campaign Integration
```sql
ALTER TABLE campaigns ADD COLUMN device_farm_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN cps_config_json TEXT;
```

`cps_config_json` schema:
```json
{
  "concurrency": 6,
  "daily_target": 100,
  "brands": ["xiaomi", "samsung", "pixel", "iphone", "windows"],
  "dwell_time_seconds": [5, 15],
  "scroll_jitter": true,
  "click_cta": true,
  "submit_leads": false,
  "proxy_provider": "nodemaven",
  "proxy_countries": ["us", "gb", "de"]
}
```

---

## 4. Inter-Service Security
- **FARM_TOKEN Enforced:** FastAPI and PHP pass `X-Farm-Token: <ORBITRA_SECRET>` to `server.py:8090`. All requests without matching HMAC tokens are rejected with 401 Unauthorized.
- **SSO JWT Authentication:** Orbitra admin sessions generate an ephemeral JWT token signed with Orbitra's secret key, passed in `Authorization: Bearer <jwt>` to `/cps-api/`.
