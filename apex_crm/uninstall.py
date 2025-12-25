"""
Uninstallation hooks for Apex CRM app
"""

import frappe


def before_uninstall():
	"""
	Clean up all customizations created by Apex CRM app
	This ensures the app can be uninstalled cleanly without leaving artifacts
	"""
	try:
		# Delete Custom Fields created by this app
		custom_fields = frappe.get_all(
			"Custom Field",
			filters={"module": "Apex CRM"},
			pluck="name"
		)
		
		for field_name in custom_fields:
			frappe.delete_doc("Custom Field", field_name, force=True, ignore_permissions=True)
		
		if custom_fields:
			frappe.db.commit()
			print(f"Deleted {len(custom_fields)} Custom Fields")
		
		# Delete Property Setters created by this app (if any)
		property_setters = frappe.get_all(
			"Property Setter",
			filters={"module": "Apex CRM"},
			pluck="name"
		)
		
		for ps_name in property_setters:
			frappe.delete_doc("Property Setter", ps_name, force=True, ignore_permissions=True)
		
		if property_setters:
			frappe.db.commit()
			print(f"Deleted {len(property_setters)} Property Setters")
		
		# Delete Custom HTML Blocks created by this app (if any)
		# Uncomment when you add custom HTML blocks
		# custom_blocks = frappe.get_all(
		# 	"Custom HTML Block",
		# 	filters={"module": "Apex CRM"},
		# 	pluck="name"
		# )
		# 
		# for block_name in custom_blocks:
		# 	frappe.delete_doc("Custom HTML Block", block_name, force=True, ignore_permissions=True)
		# 
		# if custom_blocks:
		# 	frappe.db.commit()
		# 	print(f"Deleted {len(custom_blocks)} Custom HTML Blocks")
		
		print("Apex CRM app cleanup completed successfully")
		
	except Exception as e:
		frappe.log_error(title="Apex CRM Uninstall Error", message=frappe.get_traceback())
		print(f"Error during Apex CRM cleanup: {str(e)}")
