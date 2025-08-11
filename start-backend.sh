#!/bin/bash

# Backend Server Management Script
# Usage: ./start-backend.sh [start|restart|stop|status|logs]

BACKEND_DIR="backend"
SERVER_FILE="server.js"
PORT=5002

# Function to check if server is running
is_running() {
    pgrep -f "node ${SERVER_FILE}" > /dev/null
    return $?
}

# Function to get server PID
get_pid() {
    pgrep -f "node ${SERVER_FILE}"
}

# Function to start server
start_server() {
    if is_running; then
        echo "❌ Backend server is already running (PID: $(get_pid))"
        return 1
    fi
    
    echo "🚀 Starting backend server..."
    cd $BACKEND_DIR
    
    # Start server in background with output redirection
    npm start > ../backend.log 2>&1 &
    SERVER_PID=$!
    
    # Wait a bit and check if it started successfully
    sleep 3
    
    if is_running; then
        echo "✅ Backend server started successfully!"
        echo "📍 Server URL: http://localhost:$PORT"
        echo "📋 Logs: tail -f backend.log"
        echo "🆔 Process ID: $(get_pid)"
    else
        echo "❌ Failed to start backend server"
        echo "📋 Check logs: tail -f backend.log"
        return 1
    fi
}

# Function to stop server
stop_server() {
    if ! is_running; then
        echo "❌ Backend server is not running"
        return 1
    fi
    
    echo "🛑 Stopping backend server..."
    PID=$(get_pid)
    kill $PID
    
    # Wait for graceful shutdown
    sleep 2
    
    if is_running; then
        echo "⚡ Force killing server..."
        kill -9 $PID
        sleep 1
    fi
    
    if ! is_running; then
        echo "✅ Backend server stopped"
    else
        echo "❌ Failed to stop backend server"
        return 1
    fi
}

# Function to restart server
restart_server() {
    echo "🔄 Restarting backend server..."
    stop_server
    sleep 1
    start_server
}

# Function to show server status
show_status() {
    if is_running; then
        PID=$(get_pid)
        echo "✅ Backend server is running"
        echo "🆔 Process ID: $PID"
        echo "📍 Server URL: http://localhost:$PORT"
        echo "💾 Memory usage: $(ps -o pid,vsz,rss,comm -p $PID | tail -1)"
    else
        echo "❌ Backend server is not running"
    fi
}

# Function to show logs
show_logs() {
    if [ -f "backend.log" ]; then
        echo "📋 Recent backend logs (press Ctrl+C to exit):"
        tail -f backend.log
    else
        echo "❌ No log file found (backend.log)"
    fi
}

case "$1" in
    start)
        start_server
        ;;
    stop)
        stop_server
        ;;
    restart)
        restart_server
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    *)
        echo "🔧 Backend Server Manager"
        echo ""
        echo "Usage: $0 {start|stop|restart|status|logs}"
        echo ""
        echo "Commands:"
        echo "  start    - Start the backend server"
        echo "  stop     - Stop the backend server"
        echo "  restart  - Restart the backend server (useful after code changes)"
        echo "  status   - Show server status"
        echo "  logs     - Show live logs (Ctrl+C to exit)"
        echo ""
        echo "After making changes to backend code, use: ./start-backend.sh restart"
        exit 1
        ;;
esac

exit 0