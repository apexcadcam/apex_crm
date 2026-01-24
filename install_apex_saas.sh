#!/bin/bash
# Apex CRM One-Click Install Script
# Usage: ./install_apex_saas.sh [site-name]

SITE_NAME=$1

if [ -z "$SITE_NAME" ]; then
    echo "Usage: ./install_apex_saas.sh [site-name]"
    exit 1
fi

echo "🚀 Starting Apex CRM SaaS Installation for site: $SITE_NAME..."

# 1. Get Core Customization Layer (Dependency)
echo "📦 Fetching Apex Customization..."
if [ ! -d "apps/apex_customization" ]; then
    bench get-app https://github.com/apexcadcam/apex-customization
else
    echo "  (Already exists)"
fi

# 2. Get Apex CRM
echo "📦 Fetching Apex CRM..."
if [ ! -d "apps/apex_crm" ]; then
    bench get-app https://github.com/apexcadcam/apex_crm
else
    echo "  (Already exists)"
fi

# 3. Install Apps (Strict Order)
echo "🔧 Installing Apps..."
bench --site $SITE_NAME install-app apex_customization
bench --site $SITE_NAME install-app apex_crm

# 4. Force Migration (Triggers Schema Sync & Fiscal Year Setup)
echo "🔄 Running Migration..."
bench --site $SITE_NAME migrate

# 5. Clear Cache
echo "🧹 Clearing Cache..."
bench --site $SITE_NAME clear-cache

echo "✅ Apex CRM Installation Completed Successfully!"
