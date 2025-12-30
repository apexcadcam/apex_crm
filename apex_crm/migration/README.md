# دليل نقل بيانات الاتصال من النظام القديم إلى Apex CRM

## الطريقة الموصى بها: استخدام Excel

### الخطوة 1: تصدير البيانات من ERPNext

قم بتشغيل الأمر التالي لتصدير بيانات Leads:

```bash
bench --site all execute apex_crm.migration.export_leads_contacts.export_to_excel
```

سيتم إنشاء ملف `lead_contacts_export.json` في مجلد الموقع.

### الخطوة 2: تحويل JSON إلى Excel

1. افتح ملف `lead_contacts_export.json` في Excel أو محرر JSON
2. انسخ البيانات
3. افتح Excel جديد
4. الصق البيانات في Excel
5. استخدم "Data > Text to Columns" لفصل الأعمدة إذا لزم الأمر

**أو استخدم Python:**

```python
import pandas as pd
import json

# قراءة JSON
with open('lead_contacts_export.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# تحويل إلى DataFrame
df = pd.DataFrame(data)

# حفظ كـ Excel
df.to_excel('lead_contacts_export.xlsx', index=False)
```

### الخطوة 3: تنسيق البيانات في Excel

يجب أن يحتوي Excel على الأعمدة التالية:

| Lead ID | Lead Name | Type | Country Code | Value | Is Primary | Notes |
|---------|-----------|------|--------------|-------|------------|-------|
| LEAD-001 | Name 1 | Mobile | +20 | 1234567890 | 1 | |
| LEAD-001 | Name 1 | Email | | email@example.com | 0 | |
| LEAD-002 | Name 2 | Phone | +20 | 9876543210 | 0 | |

**أنواع الاتصال المتاحة:**
- Mobile
- Phone
- Email
- WhatsApp
- Telegram
- Website
- Facebook
- Instagram
- LinkedIn
- TikTok
- Snapchat
- X
- Location
- Other

### الخطوة 4: استيراد البيانات

#### الطريقة 1: استخدام Script Python

```bash
bench --site all execute apex_crm.migration.import_leads_contacts.import_from_json --kwargs '{"file_path": "/path/to/lead_contacts_export.json"}'
```

#### الطريقة 2: استخدام Data Import Tool في Frappe

1. اذهب إلى: **Setup > Data > Data Import**
2. اختر DocType: **Lead**
3. ارفع ملف Excel
4. قم بتعيين Mapping للحقول
5. استورد البيانات

### الطريقة البديلة: استخدام Python مباشرة

إذا كنت تريد نقل البيانات مباشرة بدون Excel:

```python
import frappe

# Get Lead
lead = frappe.get_doc('Lead', 'LEAD-XXX')

# Add contact
lead.append('smart_contact_details', {
    'type': 'Mobile',
    'country_code': '+20',
    'value': '1234567890',
    'is_primary': 1
})

lead.save()
```

## ملاحظات مهمة

1. **Country Code**: يجب أن يكون بالتنسيق `+20` أو `+966` إلخ
2. **Is Primary**: استخدم `1` للحقل الأساسي، `0` للباقي
3. **Type**: يجب أن يطابق أحد الأنواع المذكورة أعلاه
4. **Duplicates**: Script الاستيراد يتخطى التكرارات تلقائياً


