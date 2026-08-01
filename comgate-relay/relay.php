<?php
// Comgate relay — přeposílá platební požadavky z Cloudflare Pages (dynamická IP)
// na Comgate API (payments.comgate.cz) ze statické IP tohoto PHP hostingu.

// Nastav si vlastní tajný klíč (musí být stejný jako COMGATE_RELAY_SECRET na Cloudflare Pages).
define('RELAY_SECRET', 'ZMEN_SI_TENTO_TAJNY_KLIC');

define('COMGATE_BASE', 'https://payments.comgate.cz');

header('Content-Type: text/plain; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo 'Method not allowed';
    exit;
}

$providedSecret = $_SERVER['HTTP_X_RELAY_SECRET'] ?? '';
if (!hash_equals(RELAY_SECRET, $providedSecret)) {
    http_response_code(403);
    echo 'Forbidden';
    exit;
}

$path = $_SERVER['HTTP_X_RELAY_PATH'] ?? '';
$allowedPaths = ['/v1.0/create', '/v1.0/status'];
if (!in_array($path, $allowedPaths, true)) {
    http_response_code(400);
    echo 'Invalid relay path';
    exit;
}

$body = file_get_contents('php://input');

$ch = curl_init(COMGATE_BASE . $path);
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $body,
    CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 20,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($response === false) {
    http_response_code(502);
    echo 'code=1&message=' . urlencode('Relay error: ' . $curlError);
    exit;
}

http_response_code($httpCode ?: 200);
echo $response;
