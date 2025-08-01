<?php
// Simple assets proxy
$assetPath = $_SERVER['REQUEST_URI'];

// Build the backend URL
$backendUrl = 'http://127.0.0.1:5002' . $assetPath;

// Get the file and forward it
$response = file_get_contents($backendUrl);

if ($response === false) {
    http_response_code(404);
    echo json_encode(['error' => 'Asset not found']);
    exit();
}

// Determine content type
$ext = pathinfo($assetPath, PATHINFO_EXTENSION);
switch (strtolower($ext)) {
    case 'mp3':
        header('Content-Type: audio/mpeg');
        break;
    case 'wav':
        header('Content-Type: audio/wav');
        break;
    case 'jpg':
    case 'jpeg':
        header('Content-Type: image/jpeg');
        break;
    case 'png':
        header('Content-Type: image/png');
        break;
    case 'gif':
        header('Content-Type: image/gif');
        break;
    default:
        header('Content-Type: application/octet-stream');
}

echo $response;
?>