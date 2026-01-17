
import frappe

def execute():
    try:
        scripts = frappe.get_all("Server Script", fields=["name", "script_type", "reference_doctype"])
        print(f"Found {len(scripts)} scripts:")
        for s in scripts:
            print(f"Name: {s.name}, Type: {s.script_type}, Ref: {s.reference_doctype}")
            if s.reference_doctype == 'Lead':
                 doc = frappe.get_doc("Server Script", s.name)
                 print(f"--- Code of {s.name} ---")
                 print(doc.script)
                 print("------------------------")
                 
    except Exception as e:
        print(e)
