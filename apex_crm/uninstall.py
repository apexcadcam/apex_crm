"""
Uninstallation hooks for Apex CRM app
Complete cleanup to restore system to original state
"""

import frappe


def before_uninstall():
\t"""
\tClean up all customizations created by Apex CRM app
\tThis ensures the app can be uninstalled cleanly without leaving artifacts
\t"""
\tprint("\\n" + "="*80)
\tprint("Apex CRM: Starting Uninstallation Cleanup")
\tprint("="*80 + "\\n")
\t
\ttry:
\t\t# Step 1: Delete Client Scripts
\t\tdelete_client_scripts()
\t\t
\t\t# Step 2: Delete Custom Fields (this will also remove child table data)
\t\tdelete_custom_fields()
\t\t
\t\t# Step 3: Delete Property Setters
\t\tdelete_property_setters()
\t\t
\t\t# Step 4: Delete Custom DocTypes
\t\tdelete_custom_doctypes()
\t\t
\t\t# Step 5: Delete Pages
\t\tdelete_pages()
\t\t
\t\tprint("\\n" + "="*80)
\t\tprint("Apex CRM: Uninstallation Cleanup Completed Successfully")
\t\tprint("="*80 + "\\n")
\t\t
\texcept Exception as e:
\t\tfrappe.log_error(title="Apex CRM Uninstall Error", message=frappe.get_traceback())
\t\tprint(f"\\n❌ Error during Apex CRM cleanup: {str(e)}\\n")


def delete_client_scripts():
\t"""Delete all Client Scripts created by this app"""
\tprint("🗑️  Deleting Client Scripts...")
\t
\tclient_scripts = frappe.get_all(
\t\t"Client Script",
\t\tfilters={"module": "Apex CRM"},
\t\tpluck="name"
\t)
\t
\tfor script_name in client_scripts:
\t\ttry:
\t\t\tfrappe.delete_doc("Client Script", script_name, force=True, ignore_permissions=True)
\t\t\tprint(f"  ✓ Deleted: {script_name}")
\t\texcept Exception as e:
\t\t\tprint(f"  ⚠️  Failed to delete {script_name}: {str(e)}")
\t
\tif client_scripts:
\t\tfrappe.db.commit()
\t\tprint(f"✅ Deleted {len(client_scripts)} Client Scripts\\n")
\telse:
\t\tprint("  ℹ️  No Client Scripts found\\n")


def delete_custom_fields():
\t"""Delete all Custom Fields created by this app"""
\tprint("🗑️  Deleting Custom Fields...")
\t
\tcustom_fields = frappe.get_all(
\t\t"Custom Field",
\t\tfilters={"module": "Apex CRM"},
\t\tfields=["name", "dt", "fieldname"],
\t\torder_by="dt, idx"
\t)
\t
\tfor field in custom_fields:
\t\ttry:
\t\t\t# Delete the field (this will also delete child table data)
\t\t\tfrappe.delete_doc("Custom Field", field.name, force=True, ignore_permissions=True)
\t\t\tprint(f"  ✓ Deleted: {field.dt}.{field.fieldname}")
\t\texcept Exception as e:
\t\t\tprint(f"  ⚠️  Failed to delete {field.dt}.{field.fieldname}: {str(e)}")
\t
\tif custom_fields:
\t\tfrappe.db.commit()
\t\tprint(f"✅ Deleted {len(custom_fields)} Custom Fields\\n")
\telse:
\t\tprint("  ℹ️  No Custom Fields found\\n")


def delete_property_setters():
\t"""Delete all Property Setters created by this app"""
\tprint("🗑️  Deleting Property Setters...")
\t
\tproperty_setters = frappe.get_all(
\t\t"Property Setter",
\t\tfilters={"module": "Apex CRM"},
\t\tpluck="name"
\t)
\t
\tfor ps_name in property_setters:
\t\ttry:
\t\t\tfrappe.delete_doc("Property Setter", ps_name, force=True, ignore_permissions=True)
\t\texcept Exception as e:
\t\t\tprint(f"  ⚠️  Failed to delete {ps_name}: {str(e)}")
\t
\tif property_setters:
\t\tfrappe.db.commit()
\t\tprint(f"✅ Deleted {len(property_setters)} Property Setters\\n")
\telse:
\t\tprint("  ℹ️  No Property Setters found\\n")


def delete_custom_doctypes():
\t"""Delete all Custom DocTypes created by this app"""
\tprint("🗑️  Deleting Custom DocTypes...")
\t
\t# List of custom DocTypes to delete
\tcustom_doctypes = [
\t\t"Apex Interaction Log",  # Child table - delete first
\t\t"Apex Contact Detail",   # Child table
\t\t"Apex Ignored Duplicate" # Regular DocType
\t]
\t
\tfor doctype_name in custom_doctypes:
\t\tif frappe.db.exists("DocType", doctype_name):
\t\t\ttry:
\t\t\t\t# Delete all records first (for non-child tables)
\t\t\t\tmeta = frappe.get_meta(doctype_name)
\t\t\t\tif not meta.istable:
\t\t\t\t\trecords = frappe.get_all(doctype_name, pluck="name")
\t\t\t\t\tfor record in records:
\t\t\t\t\t\tfrappe.delete_doc(doctype_name, record, force=True, ignore_permissions=True)
\t\t\t\t\tif records:
\t\t\t\t\t\tprint(f"  ✓ Deleted {len(records)} records from {doctype_name}")
\t\t\t\t
\t\t\t\t# Delete the DocType itself
\t\t\t\tfrappe.delete_doc("DocType", doctype_name, force=True, ignore_permissions=True)
\t\t\t\tprint(f"  ✓ Deleted DocType: {doctype_name}")
\t\t\texcept Exception as e:
\t\t\t\tprint(f"  ⚠️  Failed to delete {doctype_name}: {str(e)}")
\t\telse:
\t\t\tprint(f"  ℹ️  {doctype_name} not found")
\t
\tfrappe.db.commit()
\tprint("✅ Custom DocTypes cleanup complete\\n")


def delete_pages():
\t"""Delete all Pages created by this app"""
\tprint("🗑️  Deleting Pages...")
\t
\tpages = frappe.get_all(
\t\t"Page",
\t\tfilters={"module": "Apex CRM"},
\t\tpluck="name"
\t)
\t
\tfor page_name in pages:
\t\ttry:
\t\t\tfrappe.delete_doc("Page", page_name, force=True, ignore_permissions=True)
\t\t\tprint(f"  ✓ Deleted Page: {page_name}")
\t\texcept Exception as e:
\t\t\tprint(f"  ⚠️  Failed to delete {page_name}: {str(e)}")
\t
\tif pages:
\t\tfrappe.db.commit()
\t\tprint(f"✅ Deleted {len(pages)} Pages\\n")
\telse:
\t\tprint("  ℹ️  No Pages found\\n")
