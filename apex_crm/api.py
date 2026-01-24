import frappe
from frappe import _
import json
import re
from werkzeug.wrappers import Response



@frappe.whitelist()
def search_leads_advanced(search_type, search_value):
	"""
	Advanced search for Leads based on different criteria.
	
	Args:
		search_type: 'name', 'phone', 'note', 'email', 'all'
		search_value: The search term
	
	Returns:
		List of Lead names (IDs) matching the search criteria
	"""
	if not search_value or not search_value.strip():
		return []
	
	search_value = search_value.strip()
	lead_ids = set()
	
	if search_type == 'name':
		# Search in lead_name and name (Lead ID) using SQL
		leads = frappe.db.sql("""
			SELECT name 
			FROM `tabLead` 
			WHERE lead_name LIKE %s OR name LIKE %s
		""", (f'%{search_value}%', f'%{search_value}%'), as_dict=True)
		lead_ids.update([l.name for l in leads])
	
	elif search_type == 'phone':
		# Search in Apex Contact Detail for phone numbers
		# Also search in old custom fields (custom_mobile_number_1, custom_mobile_number_2, custom_whatsapp_number)
		# Normalize phone number (remove non-digits for better matching)
		normalized_search = ''.join(filter(str.isdigit, search_value))
		
		# Search in contact details (new format)
		contacts = frappe.db.sql("""
			SELECT DISTINCT parent 
			FROM `tabApex Contact Detail` 
			WHERE parenttype='Lead' 
			AND (
				value LIKE %s 
				OR REPLACE(REPLACE(REPLACE(REPLACE(value, ' ', ''), '-', ''), '(', ''), ')', '') LIKE %s
			)
			AND type IN ('Mobile', 'Phone', 'WhatsApp', 'Telegram')
		""", (f'%{search_value}%', f'%{normalized_search}%'), as_dict=True)
		
		lead_ids.update([c.parent for c in contacts])
		
		# Also search in old custom fields (for backward compatibility)
		old_leads = frappe.db.sql("""
			SELECT name 
			FROM `tabLead` 
			WHERE custom_mobile_number_1 LIKE %s 
			   OR custom_mobile_number_2 LIKE %s 
			   OR custom_whatsapp_number LIKE %s
		""", (f'%{search_value}%', f'%{search_value}%', f'%{search_value}%'), as_dict=True)
		lead_ids.update([l.name for l in old_leads])
	
	elif search_type == 'note':
		# Search in CRM Notes (child table)
		notes = frappe.db.sql("""
			SELECT DISTINCT parent 
			FROM `tabCRM Note` 
			WHERE parenttype='Lead' 
			AND parentfield='notes'
			AND note LIKE %s
		""", f'%{search_value}%', as_dict=True)
		
		lead_ids.update([n.parent for n in notes if n.parent])
		
		# Search in Interaction History summary
		interactions = frappe.db.sql("""
			SELECT DISTINCT parent 
			FROM `tabApex Interaction Log` 
			WHERE parenttype='Lead' 
			AND summary LIKE %s
		""", f'%{search_value}%', as_dict=True)
		
		lead_ids.update([i.parent for i in interactions])
		
		# Also search in Comments (Communication DocType)
		comments = frappe.db.sql("""
			SELECT DISTINCT reference_name as parent
			FROM `tabCommunication`
			WHERE reference_doctype='Lead'
			AND (
				content LIKE %s
				OR subject LIKE %s
			)
		""", (f'%{search_value}%', f'%{search_value}%'), as_dict=True)
		
		lead_ids.update([c.parent for c in comments if c.parent])
	
	elif search_type == 'email':
		# Search in Apex Contact Detail for email
		contacts = frappe.db.sql("""
			SELECT DISTINCT parent 
			FROM `tabApex Contact Detail` 
			WHERE parenttype='Lead' 
			AND type='Email' 
			AND value LIKE %s
		""", f'%{search_value}%', as_dict=True)
		
		lead_ids.update([c.parent for c in contacts])
	
	elif search_type == 'all':
		# Search in all fields (like Lead Search in Form)
		# 1. Name (lead_name and name/ID)
		leads = frappe.db.sql("""
			SELECT name 
			FROM `tabLead` 
			WHERE lead_name LIKE %s OR name LIKE %s
		""", (f'%{search_value}%', f'%{search_value}%'), as_dict=True)
		lead_ids.update([l.name for l in leads])
		
		# 2. Contact Details (new format)
		contacts = frappe.db.sql("""
			SELECT DISTINCT parent 
			FROM `tabApex Contact Detail` 
			WHERE parenttype='Lead' 
			AND value LIKE %s
		""", f'%{search_value}%', as_dict=True)
		lead_ids.update([c.parent for c in contacts])
		
		# 2b. Old custom fields (for backward compatibility)
		old_leads = frappe.db.sql("""
			SELECT name 
			FROM `tabLead` 
			WHERE custom_mobile_number_1 LIKE %s 
			   OR custom_mobile_number_2 LIKE %s 
			   OR custom_whatsapp_number LIKE %s
		""", (f'%{search_value}%', f'%{search_value}%', f'%{search_value}%'), as_dict=True)
		lead_ids.update([l.name for l in old_leads])
		
		# 3. CRM Notes (child table)
		notes = frappe.db.sql("""
			SELECT DISTINCT parent 
			FROM `tabCRM Note` 
			WHERE parenttype='Lead' 
			AND parentfield='notes'
			AND note LIKE %s
		""", f'%{search_value}%', as_dict=True)
		
		lead_ids.update([n.parent for n in notes if n.parent])
		
		# 4. Interaction History
		interactions = frappe.db.sql("""
			SELECT DISTINCT parent 
			FROM `tabApex Interaction Log` 
			WHERE parenttype='Lead' 
			AND summary LIKE %s
		""", f'%{search_value}%', as_dict=True)
		lead_ids.update([i.parent for i in interactions])
		
		# 5. Comments (Communication DocType)
		comments = frappe.db.sql("""
			SELECT DISTINCT reference_name as parent
			FROM `tabCommunication`
			WHERE reference_doctype='Lead'
			AND (
				content LIKE %s
				OR subject LIKE %s
			)
		""", (f'%{search_value}%', f'%{search_value}%'), as_dict=True)
		
		lead_ids.update([c.parent for c in comments if c.parent])
	
	return list(lead_ids)



@frappe.whitelist()
def check_duplicate_contact(value):
	"""
	Checks if a contact value (phone, email, etc.) exists in any Lead.
	Returns a list of leads containing this value.
	"""
	if not value:
		return []

	# Search in Apex Contact Detail child table
	# referencing the parent Lead
	duplicates = frappe.db.sql("""
		SELECT 
			parent, parenttype 
		FROM 
			`tabApex Contact Detail` 
		WHERE 
			value LIKE %s AND parenttype = 'Lead'
	""", (f"%{value}%",), as_dict=True)

	# NEW: Search Main Lead Table DYNAMICALLY
	# 1. Sanitize the value for broader matching (ignore http/https/www)
	search_val = value.strip()
	for prefix in ['https://', 'http://', 'www.']:
		if search_val.lower().startswith(prefix):
			search_val = search_val[len(prefix):]
	
	if not search_val: search_val = value # Fallback if empty

	# 2. Get all searchable text fields to ensure we catch everything
	meta = frappe.get_meta("Lead")
	ignore_fields = [
		'name', 'lead_name', 'first_name', 'last_name', 'company_name', 
		'customer_name', 'designation', 'status', 'source', 'campaign_name',
		'doctype', 'owner', 'parent', 'parenttype', 'parentfield'
	]
	
	search_fields = []
	# Prioritize standard contact fields
	priority_fields = ['mobile_no', 'phone', 'email_id', 'fax', 'website', 'twitter_id', 'linkedin_url', 'blog']
	
	# Add priority fields if they exist
	all_fieldnames = [d.fieldname for d in meta.fields]
	for f in priority_fields:
		if f in all_fieldnames:
			search_fields.append(f)
			
	# Add ANY other Data/Text field not in ignore/priority
	for d in meta.fields:
		if d.fieldname not in search_fields and d.fieldname not in ignore_fields:
			if d.fieldtype in ['Data', 'Small Text', 'Text', 'Code', 'Text Editor', 'Long Text']:
				search_fields.append(d.fieldname)
	
	# Build Dynamic Query
	if search_fields:
		conditions = " OR ".join([f"`{f}` LIKE %s" for f in search_fields])
		params = tuple([f"%{search_val}%" for _ in search_fields])
		
		legacy_sql = f"""
			SELECT name, lead_name
			FROM `tabLead`
			WHERE {conditions}
		"""
		legacy_duplicates = frappe.db.sql(legacy_sql, params, as_dict=True)
	else:
		legacy_duplicates = []

	results = []
	seen_leads = set()

	# Process Child Table Matches
	for d in duplicates:
		if d.parent in seen_leads: continue
		
		lead_name = frappe.db.get_value("Lead", d.parent, "lead_name")
		results.append({
			"name": d.parent,
			"lead_name": lead_name
		})
		seen_leads.add(d.parent)
	
	# Process Legacy Matches
	for l in legacy_duplicates:
		if l.name in seen_leads: continue
		
		results.append({
			"name": l.name,
			"lead_name": l.lead_name
		})
		seen_leads.add(l.name)
	
	return results

@frappe.whitelist()
def get_duplicate_groups():
    """
    Returns a list of values that appear more than once in Apex Contact Detail.
    Smart Filter: Excludes values ONLY IF current count matches 'ignored_count'.
    If count has changed (e.g. new duplicate added), it shows up again.
    
    OPTIMIZED: Uses single query with JOIN instead of N+1 queries.
    """
    
    # Check Page Permission to ensure authorized access
    if not has_page_permission('duplicate-manager'):
        frappe.throw(_("You do not have permission to access Duplicate Manager."))
    
    # 1. Get Ignore List {value: ignored_count} - Do this first to filter early
    ignored_list = frappe.db.get_all("Apex Ignored Duplicate", fields=["value", "ignored_count"], ignore_permissions=True)
    ignored_map = {d.value: d.ignored_count for d in ignored_list}
    
    # 2. Get duplicate values (values that appear more than once)
    duplicate_values = frappe.db.sql("""
        SELECT value, COUNT(DISTINCT parent) as count 
        FROM `tabApex Contact Detail` 
        WHERE parenttype='Lead'
        GROUP BY value 
        HAVING count > 1
        ORDER BY count DESC
    """, as_dict=True)
    
    if not duplicate_values:
        return []
    
    # 3. Filter out ignored values early (before fetching leads)
    filtered_duplicates = []
    for d in duplicate_values:
        val = d.value
        current_count = d.count
        
        # SMART CHECK: Skip if ignored and count matches
        if val in ignored_map:
            if ignored_map[val] == current_count:
                continue
        
        filtered_duplicates.append((val, current_count))
    
    if not filtered_duplicates:
        return []
    
    # 4. Get all leads for duplicate values in ONE optimized query (using IN clause)
    # This is much faster than N queries (one per duplicate value)
    # Limit to first 1000 duplicates to avoid huge IN clause (can be increased if needed)
    duplicate_values_list = [v[0] for v in filtered_duplicates[:1000]]
    
    if not duplicate_values_list:
        return []
    
    # Use parameterized query with IN clause
    # Split into chunks if too many values (MySQL has limits on IN clause size)
    chunk_size = 500
    leads_data = []
    
    for i in range(0, len(duplicate_values_list), chunk_size):
        chunk = duplicate_values_list[i:i + chunk_size]
        placeholders = ','.join(['%s'] * len(chunk))
        leads_query = f"""
            SELECT DISTINCT 
                acd.value,
                acd.parent as name,
                l.lead_name,
                l.owner
            FROM `tabApex Contact Detail` acd
            INNER JOIN `tabLead` l ON acd.parent = l.name
            WHERE acd.parenttype = 'Lead' 
            AND acd.value IN ({placeholders})
            ORDER BY acd.value, acd.parent
        """
        
        chunk_data = frappe.db.sql(leads_query, tuple(chunk), as_dict=True)
        leads_data.extend(chunk_data)
    
    # 5. Group leads by value
    value_groups = {}
    value_counts = {v[0]: v[1] for v in filtered_duplicates}
    
    for row in leads_data:
        val = row.value
        
        if val not in value_groups:
            value_groups[val] = []
        
        # Add lead if not already added
        lead_exists = any(l['name'] == row.name for l in value_groups[val])
        if not lead_exists:
            value_groups[val].append({
                "name": row.name,
                "lead_name": row.lead_name,
                "owner": row.owner
            })
    
    # 6. Build results
    results = []
    for val, count in filtered_duplicates:
        leads = value_groups.get(val, [])
        
        # Only include if we have more than 1 lead
        if len(leads) > 1:
            results.append({
                "value": val,
                "count": count,
                "leads": leads
            })
    
    return results

