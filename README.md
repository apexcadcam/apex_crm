# Apex CRM

تطبيق CRM متقدم لـ ERPNext مع نظام ترحيل أوتوماتيكي للتخصيصات.

## المميزات

### 🔄 الترحيل الأوتوماتيكي

عند تثبيت التطبيق، يتم تلقائياً:

1. **نقل Custom Fields** من CRM DocTypes إلى Apex CRM
2. **نقل Property Setters** من CRM DocTypes إلى Apex CRM  
3. **نقل Client Scripts** من CRM DocTypes إلى Apex CRM
4. **تحديث Module** لجميع التخصيصات إلى "Apex CRM"

### 🎯 DocTypes المدعومة

- Lead (العملاء المحتملون)
- Opportunity (الفرص)
- Campaign (الحملات)
- Competitor (المنافسون)

### ✅ الفوائد

- **عدم التأثر بتحديثات ERPNext**: جميع التخصيصات في تطبيق منفصل
- **سهولة الصيانة**: كل التخصيصات في مكان واحد
- **قابلية النقل**: يمكن تثبيت التطبيق على أي سيرفر
- **قابلية الإزالة**: إلغاء التثبيت ينظف جميع التخصيصات

## التثبيت

### المتطلبات

- ERPNext v15+
- Frappe Framework v15+

### خطوات التثبيت

```bash
# 1. الحصول على التطبيق
cd /path/to/frappe-bench/apps
git clone [repository-url] apex_crm

# 2. تثبيت التطبيق
cd /path/to/frappe-bench
bench --site [site-name] install-app apex_crm
```

### ماذا يحدث عند التثبيت؟

```
Apex CRM: Starting Automatic Migration
================================================================================

📋 Migrating Custom Fields...
  Lead: Found 25 custom fields
    ✓ custom_full_name (Full Name)
    ✓ custom_campaign (Campaign)
    ...
  ✅ Migrated 25 fields from Lead
  
  Opportunity: Found 4 custom fields
    ✓ custom_website (Website)
    ...
  ✅ Migrated 4 fields from Opportunity

✅ Custom Fields Migration Complete

⚙️  Migrating Property Setters...
  Lead: Found 123 property setters
  ✅ Migrated 123 property setters from Lead
  
✅ Property Setters Migration Complete

📜 Migrating Client Scripts...
  Lead: Found 8 client scripts
    ✓ Hide Lead ID
    ✓ Lead Icons phone whatsapp
    ...
  ✅ Migrated 8 scripts from Lead

✅ Client Scripts Migration Complete

Apex CRM: Migration Completed Successfully!
================================================================================
```

## إلغاء التثبيت

```bash
bench --site [site-name] uninstall-app apex_crm
```

### ماذا يحدث عند إلغاء التثبيت؟

- حذف جميع Custom Fields المنقولة
- حذف جميع Property Setters المنقولة
- حذف جميع Client Scripts المنقولة
- عودة النظام لحالته الأصلية

## الهيكل

```
apex_crm/
├── apex_crm/
│   ├── __init__.py
│   ├── hooks.py          # تكوين التطبيق
│   ├── install.py        # منطق الترحيل الأوتوماتيكي
│   ├── uninstall.py      # منطق التنظيف
│   ├── fixtures/         # التخصيصات المصدرة
│   ├── public/
│   │   └── js/          # Client Scripts (مستقبلاً)
│   └── api/             # Server Logic (مستقبلاً)
├── MANIFEST.in
├── README.md
└── pyproject.toml
```

## التطوير المستقبلي

### المرحلة التالية

- [ ] نقل Client Scripts إلى ملفات JS
- [ ] إنشاء Custom DocTypes جديدة
- [ ] إضافة Reports مخصصة
- [ ] إضافة Dashboards

### المساهمة

جميع التخصيصات الجديدة يجب أن تتم في `apex_crm` وليس في ERPNext مباشرة.

## الدعم

للمشاكل والاقتراحات، يرجى فتح Issue على GitHub.

## الترخيص

MIT License
