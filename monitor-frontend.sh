#!/bin/bash

echo "🔍 Real-time Frontend-Backend Communication Monitor"
echo "================================================"
echo "Open your browser to https://meditations.pihappy.me and navigate to 'Mijn Activiteiten'"
echo "This script will show all API calls made by the frontend"
echo ""
echo "Press Ctrl+C to stop monitoring"
echo ""

# Function to format timestamp
format_time() {
    echo "$(date '+%H:%M:%S')"
}

# Monitor backend logs for API calls
tail -f backend.log 2>/dev/null | while IFS= read -r line; do
    # Convert binary data to strings and filter for relevant API calls
    clean_line=$(echo "$line" | strings 2>/dev/null)
    
    # Check for activity-related API calls
    if echo "$clean_line" | grep -qi "activities"; then
        timestamp=$(format_time)
        echo "[$timestamp] 🔥 ACTIVITY API: $clean_line"
    fi
    
    # Check for my-activities calls  
    if echo "$clean_line" | grep -qi "my-activities"; then
        timestamp=$(format_time)
        echo "[$timestamp] 👤 MY-ACTIVITIES: $clean_line"
    fi
    
    # Check for join/leave calls
    if echo "$clean_line" | grep -qi "join\|leave"; then
        timestamp=$(format_time)
        echo "[$timestamp] 🤝 JOIN/LEAVE: $clean_line"
    fi
    
    # Check for cancel calls
    if echo "$clean_line" | grep -qi "cancel"; then
        timestamp=$(format_time)
        echo "[$timestamp] ❌ CANCEL: $clean_line"
    fi
    
    # Check for auth headers
    if echo "$clean_line" | grep -qi "x-user-id"; then
        timestamp=$(format_time)
        echo "[$timestamp] 🔐 AUTH: $clean_line"
    fi
    
    # Check for error responses
    if echo "$clean_line" | grep -qi "error\|fail"; then
        timestamp=$(format_time)
        echo "[$timestamp] 🚨 ERROR: $clean_line"
    fi
done