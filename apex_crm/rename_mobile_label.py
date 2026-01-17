
import frappe
from frappe.custom.doctype.property_setter.property_setter import make_property_setter

def execute():
    try:
        if not frappe.db:
            frappe.connect()
            
        fields_to_rename = ["mobile_no", "custom_mobile_number_1"]
        
        for field in fields_to_rename:
            # Check if field exists
            if frappe.get_meta("Lead").get_field(field):
                print(f"Renaming {field} to 'Mobile'...")
                make_property_setter("Lead", field, "label", "Mobile", "Data")
            else:
                print(f"Field {field} not found, skipping.")
                
        frappe.clear_cache(doctype="Lead")
        print("Done.")

    except Exception as e:
        print(f"Error: {e}")