@frappe.whitelist()
def merge_leads(master_lead, secondary_lead):
    """
    Merges secondary_lead into master_lead.
    """
    if not master_lead or not secondary_lead:
        frappe.throw("Both Master and Secondary leads must be specified")
    
    if master_lead == secondary_lead:
        frappe.throw("Cannot merge a lead into itself")

    try:
        # Standard ERPNext Merge (Rename with merge=True)
        frappe.rename_doc("Lead", secondary_lead, master_lead, merge=True)
        
        # Post-merge cleanup: Remove duplicate rows in 'Apex Contact Detail'
        cleanup_contacts(master_lead)
            
        return {"status": "success", "master": master_lead}
        
    except Exception as e:
        frappe.log_error(f"Merge Failed: {str(e)}")
        frappe.throw(f"Merge Failed: {str(e)}")

def cleanup_contacts(lead_name):
    doc = frappe.get_doc("Lead", lead_name)
    unique_contacts = []
    seen = set()
    
    original_count = len(doc.smart_contact_details) if doc.smart_contact_details else 0
    
    if doc.smart_contact_details:
            for row in doc.smart_contact_details:
                # Normalize signature
                row_type = row.get('type') if isinstance(row, dict) else row.type
                row_value = row.get('value') if isinstance(row, dict) else row.value
                row_country_code = row.get('country_code') if isinstance(row, dict) else row.country_code
                sig = (row_type, (row_value or "").strip(), row_country_code)
                if sig not in seen:
                    seen.add(sig)
                    unique_contacts.append(row)
        
            doc.smart_contact_details = unique_contacts
            
            if len(unique_contacts) < original_count:
                doc.save(ignore_mandatory=True)

@frappe.whitelist()
def delete_lead(lead_name):
    """
    Deletes a lead permanently.
    """
    if not frappe.has_permission("Lead", "delete"):
        frappe.throw("You do not have permission to delete Leads")
        
    frappe.delete_doc("Lead", lead_name)
    return {"status": "success"}

@frappe.whitelist()
def ignore_group(value, count=0):
    """
    Adds the value to Apex Ignored Duplicate with current count.
    """
    if not value: return
    
    if frappe.db.exists("Apex Ignored Duplicate", {"value": value}):
        # Update existing
        doc = frappe.get_doc("Apex Ignored Duplicate", {"value": value})
        doc.ignored_count =  int(count)
        doc.save()
    else:
        # Create new
        doc = frappe.new_doc("Apex Ignored Duplicate")
        doc.value = value
        doc.ignored_count = int(count)
        doc.save()
    
    return {"status": "success"}

@frappe.whitelist()
def add_smart_contact(lead, type, value, country_code=None):
    """
    Adds a new contact detail to the Lead's Smart Contact list.
    """
    if not lead or not type or not value:
        frappe.throw("Missing required fields: Lead, Type, or Value")
        
    doc = frappe.get_doc("Lead", lead)
    
    # Check for duplicate in current list
    exists = False
    if doc.smart_contact_details:
        for row in doc.smart_contact_details:
            if row.type == type and row.value == value:
                exists = True
                break
    
    if exists:
        frappe.msgprint(f"Contact {value} already exists.")
        return {"status": "exists"}
        
    # Add new row
    new_row = doc.append("smart_contact_details", {})
    new_row.type = type
    new_row.value = value
    if country_code:
        new_row.country_code = country_code
        
    doc.save(ignore_mandatory=True)
    return {"status": "success", "message": "Contact Added"}

def sync_contacts(doc, method):
	"""
	Syncs 'Smart Contact Details' to:
	1. Standard Lead Fields (mobile_no, email_id, phone, etc) for immediate visibility.
	2. A Standard 'Contact' Document linked to this Lead (for clean Lead->Customer conversion).
	"""
	if not doc.smart_contact_details:
		return

	# 1. Sync to Standard Lead Fields (First match wins)
	# This ensures standard list views and filters still work
	updates = {}
	if not doc.mobile_no:
		mobile = next((d.get('value') if isinstance(d, dict) else d.value for d in doc.smart_contact_details if (d.get('type') if isinstance(d, dict) else d.type) == 'Mobile'), None)
		if mobile: updates['mobile_no'] = mobile

	if not doc.email_id:
		email = next((d.get('value') if isinstance(d, dict) else d.value for d in doc.smart_contact_details if (d.get('type') if isinstance(d, dict) else d.type) == 'Email'), None)
		if email: updates['email_id'] = email
	
	if not doc.phone:
		phone = next((d.get('value') if isinstance(d, dict) else d.value for d in doc.smart_contact_details if (d.get('type') if isinstance(d, dict) else d.type) == 'Phone'), None)
		if phone: updates['phone'] = phone
	
	if not doc.website:
		website = next((d.get('value') if isinstance(d, dict) else d.value for d in doc.smart_contact_details if (d.get('type') if isinstance(d, dict) else d.type) == 'Website'), None)
		if website: updates['website'] = website

	if updates:
		# Use db_set to avoid infinite recursion triggers
		for k, v in updates.items():
			doc.db_set(k, v)

	# 1.5 Sync to 'custom_search_index' for Universal Search
	# Concatenate ALL types and values into one searchable text blob
	search_index_parts = []
	
	# A. Pull from Child Table (Smart Contact Details)
	for row in doc.smart_contact_details:
		# Handle both dict and DocType objects
		row_value = row.get('value') if isinstance(row, dict) else row.value
		row_country_code = row.get('country_code') if isinstance(row, dict) else row.country_code
		
		if row_value:
			# 1. Raw Value
			search_index_parts.append(row_value)
			
			# 2. Normalized Value (Digits only)
			clean_val = ''.join(filter(str.isdigit, row_value))
			if clean_val != row_value:
				search_index_parts.append(clean_val)
				
			# 3. Full International Number (if Country Code exists)
			if row_country_code:
				full_number = f"{row_country_code}{clean_val}"
				search_index_parts.append(full_number)
				# Also add with plus if missing
				if not full_number.startswith('+'):
					search_index_parts.append(f"+{full_number}")

	# B. Pull from Main Lead Table (Requested by User)
	# Mobile Number 1 (mobile_no), Mobile Number 2 (phone), Name, Business Name
	main_fields = ['mobile_no', 'phone', 'lead_name', 'company_name']
	for field in main_fields:
		val = doc.get(field)
		if val:
			search_index_parts.append(str(val))
			# Also normalize phones if it looks like a number
			clean = ''.join(filter(str.isdigit, str(val)))
			if len(clean) > 5: # Basic check to avoid indexing small IDs
				search_index_parts.append(clean)

	# C. [NEW] Include Notes (Child Table)
	if doc.get("notes"):
		for note in doc.notes:
			if note.note:
				# Strip HTML if needed, but for now raw is fine or strip tags
				search_index_parts.append(frappe.utils.strip_html(note.note))

	# D. [NEW] Include Activities (Tasks & Events)
	# Only fetch open/relevant ones or all? All is better for history search.
	# Tasks
	# Tasks: Standard Task does not link directly to Lead in this version.
	# Skipping Task indexing to avoid SQL errors.
	# tasks = frappe.get_all("Task", 
	# 	filters={"reference_type": "Lead", "reference_name": doc.name}, 
	# 	fields=["subject", "description"])
	# for t in tasks:
	# 	if t.subject: search_index_parts.append(t.subject)
	# 	if t.description: search_index_parts.append(frappe.utils.strip_html(t.description))

	# Events (Linked via 'participants' typically, OR reference in older versions/custom)
	# Standard Event has 'reference_type' provided in our DESC check earlier? 
	# No, DESC showed 'reference_doctype', 'reference_docname'
	events = frappe.get_all("Event", 
		filters={"reference_doctype": "Lead", "reference_docname": doc.name}, 
		fields=["subject", "description"])
	for e in events:
		if e.subject: search_index_parts.append(e.subject)
		if e.description: search_index_parts.append(frappe.utils.strip_html(e.description))

	# E. [NEW] Include Interaction History (Child Table)
	if doc.get("interaction_history"):
		for interaction in doc.interaction_history:
			if interaction.summary:
				search_index_parts.append(interaction.summary)


	# F. [NEW] Include Related Documents (Quotation, Opportunity, Prospect, Customer)
	
	# 1. Quotations (Linked via party_name=Lead)
	quotations = frappe.get_all("Quotation",
		filters={"party_name": doc.name, "docstatus": ["<", 2]}, # Exclude cancelled
		fields=["name", "status"])
	if quotations:
		search_index_parts.append("HasQuotation") # Marker for existence check
	for q in quotations:
		search_index_parts.append(q.name) # Index Quotation ID
		if q.status: search_index_parts.append(q.status)

	# 2. Opportunities (Linked via party_name=Lead)
	opportunities = frappe.get_all("Opportunity",
		filters={"party_name": doc.name, "docstatus": ["<", 2]},
		fields=["name", "title", "status"])
	if opportunities:
		search_index_parts.append("HasOpportunity")
	for o in opportunities:
		search_index_parts.append(o.name)
		if o.title: search_index_parts.append(o.title)
		if o.status: search_index_parts.append(o.status)

	# 3. Prospect
	try:
		prospects = frappe.get_all("Prospect",
			filters={"lead": doc.name},
			fields=["name", "company_name"])
		if prospects:
			search_index_parts.append("HasProspect")
		for p in prospects:
			search_index_parts.append(p.name)
			if p.company_name: search_index_parts.append(p.company_name)
	except Exception:
		pass

	# 4. Customer (If converted)
	if doc.get('customer'):
		search_index_parts.append("HasCustomer")
		search_index_parts.append(doc.customer)
		# Fetch customer name if different
		cust_name = frappe.db.get_value("Customer", doc.customer, "customer_name")
		if cust_name: search_index_parts.append(cust_name)



	if search_index_parts:
		# Deduplicate and Join
		unique_parts = list(dict.fromkeys(search_index_parts))
		search_blob = " | ".join(unique_parts)
		
		# No truncation needed for Text field
		# Check if field exists before setting
		current_value = doc.get('custom_search_index', '')
		if current_value != search_blob:
			# Use db_set to avoid recursion and handle missing field gracefully
			try:
				doc.db_set('custom_search_index', search_blob)
			except Exception:
				# Field doesn't exist, skip it
				pass

	# 2. Sync to Standard 'Contact' Document
	# This ensures all data (multiple numbers, social links) transfers to Customer/Contact
	sync_to_contact_doctype(doc)
    
	# 3. Sync to 'smart_contact_summary' for List View
	try:
		summary_parts = []
		icons = {
			'Mobile': '📱', 'Phone': '☎️', 'WhatsApp': '💬',
			'Email': '📧', 'Address': '📍', 'Website': '🌐', 
			'Facebook': 'FB', 'LinkedIn': 'LI', 'Instagram': 'IG'
		}

		if doc.smart_contact_details:
			for row in doc.smart_contact_details:
				val = row.get('value') if isinstance(row, dict) else row.value
				rtype = row.get('type') if isinstance(row, dict) else row.type
				
				if val:
					icon = icons.get(rtype, '▪️')
					summary_parts.append(f"{icon} {val}")

		if summary_parts:
			summary_text = "  |  ".join(summary_parts)
			# Only update if changed
			if doc.get('smart_contact_summary') != summary_text:
				doc.db_set('smart_contact_summary', summary_text)
		else:
			if doc.get('smart_contact_summary'):
				doc.db_set('smart_contact_summary', '')
				
	except Exception:
		pass

	# 4. Sync to Standard 'Address' Document
	sync_address_doctype(doc)

@frappe.whitelist()
def update_qualification_status(lead, status):
	"""
	Updates the Qualification Status of a Lead directly via DB query.
	Bypasses standard DocType validation to handle legacy data issues (e.g. invalid Lead Type options).
	"""
	if not lead or not status:
		frappe.throw(_("Lead and Status are required"))

	# Direct DB update to bypass validation of other fields
	frappe.db.set_value("Lead", lead, "qualification_status", status)
	
	return {"status": "success"}

