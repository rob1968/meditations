<?php
// Check if this is an API request
$requestUri = $_SERVER['REQUEST_URI'];

if (strpos($requestUri, '/api/') === 0) {
    // This is an API request, proxy it to the backend
    $backendUrl = 'http://127.0.0.1:5002' . $requestUri;
    
    // Set CORS headers
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit();
    }
    
    // Proxy the request
    $context = stream_context_create([
        'http' => [
            'method' => $_SERVER['REQUEST_METHOD'],
            'header' => "Content-Type: application/json\r\n",
            'content' => file_get_contents('php://input')
        ]
    ]);
    
    $response = file_get_contents($backendUrl, false, $context);
    
    if ($response === false) {
        http_response_code(500);
        echo json_encode(['error' => 'Backend server unavailable']);
        exit();
    }
    
    // Forward the response
    echo $response;
    exit();
}

// Check if this is an assets request
if (strpos($requestUri, '/assets/') === 0) {
    // This is an assets request, proxy it to the backend
    $backendUrl = 'http://127.0.0.1:5002' . $requestUri;
    
    // Get the file and forward it
    $response = file_get_contents($backendUrl);
    
    if ($response === false) {
        http_response_code(404);
        exit();
    }
    
    // Determine content type
    $ext = pathinfo($requestUri, PATHINFO_EXTENSION);
    switch ($ext) {
        case 'mp3':
            header('Content-Type: audio/mpeg');
            break;
        case 'jpg':
        case 'jpeg':
            header('Content-Type: image/jpeg');
            break;
        case 'png':
            header('Content-Type: image/png');
            break;
        default:
            header('Content-Type: application/octet-stream');
    }
    
    echo $response;
    exit();
}

// Otherwise, serve the React app
readfile('/var/www/vhosts/pihappy.me/httpdocs/index.html');
?>