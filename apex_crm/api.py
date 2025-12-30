import frappe
from frappe import _
import json
import re
from werkzeug.wrappers import Response



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
    """
    
    # 1. Get raw duplicates (Count > 1)
    raw_duplicates = frappe.db.sql("""
        SELECT value, COUNT(*) as count 
        FROM `tabApex Contact Detail` 
        WHERE parenttype='Lead'
        GROUP BY value 
        HAVING count > 1
    """, as_dict=True)



    if not raw_duplicates:
        return []

    # Check Page Permission to ensure authorized access
    # We allow access if the user has permission to the 'duplicate-manager' page.
    if not has_page_permission('duplicate-manager'):
        frappe.throw(_("You do not have permission to access Duplicate Manager."))

    # 2. Get Ignore List {value: ignored_count}
    # We ignore permissions here because if the user has Page access, they should be able to read this config.
    ignored_list = frappe.db.get_all("Apex Ignored Duplicate", fields=["value", "ignored_count"], ignore_permissions=True)
    ignored_map = {d.value: d.ignored_count for d in ignored_list}

    results = []
    for d in raw_duplicates:
        val = d.value
        current_count = d.count
        
        # SMART CHECK:
        # If value is in ignore list AND current count == ignored count -> Skip
        if val in ignored_map:
            if ignored_map[val] == current_count:
                continue 
            # If count is different (e.g. was 2, now 3), we SHOW it.
        
        # Find leads for this value
        leads_sql = """
            SELECT DISTINCT t1.parent as name, t2.lead_name, t2.owner
            FROM `tabApex Contact Detail` t1
            JOIN `tabLead` t2 ON t1.parent = t2.name
            WHERE t1.value = %s AND t1.parenttype = 'Lead'
        """
        leads = frappe.db.sql(leads_sql, (val,), as_dict=True)
        
        if len(leads) > 1:
            results.append({
                "value": val,
                "count": current_count,
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
                doc.save()

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
    
    # 3. Sync to Standard 'Address' Document
	sync_address_doctype(doc)

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
    """
    if not lead:
        return {}

    # Open Tasks
    open_tasks = frappe.db.count('ToDo', {
        'reference_type': 'Lead',
        'reference_name': lead,
        'status': 'Open'
    })

    # Open Events
    # Check standard dynamic link 'reference_doctype' & 'reference_docname' (common in Event)
    # OR 'Event Participants'
    event_filters = {
        'status': 'Open',
        'event_type': ['!=', 'Public'],
        'name': ['in', [
            d.parent for d in frappe.get_all('Event Participants', filters={'reference_doctype': 'Lead', 'reference_docname': lead}, fields=['parent'])
        ]]
    }
    open_events = frappe.db.count('Event', filters=event_filters)
    
    # Notes: Comprehensive Count
    # 1. Linked Note Documents (custom_lead)
    note_docs = frappe.db.count('Note', filters={'custom_lead': lead})
    
    # 2. CRM Note Child Table (parent)
    crm_notes = frappe.db.count('CRM Note', filters={'parent': lead, 'parentfield': 'notes', 'parenttype': 'Lead'})
    
    # 3. Timeline Comments (Communication)
    timeline_comments = frappe.db.count('Communication', filters={
        'reference_doctype': 'Lead',
        'reference_name': lead,
        'communication_type': 'Comment'
    })
    
    notes = note_docs + crm_notes + timeline_comments

    return {
        'tasks': open_tasks,
        'events': open_events,
        'notes': notes
    }

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
	# Get all Leads with old contact data
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
			custom_facebook
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
			(custom_facebook IS NOT NULL AND custom_facebook != '')
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
			
			# Save only if we added contacts
			if lead_contacts_added > 0:
				lead.save(ignore_permissions=True)
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
		'error_list': errors[:20] if errors else []
	}

