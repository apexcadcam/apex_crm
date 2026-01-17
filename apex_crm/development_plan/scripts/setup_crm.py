import frappe
import sys

def setup():
	try:
		frappe.init(site="site1")
		frappe.connect()
	except:
		print("Could not connect to site1")
		return

	# JSON Data inline
	doc_data = {
	 "actions": [],
	 "creation": "2025-01-01 00:00:00.000000",
	 "doctype": "DocType",
	 "editable_grid": 1,
	 "engine": "InnoDB",
	 "field_order": [
	  "type",
	  "country_code",
	  "value",
	  "is_primary",
	  "contact_actions"
	 ],
	 "fields": [
	  {
	   "fieldname": "type",
	   "fieldtype": "Select",
	   "in_list_view": 1,
	   "label": "Type",
	   "options": "Phone\nMobile\nEmail\nWhatsApp\nTelegram\nLinkedIn\nFacebook\nInstagram\nWebsite\nOther",
	   "reqd": 1,
	   "columns": 2
	  },
	  {
	   "default": "+20",
	   "fieldname": "country_code",
	   "fieldtype": "Select",
	   "in_list_view": 1,
	   "label": "Code",
	   "options": "\n+20\n+966\n+971\n+965\n+974\n+973\n+968\n+1\n+44",
	   "columns": 1,
	   "depends_on": "eval:in_list(['Phone', 'Mobile', 'WhatsApp', 'Telegram'], doc.type)"
	  },
	  {
	   "fieldname": "value",
	   "fieldtype": "Data",
	   "in_list_view": 1,
	   "label": "Value / Number",
	   "reqd": 1,
	   "columns": 4
	  },
	  {
	   "default": "0",
	   "fieldname": "is_primary",
	   "fieldtype": "Check",
	   "in_list_view": 1,
	   "label": "Primary",
	   "columns": 1
	  },
	  {
	   "fieldname": "contact_actions",
	   "fieldtype": "HTML",
	   "label": "Actions",
	   "read_only": 1,
	   "columns": 3
	  }
	 ],
	 "istable": 1,
	 "links": [],
	 "modified": "2025-01-01 00:00:00.000000",
	 "modified_by": "Administrator",
	 "module": "Apex CRM",
	 "name": "Apex Contact Detail",
	 "owner": "Administrator",
	 "permissions": [],
	 "sort_field": "modified",
	 "sort_order": "DESC",
	 "states": []
	}

	if not frappe.db.exists("DocType", "Apex Contact Detail"):
		try:
			doc = frappe.get_doc(doc_data)
			doc.insert()
			print("Created DocType: Apex Contact Detail")
		except Exception as e:
			print(f"Error creating DocType: {e}")
	else:
		print("DocType Apex Contact Detail already exists")

	# Create Field
	if not frappe.db.exists("Custom Field", "Lead-smart_contact_details"):
		try:
			frappe.get_doc({
				"doctype": "Custom Field",
				"dt": "Lead",
				"fieldname": "smart_contact_details",
				"label": "Smart Contact Details",
				"fieldtype": "Table",
				"options": "Apex Contact Detail",
				"insert_after": "mobile_no",
				"module": "Apex CRM",
				"hidden": 0,
				"permlevel": 0
			}).insert()
			print("Created Custom Field: Lead-smart_contact_details")
		except Exception as e:
			print(f"Error creating Custom Field: {e}")
	else:
		print("Custom Field Lead-smart_contact_details already exists")

	frappe.db.commit()

if __name__ == "__main__":
	setup()