def sync_to_contact_doctype(lead_doc):
	try:
		# Check if a Contact already exists for this Lead
		# Usually linked via Dynamic Link
		link_name = frappe.db.get_value("Dynamic Link", {
			"link_doctype": "Lead",
			"link_name": lead_doc.name,
			"parenttype": "Contact"
		}, "parent")

		contact = None
		if link_name:
			contact = frappe.get_doc("Contact", link_name)
		else:
			# Create new Contact using basic Lead info
			contact = frappe.new_doc("Contact")
			contact.first_name = lead_doc.lead_name or "Contact"
			contact.append("links", {
				"link_doctype": "Lead", 
				"link_name": lead_doc.name
			})
		
		# Update Contact Details (Phone/Email tables)
		# We clear and rebuild to ensure 1:1 sync with our Smart List
		contact.phone_nos = []
		contact.email_ids = []
		
		# Map Smart Types to Contact Fields
		for row in lead_doc.smart_contact_details:
			val = row.get('value') if isinstance(row, dict) else row.value
			type_map = row.get('type') if isinstance(row, dict) else row.type
			row_country_code = row.get('country_code') if isinstance(row, dict) else row.country_code
			
			if type_map in ['Mobile', 'Phone', 'WhatsApp', 'Fax']:
				# Handle Country Code
				full_number = val
				if row_country_code and not val.startswith('+'):
					full_number = f"{row_country_code}{val}"
				
				contact.append("phone_nos", {
					"phone": full_number,
					"is_primary_mobile_no": 1 if type_map == 'Mobile' and not any(p.is_primary_mobile_no for p in contact.phone_nos) else 0,
					"is_primary_phone": 1 if type_map == 'Phone' and not any(p.is_primary_phone for p in contact.phone_nos) else 0
				})
			
			elif type_map == 'Email':
				contact.append("email_ids", {
					"email_id": val,
					"is_primary": 1 if not any(e.is_primary for e in contact.email_ids) else 0
				})

		contact.save(ignore_permissions=True)
		
	except Exception as e:
		frappe.log_error(f"Contact Sync Failed for Lead {lead_doc.name}: {str(e)}")

def sync_address_doctype(lead_doc):
	"""
	Syncs 'Address' type items from Smart Contact Details to standard Address Doctype.
	"""
	try:
		# Find Address Entries
		address_rows = [row for row in lead_doc.smart_contact_details if (row.get('type') if isinstance(row, dict) else row.type) == 'Address']
		
		if not address_rows:
			return

		for idx, row in enumerate(address_rows):
			raw_address = row.get('value') if isinstance(row, dict) else row.value
			if not raw_address: continue

			# Unique ID/Title for this address
			address_title = f"{lead_doc.lead_name}-Address-{idx+1}"
			
			# Check if exists by Dynamic Link
			existing_name = frappe.db.get_value("Dynamic Link", {
				"link_doctype": "Lead",
				"link_name": lead_doc.name,
				"parenttype": "Address",
				"parent": ["like", f"%-Address-{idx+1}"] # Heuristic matching
			}, "parent")

			doc = None
			if existing_name:
				doc = frappe.get_doc("Address", existing_name)
			else:
				doc = frappe.new_doc("Address")
				doc.address_title = address_title
				doc.address_type = "Billing" # Default
				doc.append("links", {
					"link_doctype": "Lead",
					"link_name": lead_doc.name
				})
			
			# Parse/Set Fields
			doc.address_line1 = raw_address
			
			# Attempt simple city extraction (Last part after comma)
			if "," in raw_address:
				parts = raw_address.split(",")
				if len(parts) > 1:
					possible_city = parts[-1].strip()
					doc.city = possible_city
			else:
				if not doc.city: doc.city = "Cairo" # Fallback Default
			
			if not doc.country: doc.country = "Egypt" # Fallback Default
			
			doc.save(ignore_permissions=True)

	except Exception as e:
		frappe.log_error(f"Address Sync Failed for Lead {lead_doc.name}: {str(e)}")

@frappe.whitelist()
def check_property_setter():
    ps = frappe.db.get_value("Property Setter", {
        "doc_type": "Apex Contact Detail", 
        "field_name": "type", 
        "property": "options"
    }, "value")
    print(f"Property Setter Found: {ps}")
    
    if ps:
        # Auto-fix: Delete it to allow JSON source of truth
        frappe.db.delete("Property Setter", {
             "doc_type": "Apex Contact Detail", 
            "field_name": "type"
        })
        frappe.db.commit()
        print("Property Setter DELETED. Please reload.")
    else:
        print("No Property Setter found.")

@frappe.whitelist()
def reload_doctype():
    frappe.reload_doctype("Apex Contact Detail")
    print("DocType Reloaded.")

@frappe.whitelist()
def debug_schema():
    # 1. Check DocField (Standard)
    df_options = frappe.db.get_value("DocField", {"parent": "Apex Contact Detail", "fieldname": "type"}, "options")
    print(f"DocField Options: {df_options}")
    
    # 2. Check Custom Field (if any)
    cf_options = frappe.db.get_value("Custom Field", {"dt": "Apex Contact Detail", "fieldname": "type"}, "options")
    print(f"Custom Field Options: {cf_options}")
    
    # 3. Check Property Setter (Again)
    ps_options = frappe.db.get_value("Property Setter", {"doc_type": "Apex Contact Detail", "field_name": "type", "property": "options"}, "value")
    print(f"Property Setter Options: {ps_options}")
    
    # FORCE CORRECT
    target_options = "Phone\nMobile\nEmail\nWhatsApp\nTelegram\nLinkedIn\nFacebook\nInstagram\nTikTok\nSnapchat\nLocation\nAddress\nWebsite\nOther"
    
    if df_options and "TikTok" not in df_options:
        print("FIXING DocField...")
        frappe.db.set_value("DocField", {"parent": "Apex Contact Detail", "fieldname": "type"}, "options", target_options)
        
    if cf_options and "TikTok" not in cf_options:
        print("FIXING Custom Field...")
        frappe.db.set_value("Custom Field", {"dt": "Apex Contact Detail", "fieldname": "type"}, "options", target_options)
        
@frappe.whitelist()
def debug_schema():
    # ... existing ...
    print("FIX APPLIED. Cache Cleared.")

@frappe.whitelist()
def test_tiktok_validation():
    try:
        doc = frappe.new_doc("Lead")
        doc.first_name = "Test TikTok"
        doc.salutation = "Mr"
        doc.gender = "Male"
        doc.source = "Walk In"
        doc.status = "Lead"
        # Populate mandatory standard mandatory fields if customized
        
        doc.append("smart_contact_details", {"type": "TikTok", "value": "test_tiktok", "is_primary": 0})
        
        doc.save(ignore_permissions=True) # Use save to trigger validations
        print("Success! Created Lead with TikTok type.")
        frappe.delete_doc("Lead", doc.name)
    except Exception as e:
        print(f"FAILED: {str(e)}")

@frappe.whitelist(allow_guest=True)
def facebook_webhook():
    """
    Webhook endpoint for Facebook App.
    Handles verification (GET) and Data (POST).
    """
    # 1. Verification Request (GET)
    if frappe.request.method == "GET":
        mode = frappe.request.args.get("hub.mode")
        token = frappe.request.args.get("hub.verify_token")
        challenge = frappe.request.args.get("hub.challenge")

        if mode and token:
            if mode == "subscribe" and token == "apex_crm_fb_secret": # Default Token
                return Response(challenge, status=200, mimetype='text/plain')
            else:
                frappe.throw("Access Denied", exc=frappe.PermissionError)

    # 2. Data Notification (POST)
    if frappe.request.method == "POST":
        try:
            # Handle standard JSON payload
            payload = frappe.request.json
            if not payload and frappe.request.data:
                 payload = json.loads(frappe.request.data)
            
            if payload:
                process_facebook_payload(payload)
            
            return Response("EVENT_RECEIVED", status=200, mimetype='text/plain')
        except Exception as e:
            frappe.log_error(f"Facebook Webhook Failed: {str(e)}")
            # Return 200 to prevent Facebook from retrying indefinitely
            return Response("EVENT_RECEIVED_WITH_ERROR", status=200, mimetype='text/plain')


@frappe.whitelist()
def get_lead_dashboard_data(lead):
    """
    Returns counts for Open Tasks, Open Events, and Notes for a specific Lead.
    Matches the same logic as Form view dashboard.
    """
    if not lead:
        return {}

    # Open Tasks: Count ToDo items linked to this Lead via reference_type and reference_name
    open_tasks = frappe.db.count('ToDo', {
        'reference_type': 'Lead',
        'reference_name': lead,
        'status': 'Open'
    })

    # Open Events: Count Events where this Lead is a participant
    # Events are linked via Event Participants child table
    event_participants = frappe.get_all('Event Participants', 
        filters={
            'reference_doctype': 'Lead', 
            'reference_docname': lead
        }, 
        fields=['parent'],
        distinct=True
    )
    
    if event_participants:
        event_names = [d.parent for d in event_participants]
        # Count open events (excluding Public events)
        open_events = frappe.db.count('Event', filters={
            'status': 'Open',
            'event_type': ['!=', 'Public'],
            'name': ['in', event_names]
        })
    else:
        open_events = 0
    
    # Notes: Count from CRM Note Child Table (same as Form view)
    # Form view uses this.frm.doc.notes (child table), so we should match that
    crm_notes = frappe.db.count('CRM Note', filters={
        'parent': lead, 
        'parentfield': 'notes', 
        'parenttype': 'Lead'
    })
    
    # Also count Note documents linked via custom_lead (if used)
    note_docs = frappe.db.count('Note', filters={'custom_lead': lead})
    
    # Total notes (matching Form view behavior - primarily from child table)
    notes = crm_notes + note_docs

    # Quotations linked to this Lead
    quotations = frappe.db.count('Quotation', filters={
        'party_name': lead,
        'quotation_to': 'Lead'
    })
    
    # Prospects linked to this Lead (through Prospect Lead child table)
    prospect_leads = frappe.get_all('Prospect Lead', 
        filters={'lead': lead}, 
        fields=['parent'])
    
    if prospect_leads:
        prospect_names = [d.parent for d in prospect_leads]
        prospects = len(set(prospect_names))  # Count unique prospects
    else:
        prospects = 0
    
    # Opportunities linked to this Lead
    opportunities = frappe.db.count('Opportunity', filters={
        'opportunity_from': 'Lead',
        'party_name': lead
    })

    # Customers linked to this Lead
    customers = frappe.db.count('Customer', filters={'lead_name': lead})

    # Last Interaction
    last_interaction = None
    if frappe.db.exists("DocType", "Apex Interaction Log"):
        last_log = frappe.get_all("Apex Interaction Log", 
            filters={"parent": lead, "parenttype": "Lead"}, 
            fields=["timestamp", "type", "summary", "creation"], 
            order_by="timestamp desc", 
            limit=1
        )
        if last_log:
            last_interaction = last_log[0]
            
    # Count Total Interactions
    interaction_count = 0
    if frappe.db.exists("DocType", "Apex Interaction Log"):
         interaction_count = frappe.db.count("Apex Interaction Log", filters={"parent": lead, "parenttype": "Lead"})

            
    # Fetch Contacts (Child Table)
    contacts = frappe.db.get_all("Apex Contact Detail", 
        filters={"parent": lead}, 
        fields=["type", "value", "is_primary"]
    )
    
    # Prepend Main Lead Contact Info
    lead_doc = frappe.db.get_value("Lead", lead, ["mobile_no", "email_id"], as_dict=True)
    if lead_doc:
        # Add Email if exists
        if lead_doc.email_id:
             # Check if already in contacts to avoid dupe
             if not any(c['value'] == lead_doc.email_id for c in contacts):
                contacts.insert(0, {
                    "type": "Email",
                    "value": lead_doc.email_id,
                    "is_primary": 0 # Main fields, implicitly primary-ish
                })

        # Add Mobile if exists
        if lead_doc.mobile_no:
             # Check if already in contacts
             if not any(c['value'] == lead_doc.mobile_no for c in contacts):
                contacts.insert(0, {
                    "type": "Mobile",
                    "value": lead_doc.mobile_no,
                    "is_primary": 1 # Treat main mobile as primary by default
                })

    return {
        'tasks': open_tasks,
        'events': open_events,
        'notes': notes,
        'quotations': quotations,
        'prospects': prospects,
        'opportunities': opportunities,
        'customers': customers,
        'last_interaction': last_interaction,
        'interaction_count': interaction_count,
        'contacts': contacts
    }

