
import frappe

import frappe

def execute():
    # Only fetch leads, we'll get doc data for each to ensure we access child tables cleanly
    # (Or get_doc is safer for accessing child tables directly in loop)
    # Using SQL to get names is faster.
    leads = frappe.db.sql("SELECT name FROM `tabLead`", as_dict=True)
    print(f"Re-indexing {len(leads)} leads (Direct DB Update)...")
    
    count = 0
    for l in leads:
        try:
            doc = frappe.get_doc("Lead", l.name)
            
            # --- INDEX CONSTRUCTION LOGIC (From api.py) ---
            search_index_parts = []
            
            # A. Smart Contact Details
            if doc.smart_contact_details:
                for row in doc.smart_contact_details:
                    row_value = row.get('value')
                    row_country_code = row.get('country_code')
                    if row_value:
                        search_index_parts.append(row_value)
                        clean_val = ''.join(filter(str.isdigit, row_value))
                        if clean_val != row_value:
                            search_index_parts.append(clean_val)
                        if row_country_code:
                            full_number = f"{row_country_code}{clean_val}"
                            search_index_parts.append(full_number)
                            if not full_number.startswith('+'):
                                search_index_parts.append(f"+{full_number}")

            # B. Main Fields
            main_fields = ['mobile_no', 'phone', 'lead_name', 'company_name']
            for field in main_fields:
                val = doc.get(field)
                if val:
                    search_index_parts.append(str(val))
                    clean = ''.join(filter(str.isdigit, str(val)))
                    if len(clean) > 5:
                        search_index_parts.append(clean)

            # C. Notes
            if doc.get("notes"):
                for note in doc.notes:
                    if note.note:
                        search_index_parts.append(frappe.utils.strip_html(note.note))

            # D. Events
            events = frappe.get_all("Event", 
                filters={"reference_doctype": "Lead", "reference_docname": doc.name}, 
                fields=["subject", "description"])
            for e in events:
                if e.subject: search_index_parts.append(e.subject)
                if e.description: search_index_parts.append(frappe.utils.strip_html(e.description))

            # E. Interaction History
            if doc.get("interaction_history"):
                for interaction in doc.interaction_history:
                    if interaction.summary:
                        search_index_parts.append(interaction.summary)

            # F. Apex Interaction Log
            interaction_logs = frappe.get_all("Apex Interaction Log", 
                filters={"reference_doctype": "Lead", "reference_docname": doc.name},
                fields=["summary"])
            for log in interaction_logs:
                if log.summary:
                    search_index_parts.append(log.summary)

            # --- UPDATE ---
            if search_index_parts:
                unique_parts = list(dict.fromkeys(search_index_parts))
                search_blob = " | ".join(unique_parts)
                
                # Check current value to avoid unnecessary writes
                current_val = frappe.db.get_value("Lead", doc.name, "custom_search_index")
                if current_val != search_blob:
                    frappe.db.set_value("Lead", doc.name, "custom_search_index", search_blob)
                    # print(f"Updated {doc.name}") # Optional logging
            
            count += 1
            if count % 50 == 0:
                print(f"Processed {count} leads")
                frappe.db.commit()

        except Exception as e:
            print(f"Failed to re-index {l.name}: {e}")

    frappe.db.commit()
    print("Done.")
    
    # Verify for target
    target = "1125634273"
    gs_entry = frappe.db.sql("""
        SELECT content FROM `__global_search` 
        WHERE doctype='Lead' AND content LIKE %s
    """, (f"%{target}%",), as_dict=True)
    
    if gs_entry:
        print(f"SUCCESS: Direct Query found {len(gs_entry)} entries containing {target}.")
    else:
        print(f"FAILURE: Even SQL didn't work??")

if __name__ == "__main__":
    frappe.init(site="site1")
    frappe.connect()
    execute()
