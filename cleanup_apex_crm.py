#!/usr/bin/env python3
"""
Cleanup Script for apex_crm
Removes ALL customizations except Apex Contacts section

This script will:
1. Delete all Custom Fields except smart_contact_details
2. Delete all Property Setters
3. Delete all Client Scripts except essential ones
4. Keep ONLY Apex Contacts section

Run with: bench --site [site] execute apps/apex_crm/cleanup_apex_crm.py
"""

import frappe

def cleanup_apex_crm():
	"""Remove all apex_crm customizations except Apex Contacts section"""
	
	print("\n" + "="*80)
	print("Apex CRM Cleanup - Keeping ONLY Apex Contacts Section")
	print("="*80 + "\n")
	
	# Fields to KEEP
	fields_to_keep = [
		"smart_contact_details",  # The main Apex Contacts table
		"apex_contacts_section",  # Section break (if exists)
	]
	
	# Client Scripts to KEEP
	scripts_to_keep = [
		"Lead Default Contact Rows",  # Optional - adds default rows
	]
	
	try:
		# Step 1: Delete Custom Fields (except keepers)
		print("Step 1: Cleaning up Custom Fields...")
		custom_fields = frappe.get_all(
			"Custom Field",
			filters={
				"dt": "Lead",
				"module": "Apex CRM"
			},
			fields=["name", "fieldname", "label"]
		)
		
		deleted_fields = 0
		for field in custom_fields:
			if field.fieldname not in fields_to_keep:
				try:
					frappe.delete_doc("Custom Field", field.name, force=True, ignore_permissions=True)
					print(f"  ✓ Deleted: {field.fieldname} ({field.label})")
					deleted_fields += 1
				except Exception as e:
					print(f"  ✗ Failed to delete {field.fieldname}: {str(e)}")
			else:
				print(f"  ✓ Kept: {field.fieldname} ({field.label})")
		
		print(f"\n  Total deleted: {deleted_fields} custom fields")
		
		# Step 2: Delete Property Setters
		print("\nStep 2: Cleaning up Property Setters...")
		property_setters = frappe.get_all(
			"Property Setter",
			filters={
				"doc_type": "Lead",
				"module": "Apex CRM"
			},
			fields=["name", "field_name", "property"]
		)
		
		deleted_setters = 0
		for setter in property_setters:
			try:
				frappe.delete_doc("Property Setter", setter.name, force=True, ignore_permissions=True)
				print(f"  ✓ Deleted: {setter.field_name} - {setter.property}")
				deleted_setters += 1
			except Exception as e:
				print(f"  ✗ Failed to delete {setter.name}: {str(e)}")
		
		print(f"\n  Total deleted: {deleted_setters} property setters")
		
		# Step 3: Delete Client Scripts (except keepers)
		print("\nStep 3: Cleaning up Client Scripts...")
		client_scripts = frappe.get_all(
			"Client Script",
			filters={
				"dt": "Lead",
				"module": "Apex CRM"
			},
			fields=["name"]
		)
		
		deleted_scripts = 0
		for script in client_scripts:
			if script.name not in scripts_to_keep:
				try:
					frappe.delete_doc("Client Script", script.name, force=True, ignore_permissions=True)
					print(f"  ✓ Deleted: {script.name}")
					deleted_scripts += 1
				except Exception as e:
					print(f"  ✗ Failed to delete {script.name}: {str(e)}")
			else:
				print(f"  ✓ Kept: {script.name}")
		
		print(f"\n  Total deleted: {deleted_scripts} client scripts")
		
		# Step 4: Commit changes
		frappe.db.commit()
		
		print("\n" + "="*80)
		print("Cleanup Completed Successfully!")
		print("="*80)
		print(f"\nSummary:")
		print(f"  - Custom Fields deleted: {deleted_fields}")
		print(f"  - Property Setters deleted: {deleted_setters}")
		print(f"  - Client Scripts deleted: {deleted_scripts}")
		print(f"\nKept:")
		print(f"  - smart_contact_details (Apex Contacts table)")
		print(f"  - Lead Default Contact Rows (optional script)")
		print("\n" + "="*80 + "\n")
		
		return True
		
	except Exception as e:
		frappe.db.rollback()
		print(f"\n❌ Error during cleanup: {str(e)}")
		print(frappe.get_traceback())
		return False

# For direct execution
if __name__ == "__main__":
	cleanup_apex_crm()
