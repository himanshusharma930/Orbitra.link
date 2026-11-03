<?php
/**
 * CPS Service Gateway & API Controller
 * Provides secure communication, permission checks, and campaign mapping
 * between Lovley PHP tracker and CPS rotation service.
 */

class CpsGateway
{
    private static function getCpsDataDir(): string
    {
        $dir = __DIR__ . '/../data/cps';
        if (!is_dir($dir)) {
            @mkdir($dir, 0755, true);
        }
        return $dir;
    }

    public static function getCampaignsPath(): string
    {
        return self::getCpsDataDir() . '/campaigns.json';
    }

    public static function getProxiesPath(): string
    {
        return self::getCpsDataDir() . '/proxies.json';
    }

    private static function readJson(string $path, array $default = []): array
    {
        if (!file_exists($path)) {
            return $default;
        }
        $content = @file_get_contents($path);
        if (!$content) {
            return $default;
        }
        $data = json_decode($content, true);
        return is_array($data) ? $data : $default;
    }

    private static function writeJson(string $path, array $data): bool
    {
        $tempPath = $path . '.tmp.' . bin2hex(random_bytes(4));
        $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        if (@file_put_contents($tempPath, $json) === false) {
            return false;
        }
        return @rename($tempPath, $path);
    }

    public static function getCampaigns(): array
    {
        return self::readJson(self::getCampaignsPath(), []);
    }

    public static function saveCampaign(string $id, array $config): bool
    {
        $campaigns = self::getCampaigns();
        $campaigns[$id] = $config;
        return self::writeJson(self::getCampaignsPath(), $campaigns);
    }

    public static function deleteCampaign(string $id): bool
    {
        $campaigns = self::getCampaigns();
        if (!isset($campaigns[$id])) {
            return false;
        }
        unset($campaigns[$id]);
        return self::writeJson(self::getCampaignsPath(), $campaigns);
    }

    public static function getProxies(): array
    {
        return self::readJson(self::getProxiesPath(), []);
    }

    public static function saveProxies(array $proxies): bool
    {
        return self::writeJson(self::getProxiesPath(), $proxies);
    }

    public static function getCampaignStatus(): array
    {
        $campaigns = self::getCampaigns();
        $resultsDir = self::getCpsDataDir() . '/results';
        $statusList = [];

        foreach ($campaigns as $name => $campaign) {
            $resultFile = $resultsDir . '/' . $name . '.json';
            $resultData = file_exists($resultFile) ? self::readJson($resultFile, []) : [];
            $lastGeneratedAt = null;

            if (!empty($resultData['ts'])) {
                $lastGeneratedAt = $resultData['ts'];
            } elseif (file_exists($resultFile)) {
                $lastGeneratedAt = date('c', filemtime($resultFile));
            }

            $statusList[] = [
                'name' => (string) $name,
                'enabled' => !empty($campaign['enabled']),
                'usePlaywright' => !empty($campaign['usePlaywright']),
                'includePathQuery' => !empty($campaign['includePathQuery']),
                'interval_minutes' => isset($campaign['interval_minutes']) ? (int) $campaign['interval_minutes'] : null,
                'proxy' => $campaign['proxy'] ?? null,
                'country' => $campaign['country'] ?? null,
                'lastGeneratedAt' => $lastGeneratedAt,
                'lastUrl' => $resultData['full'] ?? $resultData['url'] ?? null,
                'lastPath' => $resultData['path'] ?? null,
                'solver' => $resultData['solver'] ?? null,
                'referer' => $resultData['referer_used'] ?? $campaign['referer'] ?? null,
                'proxyUsed' => $resultData['proxy'] ?? null,
                'countryUsed' => $resultData['country'] ?? null,
            ];
        }

        return $statusList;
    }

    public static function getRotationLogs(int $lines = 100): array
    {
        $logFile = '/var/log/rotation/rotator-all-out.log';
        if (!file_exists($logFile)) {
            $fallbackLog = self::getCpsDataDir() . '/rotation.log';
            if (!file_exists($fallbackLog)) {
                return [];
            }
            $logFile = $fallbackLog;
        }

        $lines = max(1, min(500, $lines));
        $fp = @fopen($logFile, 'rb');
        if (!$fp) {
            return [];
        }

        // Tail reading from end of file to prevent memory exhaustion
        $buffer = '';
        $chunkSize = 4096;
        $fileSize = (int) @fstat($fp)['size'];
        $pos = $fileSize;
        $foundLines = 0;

        while ($pos > 0 && $foundLines <= $lines) {
            $readSize = min($chunkSize, $pos);
            $pos -= $readSize;
            fseek($fp, $pos, SEEK_SET);
            $chunk = fread($fp, $readSize);
            $buffer = $chunk . $buffer;
            $foundLines = substr_count($buffer, "\n");
        }
        fclose($fp);

        $allLines = explode("\n", trim($buffer));
        $tailLines = array_slice($allLines, -$lines);
        $parsed = [];

        foreach ($tailLines as $line) {
            $line = trim($line);
            if ($line !== '') {
                $parsed[] = $line;
            }
        }

        return $parsed;
    }
}
