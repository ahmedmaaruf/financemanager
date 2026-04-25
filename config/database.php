<?php
/**
 * MySQL (Railway) — use after you add a MySQL service and link it to this app.
 * Railway injects variables when you "Connect" MySQL; names may be MYSQL_URL or MYSQL* .
 *
 * Usage: require __DIR__ . '/../config/database.php' from PHP under public/ (paths vary when deployed).
 * In this Docker image, config is at /app/config — use: require '/app/config/database.php';
 */
declare(strict_types=1);

/**
 * @return ?PDO  null if no DB is configured (PennyPal still works in the browser with localStorage only).
 */
function db(): ?PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $mysqlUrl = getenv('MYSQL_URL') ?: getenv('DATABASE_URL');
    if (is_string($mysqlUrl) && str_starts_with($mysqlUrl, 'mysql://')) {
        $parts = parse_url($mysqlUrl);
        if (is_array($parts) && !empty($parts['host']) && !empty($parts['path'])) {
            $dbName = ltrim((string) $parts['path'], '/');
            $port = isset($parts['port']) ? (int) $parts['port'] : 3306;
            $user = isset($parts['user']) ? rawurldecode((string) $parts['user']) : '';
            $pass = isset($parts['pass']) ? rawurldecode((string) $parts['pass']) : '';
            $host = (string) $parts['host'];
            $dsn = "mysql:host={$host};port={$port};dbname={$dbName};charset=utf8mb4";
            $pdo = new PDO($dsn, $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
            return $pdo;
        }
    }

    $host = getenv('MYSQL_HOST') ?: getenv('MYSQLHOST');
    $name = getenv('MYSQL_DATABASE') ?: getenv('MYSQLDATABASE');
    $user = getenv('MYSQL_USER') ?: getenv('MYSQLUSER');
    $pass = getenv('MYSQL_PASSWORD') ?: getenv('MYSQLPASSWORD') ?: '';
    $port = (int) (getenv('MYSQL_PORT') ?: getenv('MYSQLPORT') ?: 3306);

    if (is_string($host) && $host !== '' && is_string($name) && $name !== '' && is_string($user) && $user !== '') {
        $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";
        $pdo = new PDO($dsn, $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        return $pdo;
    }

    return null;
}