@frappe.whitelist()
def export_apex_contacts_to_excel():
	"""
	Export all Apex Contact Details to Excel format.
	Returns file path for download.
	"""
	# Check permission: User must have export permission on Lead (or read as fallback)
	if not (frappe.has_permission("Lead", "export") or frappe.has_permission("Lead", "read")):
		frappe.throw(__("You don't have permission to export contacts. You need 'Export' or 'Read' permission on Lead."), frappe.PermissionError)
	from frappe.utils.xlsxutils import make_xlsx
	from frappe.utils import get_site_path
	import os
	
	# Get all Apex Contact Details
	contacts = frappe.db.sql("""
		SELECT 
			acd.parent as lead_id,
			l.lead_name,
			acd.type,
			acd.country_code,
			acd.value,
			acd.is_primary
		FROM `tabApex Contact Detail` acd
		INNER JOIN `tabLead` l ON acd.parent = l.name
		WHERE acd.parenttype = 'Lead'
		ORDER BY acd.parent, acd.idx
	""", as_dict=True)
	
	# Prepare data for Excel
	data = [['Lead ID', 'Lead Name', 'Type', 'Country Code', 'Value', 'Is Primary']]
	
	for contact in contacts:
		data.append([
			contact.get('lead_id', ''),
			contact.get('lead_name', ''),
			contact.get('type', ''),
			contact.get('country_code', ''),
			contact.get('value', ''),
			1 if contact.get('is_primary') else 0
		])
	
	# Create Excel file
	xlsx_data = make_xlsx(data, "Apex Contacts Export")
	
	# Save to site folder
	site_path = get_site_path()
	# Format datetime as string for filename
	timestamp = frappe.utils.now_datetime().strftime('%Y-%m-%d_%H-%M-%S')
	file_name = f"apex_contacts_export_{timestamp}.xlsx"
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
		'total_records': len(contacts)
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
	

	for perm in lead_perms:
		if perm.export:
			permissions['export_contacts'] = True
		if perm.get('import', 0):
			permissions['import_contacts'] = True
	
	# Fallback/Supplemental Checks
	if not permissions['migrate_contacts']:
		# Requirement: Write AND Export
		permissions['migrate_contacts'] = frappe.has_permission("Lead", "write") and frappe.has_permission("Lead", "export")
	
	if not permissions['export_contacts']:
		permissions['export_contacts'] = frappe.has_permission("Lead", "export") or frappe.has_permission("Lead", "read")
	if not permissions['import_contacts']:
		permissions['import_contacts'] = frappe.has_permission("Lead", "import") or frappe.has_permission("Lead", "write")
	
	# Duplicate Manager: Link to Page Permission ('duplicate-manager')
	# This allows controlling button visibility via 'Role Permissions Manager' > 'Page'
	permissions['duplicate_manager'] = has_page_permission('duplicate-manager')
	
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
		frappe.throw(__("You don't have permission to import contacts. You need 'Import' or 'Write' permission on Lead."), frappe.PermissionError)
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
		
		# Validate required columns
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
			frappe.throw(f"الأعمدة المطلوبة مفقودة: {', '.join(missing_columns)}. الأعمدة الموجودة: {', '.join(header_row)}")
		
		# Get optional column indices
		optional_columns = {
			'Country Code': header_lower.get('country code'),
			'Is Primary': header_lower.get('is primary')
		}
		
		# Process data
		success_count = 0
		error_count = 0
		errors = []
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
		
		# Process each Lead
		for lead_id, lead_rows in leads_processed.items():
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
				error_msg = f"خطأ في Lead {lead_id}: {str(e)}"
				errors.append(error_msg)
				frappe.log_error(f"Import error for {lead_id}: {str(e)}")
		
		frappe.db.commit()
		
		return {
			'success': success_count,
			'errors': error_count,
			'total_leads': len(leads_processed),
			'error_list': errors[:20]  # First 20 errors
		}
		
	except Exception as e:
		frappe.log_error(f"Excel import failed: {str(e)}", "Apex CRM Import Error")
		frappe.throw(f"فشل استيراد الملف: {str(e)}")




