"""
Automatic Installation and Migration for Apex CRM
This module handles automatic migration of CRM customizations during installation
"""

import frappe
import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields
import frappe.model.sync


def after_install():
	"""
	Automatically migrate CRM customizations after app installation
	This ensures consistent setup across all servers
	"""
	print("\n" + "="*80)
	print("Apex CRM: Starting Automatic Setup")
	print("="*80 + "\n")
	
	try:
		# Step 1: Migrate Custom Fields
		migrate_custom_fields()
		
		# Step 2: Migrate Property Setters
		migrate_property_setters()
		
		# Step 3: Migrate Client Scripts
		migrate_client_scripts()
		
		# Step 4: Setup Custom DocTypes
		setup_custom_doctypes()

		# Step 4.2: Setup Required Property Setters (UI Consistency)
		setup_required_property_setters()

		# Step 4.5: Force Schema Sync (Prevent "Unknown Column" errors)
		print("🔄 Syncing Schema...")
		frappe.model.sync.sync_all("Apex CRM")

		# Step 4.6: Auto-Create Fiscal Year (Prevent Report Errors)
		setup_fiscal_year()

		# Step 4.7: Populate Search Index (Ensure Search works)
		populate_custom_search_index()

		# Step 5: Contact Data Migration - DISABLED
		# Automatic migration is disabled to allow manual data entry
		# Users can add contacts manually using the Apex Contacts section
		# migrate_contact_data()  # ← Disabled for manual data entry
		
		print("\n" + "="*80)
		print("Apex CRM: Setup Completed Successfully!")
		print("\nNote: Automatic contact migration is DISABLED.")
		print("Please add contacts manually in the 'Apex Contacts' section.")
		print("="*80 + "\n")
		
		frappe.db.commit()
		
	except Exception as e:
		frappe.log_error(title="Apex CRM Installation Error", message=frappe.get_traceback())
		print(f"\n❌ Error during Apex CRM installation: {str(e)}")
		print("Check Error Log for details\n")


def migrate_custom_fields():
	"""
	Migrate Custom Fields from CRM DocTypes to Apex CRM module
	This changes the module ownership without losing data
	"""
	print("📋 Migrating Custom Fields...")
	
	crm_doctypes = ["Lead", "Opportunity", "Campaign", "Competitor"]
	
	for doctype in crm_doctypes:
		# Get all custom fields for this doctype
		custom_fields = frappe.get_all(
			"Custom Field",
			filters={"dt": doctype},
			fields=["name", "fieldname", "label", "module"],
			order_by="idx"
		)
		
		if custom_fields:
			print(f"\n  {doctype}: Found {len(custom_fields)} custom fields")
			
			for cf in custom_fields:
				# Update module to Apex CRM
				frappe.db.set_value(
					"Custom Field",
					cf.name,
					"module",
					"Apex CRM",
					update_modified=False
				)
				print(f"    ✓ {cf.fieldname} ({cf.label})")
			
			print(f"  ✅ Migrated {len(custom_fields)} fields from {doctype}")
		else:
			print(f"  ℹ️  {doctype}: No custom fields found")
	
	frappe.db.commit()
	print("\n✅ Custom Fields Migration Complete\n")


def migrate_property_setters():
	"""
	Migrate Property Setters from CRM DocTypes to Apex CRM module
	"""
	print("⚙️  Migrating Property Setters...")
	
	crm_doctypes = ["Lead", "Opportunity", "Campaign", "Competitor"]
	
	for doctype in crm_doctypes:
		# Get all property setters for this doctype
		property_setters = frappe.get_all(
			"Property Setter",
			filters={"doc_type": doctype},
			fields=["name", "property", "value", "module"],
			order_by="name"
		)
		
		if property_setters:
			print(f"\n  {doctype}: Found {len(property_setters)} property setters")
			
			for ps in property_setters:
				# Update module to Apex CRM
				frappe.db.set_value(
					"Property Setter",
					ps.name,
					"module",
					"Apex CRM",
					update_modified=False
				)
			
			print(f"  ✅ Migrated {len(property_setters)} property setters from {doctype}")
		else:
			print(f"  ℹ️  {doctype}: No property setters found")
	
	frappe.db.commit()
	print("\n✅ Property Setters Migration Complete\n")


