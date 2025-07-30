<?php
header('Content-Type: application/json');
echo json_encode([
    'REQUEST_URI' => $_SERVER['REQUEST_URI'],
    'SCRIPT_NAME' => $_SERVER['SCRIPT_NAME'],
    'PATH_INFO' => $_SERVER['PATH_INFO'] ?? null,
    'QUERY_STRING' => $_SERVER['QUERY_STRING'] ?? null,
    'REQUEST_METHOD' => $_SERVER['REQUEST_METHOD']
]);
?>