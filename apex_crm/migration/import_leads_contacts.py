"""
Script to import Lead contact data from Excel/JSON to Apex CRM
Usage: bench --site all execute apex_crm.migration.import_leads_contacts.import_from_json --kwargs '{"file_path": "/path/to/file.json"}'
"""

import frappe
import json
import os

@frappe.whitelist()
def import_from_json(file_path=None):
	"""
	Import contact data from JSON file (exported from Excel)
	
	Expected format:
	[
		{
			"Lead ID": "LEAD-XXX",
			"Lead Name": "Name",
			"Type": "Mobile",
			"Country Code": "+20",
			"Value": "1234567890",
			"Is Primary": 1,
			"Notes": ""
		},
		...
	]
	"""
	if not file_path:
		frappe.throw("يرجى تحديد مسار الملف")
	
	if not os.path.exists(file_path):
		frappe.throw(f"الملف غير موجود: {file_path}")
	
	# Read JSON file
	with open(file_path, 'r', encoding='utf-8') as f:
		data = json.load(f)
	
	if not isinstance(data, list):
		frappe.throw("تنسيق الملف غير صحيح. يجب أن يكون قائمة من السجلات.")
	
	# Group by Lead ID
	leads_data = {}
	for row in data:
		lead_id = row.get('Lead ID')
		if not lead_id:
			continue
		
		if lead_id not in leads_data:
			leads_data[lead_id] = []
		
		leads_data[lead_id].append({
			'type': row.get('Type', 'Other'),
			'country_code': row.get('Country Code', ''),
			'value': row.get('Value', ''),
			'is_primary': row.get('Is Primary', 0),
			'notes': row.get('Notes', '')
		})
	
	# Import data
	success_count = 0
	error_count = 0
	errors = []
	
	for lead_id, contacts in leads_data.items():
		try:
			# Check if Lead exists
			if not frappe.db.exists('Lead', lead_id):
				error_count += 1
				errors.append(f"Lead {lead_id} غير موجود")
				continue
			
			# Get Lead document
			lead = frappe.get_doc('Lead', lead_id)
			
			# Initialize smart_contact_details if not exists
			if not lead.smart_contact_details:
				lead.smart_contact_details = []
			
			# Add contacts
			for contact in contacts:
				# Check for duplicates
				existing = False
				for existing_contact in lead.smart_contact_details:
					if (existing_contact.get('type') == contact['type'] and 
						existing_contact.get('value') == contact['value']):
						existing = True
						break
				
				if not existing:
					lead.append('smart_contact_details', {
						'type': contact['type'],
						'country_code': contact['country_code'],
						'value': contact['value'],
						'is_primary': contact['is_primary'],
						'notes': contact['notes']
					})
			
			# Save Lead
			lead.save(ignore_permissions=True)
			success_count += 1
			
		except Exception as e:
			error_count += 1
			errors.append(f"خطأ في Lead {lead_id}: {str(e)}")
			frappe.log_error(f"Import error for {lead_id}: {str(e)}")
	
	frappe.db.commit()
	
	return {
		'success': success_count,
		'errors': error_count,
		'error_list': errors[:10]  # First 10 errors
	}




















