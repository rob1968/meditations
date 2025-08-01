<?php
// Plesk-compatible API proxy
// Set specific CORS headers to avoid conflicts

// Increase PHP execution time for audio generation
ini_set('max_execution_time', 180);
set_time_limit(180);

// Set CORS headers
header('Access-Control-Allow-Origin: https://meditations.pihappy.me');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Extract API path
$requestUri = $_SERVER['REQUEST_URI'];
$apiPath = str_replace('/proxy-api.php', '', $requestUri);

// Remove query parameters for the path
$apiPath = parse_url($apiPath, PHP_URL_PATH);

// Build backend URL
$backendUrl = 'http://127.0.0.1:5002' . $apiPath;

// Add query parameters if they exist
if (!empty($_SERVER['QUERY_STRING'])) {
    $backendUrl .= '?' . $_SERVER['QUERY_STRING'];
}

// Initialize cURL
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $backendUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $_SERVER['REQUEST_METHOD']);
curl_setopt($ch, CURLOPT_TIMEOUT, 120);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

// Forward headers
$headers = array();
foreach (getallheaders() as $name => $value) {
    if (strtolower($name) !== 'host') {
        $headers[] = "$name: $value";
    }
}
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

// Forward POST data
if (in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PUT', 'PATCH'])) {
    // Handle multipart/form-data specially
    if (isset($_SERVER['CONTENT_TYPE']) && strpos($_SERVER['CONTENT_TYPE'], 'multipart/form-data') !== false) {
        // For multipart data, forward $_POST and $_FILES
        $postFields = array();
        
        // Add regular POST fields
        foreach ($_POST as $key => $value) {
            $postFields[$key] = $value;
        }
        
        // Add uploaded files
        foreach ($_FILES as $key => $fileInfo) {
            if (is_uploaded_file($fileInfo['tmp_name'])) {
                $postFields[$key] = new CURLFile($fileInfo['tmp_name'], $fileInfo['type'], $fileInfo['name']);
            }
        }
        
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postFields);
    } else {
        // For regular POST data
        $postData = file_get_contents('php://input');
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
    }
}

// Execute request
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);

// Check for errors
if (curl_error($ch)) {
    http_response_code(500);
    echo json_encode(['error' => 'Backend connection failed: ' . curl_error($ch)]);
    curl_close($ch);
    exit();
}

curl_close($ch);

// Set response headers
http_response_code($httpCode);
if ($contentType) {
    header('Content-Type: ' . $contentType);
}

// Output response
echo $response;
?>