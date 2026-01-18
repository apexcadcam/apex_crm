"""
Script to export Lead contact data to Excel for migration to Apex CRM
Usage: bench --site all execute apex_crm.migration.export_leads_contacts.export_to_excel
"""

import frappe
import json
from frappe.utils import get_site_path, now_datetime
import os

@frappe.whitelist()
def export_to_excel():
	"""
	Export all Lead contact data to a format suitable for Excel import
	"""
	# Get all Leads with contact information
	leads = frappe.db.sql("""
		SELECT 
			name as lead_id,
			lead_name,
			phone,
			mobile_no,
			email_id,
			whatsapp_no,
			fax,
			website,
			custom_mobile_number_1,
			custom_mobile_number_2,
			custom_facebook
		FROM `tabLead`
		WHERE (
			phone IS NOT NULL AND phone != '' OR
			mobile_no IS NOT NULL AND mobile_no != '' OR
			email_id IS NOT NULL AND email_id != '' OR
			whatsapp_no IS NOT NULL AND whatsapp_no != '' OR
			website IS NOT NULL AND website != '' OR
			fax IS NOT NULL AND fax != '' OR
			custom_mobile_number_1 IS NOT NULL AND custom_mobile_number_1 != '' OR
			custom_mobile_number_2 IS NOT NULL AND custom_mobile_number_2 != '' OR
			custom_facebook IS NOT NULL AND custom_facebook != ''
		)
		ORDER BY name
	""", as_dict=True)

	# Prepare data for Excel (one row per contact detail)
	excel_data = []
	
	for lead in leads:
		lead_id = lead['lead_id']
		lead_name = lead['lead_name']
		
		# Phone
		if lead.get('phone'):
			excel_data.append({
				'Lead ID': lead_id,
				'Lead Name': lead_name,
				'Type': 'Phone',
				'Country Code': '+20',  # Default, can be changed in Excel
				'Value': lead['phone'],
				'Is Primary': 0,
				'Notes': ''
			})
		
		# Mobile No
		if lead.get('mobile_no'):
			excel_data.append({
				'Lead ID': lead_id,
				'Lead Name': lead_name,
				'Type': 'Mobile',
				'Country Code': '+20',  # Default, can be changed in Excel
				'Value': lead['mobile_no'],
				'Is Primary': 1,  # Primary mobile
				'Notes': ''
			})
		
		# Email
		if lead.get('email_id'):
			excel_data.append({
				'Lead ID': lead_id,
				'Lead Name': lead_name,
				'Type': 'Email',
				'Country Code': '',
				'Value': lead['email_id'],
				'Is Primary': 0,
				'Notes': ''
			})
		
		# WhatsApp
		if lead.get('whatsapp_no'):
			excel_data.append({
				'Lead ID': lead_id,
				'Lead Name': lead_name,
				'Type': 'WhatsApp',
				'Country Code': '+20',  # Default, can be changed in Excel
				'Value': lead['whatsapp_no'],
				'Is Primary': 0,
				'Notes': ''
			})
		
		# Website
		if lead.get('website'):
			excel_data.append({
				'Lead ID': lead_id,
				'Lead Name': lead_name,
				'Type': 'Website',
				'Country Code': '',
				'Value': lead['website'],
				'Is Primary': 0,
				'Notes': ''
			})
		
		# Fax
		if lead.get('fax'):
			excel_data.append({
				'Lead ID': lead_id,
				'Lead Name': lead_name,
				'Type': 'Fax',
				'Country Code': '+20',  # Default, can be changed in Excel
				'Value': lead['fax'],
				'Is Primary': 0,
				'Notes': ''
			})
		
		# Mobile Number 1 (Custom)
		if lead.get('custom_mobile_number_1'):
			excel_data.append({
				'Lead ID': lead_id,
				'Lead Name': lead_name,
				'Type': 'Mobile',
				'Country Code': '+20',  # Default, can be changed in Excel
				'Value': lead['custom_mobile_number_1'],
				'Is Primary': 0,
				'Notes': 'Migrated from custom_mobile_number_1'
			})
		
		# Mobile Number 2 (Custom)
		if lead.get('custom_mobile_number_2'):
			excel_data.append({
				'Lead ID': lead_id,
				'Lead Name': lead_name,
				'Type': 'Mobile',
				'Country Code': '+20',  # Default, can be changed in Excel
				'Value': lead['custom_mobile_number_2'],
				'Is Primary': 0,
				'Notes': 'Migrated from custom_mobile_number_2'
			})
		
		# Facebook (Custom)
		if lead.get('custom_facebook'):
			excel_data.append({
				'Lead ID': lead_id,
				'Lead Name': lead_name,
				'Type': 'Facebook',
				'Country Code': '',
				'Value': lead['custom_facebook'],
				'Is Primary': 0,
				'Notes': 'Migrated from custom_facebook'
			})

	# Save to JSON file (can be converted to Excel)
	site_path = get_site_path()
	export_file = os.path.join(site_path, 'lead_contacts_export.json')
	
	with open(export_file, 'w', encoding='utf-8') as f:
		json.dump(excel_data, f, indent=2, ensure_ascii=False)
	
	frappe.msgprint(f"تم تصدير {len(excel_data)} سجل اتصال إلى: {export_file}")
	
	return {
		'total_leads': len(leads),
		'total_contacts': len(excel_data),
		'file_path': export_file
	}





















