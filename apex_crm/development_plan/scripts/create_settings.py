import frappe

frappe.connect()

print('1. Checking if DocType exists...')
exists = frappe.db.exists('DocType', 'Apex CRM Settings')
print(f'   DocType exists: {exists}')

if exists:
    print('2. Checking if Settings document exists...')
    doc_exists = frappe.db.exists('Apex CRM Settings', 'Apex CRM Settings')
    print(f'   Document exists: {doc_exists}')
    
    if not doc_exists:
        print('3. Creating Settings document...')
        doc = frappe.new_doc('Apex CRM Settings')
        doc.append('duplicate_manager_roles', {'role': 'System Manager'})
        doc.append('export_import_roles', {'role': 'System Manager'})
        doc.append('migration_roles', {'role': 'System Manager'})
        doc.insert()
        frappe.db.commit()
        print('   ✅ Settings created!')
    else:
        print('   ✅ Settings already exist!')
else:
    print('   ❌ DocType not found in database!')
    print('   Run: bench --site site1 migrate')
