# شرح Assignment Rule Conditions

## ✅ ERPNext يعمل تلقائياً - لا تحتاج ملفات خارجية!

Assignment Rule في ERPNext تعمل **تلقائياً** عند إنشاء أو تحديث Lead. لا تحتاج أي ملفات خارجية!

---

## 📝 ما هي الـ Conditions؟

### 1. **Assign Condition** (مطلوب) ⭐
**متى يتم توزيع Lead على مستخدم؟**

مثال:
```python
status == 'Lead' or status == 'Open'
```

**كيف يعمل:**
- عند إنشاء Lead جديد → ERPNext يتحقق من الشرط
- إذا الشرط **صحيح** → يوزع Lead على مستخدم (حسب Rule: Round Robin أو Load Balancing)
- إذا الشرط **خطأ** → لا يوزع

**أمثلة:**
```python
# توزيع جميع Leads
True

# توزيع Leads بحالة معينة
status == 'Open'

# توزيع Leads من مصدر معين
source == 'Facebook'

# توزيع Leads بشرطين
status == 'Open' and source == 'Website'
```

---

### 2. **Unassign Condition** (اختياري)
**متى يتم إلغاء التوزيع؟**

مثال:
```python
status == 'Closed' or status == 'Cancelled'
```

**كيف يعمل:**
- عند تحديث Lead → ERPNext يتحقق من الشرط
- إذا الشرط **صحيح** → يلغي التوزيع (يمسح الـ assignment)
- إذا الشرط **خطأ** → يبقي التوزيع

**أمثلة:**
```python
# إلغاء التوزيع عند الإغلاق
status == 'Closed'

# إلغاء التوزيع عند الإلغاء
status == 'Cancelled'

# إلغاء التوزيع عند تغيير المصدر
source == 'Internal'
```

---

### 3. **Close Condition** (اختياري)
**متى يتم إغلاق الـ assignment (ToDo)؟**

مثال:
```python
status == 'Invalid'
```

**كيف يعمل:**
- عند تحديث Lead → ERPNext يتحقق من الشرط
- إذا الشرط **صحيح** → يغلق الـ ToDo assignment (لكن لا يمسحه)
- إذا الشرط **خطأ** → يبقي الـ ToDo مفتوح

**الفرق بين Unassign و Close:**
- **Unassign**: يمسح الـ assignment تماماً
- **Close**: يغلق الـ ToDo لكن يبقي الـ assignment موجود

---

## 🔄 كيف يعمل ERPNext تلقائياً؟

### عند إنشاء Lead جديد:
1. ERPNext يتحقق من **Assign Condition**
2. إذا صح → يوزع Lead على مستخدم
3. ينشئ **ToDo** assignment تلقائياً

### عند تحديث Lead:
1. ERPNext يتحقق من **Unassign Condition** أولاً
2. إذا صح → يلغي التوزيع
3. ثم يتحقق من **Assign Condition**
4. إذا صح → يوزع Lead على مستخدم جديد
5. ثم يتحقق من **Close Condition**
6. إذا صح → يغلق الـ ToDo

---

## 📋 مثال عملي:

### Setup:
- **Assign Condition**: `status == 'Lead' or status == 'Open'`
- **Unassign Condition**: `status == 'Closed'`
- **Close Condition**: `status == 'Invalid'`
- **Rule**: `Load Balancing`
- **Users**: `user1@apex.com`, `user2@apex.com`, `user3@apex.com`

### السيناريو:
1. **إنشاء Lead جديد** بحالة `Open`
   - ✅ Assign Condition صح → يوزع على `user1@apex.com`
   - ينشئ ToDo assignment

2. **تغيير حالة Lead إلى `Closed`**
   - ✅ Unassign Condition صح → يلغي التوزيع
   - يمسح الـ assignment

3. **تغيير حالة Lead إلى `Open` مرة أخرى**
   - ✅ Assign Condition صح → يوزع على `user2@apex.com` (Load Balancing)
   - ينشئ ToDo assignment جديد

4. **تغيير حالة Lead إلى `Invalid`**
   - ✅ Close Condition صح → يغلق الـ ToDo
   - لكن يبقي الـ assignment موجود

---

## ⚠️ ملاحظة مهمة:

**Assignment Rule تعمل على `_assign` field (ToDo assignments) وليس `lead_owner` مباشرة!**

هذا يعني:
- ✅ سيتم إنشاء ToDo assignment تلقائياً
- ✅ المستخدم سيحصل على إشعار
- ❌ **لكن `lead_owner` field لن يتغير تلقائياً**

### إذا أردت تحديث `lead_owner` أيضاً:

**تحتاج كود إضافي في `hooks.py`:**

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

**ثم أضف function في `hooks.py`:**

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

---

## ⏰ متى يتم تنفيذ Assignment Rule؟

### ✅ **Assignment Rule تعمل فوراً (Event-Based) - وليس مجدولة!**

**لا يوجد خيار لتحديد "كل دقيقة" أو "كل ساعة" في Assignment Rule!**

Assignment Rule تعمل **فوراً** عند:
1. **إنشاء Lead جديد** → يتحقق من Assign Condition → يوزع تلقائياً
2. **تحديث Lead** → يتحقق من Conditions → يطبق التغييرات تلقائياً

**مثال:**
- أنشأت Lead جديد → **فوراً** يتم التوزيع (ليس بعد دقيقة أو ساعة!)
- حدثت Lead → **فوراً** يتم التحقق من Conditions

---

## 📅 Assignment Days (أيام الأسبوع)

**في شاشة Assignment Rule، يوجد قسم "Assignment Days":**

هذا يحدد **في أي أيام الأسبوع** تعمل القاعدة:

- **All Days**: تعمل كل أيام الأسبوع
- **Weekdays**: تعمل أيام العمل فقط (السبت - الخميس)
- **Weekends**: تعمل عطلة نهاية الأسبوع فقط (الجمعة - السبت)
- **Custom**: اختر أيام معينة (Monday, Tuesday, إلخ)

**مثال:**
- إذا حددت **Weekdays** فقط
- Lead تم إنشاؤه يوم **الجمعة** → لن يتم التوزيع (لأن الجمعة ليست weekday)
- Lead تم إنشاؤه يوم **السبت** → سيتم التوزيع (لأن السبت weekday)

---

## ❓ إذا أردت تنفيذ شيء كل دقيقة/ساعة/يوم؟

**Assignment Rule لا تدعم Schedule!**

إذا أردت تنفيذ شيء على schedule (كل دقيقة، كل ساعة، إلخ)، تحتاج:

### 1. **Scheduled Job Type** (من Setup → Automation → Scheduled Job Type)
- يمكنك إنشاء وظيفة مجدولة تعمل كل دقيقة/ساعة/يوم
- تحتاج كتابة كود في `hooks.py` → `scheduler_events`

### 2. **Auto Repeat** (من Setup → Automation → Auto Repeat)
- لتكرار مستندات معينة على schedule

---

## ✅ الخلاصة:

1. **Assignment Rule تعمل فوراً** عند إنشاء/تحديث Lead (Event-Based)
2. **لا يوجد schedule** في Assignment Rule (لا كل دقيقة، لا كل ساعة)
3. **Assignment Days** يحدد أيام الأسبوع التي تعمل فيها القاعدة
4. **إذا أردت schedule** → تحتاج Scheduled Job Type منفصل

---

## 🔍 التحقق من العمل:

1. **من Lead List**: راقب حقل **Assigned To**
2. **من ToDo List**: ستجد ToDo assignments جديدة
3. **من Assignment Rule**: راقب حقل **Last User**

