
import frappe
import os
import csv
from frappe.core.doctype.data_import.importer import Importer

def create_initial_csv(file_path):
    headers = ["ID", "First Name", "Status", "Salutation", "Gender", "Source", "Lead Type", "custom_full_name", "Type (Smart Contact Details)", "Value / Number (Smart Contact Details)"]
    data = [
        # Lead 1
        ["", "ImportLead 1", "Lead", "Mr", "Male", "Advertisement", "Client", "ImportLead 1", "Mobile", "0100000001"],
        
        # Lead 2
        ["", "ImportLead 2", "Lead", "Ms", "Female", "Advertisement", "Client", "ImportLead 2", "Mobile", "0100000002"],
        ["", "", "", "", "", "", "", "", "TikTok", "tiktok.com/@lead2"],
        
        # Lead 3
        ["", "ImportLead 3", "Lead", "Mr", "Male", "Advertisement", "Client", "ImportLead 3", "Mobile", "0100000003"],
        ["", "", "", "", "", "", "", "", "Email", "lead3@example.com"],
        ["", "", "", "", "", "", "", "", "Location", "https://maps.google.com/?q=Cairo"],
        
        # Lead 4
        ["", "ImportLead 4", "Lead", "Mr", "Male", "Advertisement", "Client", "ImportLead 4", "Address", "123 Tahrir St, Cairo"],
        
        # Lead 5
        ["", "ImportLead 5", "Lead", "Mrs", "Female", "Advertisement", "Client", "ImportLead 5", "Mobile", "0100000005"]
    ]
    
    with open(file_path, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(data)
    
    print(f"Created Import CSV at {file_path}")

def run_import(file_path, import_type="Insert New Records"):
    print(f"Running Import: {import_type}...")
    
    # 1. Upload file
    with open(file_path, 'rb') as f:
        content = f.read()
        
    # Create File doc
    fname = os.path.basename(file_path)
    file_doc = frappe.get_doc({
        "doctype": "File",
        "file_name": fname,
        "content": content,
        "is_private": 1
    })
    file_doc.save(ignore_permissions=True)
    
    # Create Data Import
    di = frappe.new_doc("Data Import")
    di.reference_doctype = "Lead"
    di.import_type = import_type
    di.import_file = file_doc.file_url
    di.submit_after_import = 0
    di.save()
    frappe.db.commit()
    
    # Run
    importer = Importer(di.reference_doctype, data_import=di)
    importer.import_data()
    frappe.db.commit()
    
    # Reload DI to check status
    try:
        di.reload()
        print(f"Import Status: {di.status}")
        if di.status != "Success":
            print(f"Template Warnings: {di.template_warnings}")
            print("Import Log:")
            logs = frappe.get_all("Data Import Log", filters={"data_import": di.name}, fields=["messages", "exception", "row_indexes"])
            for log in logs:
                print(log.messages)
                if log.exception:
                    print(f"Exception: {log.exception}")
                if log.row_indexes:
                     print(f"Rows: {log.row_indexes}")
                     
    except frappe.DoesNotExistError:
        print("Warning: Data Import doc not found after execution.")
            
    return di

def run_demo():
    try:
        # Check if already exist to clean first? No, just create.
        csv_path = "leads_demo.csv"
        create_initial_csv(csv_path)
        
        # Insert
        run_import(csv_path, "Insert New Records")
        
        print("\nDONE! Leads 'ImportLead 1' to 'ImportLead 5' created.")
        print("Not deleting them so user can inspect.")
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    frappe.init(site="site1")
    frappe.connect()
    run_demo()
