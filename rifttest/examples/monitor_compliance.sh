#!/bin/bash
# Real-time Compliance Monitoring Dashboard

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

clear

echo -e "${BLUE}OBINexus Compliance Monitor${NC}"
echo "============================"

# Start monitoring in background
riftsh -c "monitor" &
MONITOR_PID=$!

while true; do
    # Get current stats
    STATS=$(riftsh -c "compliance" 2>/dev/null)
    
    # Parse stats (simplified)
    VALIDATIONS=$(echo "$STATS" | grep "Validations:" | awk '{print $2}')
    VIOLATIONS=$(echo "$STATS" | grep "Violations:" | awk '{print $2}')
    
    # Calculate compliance rate
    if [ "$VALIDATIONS" -gt 0 ]; then
        TOTAL=$((VALIDATIONS + VIOLATIONS))
        RATE=$((VALIDATIONS * 100 / TOTAL))
    else
        RATE=100
    fi
    
    # Clear and redraw
    clear
    echo -e "${BLUE}OBINexus Compliance Monitor${NC}"
    echo "============================"
    echo
    echo -e "Compliance Rate: ${GREEN}${RATE}%${NC}"
    echo -e "Validations: ${GREEN}${VALIDATIONS}${NC}"
    echo -e "Violations:  ${RED}${VIOLATIONS}${NC}"
    echo
    
    # Show recent violations
    echo "Recent Activity:"
    tail -n 5 /var/log/riftraf_audit.log 2>/dev/null || echo "No audit log found"
    
    # Show active policies
    echo
    echo "Active Policies:"
    echo "- Article 3: Protection from degrading treatment"
    echo "- Article 8: Right to privacy" 
    echo "- Housing Act 1996 §202: Statutory reviews"
    echo "- #NoGhosting: Audit trail requirement"
    
    sleep 5
done
