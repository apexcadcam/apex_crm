
import frappe

def execute():
    print("--- Migrating custom_search_index to Text ---")
    
    # 1. Update Property Setter / DocField
    fraud_exists = frappe.db.exists("Property Setter", {
        "doc_type": "Lead", 
        "field_name": "custom_search_index", 
        "property": "fieldtype"
    })
    
    if fraud_exists:
        frappe.db.set_value("Property Setter", {
            "doc_type": "Lead", 
            "field_name": "custom_search_index", 
            "property": "fieldtype"
        }, "value", "Text")
    else:
        # Create it
        frappe.make_property_setter({
            "doctype": "Lead",
            "fieldname": "custom_search_index",
            "property": "fieldtype",
            "value": "Text",
            "doctype_or_field": "DocField"
        })
        
    # Also remove length if any property setter exists for it
    if frappe.db.exists("Property Setter", {"doc_type": "Lead", "field_name": "custom_search_index", "property": "length"}):
        frappe.db.delete("Property Setter", {"doc_type": "Lead", "field_name": "custom_search_index", "property": "length"})

    frappe.db.commit()
    frappe.clear_cache(doctype="Lead")
    print("Field Type changed to Text via Property Setter.")
    
    # 2. Schema Sync (Update DB column)
    # Since we changed metadata, we need to alter table? 
    # Frappe usually requires bench migrate or reload_doc?
    # We can force alter via SQL for immediacy in this session
    print("Altering Table Column...")
    frappe.db.sql("ALTER TABLE `tabLead` MODIFY custom_search_index TEXT")
    frappe.db.commit()
    print("Table Altered.")

if __name__ == "__main__":
    frappe.init(site="site1")
    frappe.connect()
    execute()
