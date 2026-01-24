# خطة التطوير الشاملة - Apex CRM

## الوضع الحالي 📊

### ✅ Phase 1: مكتملة

- [x] Smart Export (Flattened Excel)
- [x] Apex CRM Dropdown UI
- [x] Duplicate Manager
- [x] Lead Search

### ✅ Phase 2: Page-Based Permissions - **مكتملة!**

- [x] إنشاء Export/Import Manager Page
- [x] إنشاء Data Migration Manager Page
- [x] تحديث أزرار Lead List
- [x] تنظيف الملفات المؤقتة

### ✅ Phase 4: SaaS Deployment Readiness - **مكتملة!**

- [x] Dependencies Fix (pyproject.toml)
- [x] Schema Management (install.py updates)
- [x] One-Click Install Script (install_apex_saas.sh)

### ✅ Phase 3: CRM Dashboard - **مكتملة!**

- [x] Card View للموبايل
- [x] Grid View للديسكتوب
- [x] Advanced Search & Filters
- [x] Quick Actions

---

## Phase 2: Page-Based Permissions ✅

### ما تم إنجازه

#### 1. إنشاء Pages

**Export/Import Manager Page:**

- **Name:** `exportimportmanager`
- **Title:** Export/Import Manager
- **Module:** Apex CRM
- **Files:**
  - `apex_crm/page/export_import_manager/export_import_manager.json`
  - `apex_crm/page/export_import_manager/export_import_manager.js`
  - `apex_crm/page/export_import_manager/export_import_manager.py`

**Data Migration Manager Page:**

- **Name:** `datamigrationmanager`
- **Title:** Data Migration Manager
- **Module:** Apex CRM
- **Files:**
  - `apex_crm/page/data_migration_manager/data_migration_manager.json`
  - `apex_crm/page/data_migration_manager/data_migration_manager.js`
  - `apex_crm/page/data_migration_manager/data_migration_manager.py`

#### 2. تحديث JavaScript

**ملف:** `apex_crm/public/js/lead_list_unified.js`

**التغييرات:**

- تحديث زر "Export/Import Manager" ليفتح `exportimportmanager` page
- تحديث زر "Data Migration Manager" ليفتح `datamigrationmanager` page
- إزالة الكود القديم الذي كان يستدعي API مباشرة

#### 3. تنظيف الملفات

**تم نقل:**

- Apex CRM scripts → `apps/apex_crm/apex_crm/development_plan/scripts/`
- Temporary scripts → `archived/temp_scripts/`
- Guides → `docs/`

**النتيجة:**

- ✅ Bench root نظيف (0 Python files)
- ✅ MCP Server نظيف (12 ملف ضروري فقط)

---

## الصلاحيات الحالية

### كيف تعمل الصلاحيات الآن؟

**1. Page Permissions:**

- كل Page لها صلاحيات خاصة في Frappe
- يمكن التحكم فيها من: `Role Permission Manager`

**2. API Permissions:**

- `export_apex_contacts_to_excel()` - يتحقق من `Lead.export` أو `Lead.read`
- `import_apex_contacts_from_excel()` - يتحقق من `Lead.import` أو `Lead.write`
- `get_duplicate_groups()` - يتحقق من `duplicate-manager` page permission

### إضافة صلاحيات لـ Role جديد

**الخطوات:**

1. اذهب إلى: **Role Permission Manager**
2. اختر الـ Page: `exportimportmanager` أو `datamigrationmanager`
3. أضف الـ Role المطلوب
4. احفظ

**مثال:**

```
Page: exportimportmanager
Roles:
  - System Manager ✅
  - Sales Manager ✅ (جديد)
  - Sales User ❌
```

---

## Phase 3: CRM Dashboard 🎯

### الهدف

إنشاء Dashboard متقدم لإدارة الـ Leads مع:

- **Card View** للموبايل
- **Grid View** للديسكتوب
- **Advanced Search** مع فلاتر ذكية
- **Quick Actions** (Call, WhatsApp, Email)

### المرحلة 3.1: Card View للموبايل

**الهدف:** عرض Leads كـ Cards سهلة القراءة على الموبايل

**الخطوات:**

1. إنشاء Page جديد: `crm-dashboard`
2. تصميم Card Component:
   - صورة Lead (avatar)
   - الاسم
   - رقم الموبايل
   - آخر تفاعل
   - Quick Actions (Call, WhatsApp)

3. Responsive Design:
   - Mobile: 1 column
   - Tablet: 2 columns
   - Desktop: Grid View

### المرحلة 3.2: Grid View للديسكتوب

**الهدف:** عرض Leads في جدول متقدم مع فلاتر

**Features:**

- Sortable columns
- Inline editing
- Bulk actions
- Export selected

### المرحلة 3.3: Advanced Search

**الهدف:** بحث ذكي عبر كل حقول Lead

**Features:**

- Search by: Name, Mobile, Email, Facebook
- Filters: Status, Source, Owner
- Date range
- Save searches

### المرحلة 3.4: Quick Actions

**الهدف:** إجراءات سريعة من الـ Dashboard

**Actions:**

- 📞 Call (يفتح dialer)
- 💬 WhatsApp (يفتح WhatsApp)
- ✉️ Email (يفتح email client)
- 📝 Add Note
- 🔄 Change Status

---

## الملفات المهمة

### Apex CRM Files

- `apps/apex_crm/apex_crm/api.py` - Backend APIs
- `apps/apex_crm/apex_crm/public/js/lead_list_unified.js` - Lead List buttons
- `apps/apex_crm/apex_crm/page/export_import_manager/` - Export/Import Page
- `apps/apex_crm/apex_crm/page/data_migration_manager/` - Migration Page
- `apps/apex_crm/apex_crm/page/duplicate_manager/` - Duplicate Manager Page

### Development Scripts

- `apps/apex_crm/apex_crm/development_plan/scripts/` - Utility scripts

---

## Next Steps 🚀

1. **اختبار Phase 2:**
   - ✅ افتح Lead List
   - ✅ اضغط "Apex CRM"
   - ✅ جرب "Export/Import Manager"
   - ✅ جرب "Data Migration Manager"

2. **البدء في Phase 3:**
   - إنشاء `crm-dashboard` Page
   - تصميم Card Component
   - تطبيق Responsive Design

3. **Documentation:**
   - كتابة User Guide للـ Pages الجديدة
   - توثيق الصلاحيات

---

## ملاحظات مهمة ⚠️

### Page Names بدون شرطات

**المشكلة:** Frappe يقطع أسماء الـ Pages عند الشرطة الأخيرة

**الحل:** استخدمنا أسماء بدون شرطات:

- ✅ `exportimportmanager` (بدلاً من `export-import-manager`)
- ✅ `datamigrationmanager` (بدلاً من `data-migration-manager`)

### Cleanup

**تم تنظيف:**

- ✅ Bench root (0 Python files)
- ✅ MCP Server (12 ملف فقط)
- ✅ Apex CRM scripts منقولة لمكانها الصحيح

---

## الخلاصة

**Phase 1:** ✅ مكتملة
**Phase 2:** ✅ مكتملة
**Phase 3:** 🎯 جاهز للبدء!

**كل شيء جاهز للانتقال إلى CRM Dashboard!** 🚀