@frappe.whitelist()
def get_leads_dashboard_data_batch(leads):
    """
    Returns counts for Open Tasks, Open Events, and Notes for multiple Leads in batch.
    """
    import json
    
    # Handle case where leads comes as JSON string (Frappe sometimes does this)
    if isinstance(leads, str):
        try:
            leads = json.loads(leads)
        except:
            pass
    
    if not leads or not isinstance(leads, list):
        frappe.log_error(f"get_leads_dashboard_data_batch: Invalid leads parameter: {leads} (type: {type(leads)})", "API Error")
        return {}
    
    result = {}
    
    for lead in leads:
        if not lead:
            continue
        try:
            lead_data = get_lead_dashboard_data(lead)
            result[lead] = lead_data
        except Exception as e:
            frappe.log_error(f"Error getting dashboard data for {lead}: {str(e)}", "API Error")
            result[lead] = {
                'tasks': 0,
                'events': 0,
                'notes': 0,
                'quotations': 0,
                'prospects': 0,
                'opportunities': 0
            }
    
    return result

def process_facebook_payload(payload):
    """
    Parses payload and updates/creates leads.
    """
    entries = payload.get("entry", [])
    for entry in entries:
        changes = entry.get("changes", [])
        
        # Also could be 'messaging' for Messenger
        messaging = entry.get("messaging", [])
        
        # 1. Handle Feed Changes (Comments/Posts)
        for change in changes:
            value = change.get("value", {})
            field = change.get("field")
            
            if field == "feed":
                sender_name = value.get("from", {}).get("name")
                sender_id = value.get("from", {}).get("id")
                message = value.get("message") or "Interaction on Page"
                item_type = value.get("item") # 'comment', 'post', etc.
                
                if sender_id and sender_name:
                    # Try to find phone in message
                    extracted_phone = extract_phone_number(message)
                    handle_lead_interaction(sender_id, sender_name, message, "Facebook", extracted_phone)

        # 2. Handle Inbox (Messenger) - Simplified
        for msg in messaging:
            sender_id = msg.get("sender", {}).get("id")
            message_text = msg.get("message", {}).get("text")
            
            if sender_id and message_text:
                extracted_phone = extract_phone_number(message_text)
                # We assume we can get name via Graph API later, for now use ID
                handle_lead_interaction(sender_id, f"Facebook User {sender_id}", message_text, "Facebook", extracted_phone)

def extract_phone_number(text):
    if not text: return None
    # Regex to find numbers that look like phones (approx 8-15 digits, optional +)
    match = re.search(r'(\+?\d{8,15})', text)
    return match.group(1) if match else None

def handle_lead_interaction(fb_id, fb_name, text, platform="Facebook", phone=None):
    """
    Finds lead by Phone (First Priority), Facebook ID/Link, or Name.
    Logs the interaction.
    """
    profile_link = f"https://facebook.com/{fb_id}"
    lead_name = None
    
    # 1. PRIORITY: Search by Phone (if provided)
    if phone:
        # Search Apex Contact Detail for this phone
        leads = frappe.db.get_all("Apex Contact Detail", filters={
            "value": ["like", f"%{phone}%"],
            "parenttype": "Lead"
        }, fields=["parent"], limit=1)
        
        if leads:
            lead_name = leads[0].parent
            # SMART LINK: Since we found them by phone, let's ADD their Facebook link so next time we know them by ID
            add_contact_if_missing(lead_name, platform, profile_link)

    # 2. Search by Facebook ID/Link
    if not lead_name:
        lead_name = frappe.db.get_value("Apex Contact Detail", {
            "value": ["like", f"%{fb_id}%"],
            "type": platform
        }, "parent")
    
    # 3. Search by Name (Low Confidence)
    if not lead_name:
        lead_name = frappe.db.get_value("Lead", {"lead_name": fb_name}, "name")

    if lead_name:
        # EXISTING LEAD -> Log Interaction
        log_interaction(lead_name, platform, "Left Message", f"Incoming: {text}")
        frappe.db.commit()
    else:
        # NEW LEAD -> Create
        new_lead = frappe.new_doc("Lead")
        new_lead.first_name = fb_name
        
        # Populate Mandatory Custom/Standard Fields
        new_lead.salutation = "Mr" # Default
        new_lead.gender = "Male"   # Default
        new_lead.type = "Client"   # Default
        new_lead.custom_full_name = fb_name
        
        new_lead.status = "Open"
        new_lead.source = platform
        
        # Add Contact Detail (Facebook)
        new_lead.append("smart_contact_details", {
            "type": platform,
            "value": profile_link,
            "is_primary": 1
        })

        # Add Phone if we found one!
        if phone:
            new_lead.append("smart_contact_details", {
                "type": "Mobile",
                "value": phone,
                "is_primary": 0
            })
        
        # Log the first interaction
        new_lead.append("interaction_history", {
            "type": platform,
            "timestamp": frappe.utils.now_datetime(),
            "user": frappe.session.user, # System User
            "status": "Left Message",
            "summary": f"New Inquiry: {text}"
        })
        
        new_lead.save(ignore_permissions=True)
        frappe.db.commit()

def add_contact_if_missing(lead_name, type_val, value_val):
    if not frappe.db.exists("Apex Contact Detail", {"parent": lead_name, "value": value_val}):
        doc = frappe.get_doc("Lead", lead_name)
        doc.append("smart_contact_details", {
            "type": type_val,
            "value": value_val
        })
        doc.save(ignore_permissions=True)

def log_interaction(lead_name, interaction_type, status, summary):
    lead = frappe.get_doc("Lead", lead_name)
    lead.append("interaction_history", {
        "type": interaction_type,
        "timestamp": frappe.utils.now_datetime(),
        "user": frappe.session.user,
        "status": status,
        "summary": summary
    })
    lead.save(ignore_permissions=True)

@frappe.whitelist()
def migrate_old_contacts_to_apex():
	"""
	Migrate contact data from old standard fields to Apex Contact Details automatically.
	This function reads from: phone, mobile_no, email_id, whatsapp_no, fax, website,
	custom_mobile_number_1, custom_mobile_number_2, custom_facebook
	and adds them to smart_contact_details if they don't already exist.
	"""
	# Check permission: User must have write and export permission on Lead
	if not (frappe.has_permission("Lead", "write") and frappe.has_permission("Lead", "export")):
		frappe.throw(__("You don't have permission to migrate contacts. You need both 'Write' and 'Export' permissions on Lead."), frappe.PermissionError)
	# Get all Leads with old contact data or address data
	leads = frappe.db.sql("""
		SELECT 
			name,
			lead_name,
			phone,
			mobile_no,
			email_id,
			whatsapp_no,
			fax,
			website,
			custom_mobile_number_1,
			custom_mobile_number_2,
			custom_facebook,
			city,
			state,
			country
		FROM `tabLead`
		WHERE (
			(phone IS NOT NULL AND phone != '') OR
			(mobile_no IS NOT NULL AND mobile_no != '') OR
			(email_id IS NOT NULL AND email_id != '') OR
			(whatsapp_no IS NOT NULL AND whatsapp_no != '') OR
			(website IS NOT NULL AND website != '') OR
			(fax IS NOT NULL AND fax != '') OR
			(custom_mobile_number_1 IS NOT NULL AND custom_mobile_number_1 != '') OR
			(custom_mobile_number_2 IS NOT NULL AND custom_mobile_number_2 != '') OR
			(custom_facebook IS NOT NULL AND custom_facebook != '') OR
			(city IS NOT NULL AND city != '') OR
			(state IS NOT NULL AND state != '') OR
			(country IS NOT NULL AND country != '')
		)
		ORDER BY name
	""", as_dict=True)
	
	if not leads:
		return {
			'success': 0,
			'skipped': 0,
			'total_leads': 0,
			'message': 'لا توجد بيانات قديمة للانتقال'
		}
	
	success_count = 0
	skipped_count = 0
	contacts_added = 0
	addresses_added = 0
	errors = []
	
	# Default country code (can be customized)
	default_country_code = '+20'
	
	total_leads = len(leads)
	
	for i, lead_data in enumerate(leads):
		frappe.publish_progress(
			float(i) / total_leads * 100,
			title=_("Migrating Contacts"),
			description=_("Processing Lead {0} of {1}: {2}").format(i + 1, total_leads, lead_data['lead_name'])
		)
		try:
			lead = frappe.get_doc('Lead', lead_data['name'])
			
			# Initialize smart_contact_details if not exists
			if not lead.smart_contact_details:
				lead.smart_contact_details = []
			
			# Track contacts added for this lead
			lead_contacts_added = 0
			
			# Helper function to check if contact already exists
			def contact_exists(contact_type, contact_value):
				if not contact_value or not contact_value.strip():
					return True  # Skip empty values
				
				for existing in lead.smart_contact_details:
					existing_type = existing.get('type') if isinstance(existing, dict) else existing.type
					existing_value = existing.get('value') if isinstance(existing, dict) else existing.value
					
					# Normalize values for comparison (remove spaces, special chars for phones)
					normalized_existing = ''.join(filter(str.isdigit, str(existing_value or '')))
					normalized_new = ''.join(filter(str.isdigit, str(contact_value or '')))
					
					if existing_type == contact_type:
						# For phone numbers, compare digits only
						if contact_type in ['Mobile', 'Phone', 'WhatsApp', 'Fax']:
							if normalized_existing == normalized_new and normalized_new:
								return True
						# For other types, exact match
						elif str(existing_value or '').strip().lower() == str(contact_value or '').strip().lower():
							return True
				return False
			
			# Helper function to add contact if not exists
			def add_contact_if_missing(contact_type, contact_value, country_code='', is_primary=0):
				if not contact_value or not contact_value.strip():
					return False
				
				if not contact_exists(contact_type, contact_value):
					lead.append('smart_contact_details', {
						'type': contact_type,
						'country_code': country_code,
						'value': contact_value.strip(),
						'is_primary': is_primary
					})
					return True
				return False
			
			# Migrate standard fields
			# 1. Phone
			if add_contact_if_missing('Phone', lead_data.get('phone'), default_country_code, 0):
				lead_contacts_added += 1
			
			# 2. Mobile No (Primary)
			if add_contact_if_missing('Mobile', lead_data.get('mobile_no'), default_country_code, 1):
				lead_contacts_added += 1
			
			# 3. Email
			if add_contact_if_missing('Email', lead_data.get('email_id'), '', 0):
				lead_contacts_added += 1
			
			# 4. WhatsApp
			if add_contact_if_missing('WhatsApp', lead_data.get('whatsapp_no'), default_country_code, 0):
				lead_contacts_added += 1
			
			# 5. Website
			if add_contact_if_missing('Website', lead_data.get('website'), '', 0):
				lead_contacts_added += 1
			
			# 6. Fax
			if add_contact_if_missing('Fax', lead_data.get('fax'), default_country_code, 0):
				lead_contacts_added += 1
			
			# 7. Custom Mobile Number 1
			if add_contact_if_missing('Mobile', lead_data.get('custom_mobile_number_1'), default_country_code, 0):
				lead_contacts_added += 1
			
			# 8. Custom Mobile Number 2
			if add_contact_if_missing('Mobile', lead_data.get('custom_mobile_number_2'), default_country_code, 0):
				lead_contacts_added += 1
			
			# 9. Custom Facebook
			if add_contact_if_missing('Facebook', lead_data.get('custom_facebook'), '', 0):
				lead_contacts_added += 1
			
			# Migrate Address: Create Address document from Lead's city, state, country
			lead_address_added = False
			if lead_data.get('city') or lead_data.get('state') or lead_data.get('country'):
				# Check if address already exists for this Lead
				existing_address = frappe.db.get_all(
					'Dynamic Link',
					filters={
						'link_doctype': 'Lead',
						'link_name': lead.name,
						'parenttype': 'Address'
					},
					fields=['parent'],
					limit=1
				)
				
				# Only create address if it doesn't exist and we have address data
				if not existing_address:
					try:
						# Create new Address document
						address_doc = frappe.new_doc('Address')
						
						# Set address title from lead name
						address_doc.address_title = lead_data.get('lead_name') or lead.name
						address_doc.address_type = 'Billing'  # Default type
						
						# Set address fields from Lead
						if lead_data.get('city'):
							address_doc.city = lead_data.get('city')
							# Use city as address_line1 if no other address line
							if not address_doc.address_line1:
								address_doc.address_line1 = lead_data.get('city')
						
						if lead_data.get('state'):
							address_doc.state = lead_data.get('state')
						
						if lead_data.get('country'):
							address_doc.country = lead_data.get('country')
						else:
							# Default to Egypt if no country specified
							address_doc.country = 'Egypt'
						
						# Link address to Lead
						address_doc.append('links', {
							'link_doctype': 'Lead',
							'link_name': lead.name
						})
						
						# Set as primary address
						address_doc.is_primary_address = 1
						
						# Save address
						address_doc.insert(ignore_permissions=True, ignore_mandatory=True)
						lead_address_added = True
						addresses_added += 1
						
					except Exception as addr_error:
						# Log address creation error but don't fail the whole migration
						frappe.log_error(
							f"Address migration error for Lead {lead.name}: {str(addr_error)}",
							"Apex CRM Address Migration"
						)
			
			# Save Lead if we added contacts
			if lead_contacts_added > 0:
				lead.save(ignore_permissions=True)
			
			# Count success if we added contacts or address
			if lead_contacts_added > 0 or lead_address_added:
				success_count += 1
				contacts_added += lead_contacts_added
			else:
				skipped_count += 1
				
		except Exception as e:
			error_msg = f"خطأ في Lead {lead_data.get('name')}: {str(e)}"
			errors.append(error_msg)
			frappe.log_error(f"Migration error for {lead_data.get('name')}: {str(e)}", "Apex CRM Migration")
			skipped_count += 1
	
	frappe.db.commit()
	
	return {
		'success': success_count,
		'skipped': skipped_count,
		'total_leads': len(leads),
		'contacts_added': contacts_added,
		'addresses_added': addresses_added,
		'error_list': errors[:20] if errors else []
	}

