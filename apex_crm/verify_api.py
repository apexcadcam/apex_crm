
import frappe
from apex_crm.api import get_lead_dashboard_data

def run():
    # Get a random lead
    leads = frappe.get_list("Lead", limit=1)
    if leads:
        lead_name = leads[0].name
        print(f"Testing with Lead: {lead_name}")
        
        # Call the API
        try:
            stats = get_lead_dashboard_data(lead_name)
            print("API Result:")
            print(stats)
            
            # Basic validation
            assert "notes" in stats
            assert "tasks" in stats
            assert "quotations" in stats
            assert "customers" in stats
            assert "last_interaction" in stats
            print("Validation Passed!")
        except Exception as e:
            print(f"API Call Failed: {e}")
            import traceback
            traceback.print_exc()
    else:
        print("No leads found to test.")