def migrate_client_scripts():
	"""
	Migrate Client Scripts from CRM DocTypes to Apex CRM module
	"""
	print("📜 Migrating Client Scripts...")
	
	crm_doctypes = ["Lead", "Opportunity", "Campaign", "Competitor"]
	
	for doctype in crm_doctypes:
		# Get all client scripts for this doctype
		client_scripts = frappe.get_all(
			"Client Script",
			filters={"dt": doctype, "enabled": 1},
			fields=["name", "module"],
			order_by="name"
		)
		
		if client_scripts:
			print(f"\n  {doctype}: Found {len(client_scripts)} client scripts")
			
			for cs in client_scripts:
				# Update module to Apex CRM
				frappe.db.set_value(
					"Client Script",
					cs.name,
					"module",
					"Apex CRM",
					update_modified=False
				)
				print(f"    ✓ {cs.name}")
			
			print(f"  ✅ Migrated {len(client_scripts)} scripts from {doctype}")
		else:
			print(f"  ℹ️  {doctype}: No client scripts found")
	
	frappe.db.commit()
	print("\n✅ Client Scripts Migration Complete\n")


def setup_custom_doctypes():
	"""
	Setup custom DocTypes if they don't exist
	This will be expanded as we create custom DocTypes
	"""
	print("🔧 Setting up Custom DocTypes...")
	
	# For now, just log that this step is ready
	print("  ℹ️  No custom DocTypes to create yet")
	print("  ℹ️  This will be used for future custom DocTypes\n")
	
	print("✅ Custom DocTypes Setup Complete\n")


def setup_required_property_setters():
	"""
	Enforces critical UI properties (Filters, List Views) that might be missing in fresh installs.
	Satisfies SaaS Readiness Item 7: UI Consistency.
	"""
	print("🔧 Setting up Required Property Setters...")
	
	# List of required property setters: (DocType, Field, Property, Value, Type)
	required_properties = [
		("Lead", "request_type", "in_standard_filter", "1", "Check"),
		("Lead", "request_type", "in_list_view", "1", "Check"),
		("Lead", "lead_owner", "in_standard_filter", "1", "Check"),
		("Lead", "lead_owner", "in_list_view", "1", "Check"),
		("Lead", "type", "in_standard_filter", "1", "Check"), # "Lead Type"
	]
	
	count = 0
	for dt, field, prop, val, ptype in required_properties:
		# Check if exists
		name = f"{dt}-{field}-{prop}"
		exists = frappe.db.exists("Property Setter", name)
		
		if not exists:
			try:
				frappe.get_doc({
					"doctype": "Property Setter",
					"doctype_or_field": "DocField",
					"doc_type": dt,
					"field_name": field,
					"property": prop,
					"value": val,
					"property_type": ptype,
					"module": "Apex CRM"
				}).insert(ignore_permissions=True)
				print(f"  ✓ Created {name}")
				count += 1
			except Exception as e:
				print(f"  ⚠️ Failed to create {name}: {str(e)}")
	
	if count > 0:
		print(f"  ✅ Created {count} missing Property Setters")
	else:
		print("  ℹ️  All required Property Setters already exist")


def setup_fiscal_year():
	"""
	Auto-creates the current Fiscal Year if it doesn't exist.
	Essential for SaaS one-click installs to prevent Report errors.
	"""
	print("📅 Setting up Fiscal Year...")
	from frappe.utils import getdate, add_years
	
	current_year = getdate().year
	fy_name = str(current_year)
	
	if not frappe.db.exists("Fiscal Year", fy_name):
		try:
			fy = frappe.new_doc("Fiscal Year")
			fy.year = fy_name
			fy.year_start_date = f"{current_year}-01-01"
			fy.year_end_date = f"{current_year}-12-31"
			fy.disabled = 0
			fy.insert(ignore_permissions=True)
			print(f"  ✅ Created Fiscal Year: {fy_name}")
			
			# Set as Global Default if none set
			if not frappe.db.get_single_value("Global Defaults", "current_fiscal_year"):
				frappe.db.set_value("Global Defaults", None, "current_fiscal_year", fy_name)
				print(f"  ✅ Set {fy_name} as default Fiscal Year")
				
		except Exception as e:
			print(f"  ⚠️ Could not create Fiscal Year: {str(e)}")
	else:
		print(f"  ℹ️  Fiscal Year {fy_name} already exists")


def populate_custom_search_index():
	"""
	Populates custom_search_index for Leads if empty.
	"""
	print("🔍 Populating Search Index...")
	
	# Check if we need to run (only if index is empty for many leads)
	# optimized check: count leads with empty index
	pending = frappe.db.count("Lead", filters={"custom_search_index": ["is", "not set"]})
	
	if pending == 0:
		print("  ℹ️  Search Index already populated")
		return

	print(f"  Found {pending} leads with missing search index. Updating...")
	
	# Trigger the sync logic batch-wise via API function logic (re-using sync_contacts logic logic roughly)
	# Easier: Just trigger save() on them? Too slow.
	# Better: Use the API method `sync_contacts` logic but optimized.
	# Actually, `sync_contacts` is triggered on Save/Update.
	# Let's trigger a dummy update or call the function directly if imported.
	
	try:
		# Batch fetch leads
		leads = frappe.get_all("Lead", filters={"custom_search_index": ["is", "not set"]}, fields=["name"])
		from apex_crm.api import sync_contacts
		
		count = 0
		for l in leads:
			doc = frappe.get_doc("Lead", l.name)
			try:
				sync_contacts(doc, "update") # This populates the index
				# We don't need to save doc if sync_contacts uses db_set, 
				# BUT sync_contacts calls db_set which commits? No, db_set does direct update.
				# Let's check api.py... yes, it uses doc.db_set.
				count += 1
				if count % 50 == 0:
					print(f"    Processed {count}...")
			except Exception:
				continue
				
		print(f"  ✅ Populated Search Index for {count} leads")
		
	except Exception as e:
		print(f"  ⚠️ Failed to populate search index: {str(e)}")


