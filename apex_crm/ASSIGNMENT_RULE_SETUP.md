# دليل إعداد Assignment Rule يدوياً

## 📋 إنشاء Assignment Rule يدوياً

### 1. من الواجهة:
- اذهب إلى: **Setup → Automation → Assignment Rule**
- اضغط **+ Add Assignment Rule**
- املأ البيانات:
  - **Name**: `lead-aut-not` (أو أي اسم تريده)
  - **Document Type**: `Lead`
  - **Priority**: `1`
  - **Disabled**: غير مفعّل
  - **Description**: `Automatic Lead Assignment`
  - **Assign Condition**: `status == 'Lead' or status == 'Open'`
  - **Rule**: `Load Balancing` أو `Round Robin`
  - **Users**: أضف المستخدمين الذين تريد توزيع Leads عليهم

### 2. حفظ:
- اضغط **Save**

---

---

## ⚠️ ملاحظة مهمة:

**ERPNext يعمل تلقائياً بدون أي ملفات خارجية!**

Assignment Rule تعمل تلقائياً عند إنشاء/تحديث Lead. الـ Conditions هي Python expressions بسيطة لتحديد متى يتم تطبيق القاعدة.

**الكود الإضافي مطلوب فقط إذا أردت تحديث `lead_owner` من `_assign`** (لأن Assignment Rule تعمل على `_assign` فقط وليس `lead_owner` مباشرة).

---

## 🔧 أين تكتب الكود إذا احتاج؟

### 1. لتحديث `lead_owner` من `_assign` تلقائياً:

**الملف**: `apps/apex_crm/apex_crm/hooks.py`

**أضف في قسم `doc_events`:**

```python
doc_events = {
	"Lead": {
		"on_update": [
			"apex_crm.api.sync_contacts",  # موجود بالفعل
			"apex_crm.hooks.update_lead_owner_from_assignment"  # أضف هذا
		]
	}
}
```

**ثم أنشئ ملف**: `apps/apex_crm/apex_crm/hooks.py` (أو أضف في نفس الملف):

```python
def update_lead_owner_from_assignment(doc, method):
	"""
	تحديث lead_owner من _assign بعد تطبيق Assignment Rule
	"""
	if doc.get("_assign"):
		import json
		assigned_users = json.loads(doc._assign) if isinstance(doc._assign, str) else doc._assign
		if assigned_users and len(assigned_users) > 0:
			new_owner = assigned_users[0]
			if doc.lead_owner != new_owner:
				doc.db_set("lead_owner", new_owner, update_modified=False)
```

---

### 2. لإضافة وظيفة مجدولة (Scheduled Job):

**الملف**: `apps/apex_crm/apex_crm/hooks.py`

**أضف في قسم `scheduler_events`:**

```python
scheduler_events = {
	"cron": {
		"* * * * *": [  # كل دقيقة
			"apex_crm.tasks.your_function_name"
		]
	}
}
```

**ثم أنشئ ملف**: `apps/apex_crm/apex_crm/tasks.py`:

```python
import frappe

def your_function_name():
	# كودك هنا
	pass
```

**لتسجيل الوظيفة:**
```bash
bench --site standard execute apex_crm.sync_scheduled_job.sync
```

---

### 3. لإضافة API endpoint:

**الملف**: `apps/apex_crm/apex_crm/api.py`

```python
@frappe.whitelist()
def your_api_function():
	# كودك هنا
	return {"status": "success"}
```

---

### 4. لإضافة Client Script (JavaScript):

**الملف**: `apps/apex_crm/apex_crm/public/js/lead.js` (أو ملف جديد)

**ثم في `hooks.py`:**

```python
doctype_js = {
	"Lead": "public/js/lead.js"
}
```

---

## 📝 ملاحظات مهمة

1. **Assignment Rule** تعمل تلقائياً على `_assign` field (ToDo assignments)
2. **`lead_owner`** لا يتحدث تلقائياً - تحتاج كود إضافي
3. **Scheduler** يجب أن يكون مفعّل: `bench --site standard scheduler status`
4. بعد أي تعديل في `hooks.py`: `bench --site standard clear-cache`

---

## 🔍 التحقق من Assignment Rule

1. **من Lead List**: راقب حقل **Assigned To**
2. **من ToDo List**: ستجد ToDo assignments جديدة
3. **من Assignment Rule**: راقب حقل **Last User**

---

## 📚 الملفات المهمة

- `apps/apex_crm/apex_crm/hooks.py` - Hooks و Events
- `apps/apex_crm/apex_crm/api.py` - API Endpoints
- `apps/apex_crm/apex_crm/tasks.py` - Scheduled Tasks (إذا احتجت)
- `apps/apex_crm/apex_crm/public/js/` - JavaScript Files

---

## ✅ بعد التعديلات

```bash
# مسح الكاش
bench --site standard clear-cache

# إعادة تحميل hooks (إذا أضفت scheduler_events)
bench --site standard migrate
```

