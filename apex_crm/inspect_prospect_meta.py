
import frappe

def inspect():
    meta = frappe.get_meta('Prospect')
    print([d.fieldname for d in meta.fields])

inspect()