@frappe.whitelist()
def import_addresses_from_external(file_path=None, addresses_data=None):
	"""
	Import addresses from external server (JSON file or direct data)
	
	Expected format:
	[
		{
			"Lead ID": "LEAD-XXX",
			"address_line1": "123 Main St",
			"address_line2": "Apt 4",
			"city": "Cairo",
			"state": "Cairo",
			"country": "Egypt",
			"pincode": "12345",
			"address_type": "Billing"
		},
		...
	]
	"""
	# Check permission
	if not (frappe.has_permission("Lead", "write") and frappe.has_permission("Address", "write")):
		frappe.throw(__("You don't have permission to import addresses. You need 'Write' permission on Lead and Address."), frappe.PermissionError)
	
	import json
	import os
	
	# Get data from file or direct input
	if file_path:
		# Handle Frappe File DocType path
		actual_file_path = file_path
		if file_path.startswith('/files/') or file_path.startswith('/private/files/'):
			# Get file from Frappe File DocType
			try:
				file_doc = frappe.get_doc("File", {"file_url": file_path})
				actual_file_path = file_doc.get_full_path()
			except:
				# Try to get file by name
				try:
					file_doc = frappe.get_doc("File", {"file_name": file_path.split('/')[-1]})
					actual_file_path = file_doc.get_full_path()
				except:
					frappe.throw(f"الملف غير موجود في النظام: {file_path}")
		
		if not os.path.exists(actual_file_path):
			frappe.throw(f"الملف غير موجود: {actual_file_path}")
		
		with open(actual_file_path, 'r', encoding='utf-8') as f:
			addresses_data = json.load(f)
	
	if not addresses_data:
		frappe.throw("لا توجد بيانات للاستيراد")
	
	if not isinstance(addresses_data, list):
		frappe.throw("تنسيق البيانات غير صحيح. يجب أن يكون قائمة من السجلات.")
	
	success_count = 0
	skipped_count = 0
	errors = []
	
	for addr_data in addresses_data:
		try:
			lead_id = addr_data.get('Lead ID') or addr_data.get('lead_id') or addr_data.get('lead_name')
			if not lead_id:
				skipped_count += 1
				errors.append("سجل بدون Lead ID - تم تخطيه")
				continue
			
			# Check if Lead exists
			if not frappe.db.exists('Lead', lead_id):
				skipped_count += 1
				errors.append(f"Lead {lead_id} غير موجود - تم تخطيه")
				continue
			
			# Check if address already exists for this Lead
			existing_address = frappe.db.get_all(
				'Dynamic Link',
				filters={
					'link_doctype': 'Lead',
					'link_name': lead_id,
					'parenttype': 'Address'
				},
				fields=['parent'],
				limit=1
			)
			
			# Skip if address already exists (optional - can be changed to update)
			if existing_address:
				skipped_count += 1
				continue
			
			# Get Lead to use name for address title
			lead = frappe.get_doc('Lead', lead_id)
			
			# Create new Address document
			address_doc = frappe.new_doc('Address')
			
			# Set address title from lead name
			address_doc.address_title = lead.lead_name or lead.name
			address_doc.address_type = addr_data.get('address_type', 'Billing')
			
			# Set address fields
			if addr_data.get('address_line1'):
				address_doc.address_line1 = addr_data.get('address_line1')
			elif addr_data.get('city'):
				# Use city as address_line1 if no address_line1
				address_doc.address_line1 = addr_data.get('city')
			
			if addr_data.get('address_line2'):
				address_doc.address_line2 = addr_data.get('address_line2')
			
			if addr_data.get('city'):
				address_doc.city = addr_data.get('city')
			
			if addr_data.get('state'):
				address_doc.state = addr_data.get('state')
			
			if addr_data.get('country'):
				address_doc.country = addr_data.get('country')
			else:
				# Default to Egypt if no country specified
				address_doc.country = 'Egypt'
			
			if addr_data.get('pincode'):
				address_doc.pincode = addr_data.get('pincode')
			
			if addr_data.get('phone'):
				address_doc.phone = addr_data.get('phone')
			
			if addr_data.get('email_id'):
				address_doc.email_id = addr_data.get('email_id')
			
			# Link address to Lead
			address_doc.append('links', {
				'link_doctype': 'Lead',
				'link_name': lead_id
			})
			
			# Set as primary address if specified
			if addr_data.get('is_primary', 1):
				address_doc.is_primary_address = 1
			
			# Save address
			address_doc.insert(ignore_permissions=True, ignore_mandatory=True)
			success_count += 1
			
		except Exception as e:
			error_msg = f"خطأ في استيراد العنوان لـ Lead {lead_id}: {str(e)}"
			errors.append(error_msg)
			frappe.log_error(f"Address import error: {str(e)}", "Apex CRM Address Import")
			skipped_count += 1
	
	frappe.db.commit()
	
	return {
		'success': success_count,
		'skipped': skipped_count,
		'total_addresses': len(addresses_data),
		'error_list': errors[:20] if errors else []
	}

@frappe.whitelist()
def export_apex_contacts_to_excel():
	"""
	Export all Apex Contact Details to Excel format using a Pivoted (Flattened) layout.
	Instead of multiple rows per lead, this creates one row per lead with columns like Mobile 1, Mobile 2, Facebook, etc.
	"""
	# Check permission
	if not (frappe.has_permission("Lead", "export") or frappe.has_permission("Lead", "read")):
		frappe.throw(_("You don't have permission to export contacts. You need 'Export' or 'Read' permission on Lead."), frappe.PermissionError)
	
	from frappe.utils.xlsxutils import make_xlsx
	from frappe.utils import get_site_path
	import os
	
	# 1. Fetch all raw data
	contacts = frappe.db.sql("""
		SELECT 
			acd.parent as lead_id,
			l.lead_name,
			acd.type,
			acd.country_code,
			acd.value
		FROM `tabApex Contact Detail` acd
		INNER JOIN `tabLead` l ON acd.parent = l.name
		WHERE acd.parenttype = 'Lead'
		ORDER BY acd.parent, acd.idx
	""", as_dict=True)
	
	if not contacts:
		frappe.throw(_("No contacts found to export."))

	# 2. Process data to group by Lead
	# Structure: { lead_id: { 'name': 'Lead Name', 'data': { 'Mobile': ['+2010..', '+2011..'], 'Facebook': ['url'] } } }
	leads_data = {}
	global_max_counts = {} # { 'Mobile': 3, 'Facebook': 1, 'Email': 2 }
	
	for c in contacts:
		lead_id = c.lead_id
		if lead_id not in leads_data:
			leads_data[lead_id] = {
				'name': c.lead_name,
				'data': {} # dictionary of lists
			}
		
		ctype = c.type or 'Other'
		val = c.value or ''
		
		# Format value with country code if applicable
		if c.country_code and ctype in ['Mobile', 'Phone', 'WhatsApp', 'Telegram']:
			# Avoid double code if already present
			if not val.startswith('+'):
				val = f"{c.country_code}{val}"
		
		if ctype not in leads_data[lead_id]['data']:
			leads_data[lead_id]['data'][ctype] = []
			
		leads_data[lead_id]['data'][ctype].append(val)
		
		# Update global max structure to know how many columns we need
		current_len = len(leads_data[lead_id]['data'][ctype])
		if global_max_counts.get(ctype, 0) < current_len:
			global_max_counts[ctype] = current_len

	# 3. Build Dynamic Columns
	# Base columns
	columns = ['Lead ID', 'Lead Name']
	
	# Sort types alphabetically for consistent output, but maybe put common ones first?
	# Let's enforce a specific order for common types, others alphabetical
	priority_types = ['Mobile', 'Phone', 'WhatsApp', 'Email', 'Facebook', 'Instagram', 'LinkedIn']
	all_types = sorted(global_max_counts.keys())
	sorted_types = [t for t in priority_types if t in all_types] + [t for t in all_types if t not in priority_types]
	
	# Create header row: Mobile 1, Mobile 2, Email 1, etc.
	for ctype in sorted_types:
		count = global_max_counts[ctype]
		if count == 1:
			columns.append(ctype)
		else:
			for i in range(count):
				columns.append(f"{ctype} {i+1}")

	# 4. Populate Rows
	excel_rows = [columns] # Start with header
	
	for lead_id, info in leads_data.items():
		row = [lead_id, info['name']]
		
		for ctype in sorted_types:
			max_c = global_max_counts[ctype]
			values = info['data'].get(ctype, [])
			
			# Add values for this type
			for i in range(max_c):
				if i < len(values):
					row.append(values[i])
				else:
					row.append("") # Empty cell if this lead has fewer items than max
		
		excel_rows.append(row)
	
	# 5. Generate Excel
	xlsx_data = make_xlsx(excel_rows, "Apex Contact Smart Export")
	
	# Save to site folder
	site_path = get_site_path()
	timestamp = frappe.utils.now_datetime().strftime('%Y-%m-%d_%H-%M-%S')
	file_name = f"apex_smart_export_{timestamp}.xlsx"
	file_path = os.path.join(site_path, 'public', 'files', file_name)
	
	# Ensure directory exists
	os.makedirs(os.path.dirname(file_path), exist_ok=True)
	
	with open(file_path, 'wb') as f:
		f.write(xlsx_data.getvalue())
	
	# Return file URL for download
	file_url = f"/files/{file_name}"
	
	return {
		'file_url': file_url,
		'file_path': file_path,
		'total_records': len(leads_data)
	}

@frappe.whitelist()
def get_apex_crm_button_permissions():
	"""
	Get custom permissions for Apex CRM buttons.
	Checks Role Permissions for Lead DocType and returns permissions for each button.
	
	Returns:
		dict: {
			'duplicate_manager': bool,
			'migrate_contacts': bool,
			'export_contacts': bool,
			'import_contacts': bool
		}
	"""
	permissions = {
		'duplicate_manager': False,
		'migrate_contacts': False,
		'export_contacts': False,
		'import_contacts': False
	}
	
	# Get user roles
	user_roles = frappe.get_roles()
	
	# Get Lead DocType permissions
	lead_perms = frappe.get_all("DocPerm",
		filters={"parent": "Lead", "role": ["in", user_roles]},
		fields=["role", "read", "write", "export", "import"]
	)
	

	# Check permissions from DocPerm
	for perm in lead_perms:
		if perm.export:
			permissions['export_contacts'] = True
		if perm.get('import', 0):
			permissions['import_contacts'] = True
		# Migrate requires Write AND Export
		if perm.write and perm.export:
			permissions['migrate_contacts'] = True
	
	# Fallback/Supplemental Checks using frappe.has_permission (more reliable)
	if not permissions['export_contacts']:
		permissions['export_contacts'] = frappe.has_permission("Lead", "export") or frappe.has_permission("Lead", "read")
	
	if not permissions['import_contacts']:
		permissions['import_contacts'] = frappe.has_permission("Lead", "import") or frappe.has_permission("Lead", "write")
	
	if not permissions['migrate_contacts']:
		# Requirement: Write AND Export
		permissions['migrate_contacts'] = frappe.has_permission("Lead", "write") and frappe.has_permission("Lead", "export")
	
	# Duplicate Manager: Link to Page Permission ('duplicate-manager')
	# This allows controlling button visibility via 'Role Permissions Manager' > 'Page'
	permissions['duplicate_manager'] = has_page_permission('duplicate-manager')
	
	# Combine export and import into export_import for the button
	permissions['export_import'] = permissions['export_contacts'] or permissions['import_contacts']
	
	return permissions

