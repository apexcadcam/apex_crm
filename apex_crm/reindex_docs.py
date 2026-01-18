import frappe
from apex_crm.api import sync_contacts

def run():
    leads = frappe.get_all("Lead", fields=["name"])
    total = len(leads)
    print(f"Re-indexing {total} leads for search filters...")
    
    for i, l in enumerate(leads):
        try:
            doc = frappe.get_doc("Lead", l.name)
            # Run the sync logic which updates custom_search_index
            sync_contacts(doc, None)
            
            if i % 50 == 0:
                frappe.db.commit()
                print(f"Processed {i}/{total}")
        except Exception as e:
            print(f"Error on {l.name}: {e}")
            
    frappe.db.commit()
    print("Re-indexing Complete!")
