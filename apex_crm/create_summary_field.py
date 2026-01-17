
import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

def execute():
    try:
        if not frappe.db:
            frappe.connect()
            
        print("Creating Custom Field 'smart_contact_summary' for Lead...")
        
        # Define field
        df = {
            "fieldname": "smart_contact_summary",
            "label": "Contact Details",
            "fieldtype": "Small Text", # Use Small Text to allow for multiple lines/icons
            "insert_after": "lead_name", 
            "hidden": 0,
            "read_only": 1,
            "in_list_view": 1, # Make it visible in list by default
            "columns": 2 # Give it more width in list view if possible
        }
        
        create_custom_field("Lead", df, is_system_generated=False)
        
        print("Custom Field Created Successfully.")
        frappe.clear_cache(doctype="Lead")
            
    except Exception as e:
        print(f"Error: {e}")