def has_page_permission(page_name):
	"""
	Checks if the current user has access to a specific Page.
	"""
	if "System Manager" in frappe.get_roles():
		return True
		
	roles = frappe.get_roles()
	allowed_roles = frappe.db.get_all('Has Role', 
		filters={'parent': page_name, 'parenttype': 'Page', 'role': ['in', roles]}, 
		fields=['role'],
		ignore_permissions=True
	)
	
	return len(allowed_roles) > 0

@frappe.whitelist()
def import_apex_contacts_from_excel():
	"""
	Import Apex Contact Details from Excel file.
	
	Expected Excel format:
	- Columns: Lead ID, Lead Name, Type, Country Code, Value, Is Primary
	- First row is header (will be skipped)
	
	This method is called by FileUploader, which provides the file via frappe.local.uploaded_file
	"""
	# Check permission: User must have import permission on Lead (or write as fallback)
	if not (frappe.has_permission("Lead", "import") or frappe.has_permission("Lead", "write")):
		frappe.throw(_("You don't have permission to import contacts. You need 'Import' or 'Write' permission on Lead."), frappe.PermissionError)
	import os
	from frappe.utils.xlsxutils import read_xlsx_file_from_attached_file
	
	# Get file content from FileUploader
	file_content = None
	file_path = None
	
	# Method 1: FileUploader provides content via frappe.local.uploaded_file
	if hasattr(frappe.local, 'uploaded_file') and frappe.local.uploaded_file:
		file_content = frappe.local.uploaded_file
		file_name = getattr(frappe.local, 'uploaded_filename', 'import.xlsx')
	
	# Method 2: File URL (if file was already uploaded)
	elif hasattr(frappe.local, 'uploaded_file_url') and frappe.local.uploaded_file_url:
		file_url = frappe.local.uploaded_file_url
		file_path = frappe.utils.file_manager.get_file_path(file_url)
		if not os.path.exists(file_path):
			frappe.throw(f"الملف غير موجود: {file_path}")
	
	# Method 3: Check if file_path was passed as parameter (backward compatibility)
	elif frappe.form_dict.get('file_path'):
		file_path = frappe.form_dict.file_path
		if file_path.startswith('/files/'):
			from frappe.utils import get_site_path
			site_path = get_site_path()
			file_path = os.path.join(site_path, 'public', file_path.lstrip('/'))
		
		if not os.path.exists(file_path):
			frappe.throw(f"الملف غير موجود: {file_path}")
	
	else:
		frappe.throw("يرجى تحديد ملف للاستيراد")
	
	try:
		# Read Excel file using Frappe utils (no pandas needed)
		if file_content:
			# Read from memory
			rows = read_xlsx_file_from_attached_file(fcontent=file_content)
		else:
			# Read from file path
			rows = read_xlsx_file_from_attached_file(filepath=file_path)
		
		if not rows or len(rows) < 2:
			frappe.throw("الملف فارغ أو لا يحتوي على بيانات")
		
		# First row is header
		header_row = [str(cell).strip() if cell else '' for cell in rows[0]]
		header_lower = {str(cell).lower().strip() if cell else '': i for i, cell in enumerate(rows[0])}
		
		# Detect file format: Old format (Type/Value) or New format (Flattened columns)
		has_type_value = 'type' in header_lower and 'value' in header_lower
		has_flattened = any(col.lower() in ['mobile 1', 'phone 1', 'email', 'facebook 1'] for col in header_row)
		
		# Validate required columns based on format
		if has_type_value:
			# Old format: Lead ID, Type, Value
			required_columns = ['Lead ID', 'Type', 'Value']
			missing_columns = []
			column_indices = {}
			
			for req_col in required_columns:
				req_col_lower = req_col.lower()
				if req_col_lower in header_lower:
					column_indices[req_col] = header_lower[req_col_lower]
				else:
					missing_columns.append(req_col)
			
			if missing_columns:
				frappe.throw(f"الأعمدة المطلوبة مفقودة: {', '.join(missing_columns)}. الأعمدة الموجودة: {', '.join(header_row[:10])}...")
		elif has_flattened:
			# New format: Lead ID, Lead Name, Mobile 1, Mobile 2, Phone 1, etc.
			required_columns = ['Lead ID']
			missing_columns = []
			column_indices = {}
			
			for req_col in required_columns:
				req_col_lower = req_col.lower()
				if req_col_lower in header_lower:
					column_indices[req_col] = header_lower[req_col_lower]
				else:
					missing_columns.append(req_col)
			
			if missing_columns:
				frappe.throw(f"الأعمدة المطلوبة مفقودة: {', '.join(missing_columns)}. الأعمدة الموجودة: {', '.join(header_row[:10])}...")
		else:
			# Unknown format
			frappe.throw(f"صيغة الملف غير معروفة. يجب أن يحتوي على إما (Lead ID, Type, Value) أو (Lead ID, Mobile 1, Phone 1, etc.). الأعمدة الموجودة: {', '.join(header_row[:10])}...")
		
		# Process data based on format
		success_count = 0
		error_count = 0
		errors = []
		
		if has_type_value:
			# OLD FORMAT: Process Type/Value format
			optional_columns = {
				'Country Code': header_lower.get('country code'),
				'Is Primary': header_lower.get('is primary')
			}
			
			leads_processed = {}
			
			# Group rows by Lead ID
			for row_idx, row in enumerate(rows[1:], start=2):  # Skip header
				if not row or len(row) <= column_indices['Lead ID']:
					continue
				
				lead_id = str(row[column_indices['Lead ID']]).strip() if row[column_indices['Lead ID']] else ''
				if not lead_id:
					continue
				
				# Group by Lead ID
				if lead_id not in leads_processed:
					leads_processed[lead_id] = []
				leads_processed[lead_id].append(row)
			
			# Calculate total leads for progress tracking
			total_leads = len(leads_processed)
			
			# Process each Lead
			for idx, (lead_id, lead_rows) in enumerate(leads_processed.items(), 1):
				# Publish progress
				frappe.publish_progress(
					float(idx) / total_leads * 100,
					title=_("استيراد جهات الاتصال"),
					description=_("معالجة Lead {0} من {1}: {2}").format(idx, total_leads, lead_id)
				)
				try:
					# Check if Lead exists
					if not frappe.db.exists('Lead', lead_id):
						error_count += 1
						errors.append(f"Lead {lead_id} غير موجود")
						continue
					
					# Get Lead document
					lead = frappe.get_doc('Lead', lead_id)
					
					# Initialize smart_contact_details if not exists
					if not lead.smart_contact_details:
						lead.smart_contact_details = []
					
					# Process each contact row for this lead
					for row in lead_rows:
						contact_type = str(row[column_indices['Type']]).strip() if len(row) > column_indices['Type'] and row[column_indices['Type']] else 'Other'
						contact_value = str(row[column_indices['Value']]).strip() if len(row) > column_indices['Value'] and row[column_indices['Value']] else ''
						
						if not contact_value:
							continue
						
						# Get optional fields
						country_code = ''
						if optional_columns['Country Code'] is not None and len(row) > optional_columns['Country Code']:
							country_code = str(row[optional_columns['Country Code']]).strip() if row[optional_columns['Country Code']] else ''
						
						is_primary = 0
						if optional_columns['Is Primary'] is not None and len(row) > optional_columns['Is Primary']:
							primary_val = row[optional_columns['Is Primary']]
							is_primary = 1 if (primary_val == 1 or str(primary_val).lower() in ['1', 'true', 'yes']) else 0
						
						# Check for duplicates
						existing = False
						for existing_contact in lead.smart_contact_details:
							existing_type = existing_contact.get('type') if isinstance(existing_contact, dict) else existing_contact.type
							existing_value = existing_contact.get('value') if isinstance(existing_contact, dict) else existing_contact.value
							
							if existing_type == contact_type and existing_value == contact_value:
								existing = True
								break
						
						if not existing:
							lead.append('smart_contact_details', {
								'type': contact_type,
								'country_code': country_code,
								'value': contact_value,
								'is_primary': is_primary
							})
					
					# Save Lead
					lead.save(ignore_permissions=True)
					success_count += 1
					
				except Exception as e:
					error_count += 1
					# More detailed error message
					error_type = type(e).__name__
					error_details = str(e)
					
					# Categorize errors
					if "does not exist" in error_details.lower() or "not found" in error_details.lower():
						error_msg = f"Lead {lead_id}: غير موجود في النظام"
					elif "permission" in error_details.lower() or "access" in error_details.lower():
						error_msg = f"Lead {lead_id}: لا توجد صلاحية للوصول"
					elif "duplicate" in error_details.lower():
						error_msg = f"Lead {lead_id}: بيانات مكررة"
					else:
						error_msg = f"Lead {lead_id}: {error_details[:80]}"
					
					errors.append(error_msg)
					frappe.log_error(f"Import error for Lead {lead_id}: {error_type} - {error_details[:200]}", "Apex CRM Import")
		
		else:
			# NEW FORMAT: Process Flattened columns (Mobile 1, Mobile 2, Phone 1, etc.)
			# Map column names to contact types
			type_mapping = {
				'mobile': 'Mobile',
				'phone': 'Phone',
				'whatsapp': 'WhatsApp',
				'email': 'Email',
				'facebook': 'Facebook',
				'instagram': 'Instagram',
				'telegram': 'Telegram',
				'tiktok': 'TikTok',
				'address': 'Address',
				'website': 'Website',
				'linkedin': 'LinkedIn'
			}
			
			# Calculate total rows (excluding header) for progress tracking
			total_rows = len([r for r in rows[1:] if r and len(r) > column_indices['Lead ID'] and str(r[column_indices['Lead ID']]).strip()])
			
			# Process each row (one row per Lead)
			processed_rows = 0
			for row_idx, row in enumerate(rows[1:], start=2):  # Skip header
				try:
					if not row or len(row) <= column_indices['Lead ID']:
						continue
					
					lead_id = str(row[column_indices['Lead ID']]).strip() if row[column_indices['Lead ID']] else ''
					if not lead_id:
						continue
					
					processed_rows += 1
					
					# Publish progress
					frappe.publish_progress(
						float(processed_rows) / total_rows * 100,
						title=_("استيراد جهات الاتصال"),
						description=_("معالجة Lead {0} من {1}: {2}").format(processed_rows, total_rows, lead_id)
					)
					
					# Check if Lead exists
					if not frappe.db.exists('Lead', lead_id):
						error_count += 1
						errors.append(f"Lead {lead_id} غير موجود")
						continue
					
					# Get Lead document
					lead = frappe.get_doc('Lead', lead_id)
					
					# Initialize smart_contact_details if not exists
					if not lead.smart_contact_details:
						lead.smart_contact_details = []
					
					# Track contacts added for this lead
					contacts_added_count = 0
					contacts_before = len(lead.smart_contact_details)
					
					# Process each column in the row
					for col_idx, col_name in enumerate(header_row):
						if col_idx >= len(row):
							continue
						
						col_value = str(row[col_idx]).strip() if row[col_idx] else ''
						if not col_value or col_idx == column_indices['Lead ID']:
							continue
						
						# Skip Lead Name column
						if 'lead name' in col_name.lower():
							continue
						
						# Determine contact type from column name
						contact_type = 'Other'
						col_lower = col_name.lower()
						
						# Check for numbered columns (Mobile 1, Mobile 2, etc.)
						for key, mapped_type in type_mapping.items():
							if key in col_lower:
								contact_type = mapped_type
								break
						
						# Check for duplicates
						existing = False
						for existing_contact in lead.smart_contact_details:
							existing_type = existing_contact.get('type') if isinstance(existing_contact, dict) else existing_contact.type
							existing_value = existing_contact.get('value') if isinstance(existing_contact, dict) else existing_contact.value
							
							# Normalize comparison (remove spaces, special chars for phones)
							if contact_type in ['Mobile', 'Phone', 'WhatsApp', 'Telegram']:
								normalized_existing = ''.join(filter(str.isdigit, str(existing_value or '')))
								normalized_new = ''.join(filter(str.isdigit, str(col_value or '')))
								if existing_type == contact_type and normalized_existing == normalized_new and normalized_new:
									existing = True
									break
							else:
								if existing_type == contact_type and str(existing_value or '').strip().lower() == str(col_value or '').strip().lower():
									existing = True
									break
						
						if not existing:
							# Default country code for phone numbers
							country_code = '+20' if contact_type in ['Mobile', 'Phone', 'WhatsApp', 'Telegram'] else ''
							
							lead.append('smart_contact_details', {
								'type': contact_type,
								'country_code': country_code,
								'value': col_value,
								'is_primary': 0
							})
							contacts_added_count += 1
					
					# Only save if contacts were added
					if contacts_added_count > 0:
						lead.save(ignore_permissions=True)
						frappe.db.commit()  # Commit immediately to ensure data is saved
						contacts_after = len(lead.smart_contact_details)
						success_count += 1
						
						# Log success for debugging
						frappe.log_error(
							f"Import success for Lead {lead_id}: Added {contacts_added_count} contacts (Total: {contacts_before} -> {contacts_after})",
							"Apex CRM Import Success"
						)
					else:
						# No new contacts added (all duplicates)
						success_count += 1  # Still count as success (no errors)
					
				except Exception as e:
					error_count += 1
					# More detailed error message
					error_type = type(e).__name__
					error_details = str(e)
					
					# Categorize errors
					if "does not exist" in error_details.lower() or "not found" in error_details.lower():
						error_msg = f"Lead {lead_id}: غير موجود في النظام"
					elif "permission" in error_details.lower() or "access" in error_details.lower():
						error_msg = f"Lead {lead_id}: لا توجد صلاحية للوصول"
					elif "duplicate" in error_details.lower():
						error_msg = f"Lead {lead_id}: بيانات مكررة"
					else:
						error_msg = f"Lead {lead_id}: {error_details[:80]}"
					
					errors.append(error_msg)
					frappe.log_error(f"Import error for Lead {lead_id}: {error_type} - {error_details[:200]}", "Apex CRM Import")
		
		frappe.db.commit()
		
		# Calculate total leads processed
		total_leads = success_count + error_count
		
		# Final progress update (will be closed by client-side code)
		frappe.publish_progress(100, title=_("اكتمل الاستيراد"), description=_("تم معالجة {0} من {1} Lead بنجاح").format(success_count, total_leads))
		
		# Group errors by type for better reporting
		error_summary = {}
		for err in errors:
			# Extract error type from message
			if "غير موجود" in err:
				error_type = "Lead غير موجود"
			elif "صلاحية" in err:
				error_type = "مشاكل صلاحيات"
			elif "مكررة" in err:
				error_type = "بيانات مكررة"
			else:
				error_type = "أخطاء أخرى"
			
			error_summary[error_type] = error_summary.get(error_type, 0) + 1
		
		return {
			'success': success_count,
			'errors': error_count,
			'total_leads': total_leads,
			'error_list': errors[:50],  # First 50 errors (increased from 20)
			'error_summary': error_summary,  # Summary by error type
			'message': _("تم استيراد {0} من {1} Lead بنجاح. {2} أخطاء.").format(success_count, total_leads, error_count)
		}
		
	except Exception as e:
		# Truncate error message to avoid CharacterLengthExceededError
		error_msg = str(e)
		if len(error_msg) > 200:
			error_msg = error_msg[:200] + "..."
		
		frappe.log_error(f"Excel import failed: {error_msg}", "Apex CRM Import Error")
		
		# Show user-friendly error message
		if "الأعمدة المطلوبة مفقودة" in error_msg:
			frappe.throw(error_msg)
		else:
			frappe.throw(f"فشل استيراد الملف: {error_msg[:100]}")


