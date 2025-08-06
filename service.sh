#!/bin/bash

# Meditations Backend Service Management Script
# Usage: ./service.sh [start|stop|restart|status|logs|enable|disable]

SERVICE_NAME="meditations-backend"

case "$1" in
    start)
        echo "🚀 Starting $SERVICE_NAME..."
        systemctl --user start $SERVICE_NAME
        systemctl --user status $SERVICE_NAME --no-pager
        ;;
    stop)
        echo "🛑 Stopping $SERVICE_NAME..."
        systemctl --user stop $SERVICE_NAME
        echo "Service stopped."
        ;;
    restart)
        echo "🔄 Restarting $SERVICE_NAME..."
        systemctl --user restart $SERVICE_NAME
        systemctl --user status $SERVICE_NAME --no-pager
        ;;
    status)
        echo "📊 Status of $SERVICE_NAME:"
        systemctl --user status $SERVICE_NAME --no-pager
        ;;
    logs)
        echo "📋 Logs for $SERVICE_NAME (press Ctrl+C to exit):"
        journalctl --user -u $SERVICE_NAME -f
        ;;
    enable)
        echo "✅ Enabling $SERVICE_NAME to start on boot..."
        systemctl --user enable $SERVICE_NAME
        echo "Service enabled."
        ;;
    disable)
        echo "❌ Disabling $SERVICE_NAME from starting on boot..."
        systemctl --user disable $SERVICE_NAME
        echo "Service disabled."
        ;;
    *)
        echo "🔧 Meditations Backend Service Manager"
        echo ""
        echo "Usage: $0 {start|stop|restart|status|logs|enable|disable}"
        echo ""
        echo "Commands:"
        echo "  start    - Start the service"
        echo "  stop     - Stop the service" 
        echo "  restart  - Restart the service"
        echo "  status   - Show service status"
        echo "  logs     - Show live logs (Ctrl+C to exit)"
        echo "  enable   - Enable service to start on boot"
        echo "  disable  - Disable service from starting on boot"
        echo ""
        exit 1
        ;;
esac

exit 0