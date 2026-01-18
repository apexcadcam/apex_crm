# دليل إعداد Assignment Rule لتوزيع Leads تلقائياً في ERPNext

## ✅ نعم، ERPNext لديه خاصية توزيع Leads تلقائياً!

ERPNext يحتوي على نظام **Assignment Rule** يمكن استخدامه لتوزيع Leads تلقائياً على Sales Team.

## 📋 كيفية الإعداد

### 1. إنشاء Assignment Rule

1. اذهب إلى: **Setup → Automation → Assignment Rule**
2. اضغط **New**
3. املأ البيانات التالية:
   - **Document Type**: `Lead`
   - **Priority**: `1` (كلما زاد الرقم زادت الأولوية)
   - **Disabled**: غير مفعل
   - **Description**: `توزيع Leads على Sales Team`

### 2. إعداد Assignment Rules

#### Assign Condition (شرط التوزيع):
```
status == 'Lead' or status == 'Open'
```
أو إذا كنت تريد توزيع جميع Leads:
```
True
```

#### Rule (طريقة التوزيع):
يمكنك اختيار واحدة من:

1. **Round Robin** (التوزيع الدائري):
   - يوزع Leads بالتساوي على المستخدمين بالتناوب
   - مثال: Lead 1 → User A, Lead 2 → User B, Lead 3 → User A, ...

2. **Load Balancing** (التوازن في الحمل):
   - يوزع Leads على المستخدم الذي لديه أقل عدد من المهام المفتوحة
   - أفضل لتوزيع متوازن

3. **Based on Field** (بناءً على حقل):
   - يوزع بناءً على قيمة حقل معين في Lead
   - مثال: يمكن ربطه بـ Territory أو Source

### 3. إضافة المستخدمين

في قسم **Users**:
- أضف جميع المستخدمين الذين تريد توزيع Leads عليهم
- يمكنك إضافة أكثر من مستخدم

### 4. Assignment Days (أيام التوزيع)

- حدد الأيام التي تريد تطبيق القاعدة فيها
- مثال: جميع أيام الأسبوع

## ⚠️ ملاحظة مهمة

**Assignment Rule الحالي في ERPNext يعمل على `_assign` field (ToDo assignments) وليس `lead_owner` مباشرة!**

هذا يعني:
- ✅ سيتم إنشاء ToDo assignment لكل Lead تلقائياً
- ✅ المستخدم سيحصل على إشعار
- ❌ **لكن `lead_owner` field لن يتغير تلقائياً**

## 🔧 الحل: تعديل Assignment Rule لتحديث lead_owner

إذا كنت تريد تحديث `lead_owner` مباشرة، يجب إضافة hook أو تعديل Assignment Rule.

### الحل المقترح: إضافة After Save Hook

يمكن إضافة hook في `hooks.py`:

```python
def on_update(doc, method):
    # بعد تطبيق Assignment Rule
    # تحديث lead_owner من _assign
    if doc.get("_assign"):
        assigned_users = frappe.parse_json(doc._assign)
        if assigned_users:
            doc.db_set("lead_owner", assigned_users[0], update_modified=False)
```

أو يمكن إنشاء Custom Assignment Rule Method:

```python
# في apex_crm/hooks.py
def on_update_lead(doc, method):
    """Update lead_owner when Lead is assigned"""
    if doc.get("_assign"):
        assigned_users = frappe.parse_json(doc._assign)
        if assigned_users and assigned_users[0] != doc.lead_owner:
            doc.db_set("lead_owner", assigned_users[0], update_modified=False)
```

ثم في `hooks.py`:
```python
doc_events = {
    "Lead": {
        "on_update": "apex_crm.hooks.on_update_lead"
    }
}
```

## 📝 خطوات التنفيذ العملية

### الخطوة 1: إنشاء Assignment Rule
1. Setup → Automation → Assignment Rule → New
2. Document Type: Lead
3. Assign Condition: `status == 'Lead' or status == 'Open'`
4. Rule: Load Balancing (أو Round Robin)
5. أضف المستخدمين
6. Save

### الخطوة 2: تفعيل التوزيع التلقائي
- Assignment Rule ستعمل تلقائياً عند إنشاء/تحديث Lead
- سيتم إنشاء ToDo assignment تلقائياً

### الخطوة 3 (اختياري): ربط lead_owner
- إضافة hook لتحديث `lead_owner` من `_assign`

## 🎯 مثال عملي

### Scenario: توزيع Leads على 3 Sales Users

1. **إنشاء Assignment Rule**:
   - Name: `Lead Distribution - Sales Team`
   - Document Type: `Lead`
   - Assign Condition: `status in ('Lead', 'Open')`
   - Rule: `Load Balancing`
   - Users:
     - sales@example.com
     - sales2@example.com
     - sales3@example.com

2. **النتيجة**:
   - عند إنشاء Lead جديد، سيتم توزيعه على المستخدم الذي لديه أقل عدد من Leads
   - سيحصل المستخدم على إشعار ToDo

## 🔍 التحقق من التوزيع

بعد الإعداد، يمكنك التحقق من:
1. Lead List → فلتر بـ `_assign` field
2. ToDo List → سترى جميع Leads المخصصة
3. User Dashboard → سيرى كل مستخدم Leads المخصصة له

## 📚 مراجع

- ERPNext Assignment Rule Documentation
- Frappe Framework Automation Docs
- `apps/frappe/frappe/automation/doctype/assignment_rule/assignment_rule.py`

















