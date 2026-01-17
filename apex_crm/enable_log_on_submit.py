
import frappe

def execute():
    # 1. Ensure 'interaction_history' field in 'Lead' is Allow on Submit
    # It might be in 'Lead' doctype directly (if customized) or in Property Setter
    
    # Check Custom Field
    cf = frappe.db.get_value("Custom Field", {"dt": "Lead", "fieldname": "interaction_history"}, "name")
    if cf:
        doc = frappe.get_doc("Custom Field", cf)
        doc.allow_on_submit = 1
        doc.save()
        print(f"Updated Custom Field {cf} to allow on submit.")
    
    # Check Property Setter (overrides standard field)
    ps_name = frappe.db.get_value("Property Setter", {"doc_type": "Lead", "field_name": "interaction_history", "property": "allow_on_submit"}, "name")
    if ps_name:
        frappe.db.set_value("Property Setter", ps_name, "value", "1")
        print(f"Updated Property Setter {ps_name} to allow on submit.")
    else:
        # Create Property Setter if it doesn't exist and field is standard
        # But interaction_history is likely custom. If standard, we need PS.
        # Assuming it is custom field as per previous context.
        pass

    frappe.db.commit()
    print("Permissions updated.")

if __name__ == "__main__":
    execute()
