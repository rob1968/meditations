<?php
// Serve Pi Network validation key
header('Content-Type: text/plain');
header('Cache-Control: public, max-age=3600');

// Read the validation key from the .env file or use the static value
$validation_key = '45e6320f7d680a58948a62eb150ed2687d390fb11b8e986d9710e28282467ee96ae00d97e546116eccd85a0c0dc5cf21e810a4291206a4729f7c67ace71f57ac';

echo $validation_key;
?>