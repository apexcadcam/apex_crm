import frappe
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

    # 2. Get Ignore List {value: ignored_count}
    ignored_list = frappe.db.get_all("Apex Ignored Duplicate", fields=["value", "ignored_count"])
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
                sig = (row.type, (row.value or "").strip(), row.country_code)
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
		mobile = next((d.value for d in doc.smart_contact_details if d.type == 'Mobile'), None)
		if mobile: updates['mobile_no'] = mobile

	if not doc.email_id:
		email = next((d.value for d in doc.smart_contact_details if d.type == 'Email'), None)
		if email: updates['email_id'] = email
	
	if not doc.phone:
		phone = next((d.value for d in doc.smart_contact_details if d.type == 'Phone'), None)
		if phone: updates['phone'] = phone
	
	if not doc.website:
		website = next((d.value for d in doc.smart_contact_details if d.type == 'Website'), None)
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
		if row.value:
			# 1. Raw Value
			search_index_parts.append(row.value)
			
			# 2. Normalized Value (Digits only)
			clean_val = ''.join(filter(str.isdigit, row.value))
			if clean_val != row.value:
				search_index_parts.append(clean_val)
				
			# 3. Full International Number (if Country Code exists)
			if row.country_code:
				full_number = f"{row.country_code}{clean_val}"
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
		if doc.custom_search_index != search_blob:
			doc.db_set('custom_search_index', search_blob)

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
			val = row.value
			type_map = row.type
			
			if type_map in ['Mobile', 'Phone', 'WhatsApp', 'Fax']:
				# Handle Country Code
				full_number = val
				if row.country_code and not val.startswith('+'):
					full_number = f"{row.country_code}{val}"
				
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
		address_rows = [row for row in lead_doc.smart_contact_details if row.type == 'Address']
		
		if not address_rows:
			return

		for idx, row in enumerate(address_rows):
			raw_address = row.value
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