@frappe.whitelist()
def update_territory_option():
	"""Update Apex Contact Detail DocType to include Territory in type options and fix existing records"""
	try:
		# Get the DocType
		dt = frappe.get_doc('DocType', 'Apex Contact Detail')
		
		# Find the 'type' field
		type_field = None
		for field in dt.fields:
			if field.fieldname == 'type':
				type_field = field
				break
		
		if type_field:
			# Get current options
			options = type_field.options.split('\n')
			
			# Remove 'Territory' and 'Territory-1' if they exist
			if 'Territory' in options:
				options.remove('Territory')
			if 'Territory-1' in options:
				options.remove('Territory-1')
			
			# Update the field
			type_field.options = '\n'.join(options)
			
			# Save the DocType
			dt.save()
			frappe.db.commit()
			
			# Fix existing records with 'Territory' or 'Territory-1' - convert them to 'Other'
			updated_count = frappe.db.sql("""
				UPDATE `tabApex Contact Detail`
				SET type = 'Other'
				WHERE type IN ('Territory', 'Territory-1')
			""")
			frappe.db.commit()
			
			return {
				'success': True,
				'message': 'Successfully removed Territory from Apex Contact Detail DocType',
				'options': type_field.options.split('\n'),
				'records_updated': updated_count
			}
		else:
			return {
				'success': False,
				'message': 'Type field not found'
			}
			
	except Exception as e:
		frappe.log_error(f"Error updating Territory option: {str(e)}", "Update Territory Option")
		return {
			'success': False,
			'message': str(e)
		}




@frappe.whitelist()
def get_lead_notes(lead):
	"""
	Returns a list of notes (both CRM Note child table and standard Note docs) for a lead.
	"""
	all_notes = []
	
	# 1. Fetch CRM Notes (Child Table)
	crm_notes = frappe.db.sql("""
		SELECT note, creation, 'CRM Note' as type, owner 
		FROM `tabCRM Note` 
		WHERE parent = %s AND parenttype = 'Lead'
		ORDER BY creation DESC
	""", (lead,), as_dict=True)
	
	for n in crm_notes:
		all_notes.append({
			"content": n.note,
			"date": n.creation,
			"type": "Quick Note",
			"owner": n.owner
		})
		
	# 2. Fetch Standard Notes
	std_notes = frappe.db.sql("""
		SELECT title, content, creation, owner 
		FROM `tabNote` 
		WHERE custom_lead = %s
		ORDER BY creation DESC
	""", (lead,), as_dict=True)
	
	for n in std_notes:
		# Use title if content is empty, or combine
		content = n.content
		if n.title and n.title not in content:
			content = f"<b>{n.title}</b><br>{content}"
			
		all_notes.append({
			"content": content,
			"date": n.creation,
			"type": "Note",
			"owner": n.owner
		})
		
	# Sort combined list by date desc
	all_notes.sort(key=lambda x: x['date'], reverse=True)
	
	return all_notes

@frappe.whitelist()
def add_lead_note(lead, notes):
	"""
	Adds a note to the Lead's CRM Note child table.
	"""
	if not notes:
		frappe.throw("Note content is required")
		
	doc = frappe.get_doc("Lead", lead)
	
	# Find the fieldname for 'CRM Note' child table
	table_field = None
	# Usually 'notes' for Lead if defined in doctype, checking meta
	# Optimization: We know it's "CRM Note" child table. 
	# To add safely via SQL we need the newly created name
	
	import frappe.utils
	
	# Generate ID
	name = frappe.generate_hash(length=10)
	parent = lead
	parenttype = "Lead"
	parentfield = "notes" # Verified common default, but we can double check
	
	# Try to find correct parentfield from meta if possible, otherwise default to notes
	meta = frappe.get_meta("Lead")
	for field in meta.fields:
		if field.fieldtype == "Table" and field.options == "CRM Note":
			parentfield = field.fieldname
			break
			
	# Raw SQL Insert to bypass ALL hooks
	query = """
		INSERT INTO `tabCRM Note` 
		(name, creation, modified, modified_by, owner, docstatus, parent, parenttype, parentfield, note, added_by, added_on)
		VALUES (%s, %s, %s, %s, %s, 0, %s, %s, %s, %s, %s, %s)
	"""
	
	params = (
		name, 
		frappe.utils.now(), 
		frappe.utils.now(), 
		frappe.session.user, 
		frappe.session.user,
		parent,
		parenttype,
		parentfield,
		notes,
		frappe.session.user,
		frappe.utils.now()
	)
	
	frappe.db.sql(query, params)
	frappe.db.commit()
	
	return "Success"

@frappe.whitelist()
def update_lead_status(lead, status):
	"""
	Updates Lead status safely using raw SQL to COMPLETELY bypass hooks.
	"""
	if not lead or not status:
		frappe.throw(_("Missing lead or status"))
	
	# Raw SQL update to bypass on_update hooks that trigger assignment rules
	frappe.db.sql("UPDATE `tabLead` SET status=%s, modified=%s WHERE name=%s", (status, frappe.utils.now(), lead))
	frappe.db.commit()
	
	return "Success"


@frappe.whitelist()
def quick_add_contact(lead, type, value):
	"""
	Adds a new contact to the Lead's smart_contact_details.
	"""
	if not lead or not type or not value:
		frappe.throw(_("Missing arguments"))

	import frappe.utils
	
	# Generate ID
	name = frappe.generate_hash(length=10)
	
	# Default parentfield
	parentfield = "smart_contact_details" 
	
	# Verify parentfield via Meta
	meta = frappe.get_meta("Lead")
	for field in meta.fields:
		if field.fieldtype == "Table" and field.options == "Apex Contact Detail":
			parentfield = field.fieldname
			break
			
	# Raw SQL Insert to bypass ALL hooks
	query = """
		INSERT INTO `tabApex Contact Detail` 
		(name, creation, modified, modified_by, owner, docstatus, parent, parenttype, parentfield, type, value, is_primary)
		VALUES (%s, %s, %s, %s, %s, 0, %s, %s, %s, %s, %s, 0)
	"""
	
	params = (
		name, 
		frappe.utils.now(), 
		frappe.utils.now(), 
		frappe.session.user, 
		frappe.session.user,
		lead,
		"Lead",
		parentfield,
		type,
		value
	)
	
	frappe.db.sql(query, params)
	frappe.db.commit() # Ensure it's committed
	
	return {"status": "success", "message": "Contact added"}
	
	# Create new contact row
	row = {
		"type": type,
		"value": value
	}
	
	# Add to smart_contact_details
	if not doc.smart_contact_details:
		doc.smart_contact_details = []
	
	doc.append("smart_contact_details", row)
	doc.save()
	
	return doc.smart_contact_details

@frappe.whitelist()
def get_linked_prospects(lead):
    """
    Fetch Prospects linked to a Lead via the Prospect Lead child table.
    """
    if not lead: return []
    
    # Check permissions (optional but good)
    # if not frappe.has_permission("Prospect", "read"): return []

    # Find Parents (Prospects) where this lead is listed in child table
    # Child table: 'Prospect Lead', Field: 'lead'
    
    # 1. Get List of Prospect Names
    child_rows = frappe.get_all('Prospect Lead', filters={'lead': lead}, fields=['parent'])
    if not child_rows: return []
    
    parents = [d.parent for d in child_rows]
    parents = list(set(parents)) # dedup
    
    linked_prospects = frappe.get_all('Prospect', 
        filters={'name': ['in', parents]},
        fields=['name', 'company_name', 'status', 'title']
    )
    return linked_prospects

@frappe.whitelist()
def get_lead_notes(lead):
    """
    Fetch Notes linked to a Lead (party_name = lead).
    """
    if not lead: return []
    return frappe.get_list('Note',
        filters={'party_name': lead},
        fields=['title', 'content', 'owner', 'modified'],
        order_by='modified desc'
    )


