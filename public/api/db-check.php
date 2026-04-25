<?php
/**
 * Optional: visit /api/db-check.php after you connect MySQL on Railway.
 * Returns JSON: connected + server version, or a message that DB env is not set.
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$config = getenv('APP_CONFIG_DIR') ?: '/app/config';
$dbFile = rtrim($config, '/') . '/database.php';
if (is_readable($dbFile)) {
    require_once $dbFile;
} else {
    require_once dirname(__DIR__, 2) . '/config/database.php';
}

header('X-Content-Type-Options: nosniff');

try {
    $pdo = db();
    if ($pdo === null) {
        echo json_encode([
            'ok' => false,
            'message' => 'No database configured. Add MySQL in Railway, link the service, and set MYSQL_* (or MYSQL_URL) variables.',
        ], JSON_UNESCAPED_SLASHES);
        exit(0);
    }
    $v = $pdo->query('SELECT VERSION() AS v')->fetch(PDO::FETCH_ASSOC);
    echo json_encode(['ok' => true, 'mysql' => $v['v'] ?? 'unknown'], JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'Connection failed: ' . $e->getMessage()], JSON_UNESCAPED_SLASHES);
}
