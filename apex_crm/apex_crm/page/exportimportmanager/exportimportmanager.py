import frappe

@frappe.whitelist()
def get_context(context):
	# No special context needed for this page
	pass
