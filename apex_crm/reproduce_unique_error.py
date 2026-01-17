import frappe
import traceback

def execute():
    try:
        # Find an existing lead with an email
        existing_lead = frappe.db.get_value("Lead", {"email_id": ["is", "set"]}, ["name", "email_id"], as_dict=True)
        if not existing_lead:
            print("No lead with email found to test duplicate.")
            return

        print(f"Found existing lead: {existing_lead.name} with email {existing_lead.email_id}")

        # Try to create a NEW lead with the SAME email
        new_lead = frappe.get_doc({
            "doctype": "Lead",
            "lead_name": "Test Duplicate Lead",
            "email_id": existing_lead.email_id,
            "status": "Open" 
        })
        new_lead.insert()
        print("SUCCESS: Lead inserted with duplicate email!")
        # Cleanup
        new_lead.delete()

    except Exception as e:
        print(f"FAILURE: {str(e)}")
        traceback.print_exc()
