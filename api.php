<?php
// Simple PHP proxy for API requests to avoid mixed content issues
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Get the API path from the URL
$apiPath = $_SERVER['REQUEST_URI'];
$apiPath = str_replace('/api.php', '', $apiPath);
$apiPath = ltrim($apiPath, '/');

// Build the backend URL
$backendUrl = 'https://127.0.0.1:5443/' . $apiPath;

// Get the request method and body
$method = $_SERVER['REQUEST_METHOD'];
$postData = file_get_contents('php://input');

// Initialize cURL
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $backendUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);

// Set headers
$headers = [];
if (function_exists('getallheaders')) {
    foreach (getallheaders() as $name => $value) {
        if (strtolower($name) !== 'host') {
            $headers[] = "$name: $value";
        }
    }
} else {
    // Fallback for when getallheaders() is not available
    foreach ($_SERVER as $name => $value) {
        if (substr($name, 0, 5) == 'HTTP_') {
            $header_name = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))));
            $headers[] = "$header_name: $value";
        }
    }
}
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

// Set POST data if applicable
if ($method === 'POST' || $method === 'PUT') {
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
}

// Execute request
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);

curl_close($ch);

// Set response headers
http_response_code($httpCode);
if ($contentType) {
    header('Content-Type: ' . $contentType);
}

// Output response
echo $response;
?>