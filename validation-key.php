<?php
// Serve Pi Network validation key
header('Content-Type: text/plain');
header('Cache-Control: public, max-age=3600');

// Read the validation key from the .env file or use the static value
$validation_key = 'e9ab4e70062f0f03a03f2e7be0d6f536690d28a03ccdc86892107e131516eaec58ae98d059f7f9f81d2fd956e18ba2945562bea7f01e711d1743e45120baf9f7';

echo $validation_key;
?>