
import frappe

def inspect_notes():
    lead = "LEAD-05-24-01126"
    print(f"Inspecting Notes for {lead}...")
    
    # 1. Check CRM Note Child Table
    crm_notes = frappe.get_all('CRM Note', 
        filters={'parent': lead}, 
        fields=['name', 'note', 'creation', 'modified', 'parent', 'parentfield']
    )
    print(f"\nFound {len(crm_notes)} CRM Notes:")
    for n in crm_notes:
        print(f" - [{n.creation}] {n.note} (Field: {n.parentfield})")

    # 2. Check Linked Note Docs
    if frappe.db.has_column('Note', 'custom_lead'):
        linked_notes = frappe.get_list('Note',
            filters={'custom_lead': lead},
            fields=['name', 'title', 'creation']
        )
        print(f"\nFound {len(linked_notes)} Linked Notes:")
        for n in linked_notes:
            print(f" - [{n.creation}] {n.title}")
    else:
        print("\nNote DocType has no 'custom_lead' column.")

inspect_notes()
