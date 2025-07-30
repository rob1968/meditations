<?php
// Test if we can reach the backend
$backendUrl = 'https://127.0.0.1:5443/api/notifications/user/test?unreadOnly=true';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $backendUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
curl_setopt($ch, CURLOPT_TIMEOUT, 5);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

header('Content-Type: application/json');
echo json_encode([
    'backend_url' => $backendUrl,
    'http_code' => $httpCode,
    'error' => $error,
    'response' => $response
]);
?>