@frappe.whitelist()
def get_lead_notes(lead):
    # Fetch Notes linked to a Lead. 
    # Combines 'CRM Note' child table and 'Note' DocType (custom_lead).
    
    if not lead: return []
    
    # 1. Fetch CRM Note Child Table (embedded in Lead)
    # These are stored in 'tabCRM Note'
    crm_notes = frappe.db.get_all('CRM Note', 
        filters={
            'parent': lead,
            'parenttype': 'Lead',
            'parentfield': 'notes'
        },
        fields=['note as content', 'added_by as owner', 'creation as modified'],
        order_by='creation desc'
    )
    for n in crm_notes:
        n['title'] = "Lead Note" # Child table notes don't have titles usually
        
    # 2. Fetch linked 'Note' docs (if using custom_lead)
    # Check if custom_lead field exists to avoid error
    linked_notes = []
    if frappe.db.has_column('Note', 'custom_lead'):
        linked_notes = frappe.get_list('Note',
            filters={'custom_lead': lead},
            fields=['title', 'content', 'owner', 'modified'],
            order_by='modified desc'
        )
    
    # Combine and Sort
    all_notes = crm_notes + linked_notes
    # Sort by modified/creation desc
    all_notes.sort(key=lambda x: x.get('modified'), reverse=True)
    
    return all_notes

@frappe.whitelist()
def add_lead_note(lead, content):
    # Adds a note to the Lead's 'CRM Note' child table.
    
    if not lead or not content: return
    
    try:
        # Create Child Doc directly to bypass Parent Validation
        note = frappe.new_doc('CRM Note')
        note.note = content
        note.added_by = frappe.session.user
        note.parent = lead
        note.parenttype = 'Lead'
        note.parentfield = 'notes'
        
        # Flags to bypass standard checks if any
        note.flags.ignore_permissions = True
        note.flags.ignore_validate_update_after_submit = True 
        
        note.insert(ignore_permissions=True)
        
        # Explicit Commit to ensure persistence
        frappe.db.commit()
        
        return note.name
    except Exception as e:
        frappe.log_error(f"Failed to add note to {lead}: {str(e)}")
        raise e



@frappe.whitelist()
def get_lead_notes(lead):
    # Fetch Notes linked to a Lead. 
    # Uses 'added_on' for CRM Note child table.
    
    if not lead: return []
    
    # 1. Fetch CRM Note Child Table
    crm_notes = frappe.db.get_all('CRM Note', 
        filters={
            'parent': lead,
            'parenttype': 'Lead',
            'parentfield': 'notes'
        },
        fields=['note as content', 'added_by as owner', 'added_on', 'creation'],
        order_by='added_on desc'
    )
    for n in crm_notes:
        n['title'] = "Lead Note"
        # Use added_on if available, else creation
        n['modified'] = n.get('added_on') or n.get('creation')
        
    # 2. Fetch linked 'Note' docs (Legacy/Custom Lead link)
    linked_notes = []
    if frappe.db.has_column('Note', 'custom_lead'):
        linked_notes = frappe.get_list('Note',
            filters={'custom_lead': lead},
            fields=['title', 'content', 'owner', 'modified'],
            order_by='modified desc'
        )
    
    # Combine and Sort
    all_notes = crm_notes + linked_notes
    all_notes.sort(key=lambda x: x.get('modified') or "", reverse=True)
    
    return all_notes

@frappe.whitelist()
def add_lead_note(lead, content):
    if not lead or not content: return
    
    try:
        note = frappe.new_doc('CRM Note')
        note.note = content
        note.added_by = frappe.session.user
        note.parent = lead
        note.parenttype = 'Lead'
        note.parentfield = 'notes'
        
        # Explicitly set Date
        from frappe.utils import now
        note.added_on = now()
        
        note.flags.ignore_permissions = True
        note.flags.ignore_validate_update_after_submit = True 
        
        note.insert(ignore_permissions=True)
        frappe.db.commit()
        
        return note.name
    except Exception as e:
        frappe.log_error(f"Failed to add note to {lead}: {str(e)}")
        raise e

@frappe.whitelist()
def get_linked_prospects(lead):
    # Fetch Prospects linked to a Lead via the Prospect Lead child table.
    
    if not lead: return []
    
    # 1. Get List of Prospect Names
    try:
        child_rows = frappe.get_all('Prospect Lead', filters={'lead': lead}, fields=['parent'])
        if not child_rows: return []
        
        parents = [d.parent for d in child_rows]
        parents = list(set(parents)) # dedup
        
        # 'status' field does NOT exist on Prospect. Removed.
        linked_prospects = frappe.get_all('Prospect', 
            filters={'name': ['in', parents]},
            fields=['name', 'company_name', 'customer_group', 'no_of_employees', 'industry']
        )
        return linked_prospects
    except Exception as e:
        frappe.log_error(f"Error fetching prospects for {lead}: {str(e)}")
        return []


# ==========================================
# Phase 4: Expanded Dashboard API Methods
# ==========================================

@frappe.whitelist()
def get_linked_tasks(lead):
    if not lead: return []
    return frappe.get_list('ToDo',
        filters={
            'reference_type': 'Lead',
            'reference_name': lead,
            'status': 'Open'
        },
        fields=['name', 'description', 'date', 'status', 'owner'],
        order_by='date desc'
    )

@frappe.whitelist()
def add_lead_task(lead, description, date):
    if not lead or not description: return
    try:
        task = frappe.new_doc('ToDo')
        task.reference_type = 'Lead'
        task.reference_name = lead
        task.description = description
        task.date = date or frappe.utils.nowdate()
        task.status = 'Open'
        task.insert(ignore_permissions=True)
        frappe.db.commit()
        return task.name
    except Exception as e:
        frappe.log_error(f"Error adding task for {lead}: {str(e)}")
        raise e

@frappe.whitelist()
def get_linked_events(lead):
    if not lead: return []
    # Events logic matches dashboard: Participant via Event Participants or reference
    # Simplified: Get events where reference_docname is lead
    # NOTE: Standard Event uses 'Event Participants' usually.
    # Let's check 'Event Participants'
    participants = frappe.get_all('Event Participants', filters={'reference_docname': lead}, fields=['parent'])
    p_names = [d.parent for d in participants]
    
    events = frappe.get_list('Event',
        filters={
            'name': ['in', p_names],
            'status': 'Open'
        },
        fields=['name', 'subject', 'starts_on', 'ends_on', 'event_type'],
        order_by='starts_on desc'
    )
    return events

@frappe.whitelist()
def add_lead_event(lead, subject, starts_on):
    if not lead or not subject: return
    try:
        event = frappe.new_doc('Event')
        event.subject = subject
        event.starts_on = starts_on or frappe.utils.now_datetime()
        event.event_type = 'Private' # Default to private or call?
        event.status = 'Open'
        # Add participant
        event.append('event_participants', {
            'reference_doctype': 'Lead',
            'reference_docname': lead
        })
        event.insert(ignore_permissions=True)
        frappe.db.commit()
        return event.name
    except Exception as e:
        frappe.log_error(f"Error adding event for {lead}: {str(e)}")
        raise e

@frappe.whitelist()
def get_linked_quotations(lead):
    if not lead: return []
    return frappe.get_list('Quotation',
        filters={'party_name': lead, 'quotation_to': 'Lead', 'docstatus': ['<', 2]},
        fields=['name', 'grand_total', 'status', 'transaction_date', 'currency'],
        order_by='transaction_date desc'
    )

@frappe.whitelist()
def get_linked_opportunities(lead):
    if not lead: return []
    return frappe.get_list('Opportunity',
        filters={'party_name': lead, 'opportunity_from': 'Lead', 'status': 'Open'}, # Or all?
        fields=['name', 'opportunity_amount', 'status', 'transaction_date', 'currency'],
        order_by='transaction_date desc'
    )

@frappe.whitelist()
def get_linked_customers(lead):
    if not lead: return []
    return frappe.get_list('Customer',
        filters={'lead_name': lead},
        fields=['name', 'customer_name', 'customer_group'],
        order_by='creation desc'
    )


@frappe.whitelist()
def get_lead_interaction_history(lead):
    # Fetch logs where parent = lead
    return frappe.get_all('Apex Interaction Log', 
        filters={'parent': lead}, 
        fields=['type', 'status', 'summary', 'timestamp', 'user', 'voice_note'],
        order_by='timestamp desc'
    )

@frappe.whitelist()
def log_interaction(lead, type, status, summary=None, duration=None, voice_note=None):
    """
    Safely adds an interaction log to a lead by inserting child doc directly.
    Bypasses Parent.save() to avoid Assignment Rule / Workflow errors on submitted docs.
    """
    if not frappe.db.exists("Lead", lead):
        frappe.throw("Lead not found")
        
    # Insert Child Doc Directly
    log = frappe.get_doc({
        "doctype": "Apex Interaction Log",
        "parent": lead,
        "parenttype": "Lead",
        "parentfield": "interaction_history",
        "type": type,
        "status": status,
        "summary": summary,
        "duration": duration,
        "voice_note": voice_note,
        "user": frappe.session.user,
        "timestamp": frappe.utils.now_datetime()
    })
    
    log.insert(ignore_permissions=True)
    return log.name

@frappe.whitelist()
def update_lead_status(lead, status):
    """
    Updates Lead status directly, bypassing UpdateAfterSubmit checks if necessary.
    Uses frappe.db.set_value to avoid triggering full save validations that block strict changes.
    """
    if not frappe.db.exists("Lead", lead):
        frappe.throw("Lead not found")
        
    # check permission (optional, but good practice)
    # if not frappe.has_permission("Lead", "write"):
    #     frappe.throw("Not permitted")

    # Direct DB update to bypass 'UpdateAfterSubmitError'
    frappe.db.set_value("Lead", lead, "status", status)
    
    # Add a comment so we know it happened
    frappe.get_doc("Lead", lead).add_comment("Info", f"Status changed to {status} via Mobile Card")
    
    return "ok"

@frappe.whitelist()
def get_lead_contact_details(lead):
	if not frappe.has_permission("Lead", "read"):
		frappe.throw("No permission to view Lead")
		
	doc = frappe.get_doc("Lead", lead)
	details = []
	
	# Deduplication sets
	seen_keys = set()
	
	import re
	
	def get_normalization_key(dtype, value):
		if not value: return ""
		val = str(value).strip().lower()
		
		# Phone/Mobile/WhatsApp: Strip strictly to digits
		if dtype in ['Mobile', 'Phone', 'WhatsApp', 'Fax']:
			return re.sub(r'\D', '', val)
			
		# Website: Strip protocol and www
		if dtype == 'Website':
			return val.replace('http://', '').replace('https://', '').replace('www.', '').strip('/')
			
		return val

	def add_detail(dtype, value, icon, source="Main"):
		if not value: return
		
		norm_key = get_normalization_key(dtype, value)
		unique_key = (dtype, norm_key)
		
		if unique_key not in seen_keys:
			details.append({"type": dtype, "value": value, "icon": icon, "source": source})
			seen_keys.add(unique_key)
	
	add_detail("Email", doc.email_id, "envelope")
	add_detail("Mobile", doc.mobile_no, "mobile")
	add_detail("Phone", doc.phone, "phone")
	add_detail("WhatsApp", doc.whatsapp_no, "whatsapp")
	add_detail("Website", doc.website, "globe")
	add_detail("Fax", doc.fax, "fax")
	
	# Address (Composite)
	if doc.city or doc.country:
		addr = ", ".join(filter(None, [doc.city, doc.state, doc.country]))
		add_detail("Address", addr, "map-marker")

	# 2. Child Table (Apex Contact Details)
	if doc.get("smart_contact_details"):
		for row in doc.smart_contact_details:
			# Map Type to Icon
			icon = "circle"
			t = (row.type or "").lower()
			
			if "facebook" in t: icon = "facebook"
			elif "whatsapp" in t: icon = "whatsapp"
			elif "linkedin" in t: icon = "linkedin"
			elif "instagram" in t: icon = "instagram"
			elif "twitter" in t: icon = "twitter"
			elif "tiktok" in t: icon = "play"
			elif "snapchat" in t: icon = "snapchat"
			elif "telegram" in t: icon = "telegram"
			elif "email" in t: icon = "envelope"
			elif "phone" in t: icon = "phone"
			elif "mobile" in t: icon = "mobile"
			elif "website" in t: icon = "globe"
			elif "address" in t or "location" in t: icon = "map-marker"
			
			val = row.value
			# Add country code if phone-like and not present
			if row.country_code and val and row.type in ['Mobile', 'Phone', 'WhatsApp'] and not val.startswith('+'):
				val = f"{row.country_code}{val}"
			
			add_detail(row.type, val, icon, "Child Table")
				
	return details
