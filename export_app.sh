#!/bin/bash
# Apex CRM Export Script
# This script exports the app with all fixtures and customizations

set -e

APP_NAME="apex_crm"
BENCH_PATH="/home/frappe/frappe-bench"
APP_PATH="$BENCH_PATH/apps/$APP_NAME"

echo "=========================================="
echo "Apex CRM Export Script"
echo "=========================================="
echo ""

# Step 1: Export Fixtures
echo "📦 Step 1: Exporting Fixtures..."
cd $BENCH_PATH
bench --site all export-fixtures --app $APP_NAME

# Step 2: Verify Fixtures
echo ""
echo "✅ Step 2: Verifying Fixtures..."
if [ -f "$APP_PATH/apex_crm/fixtures/custom_field.json" ]; then
    echo "  ✓ custom_field.json exists"
else
    echo "  ❌ custom_field.json missing!"
    exit 1
fi

if [ -f "$APP_PATH/apex_crm/fixtures/client_script.json" ]; then
    echo "  ✓ client_script.json exists"
else
    echo "  ❌ client_script.json missing!"
    exit 1
fi

if [ -f "$APP_PATH/apex_crm/fixtures/property_setter.json" ]; then
    echo "  ✓ property_setter.json exists"
else
    echo "  ⚠️  property_setter.json missing (optional)"
fi

# Step 3: Verify DocTypes
echo ""
echo "✅ Step 3: Verifying DocTypes..."
if [ -d "$APP_PATH/apex_crm/doctype/apex_contact_detail" ]; then
    echo "  ✓ apex_contact_detail exists"
else
    echo "  ❌ apex_contact_detail missing!"
    exit 1
fi

if [ -d "$APP_PATH/apex_crm/doctype/apex_ignored_duplicate" ]; then
    echo "  ✓ apex_ignored_duplicate exists"
else
    echo "  ❌ apex_ignored_duplicate missing!"
    exit 1
fi

if [ -d "$APP_PATH/apex_crm/doctype/apex_interaction_log" ]; then
    echo "  ✓ apex_interaction_log exists"
else
    echo "  ❌ apex_interaction_log missing!"
    exit 1
fi

# Step 4: Verify Pages
echo ""
echo "✅ Step 4: Verifying Pages..."
if [ -d "$APP_PATH/apex_crm/page/duplicate_manager" ]; then
    echo "  ✓ duplicate_manager page exists"
else
    echo "  ❌ duplicate_manager page missing!"
    exit 1
fi

# Step 5: Verify Public Files
echo ""
echo "✅ Step 5: Verifying Public Files..."
if [ -f "$APP_PATH/apex_crm/public/js/lead.js" ]; then
    echo "  ✓ lead.js exists"
else
    echo "  ❌ lead.js missing!"
    exit 1
fi

if [ -f "$APP_PATH/apex_crm/public/js/lead_list.js" ]; then
    echo "  ✓ lead_list.js exists"
else
    echo "  ❌ lead_list.js missing!"
    exit 1
fi

# Step 6: Verify API Files
echo ""
echo "✅ Step 6: Verifying API Files..."
if [ -f "$APP_PATH/apex_crm/api.py" ]; then
    echo "  ✓ api.py exists"
else
    echo "  ❌ api.py missing!"
    exit 1
fi

# Step 7: Create Archive
echo ""
echo "📦 Step 7: Creating Archive..."
cd $BENCH_PATH/apps
ARCHIVE_NAME="${APP_NAME}_export_$(date +%Y%m%d_%H%M%S).tar.gz"

tar --exclude='node_modules' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='.git' \
    --exclude='*.pyc' \
    --exclude='.pytest_cache' \
    --exclude='*.egg-info' \
    -czf $ARCHIVE_NAME $APP_NAME/

ARCHIVE_SIZE=$(du -h $ARCHIVE_NAME | cut -f1)

echo ""
echo "=========================================="
echo "✅ Export Completed Successfully!"
echo "=========================================="
echo ""
echo "Archive: $ARCHIVE_NAME"
echo "Size: $ARCHIVE_SIZE"
echo "Location: $BENCH_PATH/apps/"
echo ""
echo "To install on another server:"
echo "1. Copy the archive to the new server"
echo "2. Extract: tar -xzf $ARCHIVE_NAME"
echo "3. Install: bench get-app apex_crm && bench install-app apex_crm"
echo "4. Import fixtures: bench --site all import-fixtures"
echo "5. Migrate: bench migrate && bench restart"
echo ""



















