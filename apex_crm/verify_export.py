import frappe
from apex_crm.api import export_apex_contacts_to_excel

def verify_export():
    try:
        # We need to simulate the logic inside export_apex_contacts_to_excel 
        # because the original function returns a file URL.
        # So we will copy the core logic here to print the grid.

        print("Fetching Data...")
        contacts = frappe.db.sql("""
            SELECT 
                acd.parent as lead_id,
                l.lead_name,
                acd.type,
                acd.country_code,
                acd.value
            FROM `tabApex Contact Detail` acd
            INNER JOIN `tabLead` l ON acd.parent = l.name
            WHERE acd.parenttype = 'Lead'
            ORDER BY acd.parent, acd.idx
        """, as_dict=True)

        if not contacts:
            print("No contacts found.")
            return

        leads_data = {}
        global_max_counts = {}

        for c in contacts:
            lead_id = c.lead_id
            if lead_id not in leads_data:
                leads_data[lead_id] = {
                    'name': c.lead_name,
                    'data': {} 
                }
            
            ctype = c.type or 'Other'
            val = c.value or ''
            
            if c.country_code and ctype in ['Mobile', 'Phone', 'WhatsApp', 'Telegram']:
                if not val.startswith('+'):
                    val = f"{c.country_code}{val}"
            
            if ctype not in leads_data[lead_id]['data']:
                leads_data[lead_id]['data'][ctype] = []
                
            leads_data[lead_id]['data'][ctype].append(val)
            
            current_len = len(leads_data[lead_id]['data'][ctype])
            if global_max_counts.get(ctype, 0) < current_len:
                global_max_counts[ctype] = current_len

        print(f"Max Counts Found: {global_max_counts}")

        # Build Headers
        columns = ['Lead ID', 'Lead Name']
        priority_types = ['Mobile', 'Phone', 'WhatsApp', 'Email', 'Facebook', 'Instagram', 'LinkedIn']
        all_types = sorted(global_max_counts.keys())
        sorted_types = [t for t in priority_types if t in all_types] + [t for t in all_types if t not in priority_types]
        
        for ctype in sorted_types:
            count = global_max_counts[ctype]
            if count == 1:
                columns.append(ctype)
            else:
                for i in range(count):
                    columns.append(f"{ctype} {i+1}")

        print("\n--- EXPORT PREVIEW (First 5 Rows) ---")
        print(f"HEADERS: {columns}")
        
        row_count = 0
        for lead_id, info in leads_data.items():
            if row_count >= 5: break
            
            row = [lead_id, info['name']]
            for ctype in sorted_types:
                max_c = global_max_counts[ctype]
                values = info['data'].get(ctype, [])
                for i in range(max_c):
                    if i < len(values):
                        row.append(values[i])
                    else:
                        row.append("") 
            print(f"ROW: {row}")
            row_count += 1
            
    except Exception as e:
        print(f"Error: {e}")

verify_export()
