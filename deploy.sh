#!/bin/bash

# Meditations App Deployment Script
# This script builds the frontend and deploys it to the correct location

set -e  # Exit on any error

echo "🚀 Starting Meditations App Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PROJECT_ROOT="/var/www/vhosts/pihappy.me/meditations.pihappy.me"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
DEPLOY_DIR="$PROJECT_ROOT"

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Change to project root
cd "$PROJECT_ROOT"

# Build frontend
print_status "Building frontend..."
cd "$FRONTEND_DIR"
GENERATE_SOURCEMAP=false npm run build

if [ $? -ne 0 ]; then
    print_error "Frontend build failed!"
    exit 1
fi

print_status "Frontend build completed successfully"

# Deploy build to root directory
print_status "Deploying build files..."
cd "$PROJECT_ROOT"

# Remove old static files (but keep other directories)
if [ -d "static" ]; then
    print_warning "Removing old static files..."
    rm -rf static
fi

if [ -f "index.html" ]; then
    rm -f index.html
fi

# Copy new build files
cp -r "$FRONTEND_DIR/build/"* "$DEPLOY_DIR/"

print_status "Build files deployed to $DEPLOY_DIR"

# Restart PM2 services
print_status "Restarting services..."
npx pm2 restart meditations-backend meditations-frontend

if [ $? -eq 0 ]; then
    print_status "Services restarted successfully"
else
    print_warning "Service restart had issues, but deployment completed"
fi

# Show deployment info
JS_FILE=$(ls static/js/main.*.js 2>/dev/null | head -1)
if [ -n "$JS_FILE" ]; then
    print_status "Deployed JavaScript: $JS_FILE"
fi

CSS_FILE=$(ls static/css/main.*.css 2>/dev/null | head -1)
if [ -n "$CSS_FILE" ]; then
    print_status "Deployed CSS: $CSS_FILE"
fi

echo ""
print_status "🎉 Deployment completed successfully!"
print_status "Visit: https://meditations.pihappy.me"
echo ""