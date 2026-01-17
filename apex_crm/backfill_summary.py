
import frappe
from apex_crm.api import sync_contacts

def execute():
    try:
        if not frappe.db:
            frappe.connect()
            
        print("--- Backfilling Smart Contact Summary ---")
        
        # Get all leads
        leads = frappe.get_all("Lead", fields=["name"])
        print(f"Found {len(leads)} leads. Processing...")
        
        count = 0
        for l in leads:
            try:
                doc = frappe.get_doc("Lead", l.name)
                # Manually trigger sync
                sync_contacts(doc, "update")
                count += 1
                if count % 50 == 0:
                    print(f"Processed {count} leads...")
                    frappe.db.commit()
            except Exception as e:
                print(f"Error processing {l.name}: {e}")
                
        frappe.db.commit()
        print("Backfill Complete!")

    except Exception as e:
        print(f"Error: {e}")
