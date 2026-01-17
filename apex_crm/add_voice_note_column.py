
import frappe

def execute():
    table = "tabApex Interaction Log"
    column = "voice_note"
    
    # Check if column exists
    if not frappe.db.has_column(table, column):
        print(f"Column {column} missing in {table}. Adding it...")
        frappe.db.add_column(table, column, "Text")
        print("Column added successfully.")
    else:
        print(f"Column {column} already exists in {table}.")

    # Commit changes
    frappe.db.commit()

execute()
