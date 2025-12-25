#!/bin/bash

# Cleanup script for apex_crm before GitHub upload

cd /home/frappe/frappe-bench/apps/apex_crm

echo "Removing notification-related files..."
rm -rf apex_crm/doctype/apex_notification_settings
rm -rf apex_crm/doctype/apex_device_token
rm -f apex_crm/setup_notifications.py
rm -f apex_crm/setup_notifications_v2.py
rm -f apex_crm/cleanup_notifications.py
rm -f apex_crm/final_cleanup.py
rm -f apex_crm/force_cleanup.py

echo "Removing debug scripts..."
rm -f apex_crm/debug_*.py
rm -f apex_crm/test_fb_*.py

echo "Removing temporary fix scripts..."
rm -f apex_crm/fix_*.py
rm -f apex_crm/force_*.py

echo "Removing other temporary files..."
rm -f apex_crm/fix_db.sql
rm -f apex_crm/check_fields.py
rm -f apex_crm/check_fields_v2.py
rm -f apex_crm/check_x_options.py
rm -f apex_crm/diagnose_search.py
rm -f apex_crm/analyze_customer.py
rm -f apex_crm/clear_logs.py
rm -f apex_crm/create_lead_sources.py
rm -f apex_crm/create_interaction_log.py
rm -f apex_crm/inspect_index.py
rm -f apex_crm/isolate_section.py
rm -f apex_crm/list_scripts.py
rm -f apex_crm/reindex*.py
rm -f apex_crm/restore_*.py
rm -f apex_crm/update_*.py
rm -f apex_crm/verify_*.py
rm -f apex_crm/get_roles.py
rm -f apex_crm/assign_*.py
rm -f apex_crm/find_and_assign.py
rm -f apex_crm/list_users.py
rm -f apex_crm/grant_access.py
rm -f apex_crm/trigger_popup.py
rm -f apex_crm/debug_delivery.py

echo "Removing firebase service worker..."
rm -f apex_crm/public/js/firebase-messaging-sw.js

echo "Cleanup complete!"
echo "Files remaining in apex_crm:"
find apex_crm -type f -name "*.py" | grep -v __pycache__ | grep -v ".pyc" | wc -l
