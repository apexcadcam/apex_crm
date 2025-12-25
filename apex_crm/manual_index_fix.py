
import frappe

def execute():
    print("--- Directly Patching __global_search Table ---")
    
    # 1. Get all Leads with custom_search_index
    leads = frappe.get_all("Lead", fields=["name", "custom_search_index", "title", "owner", "modified"], filters={"custom_search_index": ["is", "set"]})
    print(f"Patching {len(leads)} leads...")
    
    for l in leads:
        # Construct content
        content = f"{l.title or l.name} ||| {l.name} ||| {l.custom_search_index}"
        
        # Check if exists
        exists = frappe.db.exists("__global_search", {"doctype": "Lead", "name": l.name})
        
        if exists:
            frappe.db.sql("""
                UPDATE `__global_search`
                SET content = %s
                WHERE doctype='Lead' AND name=%s
            """, (content, l.name))
        else:
            # Insert new
            frappe.db.sql("""
                INSERT INTO `__global_search` (doctype, name, content, route, published, title)
                VALUES (%s, %s, %s, %s, 1, %s)
            """, ("Lead", l.name, content, f"/app/lead/{l.name}", l.title or l.name))
            
    frappe.db.commit()
    print("Manual Patch Complete. Verifying...")
    
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
