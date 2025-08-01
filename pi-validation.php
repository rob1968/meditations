<?php
// Simple validation key endpoint that bypasses all routing
header('Content-Type: text/plain');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-cache');

// Output just the validation key
echo 'e9ab4e70062f0f03a03f2e7be0d6f536690d28a03ccdc86892107e131516eaec58ae98d059f7f9f81d2fd956e18ba2945562bea7f01e711d1743e45120baf9f7';
exit;
?>