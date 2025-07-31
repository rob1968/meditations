<?php
// Simple proxy to forward requests to Node.js backend on port 5002
// This allows Pi Browser to access the API without port restrictions

// Enable CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Get the request path
$path = isset($_GET['path']) ? $_GET['path'] : $_SERVER['PATH_INFO'];
if (!$path) {
    http_response_code(400);
    echo json_encode(['error' => 'No path specified']);
    exit();
}

// Build the backend URL
$backend_url = 'http://localhost:5002' . $path;

// Get request method
$method = $_SERVER['REQUEST_METHOD'];

// Initialize cURL
$ch = curl_init($backend_url);

// Set common cURL options
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);

// Forward headers
$headers = [];
foreach (getallheaders() as $name => $value) {
    if (!in_array(strtolower($name), ['host', 'connection'])) {
        $headers[] = "$name: $value";
    }
}
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

// Forward request body for POST/PUT
if (in_array($method, ['POST', 'PUT'])) {
    $input = file_get_contents('php://input');
    curl_setopt($ch, CURLOPT_POSTFIELDS, $input);
}

// Execute request
$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);

// Close cURL
curl_close($ch);

// Parse response
$header = substr($response, 0, $header_size);
$body = substr($response, $header_size);

// Set response code
http_response_code($http_code);

// Forward response headers
$response_headers = explode("\r\n", $header);
foreach ($response_headers as $header) {
    if (strpos($header, ':') !== false && !preg_match('/^(Transfer-Encoding|Connection):/i', $header)) {
        header($header);
    }
}

// Output response body
echo $body;
?>