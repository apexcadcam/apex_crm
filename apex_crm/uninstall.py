"""
Uninstallation hooks for Apex CRM app
Complete cleanup to restore system to original state
"""

import frappe


def before_uninstall():
	"""
	Clean up all customizations created by Apex CRM app
	This ensures the app can be uninstalled cleanly without leaving artifacts
	"""
	print("\
" + "="*80)
	print("Apex CRM: Starting Uninstallation Cleanup")
	print("="*80 + "\
")
	
	try:
		# Step 1: Delete Client Scripts
		delete_client_scripts()
		
		# Step 2: Delete Custom Fields (this will also remove child table data)
		delete_custom_fields()
		
		# Step 3: Delete Property Setters
		delete_property_setters()
		
		# Step 4: Delete Custom DocTypes
		delete_custom_doctypes()
		
		# Step 5: Delete Pages
		delete_pages()
		
		print("\
" + "="*80)
		print("Apex CRM: Uninstallation Cleanup Completed Successfully")
		print("="*80 + "\
")
		
	except Exception as e:
		frappe.log_error(title="Apex CRM Uninstall Error", message=frappe.get_traceback())
		print(f"\
❌ Error during Apex CRM cleanup: {str(e)}\
")


def delete_client_scripts():
	"""Delete all Client Scripts created by this app"""
	print("🗑️  Deleting Client Scripts...")
	
	client_scripts = frappe.get_all(
		"Client Script",
		filters={"module": "Apex CRM"},
		pluck="name"
	)
	
	for script_name in client_scripts:
		try:
			frappe.delete_doc("Client Script", script_name, force=True, ignore_permissions=True)
			print(f"  ✓ Deleted: {script_name}")
		except Exception as e:
			print(f"  ⚠️  Failed to delete {script_name}: {str(e)}")
	
	if client_scripts:
		frappe.db.commit()
		print(f"✅ Deleted {len(client_scripts)} Client Scripts\
")
	else:
		print("  ℹ️  No Client Scripts found\
")


def delete_custom_fields():
	"""Delete all Custom Fields created by this app"""
	print("🗑️  Deleting Custom Fields...")
	
	custom_fields = frappe.get_all(
		"Custom Field",
		filters={"module": "Apex CRM"},
		fields=["name", "dt", "fieldname"],
		order_by="dt, idx"
	)
	
	for field in custom_fields:
		try:
			# Delete the field (this will also delete child table data)
			frappe.delete_doc("Custom Field", field.name, force=True, ignore_permissions=True)
			print(f"  ✓ Deleted: {field.dt}.{field.fieldname}")
		except Exception as e:
			print(f"  ⚠️  Failed to delete {field.dt}.{field.fieldname}: {str(e)}")
	
	if custom_fields:
		frappe.db.commit()
		print(f"✅ Deleted {len(custom_fields)} Custom Fields\
")
	else:
		print("  ℹ️  No Custom Fields found\
")


def delete_property_setters():
	"""Delete all Property Setters created by this app"""
	print("🗑️  Deleting Property Setters...")
	
	property_setters = frappe.get_all(
		"Property Setter",
		filters={"module": "Apex CRM"},
		pluck="name"
	)
	
	for ps_name in property_setters:
		try:
			frappe.delete_doc("Property Setter", ps_name, force=True, ignore_permissions=True)
		except Exception as e:
			print(f"  ⚠️  Failed to delete {ps_name}: {str(e)}")
	
	if property_setters:
		frappe.db.commit()
		print(f"✅ Deleted {len(property_setters)} Property Setters\
")
	else:
		print("  ℹ️  No Property Setters found\
")


def delete_custom_doctypes():
	"""Delete all Custom DocTypes created by this app"""
	print("🗑️  Deleting Custom DocTypes...")
	
	# List of custom DocTypes to delete
	custom_doctypes = [
		"Apex Interaction Log",  # Child table - delete first
		"Apex Contact Detail",   # Child table
		"Apex Ignored Duplicate" # Regular DocType
	]
	
	for doctype_name in custom_doctypes:
		if frappe.db.exists("DocType", doctype_name):
			try:
				# Delete all records first (for non-child tables)
				meta = frappe.get_meta(doctype_name)
				if not meta.istable:
					records = frappe.get_all(doctype_name, pluck="name")
					for record in records:
						frappe.delete_doc(doctype_name, record, force=True, ignore_permissions=True)
					if records:
						print(f"  ✓ Deleted {len(records)} records from {doctype_name}")
				
				# Delete the DocType itself
				frappe.delete_doc("DocType", doctype_name, force=True, ignore_permissions=True)
				print(f"  ✓ Deleted DocType: {doctype_name}")
			except Exception as e:
				print(f"  ⚠️  Failed to delete {doctype_name}: {str(e)}")
		else:
			print(f"  ℹ️  {doctype_name} not found")
	
	frappe.db.commit()
	print("✅ Custom DocTypes cleanup complete\
")


def delete_pages():
	"""Delete all Pages created by this app"""
	print("🗑️  Deleting Pages...")
	
	pages = frappe.get_all(
		"Page",
		filters={"module": "Apex CRM"},
		pluck="name"
	)
	
	for page_name in pages:
		try:
			frappe.delete_doc("Page", page_name, force=True, ignore_permissions=True)
			print(f"  ✓ Deleted Page: {page_name}")
		except Exception as e:
			print(f"  ⚠️  Failed to delete {page_name}: {str(e)}")
	
	if pages:
		frappe.db.commit()
		print(f"✅ Deleted {len(pages)} Pages\
")
	else:
		print("  ℹ️  No Pages found\
")