def before_install():
	"""
	Pre-installation checks and preparations
	"""
	print("\n" + "="*80)
	print("Apex CRM: Pre-Installation Checks")
	print("="*80 + "\n")
	
	# Check if ERPNext is installed
	if "erpnext" not in frappe.get_installed_apps():
		frappe.throw("ERPNext must be installed before installing Apex CRM")
	
	print("✅ ERPNext is installed")
	print("✅ Pre-installation checks passed\n")

def create_smart_contact_field():
	"""
	Creates the Smart Contact Details custom field on Lead
	"""
	if not frappe.db.exists("Custom Field", "Lead-smart_contact_details"):
		frappe.get_doc({
			"doctype": "Custom Field",
			"dt": "Lead",
			"fieldname": "smart_contact_details",
			"label": "Smart Contact Details",
			"fieldtype": "Table",
			"options": "Apex Contact Detail",
			"insert_after": "mobile_no",
			"module": "Apex CRM",
			"hidden": 0,
			"permlevel": 0
		}).insert()
		print("Created Custom Field: Lead-smart_contact_details")
	else:
		print("Custom Field already exists")


def migrate_contact_data():
	"""
	Migrates existing contact data (Mobile, Phone, Email, Website) 
	into the new Smart Contact Details child table.
	"""
	print("📲 Migrating Legacy Contact Data...")
	
	try:
		# Define fields to fetch (checking availability handled by get_all mostly, but safer to be specific or use *)
		fields_to_fetch = ["name", "mobile_no", "phone", "email_id", "website", "whatsapp_no", 
						   "custom_mobile_number_1", "custom_mobile_number_2", "custom_facebook", "custom_address_line_1"]
		
		# Only fetch fields that actually exist in the DocType to avoid errors
		meta = frappe.get_meta("Lead")
		existing_fields = [f.fieldname for f in meta.fields]
		final_fields = ["name"]
		for f in fields_to_fetch:
			if f in existing_fields or f in ["name", "owner", "creation", "modified", "modified_by", "docstatus", "idx"]:
				final_fields.append(f)

		# Fetch ALL Leads (default limit is smaller)
		leads = frappe.get_all("Lead", fields=final_fields, limit_page_length=50000)
		count = 0
		
		# Helper for Country Code
		import phonenumbers
		from phonenumbers.phonenumberutil import number_type, region_code_for_number

		def parse_phone_number(phone_val, default_code="+20"):
			"""Returns (country_code_str, national_number_str)"""
			if not phone_val: return default_code, ""
			val = str(phone_val).strip()
			
			# Pre-cleaning
			# If it starts with +20 (Egypt default in DB but user typed duplicate), strip it?
			# No, trust parser.
			
			# If starts with 00, replace with +
			if val.startswith("00"):
				val = "+" + val[2:]
			
			try:
				# Attempt parse with default region assumption (Egypt) if no + provided
				# But if the number is clearly international (e.g. 967...), the parser might fail with EG region.
				# So we try parsing as-is.
				
				# Optimization: If val starts with + and valid code, standard parse works.
				# If val has NO +, and we pass "EG", it treats as local EG number.
				# But 967... is NOT local EG.
				# So we might want to try prepending + and parsing if standard parse fails?
				
				pn = phonenumbers.parse(val, "EG")
				if not phonenumbers.is_valid_number(pn):
					# Try prepending + if not present
					if not val.startswith("+"):
						pn_plus = phonenumbers.parse("+" + val, None)
						if phonenumbers.is_valid_number(pn_plus):
							pn = pn_plus
				
				if phonenumbers.is_valid_number(pn):
					return f"+{pn.country_code}", str(pn.national_number)
			except:
				pass
			
			# Fallback: simple heuristic
			# If starts with +, try to split?
			# If not, return default code and full value
			return default_code, val

		for lead_data in leads:
			try:
				doc = frappe.get_doc("Lead", lead_data.name)
				
				# CLEANUP & NORMALIZE EXISTING ROWS
				unique_map = {} # val -> row
				clean_rows = []
				has_cleanup = False
				
				if doc.get("smart_contact_details"):
					for row in doc.smart_contact_details:
						# Only process phone types
						if row.type in ["Mobile", "Phone", "WhatsApp"]:
							# Re-parse existing value combined with its current code?
							# Or just raw value?
							# Best is to join them, then re-split correctly.
							# e.g. code="+20", value="967..." -> full="+20967..." -> parse -> code="+20", nat="967..." (Bad)
							# e.g. code="+20", value="+967..." -> full="+20+967..." (Bad)
							
							# Strategy: Parse the VALUE itself. If it has country info, extract it.
							p_code, p_nat = parse_phone_number(row.value, default_code=row.country_code)
							
							# If parsed code differs from stored code, and parsed is valid diff, update.
							# e.g. stored="+20", parsed="+967". Update!
							if p_code != row.country_code:
								row.country_code = p_code
								row.value = p_nat
								has_cleanup = True
							elif p_nat and p_nat != row.value:
								# Canonical format (removes dashes/spaces)
								row.value = p_nat
								has_cleanup = True
								
						val_key = str(row.value).strip()
						
						if val_key not in unique_map:
							unique_map[val_key] = row
							clean_rows.append(row)
						else:
							# Duplicate logic
							existing = unique_map[val_key]
							# Always favor Mobile
							if row.type == 'Mobile' and existing.type != 'Mobile':
								clean_rows.remove(existing)
								clean_rows.append(row)
								unique_map[val_key] = row
							# If both same type or existing is already Mobile, skip 'row' (delete it)
							has_cleanup = True
					
					if has_cleanup:
						doc.smart_contact_details = clean_rows
						doc.save(ignore_permissions=True)
						doc = frappe.get_doc("Lead", lead_data.name)

				modified = False
				
				# Helper to safely add contact with SPLIT (Code, National)
				def add_contact(ctype, raw_val, code_hint="+20"):
					if not raw_val: return False
					# Parse and Split
					final_code, final_nat = parse_phone_number(raw_val, default_code=code_hint)
					if not final_nat: return False # Empty number
					
					# Dedup check (Check National Number against existing Values)
					for c in doc.get("smart_contact_details"):
						if str(c.value).strip() == final_nat:
							return False
					
					doc.append("smart_contact_details", {
						"type": ctype,
						"value": final_nat,
						"country_code": final_code
					})
					return True

				# 1. Migrate Mobile (Standard)
				if add_contact("Mobile", doc.get("mobile_no")): modified = True
					
				# 2. Migrate Phone (Standard)
				if add_contact("Phone", doc.get("phone")): modified = True
					
				# 3. Migrate Email (Standard)
				if add_contact("Email", doc.get("email_id"), code_hint=""): modified = True

				# 4. Migrate WhatsApp (Standard)
				if add_contact("WhatsApp", doc.get("whatsapp_no")): modified = True

				# 5. Migrate Custom Mobile 1
				if add_contact("Mobile", doc.get("custom_mobile_number_1")): modified = True

				# 6. Migrate Custom Mobile 2
				if add_contact("Mobile", doc.get("custom_mobile_number_2")): modified = True

				# 7. Migrate Custom Facebook
				if add_contact("Facebook", doc.get("custom_facebook"), code_hint=""): modified = True
				
				# 8. Migrate Custom Address
				if add_contact("Address", doc.get("custom_address_line_1"), code_hint=""): modified = True
					
				# 9. Migrate Website (Social Media Detection)
				if doc.get("website"):
					url = str(doc.website).strip().lower()
					if url:
						ctype = "Website"
						if "facebook.com" in url: ctype = "Facebook"
						elif "linkedin.com" in url: ctype = "LinkedIn"
						elif "instagram.com" in url: ctype = "Instagram"
						elif "twitter.com" in url or "x.com" in url: ctype = "X"
						elif "tiktok.com" in url: ctype = "TikTok"
						elif "t.me" in url: ctype = "Telegram"
						
						if add_contact(ctype, doc.website, code_hint=""): modified = True
					
				if modified:
					doc.flags.ignore_mandatory = True
					doc.flags.ignore_validate = True # Also skip validations if possible
					doc.save(ignore_permissions=True)
					count += 1
					if count % 50 == 0:
						frappe.db.commit()
						print(f"   Processed {count} leads...")
			
			
			except Exception as e:
				print(f"⚠️ Failed to migrate Lead {lead_data.name}: {str(e)}")
				frappe.log_error(
					title=f"Lead Migration Failed: {lead_data.name}",
					message=frappe.get_traceback()
				)
				# Explicitly continue to next lead without marking this one as migrated
				continue
					
		frappe.db.commit()
		print(f"✅ Migrated contact data for {count} Leads\n")

	except Exception as e:
		# This catches errors in the setup phase (get_all), not per-lead errors
		print(f"❌ Critical Error starting migration: {str(e)}")

