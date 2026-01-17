import frappe

def disable_old_client_script():
    """Disable the old 'Lead List Apex CRM Buttons' client script"""
    try:
        script = frappe.get_doc("Client Script", "Lead List Apex CRM Buttons")
        script.enabled = 0
        script.save()
        frappe.db.commit()
        print("✅ Disabled old Client Script: 'Lead List Apex CRM Buttons'")
    except frappe.DoesNotExistError:
        print("ℹ️ Client Script 'Lead List Apex CRM Buttons' not found (may already be deleted)")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    import sys
    import os
    # Add bench to path
    bench_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
    sys.path.insert(0, bench_path)
    
    from frappe.utils import get_site_path
    import frappe
    
    # Initialize Frappe
    site = os.environ.get('FRAPPE_SITE', 'apex.localhost')
    frappe.init(site=site)
    frappe.connect()
    
    disable_old_client_script()

