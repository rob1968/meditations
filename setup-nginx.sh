#!/bin/bash

# Nginx Setup Script for Meditation App
# This script will setup Nginx configuration and test it parallel to Apache

echo "🚀 Setting up Nginx for Meditation App..."

# Step 1: Copy configuration file to sites-available
echo "📝 Copying Nginx configuration..."
sudo cp /var/www/vhosts/pihappy.me/meditations.pihappy.me/nginx-meditation-app.conf /etc/nginx/sites-available/meditation-app

# Step 2: Test the configuration syntax  
echo "🔍 Testing Nginx configuration syntax..."
sudo nginx -t

if [ $? -ne 0 ]; then
    echo "❌ Nginx configuration test failed!"
    exit 1
fi

# Step 3: Enable the site (create symlink)
echo "🔗 Enabling meditation-app site..."
sudo ln -sf /etc/nginx/sites-available/meditation-app /etc/nginx/sites-enabled/meditation-app

# Step 4: Disable default site to avoid conflicts
echo "❌ Disabling default Nginx site..."
sudo rm -f /etc/nginx/sites-enabled/default

# Step 5: Check if rate limiting is configured in nginx.conf
echo "⚡ Checking rate limiting configuration..."
if ! grep -q "limit_req_zone" /etc/nginx/nginx.conf; then
    echo "📝 Adding rate limiting to nginx.conf..."
    sudo sed -i '/http {/a\\tlimit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;' /etc/nginx/nginx.conf
fi

# Step 6: Test configuration again
echo "🔍 Final configuration test..."
sudo nginx -t

if [ $? -ne 0 ]; then
    echo "❌ Final Nginx configuration test failed!"
    exit 1
fi

# Step 7: Start Nginx (don't reload yet to avoid conflicts)
echo "🚀 Starting Nginx service..."
sudo systemctl start nginx

# Check if Nginx started successfully
if sudo systemctl is-active --quiet nginx; then
    echo "✅ Nginx started successfully!"
    echo "🔧 Nginx is now running parallel to Apache"
    echo ""
    echo "📊 Service Status:"
    echo "   Apache2: $(systemctl is-active apache2)"
    echo "   Nginx:   $(systemctl is-active nginx)"
    echo ""
    echo "⚠️  NEXT STEPS:"
    echo "   1. Test the application on port 80 with Nginx"
    echo "   2. If everything works, stop Apache: sudo systemctl stop apache2"
    echo "   3. Enable Nginx autostart: sudo systemctl enable nginx"
    echo ""
    echo "🌐 Test URL: http://meditations.pihappy.me"
else
    echo "❌ Failed to start Nginx!"
    sudo systemctl status nginx
    exit 1
fi