
// Ensure namespace exists
if (!window.apex_crm) {
	window.apex_crm = {};
}

frappe.ui.form.on('Lead', {
	refresh: function (frm) {
		// Hide standard child table, we use custom UI
		frm.set_df_property('interaction_history', 'hidden', 1);

		apex_crm.render_contacts(frm);
		apex_crm.render_interaction_history(frm);
		apex_crm.render_dashboard_summary(frm);
	}
});

apex_crm.render_contacts = function (frm) {
	let wrapper = frm.fields_dict['contact_manager_ui'].wrapper;

	// Unbind previous events
	$(wrapper).off('click');
	$(wrapper).off('keypress');
	$(wrapper).off('change');
	$(wrapper).empty();

	// Add Dashboard Container
	$(wrapper).append('<div class="dashboard-row" style="margin-bottom: 15px;"></div>');
	// Render Dash content immediately if cached or wait for separate call?
	// It's handled by render_dashboard_summary targeting .dashboard-row

	let contacts = frm.doc.smart_contact_details || [];

	// Smart Default: First item = Mobile, Subsequent = Email
	let is_empty = contacts.length === 0;
	let default_type = is_empty ? 'Mobile' : 'Email';
	let default_placeholder = is_empty ? 'Enter Mobile Number...' : 'name@example.com';

	// Prepare Country List for Awesomplete
	// Format: "Name (+Code) Flag"
	let default_country_label = '';
	let country_list = apex_crm.country_codes.map(c => {
		let flag = apex_crm.get_flag_emoji(c.code);
		let label = `${c.name} (${c.dial}) ${flag}`;
		if (c.dial === '+20') default_country_label = label;
		return label;
	});

	let html = `
	<div class="apex-contact-manager" style="padding-top: 10px;">
		<div class="contact-list" style="display: flex; flex-direction: column; gap: 12px;">
			${contacts.map((row, index) => apex_crm.get_contact_card_html(row, index)).join('')}
		</div>

		<!-- Quick Add Row -->
		<div class="quick-add-row" style="margin-top: 15px; display: flex; align-items: center; gap: 8px;">
			
			<!-- Type Selector -->
			<div style="width: 130px;">
				<select class="qa-type form-control input-sm">
					<option value="Mobile" ${default_type === 'Mobile' ? 'selected' : ''}>📱 Mobile</option>
					<option value="Phone" ${default_type === 'Phone' ? 'selected' : ''}>☎️ Phone</option>
					<option value="Email" ${default_type === 'Email' ? 'selected' : ''}>📧 Email</option>
					<option value="WhatsApp" ${default_type === 'WhatsApp' ? 'selected' : ''}>WhatsApp</option>
					<option value="Telegram" ${default_type === 'Telegram' ? 'selected' : ''}>Telegram</option>
					<option value="Facebook" ${default_type === 'Facebook' ? 'selected' : ''}>Facebook</option>
					<option value="LinkedIn" ${default_type === 'LinkedIn' ? 'selected' : ''}>LinkedIn</option>
					<option value="Instagram" ${default_type === 'Instagram' ? 'selected' : ''}>Instagram</option>
					<option value="TikTok" ${default_type === 'TikTok' ? 'selected' : ''}>TikTok</option>
					<option value="Snapchat" ${default_type === 'Snapchat' ? 'selected' : ''}>Snapchat</option>
					<option value="X" ${default_type === 'X' ? 'selected' : ''}>X</option>
					<option value="Location" ${default_type === 'Location' ? 'selected' : ''}>📍 Location</option>
					<option value="Address" ${default_type === 'Address' ? 'selected' : ''}>🏠 Address</option>
					<option value="Website" ${default_type === 'Website' ? 'selected' : ''}>🌐 Website</option>
				</select>
			</div>

			<!-- Country Selector (Awesomplete Input) -->
			<!-- Visible for Mobile/Phone -->
			<div class="qa-country-wrapper" style="width: 180px; position: relative; ${['Mobile', 'Phone', 'WhatsApp'].includes(default_type) ? '' : 'display:none;'}">
				<input type="text" class="qa-country form-control input-sm" placeholder="Country..." value="${default_country_label}">
			</div>
			
			<!-- Input Header -->
			<div style="flex: 1;">
				<input type="text" class="qa-value form-control input-sm" placeholder="${default_placeholder}" style="width: 100%;">
			</div>

			<button type="button" class="btn btn-secondary btn-sm qa-add-btn" title="Add" style="padding: 4px 10px;">
				<i class="fa fa-plus"></i>
			</button>
		</div>
		<div class="text-muted small" style="margin-top: 4px; font-size: 11px; margin-left: 2px;">
			Select type and add details. <a href="#" class="open-advanced-add" style="margin-left: 5px;">Advanced Options</a>
		</div>
	</div>
	`;

	// Combine with dashboard container (prepending it)
	let full_html = `
	<div class="dashboard-row" style="margin-bottom: 15px;"></div>
	${html}
	`;

	$(wrapper).html(full_html);

	// --- Initialize Awesomplete ---
	// Using setTimeout to ensure DOM is ready inside wrapper
	setTimeout(() => {
		let country_input = $(wrapper).find('.qa-country')[0];
		if (country_input) {
			new Awesomplete(country_input, {
				list: country_list,
				minChars: 0,
				maxItems: 200, // Allow showing many matches
				autoFirst: true
			});

			// Show list on click/focus if empty or to change
			$(country_input).on('click', function () {
				if (this.value && this.value === default_country_label) {
					this.select(); // Auto-select text for easy overwrite
				}
			});
		}
	}, 100);

	// --- Bind Events ---

	// 1. Delete Contact
	// 1. Delete Contact
	$(wrapper).on('click', '.delete-contact-btn', function () {
		let index = $(this).data('index');
		frappe.confirm(__('Are you sure you want to delete this contact?'), () => {
			apex_crm.delete_contact(frm, index);
		});
	});

	// 1b. Edit Contact
	$(wrapper).on('click', '.edit-contact-btn', function () {
		let index = $(this).data('index');
		apex_crm.edit_contact(frm, index);
	});

	// 2. Open Advanced Dialog
	$(wrapper).on('click', '.open-advanced-add', function (e) {
		e.preventDefault();
		apex_crm.open_add_dialog(frm);
	});

	// 3. Type Change Logic
	$(wrapper).on('change', '.qa-type', function () {
		let val = $(this).val();
		let input = $(wrapper).find('.qa-value');
		let country_wrapper = $(wrapper).find('.qa-country-wrapper');

		if (['Mobile', 'Phone', 'WhatsApp'].includes(val)) {
			country_wrapper.show();
			input.attr('placeholder', 'Enter Mobile/Phone Number...');
		} else {
			country_wrapper.hide();
			if (val === 'Email') input.attr('placeholder', 'name@example.com');
			else if (val === 'Location') input.attr('placeholder', 'Google Maps Link...');
			else if (val === 'Website') input.attr('placeholder', 'www.example.com');
			else input.attr('placeholder', 'Enter Username or Link...');
		}
		input.focus();
	});

	// 4. Quick Add Action
	let perform_quick_add = function () {
		let type = $(wrapper).find('.qa-type').val();
		let country_str = $(wrapper).find('.qa-country').val();
		let val = $(wrapper).find('.qa-value').val();

		if (!val) {
			frappe.show_alert({ message: __('Please enter a value'), indicator: 'orange' });
			return;
		}

		let entry = {
			type: type,
			value: val
		};

		if (['Mobile', 'Phone', 'WhatsApp'].includes(type)) {
			// Parse code from string like "Egypt (+20) 🇪🇬"
			// Matches (+Digits)
			let match = country_str.match(/\((\+\d+)\)/);
			entry.country_code = match ? match[1] : '';

			// Fallback: If user typed just "+20"
			if (!entry.country_code && country_str.trim().startsWith('+')) {
				entry.country_code = country_str.trim();
			}
		} else {
			entry.country_code = ''; // Explicitly empty for others
		}

		frappe.call({
			method: 'apex_crm.api.check_duplicate_contact',
			args: { value: val },
			freeze: true,
			callback: function (r) {
				if (r.message && r.message.length > 0) {
					frappe.msgprint({
						title: __('Duplicate Detected'),
						message: __('This contact is already linked to: ') + r.message.map(l => l.lead_name).join(', '),
						indicator: 'orange',
						primary_action: {
							label: 'Add Anyway',
							action: () => {
								apex_crm.add_row_to_frm(frm, entry);
							}
						}
					});
				} else {
					apex_crm.add_row_to_frm(frm, entry);
				}
			},
			error: function (r) {
				console.error(r);
			}
		});
	};

	$(wrapper).on('click', '.qa-add-btn', function () {
		perform_quick_add();
	});

	$(wrapper).on('keypress', '.qa-value', function (e) {
		if (e.which === 13) { // Enter
			perform_quick_add();
		}
	});

	// 5. Interaction Logging (Call / WhatsApp)
	$(wrapper).on('click', '.log-interaction', function (e) {
		// e.preventDefault(); // Optional: Uncomment to block immediate action if needed for testing
		let type = $(this).data('action-type');
		let value = $(this).data('value');
		if (type && value) {
			apex_crm.log_interaction(frm, type, value);
		}
	});
};

apex_crm.get_contact_card_html = function (row, index) {
	let action_btns = '';

	let full_value = (row.value || "").toString().trim();
	let display_value = full_value;
	let clean_number = full_value.replace(/[^0-9]/g, '');

	// Detect Effective Type
	let effective_type = row.type;
	if (full_value.includes('linkedin.com')) effective_type = 'LinkedIn';
	else if (full_value.includes('facebook.com')) effective_type = 'Facebook';
	else if (full_value.includes('instagram.com')) effective_type = 'Instagram';
	else if (full_value.includes('tiktok.com')) effective_type = 'TikTok';
	else if (full_value.includes('snapchat.com')) effective_type = 'Snapchat';
	else if (full_value.includes('x.com') || full_value.includes('twitter.com')) effective_type = 'X';
	else if (full_value.includes('maps.google') || full_value.includes('goo.gl') || full_value.includes('waze.com')) effective_type = 'Location';
	else if (full_value.includes('@') && !full_value.includes('http') && row.type !== 'Telegram' && row.type !== 'X' && row.type !== 'Instagram' && row.type !== 'TikTok') effective_type = 'Email';

	let is_numeric_type = ['Phone', 'Mobile', 'WhatsApp', 'Telegram', 'SMS'].includes(effective_type);

	// Country Code Logic
	let flag_html = '';
	if (is_numeric_type) {
		if (row.country_code && !full_value.startsWith('+') && !full_value.startsWith('00') && /^[0-9]+$/.test(full_value)) {
			full_value = (row.country_code) + full_value;
			display_value = full_value;
		}
		clean_number = full_value.replace(/[^0-9]/g, '');

		// Resolve Flag
		const iso = apex_crm.get_iso_from_dial_code(row.country_code);
		if (iso) {
			flag_html = `<img src="https://flagcdn.com/20x15/${iso}.png" style="margin-right: 6px; vertical-align: middle; border-radius: 2px;">`;
		}
	}

	// Icons Style
	const icon_style = "font-size: 18px; margin: 0 6px; text-decoration: none; vertical-align: middle; transition: transform 0.2s;";
	const hover = "onmouseover=\"this.style.transform='scale(1.2)'\" onmouseout=\"this.style.transform='scale(1)'\"";

	if (effective_type === 'Mobile') {
		action_btns = `
			<a href="https://wa.me/${clean_number}" target="_blank" class="log-interaction" data-action-type="WhatsApp" data-value="${full_value}" style="color: #25D366; ${icon_style}" ${hover} title="WhatsApp"><i class="fa fa-whatsapp"></i></a>
			<a href="tel:${full_value}" class="log-interaction" data-action-type="Call" data-value="${full_value}" style="color: #00b65e; ${icon_style}" ${hover} title="Call"><i class="fa fa-phone"></i></a>
			<a href="sms:${full_value}" style="color: #f39c12; ${icon_style}" ${hover} title="SMS"><i class="fa fa-comment"></i></a>
		`;
	} else if (effective_type === 'Phone') {
		action_btns = `
			<a href="tel:${full_value}" class="log-interaction" data-action-type="Call" data-value="${full_value}" style="color: #333; ${icon_style}" ${hover} title="Call"><i class="fa fa-phone"></i></a>
		`;
	} else if (effective_type === 'Email') {
		// Link directly to Gmail Compose
		action_btns = `<a href="https://mail.google.com/mail/?view=cm&fs=1&to=${full_value}" target="_blank" style="color: #EA4335; ${icon_style}" ${hover} title="Send via Gmail"><i class="fa fa-envelope"></i></a>`;
	} else if (effective_type === 'WhatsApp') {
		action_btns = `<a href="https://wa.me/${clean_number}" target="_blank" class="log-interaction" data-action-type="WhatsApp" data-value="${full_value}" style="color: #25D366; ${icon_style}" ${hover} title="WhatsApp"><i class="fa fa-whatsapp"></i></a>`;
	} else if (effective_type === 'Telegram') {
		let tg_link = full_value.startsWith('@') ? `https://t.me/${full_value.substring(1)}` : `https://t.me/${clean_number}`;
		// Use 'fa fa-telegram' to be safe with older FontAwesome versions or shims
		action_btns = `<a href="${tg_link}" target="_blank" class="log-interaction" data-action-type="Telegram" data-value="${full_value}" style="color: #0088cc; ${icon_style}" ${hover} title="Telegram"><i class="fa fa-telegram"></i></a>`;
	} else if (effective_type === 'LinkedIn') {
		action_btns = `<a href="${apex_crm.format_url(full_value)}" target="_blank" class="log-interaction" data-action-type="LinkedIn" data-value="${full_value}" style="color: #0077b5; ${icon_style}" ${hover} title="LinkedIn"><i class="fa fa-linkedin"></i></a>`;
	} else if (effective_type === 'Facebook') {
		action_btns = `<a href="${apex_crm.format_url(full_value)}" target="_blank" class="log-interaction" data-action-type="Facebook" data-value="${full_value}" style="color: #1877f2; ${icon_style}" ${hover} title="Facebook"><i class="fa fa-facebook"></i></a>`;
	} else if (effective_type === 'Instagram') {
		action_btns = `<a href="${apex_crm.format_url(full_value)}" target="_blank" class="log-interaction" data-action-type="Instagram" data-value="${full_value}" style="color: #c32aa3; ${icon_style}" ${hover} title="Instagram"><i class="fa fa-instagram"></i></a>`;
	} else if (effective_type === 'TikTok') {
		action_btns = `<a href="${apex_crm.format_url(full_value)}" target="_blank" class="log-interaction" data-action-type="TikTok" data-value="${full_value}" style="color: #000000; ${icon_style}" ${hover} title="TikTok"><i class="fa fa-music"></i></a>`;
	} else if (effective_type === 'Snapchat') {
		action_btns = `<a href="${apex_crm.format_url(full_value)}" target="_blank" class="log-interaction" data-action-type="Snapchat" data-value="${full_value}" style="color: #fffc00; text-shadow: 0px 0px 1px #000; ${icon_style}" ${hover} title="Snapchat"><i class="fa fa-snapchat-ghost"></i></a>`;
	} else if (effective_type === 'X') {
		action_btns = `<a href="${apex_crm.format_url(full_value)}" target="_blank" class="log-interaction" data-action-type="X" data-value="${full_value}" style="color: #000000; ${icon_style}" ${hover} title="X"><i class="fa fa-times"></i></a>`;
	} else if (effective_type === 'Location') {
		action_btns = `<a href="${apex_crm.format_url(full_value)}" target="_blank" class="log-interaction" data-action-type="Location" data-value="${full_value}" style="color: #ea4335; ${icon_style}" ${hover} title="Open in Maps"><i class="fa fa-map-marker"></i></a>`;
	} else if (effective_type === 'Address') {
		// Search Google Maps for this address
		let q = encodeURIComponent(full_value);
		action_btns = `<a href="https://www.google.com/maps/search/?api=1&query=${q}" target="_blank" class="log-interaction" data-action-type="Location" data-value="${full_value}" style="color: #673ab7; ${icon_style}" ${hover} title="Search Address"><i class="fa fa-home"></i></a>`;
	} else {
		action_btns = `<a href="${apex_crm.format_url(full_value)}" target="_blank" class="log-interaction" data-action-type="Other" data-value="${full_value}" style="color: #333; ${icon_style}" ${hover} title="Link"><i class="fa fa-globe"></i></a>`;
	}

	// Pill Style
	let is_long_text = effective_type === 'Address';
	let pill_style = `
		background: #f7f7f7; 
		padding: 8px 14px; 
		border-radius: 8px; 
		color: #333; 
		font-size: 14px; 
		font-weight: 500;
		border: 1px solid #e2e6ea;
		display: inline-block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: ${is_long_text ? 'normal' : 'nowrap'};
		max-width: ${is_long_text ? '100%' : '250px'};
		line-height: ${is_long_text ? '1.4' : 'normal'};
		vertical-align: middle;
	`;

	return `
	<div class="contact-row" style="display: flex; align-items: center; gap: 12px;">
		<!-- Value Pill -->
		<div style="${pill_style}" title="${full_value}">
			${flag_html}${display_value}
		</div>
		
		<!-- Floating Action Icons -->
		<div style="display: flex; align-items: center;">
			${action_btns}
		</div>
		
		<!-- Controls -->
		<div style="display: flex; align-items: center; margin-left: auto; gap: 6px;">
			<!-- Edit Button -->
			<div class="edit-contact-btn" data-index="${index}" title="Edit" 
				style="width: 24px; height: 24px; border-radius: 50%; background: #eef0f2; color: #555; 
				display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.2s;"
				onmouseover="this.style.background='#dce2e6'" 
				onmouseout="this.style.background='#eef0f2'">
				<i class="fa fa-pencil" style="font-size: 10px;"></i>
			</div>

			<!-- Delete Button -->
			<div class="delete-contact-btn" data-index="${index}" title="Remove" 
				style="width: 24px; height: 24px; border-radius: 50%; background: #ffebeb; color: #ff6b6b; 
				display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.2s;"
				onmouseover="this.style.background='#ffc9c9'" 
				onmouseout="this.style.background='#ffebeb'">
				<i class="fa fa-minus" style="font-size: 10px;"></i>
			</div>
		</div>
	</div>
	`;
};

apex_crm.format_url = function (url) {
	if (!url.startsWith('http') && !url.startsWith('//')) return 'https://' + url;
	return url;
};


// Helper to get formatted list
apex_crm.get_country_options = function () {
	if (!apex_crm._country_options) {
		apex_crm._country_options = apex_crm.country_codes.map(c => {
			let flag = apex_crm.get_flag_emoji(c.code);
			return `${c.name} (${c.dial}) ${flag}`;
		});
	}
	return apex_crm._country_options;
};

// Helper to extract code from "Egypt (+20) 🇪🇬" or return raw "+20"
apex_crm.extract_country_code = function (txt) {
	if (!txt) return '';
	let match = txt.match(/\((\+\d+)\)/);
	if (match) return match[1];
	// Fallback if user typed just "+20"
	if (txt.startsWith('+')) return txt.trim();
	// Fallback if just digits (e.g. 20)
	if (/^\d+$/.test(txt)) return '+' + txt;
	return '';
};

// Helper to find full label from code "+20" -> "Egypt (+20) 🇪🇬"
apex_crm.get_label_from_code = function (code) {
	if (!code) return '';
	// Try exact match in dial
	let found = apex_crm.country_codes.find(c => c.dial === code);
	if (found) {
		let flag = apex_crm.get_flag_emoji(found.code);
		return `${found.name} (${found.dial}) ${flag}`;
	}
	return code; // Return raw if no name found
};

apex_crm.open_add_dialog = function (frm) {
	let d = new frappe.ui.Dialog({
		title: 'Add New Contact',
		fields: [
			{
				label: 'Type',
				fieldname: 'type',
				fieldtype: 'Select',
				options: 'Mobile\nPhone\nEmail\nWhatsApp\nTelegram\nWebsite\nLinkedIn\nFacebook\nInstagram\nTikTok\nSnapchat\nX\nLocation\nOther',
				reqd: 1,
				default: 'Mobile'
			},
			{
				label: 'Code',
				fieldname: 'country_code',
				fieldtype: 'Autocomplete', // CHANGED from Select
				options: apex_crm.get_country_options(),
				default: apex_crm.get_label_from_code('+20'),
				depends_on: 'eval:in_list(["Mobile", "Phone", "WhatsApp", "Telegram"], doc.type)',
				description: 'Type to search (e.g. "Saudi")'
			},
			{
				label: 'Value',
				fieldname: 'value',
				fieldtype: 'Data',
				reqd: 1,
				description: 'Enter number, email, or URL'
			},
			{
				fieldname: 'duplicate_warning',
				fieldtype: 'HTML',
				hidden: 1
			}
		],
		primary_action_label: 'Add',
		primary_action: function (values) {
			// Extract Code
			values.country_code_label = values.country_code; // Store for UI if needed
			values.country_code = apex_crm.extract_country_code(values.country_code);
			check_and_add(values);
		}
	});

	let detect_type = function (val) {
		if (!val) return null;
		if (val.includes('linkedin.com')) return 'LinkedIn';
		if (val.includes('facebook.com')) return 'Facebook';
		if (val.includes('instagram.com')) return 'Instagram';
		if (val.includes('tiktok.com')) return 'TikTok';
		if (val.includes('snapchat.com')) return 'Snapchat';
		if (val.includes('x.com') || val.includes('twitter.com')) return 'X';
		if (val.includes('maps.google') || val.includes('goo.gl') || val.includes('waze.com')) return 'Location';
		if (val.includes('@') && !val.includes('http') && !val.startsWith('@')) return 'Email';
		if (val.startsWith('@')) return null; // Let user choose Telegram/X manually if simple handle
		if (val.startsWith('http') || val.startsWith('www')) return 'Website';
		return null;
	};

	let check_and_add = function (values) {
		if (!values.value) return;

		let detected = detect_type(values.value);
		if (detected) values.type = detected;

		// Server-side Check
		frappe.call({
			method: 'apex_crm.api.check_duplicate_contact',
			args: { value: values.value },
			callback: function (r) {
				if (r.message && r.message.length > 0) {
					// Duplicate
					let links = r.message.map(l => `<a href="/app/lead/${l.name}" target="_blank" style="font-weight: bold; text-decoration: underline;">${l.lead_name}</a>`).join(', ');

					let wrapper = d.fields_dict.duplicate_warning.wrapper;
					$(wrapper).html(`
						<div class="alert alert-danger" style="margin-top: 15px; font-size: 13px;">
							<div style="margin-bottom: 5px;">
								<i class="fa fa-ban"></i> <b>Duplicate Detected!</b>
							</div>
							<div>This contact is used by: ${links}</div>
						</div>
					`);
					$(wrapper).show();

					d.set_primary_action('Ignore & Add', function () {
						apex_crm.add_row_to_frm(frm, d.get_values());
						d.hide();
					});
					d.get_primary_btn().removeClass('btn-primary').addClass('btn-danger');

				} else {
					apex_crm.add_row_to_frm(frm, values);
					d.hide();
				}
			}
		});
	};

	// Auto-detect on change (Soft)
	d.fields_dict.value.df.onchange = () => {
		let val = d.get_value('value');
		if (!val) return;

		let detected = detect_type(val);
		if (detected && detected !== d.get_value('type')) {
			d.set_value('type', detected);
			frappe.show_alert({ message: `Type set to ${detected}`, indicator: 'green' });
		}
	};

	d.show();
};

apex_crm.edit_contact = function (frm, index) {
	let contacts = frm.doc.smart_contact_details || [];
	let contact = contacts[index];
	if (!contact) return;

	let d = new frappe.ui.Dialog({
		title: 'Edit Contact',
		fields: [
			{
				label: 'Type',
				fieldname: 'type',
				fieldtype: 'Select',
				options: 'Mobile\nPhone\nEmail\nWhatsApp\nTelegram\nWebsite\nLinkedIn\nFacebook\nInstagram\nTikTok\nSnapchat\nX\nLocation\nOther',
				reqd: 1,
				default: contact.type
			},
			{
				label: 'Code',
				fieldname: 'country_code',
				fieldtype: 'Autocomplete',
				options: apex_crm.get_country_options(),
				default: apex_crm.get_label_from_code(contact.country_code || '+20'), // Default to +20
				depends_on: 'eval:in_list(["Mobile", "Phone", "WhatsApp", "Telegram"], doc.type)',
				description: 'Type to search (e.g. "Saudi")'
			},
			{
				label: 'Value',
				fieldname: 'value',
				fieldtype: 'Data',
				reqd: 1,
				default: contact.value
			}
		],
		primary_action_label: 'Update',
		primary_action: function (values) {

			// Check logic
			contacts[index].type = values.type;

			// STRICT: If numeric type, ensure validation
			if (['Mobile', 'Phone', 'WhatsApp', 'Telegram'].includes(values.type)) {
				let extracted = apex_crm.extract_country_code(values.country_code);
				if (!extracted) {
					frappe.msgprint({
						title: __('Missing Country Code'),
						message: __('Please select a valid country code (e.g. +20).'),
						indicator: 'red'
					});
					return; // Stop save
				}
				contacts[index].country_code = extracted;
			} else {
				contacts[index].country_code = '';
			}

			contacts[index].value = values.value;

			frm.refresh_field('smart_contact_details');
			apex_crm.render_contacts(frm);
			frm.dirty();
			d.hide();
		}
	});

	d.show();
};

apex_crm.delete_contact = function (frm, index) {
	let contacts = frm.doc.smart_contact_details || [];
	if (contacts[index]) {
		// Remove from Child Table
		frm.doc.smart_contact_details.splice(index, 1);

		// Refresh UI
		frm.refresh_field('smart_contact_details');
		apex_crm.render_contacts(frm);

		// Trigger Form Dirty state
		frm.dirty();
	}
};

// Comprehensive Country List
apex_crm.country_codes = [
	{ code: 'eg', dial: '+20', name: 'Egypt' },
	{ code: 'sa', dial: '+966', name: 'Saudi Arabia' },
	{ code: 'ae', dial: '+971', name: 'UAE' },
	{ code: 'kw', dial: '+965', name: 'Kuwait' },
	{ code: 'qa', dial: '+974', name: 'Qatar' },
	{ code: 'bh', dial: '+973', name: 'Bahrain' },
	{ code: 'om', dial: '+968', name: 'Oman' },
	{ code: 'jo', dial: '+962', name: 'Jordan' },
	{ code: 'lb', dial: '+961', name: 'Lebanon' },
	{ code: 'iq', dial: '+964', name: 'Iraq' },
	{ code: 'ye', dial: '+967', name: 'Yemen' },
	{ code: 'sy', dial: '+963', name: 'Syria' },
	{ code: 'ps', dial: '+970', name: 'Palestine' },
	{ code: 'sd', dial: '+249', name: 'Sudan' },
	{ code: 'et', dial: '+251', name: 'Ethiopia' },
	{ code: 'ly', dial: '+218', name: 'Libya' },
	{ code: 'ma', dial: '+212', name: 'Morocco' },
	{ code: 'tn', dial: '+216', name: 'Tunisia' },
	{ code: 'dz', dial: '+213', name: 'Algeria' },
	{ code: 'so', dial: '+252', name: 'Somalia' },
	{ code: 'dj', dial: '+253', name: 'Djibouti' },
	{ code: 'er', dial: '+291', name: 'Eritrea' },
	{ code: 'ke', dial: '+254', name: 'Kenya' },
	{ code: 'ug', dial: '+256', name: 'Uganda' },
	{ code: 'tz', dial: '+255', name: 'Tanzania' },
	{ code: 'rw', dial: '+250', name: 'Rwanda' },
	{ code: 'bi', dial: '+257', name: 'Burundi' },
	{ code: 'ss', dial: '+211', name: 'South Sudan' },
	{ code: 'ng', dial: '+234', name: 'Nigeria' },
	{ code: 'gh', dial: '+233', name: 'Ghana' },
	{ code: 'za', dial: '+27', name: 'South Africa' },
	{ code: 'us', dial: '+1', name: 'USA' },
	{ code: 'gb', dial: '+44', name: 'UK' },
	{ code: 'ca', dial: '+1', name: 'Canada' },
	{ code: 'au', dial: '+61', name: 'Australia' },
	{ code: 'de', dial: '+49', name: 'Germany' },
	{ code: 'fr', dial: '+33', name: 'France' },
	{ code: 'it', dial: '+39', name: 'Italy' },
	{ code: 'es', dial: '+34', name: 'Spain' },
	{ code: 'tr', dial: '+90', name: 'Turkey' },
	{ code: 'in', dial: '+91', name: 'India' },
	{ code: 'pk', dial: '+92', name: 'Pakistan' },
	{ code: 'cn', dial: '+86', name: 'China' },
	{ code: 'jp', dial: '+81', name: 'Japan' },
	{ code: 'kr', dial: '+82', name: 'South Korea' },
	{ code: 'ru', dial: '+7', name: 'Russia' },
	{ code: 'br', dial: '+55', name: 'Brazil' },
	{ code: 'mx', dial: '+52', name: 'Mexico' },
	{ code: 'ar', dial: '+54', name: 'Argentina' },
	{ code: 'my', dial: '+60', name: 'Malaysia' },
	{ code: 'id', dial: '+62', name: 'Indonesia' },
	{ code: 'ph', dial: '+63', name: 'Philippines' },
	{ code: 'th', dial: '+66', name: 'Thailand' },
	{ code: 'vn', dial: '+84', name: 'Vietnam' },
	{ code: 'ch', dial: '+41', name: 'Switzerland' },
	{ code: 'se', dial: '+46', name: 'Sweden' },
	{ code: 'nl', dial: '+31', name: 'Netherlands' },
	{ code: 'be', dial: '+32', name: 'Belgium' },
	{ code: 'at', dial: '+43', name: 'Austria' },
	{ code: 'dk', dial: '+45', name: 'Denmark' },
	{ code: 'no', dial: '+47', name: 'Norway' },
	{ code: 'fi', dial: '+358', name: 'Finland' },
	{ code: 'pt', dial: '+351', name: 'Portugal' },
	{ code: 'gr', dial: '+30', name: 'Greece' },
	{ code: 'pl', dial: '+48', name: 'Poland' },
	{ code: 'ro', dial: '+40', name: 'Romania' },
	{ code: 'cz', dial: '+420', name: 'Czechia' },
	{ code: 'hu', dial: '+36', name: 'Hungary' },
	{ code: 'ua', dial: '+380', name: 'Ukraine' },
	{ code: 'co', dial: '+57', name: 'Colombia' },
	{ code: 'cl', dial: '+56', name: 'Chile' },
	{ code: 'pe', dial: '+51', name: 'Peru' },
	{ code: 've', dial: '+58', name: 'Venezuela' }
];

apex_crm.add_row_to_frm = function (frm, values) {
	let row = frappe.model.add_child(frm.doc, 'Apex Contact Detail', 'smart_contact_details');
	row.type = values.type || 'Mobile';

	let is_numeric = ['Phone', 'Mobile', 'WhatsApp', 'Telegram'].includes(row.type);
	row.country_code = is_numeric ? values.country_code : '';

	row.value = values.value;
	frm.refresh_field('smart_contact_details');
	apex_crm.render_contacts(frm);
};

apex_crm.get_flag_emoji = function (country_code) {
	const codePoints = country_code
		.toUpperCase()
		.split('')
		.map(char => 127397 + char.charCodeAt());
	return String.fromCodePoint(...codePoints);
};

apex_crm.get_iso_from_dial_code = function (dial_code) {
	if (!dial_code) return null;
	if (apex_crm.country_codes) {
		let found = apex_crm.country_codes.find(c => c.dial === dial_code);
		if (found) return found.code;
	}
	const map = {
		'+20': 'eg', '+966': 'sa', '+971': 'ae', '+965': 'kw', '+974': 'qa',
		'+973': 'bh', '+968': 'om', '+1': 'us', '+44': 'gb'
	};
	return map[dial_code] || null;
};

// --- Custom Renderer for Interaction History ---
apex_crm.render_interaction_history = function (frm) {
	let wrapper = frm.fields_dict['interaction_history_ui'] ? frm.fields_dict['interaction_history_ui'].wrapper : null;
	if (!wrapper) return;

	let history = [...(frm.doc.interaction_history || [])];
	// sort by timestamp desc
	history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

	let rows_html = history.map((row, index) => {
		let user_img = frappe.user_info(row.user).image;
		let user_fullname = frappe.user_info(row.user).fullname;
		let avatar_html = frappe.avatar(row.user, 'avatar-small', row.user); // generates standard avatar html

		// Status Badge Color
		let status_color = 'gray'; // Attempted
		if (['Connected', 'Completed', 'Answered'].includes(row.status)) status_color = 'green';
		else if (['Busy', 'No Answer'].includes(row.status)) status_color = 'red';
		else if (['Left Message'].includes(row.status)) status_color = 'orange';
		else if (['Scheduled'].includes(row.status)) status_color = 'blue';

		// Formatted Time
		let timestamp_display = frappe.datetime.global_date_format(row.timestamp) + ' ' + row.timestamp.split(' ')[1].substring(0, 5);
		if (frappe.datetime.get_day_diff(frappe.datetime.get_today(), row.timestamp) === 0) {
			timestamp_display = "Today " + row.timestamp.split(' ')[1].substring(0, 5);
		}

		// Icon
		let type_icon = 'fa fa-phone';
		let type_color = '#333';
		if (row.type === 'WhatsApp') { type_icon = 'fa fa-whatsapp'; type_color = '#25D366'; }
		else if (row.type === 'Call') { type_icon = 'fa fa-phone'; type_color = '#007bff'; }
		else if (row.type === 'SMS') { type_icon = 'fa fa-comment'; type_color = '#f39c12'; }
		else if (row.type === 'Email') { type_icon = 'fa fa-envelope'; type_color = '#dc3545'; }
		else if (row.type === 'Facebook') { type_icon = 'fa fa-facebook'; type_color = '#1877f2'; }
		else if (row.type === 'Instagram') { type_icon = 'fa fa-instagram'; type_color = '#c32aa3'; }
		else if (row.type === 'LinkedIn') { type_icon = 'fa fa-linkedin'; type_color = '#0077b5'; }
		else if (row.type === 'Telegram') { type_icon = 'fa fa-telegram'; type_color = '#0088cc'; }
		else if (row.type === 'TikTok') { type_icon = 'fa fa-music'; type_color = '#000000'; }
		else if (row.type === 'Snapchat') { type_icon = 'fa fa-snapchat-ghost'; type_color = '#fffc00; text-shadow: 0px 0px 1px #000'; }
		else if (row.type === 'X') { type_icon = 'fa fa-times'; type_color = '#000000'; }
		else if (row.type === 'Location') { type_icon = 'fa fa-map-marker'; type_color = '#ea4335'; }
		else if (row.type === 'Other') { type_icon = 'fa fa-globe'; type_color = '#333'; }

		// Summary truncation
		let summary = row.summary || '';

		return `
		<tr style="border-bottom: 1px solid #ebf1f1;" class="interaction-row" data-name="${row.name}">
			<td style="padding: 10px; text-align: center;">
				<i class="${type_icon}" style="font-size: 16px; color: ${type_color};"></i>
			</td>
			<td style="padding: 10px; color: #555; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${timestamp_display}</td>
			<td style="padding: 10px;">
				<div style="display: flex; align-items: center; justify-content: center;">
					${avatar_html}
				</div>
			</td>
			<td style="padding: 10px;">
				<span class="indicator-pill ${status_color} no-indicator-dot" style="font-size: 11px; padding: 3px 8px; border-radius: 12px; display: inline-block; white-space: nowrap;">${row.status || '-'}</span>
			</td>
			<td style="padding: 10px; color: #555; font-size: 13px;">${frappe.format(row.duration, { fieldtype: 'Duration' }) || '-'}</td>
			<td style="padding: 10px; font-size: 13px; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 0;" title="${summary}">
				${summary}
			</td>
			<td style="padding: 10px; text-align: right; white-space: nowrap;">
				<button class="btn btn-xs btn-default edit-interaction-btn" data-name="${row.name}" title="Edit"><i class="fa fa-pencil"></i></button>
				<button class="btn btn-xs btn-danger delete-interaction-btn" data-name="${row.name}" style="margin-left: 5px;" title="Delete"><i class="fa fa-trash"></i></button>
			</td>
		</tr>
		`;
	}).join('');

	// Debug Log
	console.log("Apex CRM: Rendering Interaction History (Fixed Layout)");

	let table_html = `
	<div class="interaction-history-container" style="background: #fff; border: 1px solid #d1d8dd; border-radius: 8px; margin-top: 10px;">
		<div style="padding: 12px 15px; background: #f8f9fa; border-bottom: 1px solid #d1d8dd; font-weight: bold; font-size: 14px; color: #333;">
			Interaction History
		</div>
		<div style="max-height: 250px; overflow-y: auto;">
			<table style="width: 100%; min-width: 600px; border-collapse: collapse; table-layout: fixed;">
				<thead style="background: #fcfcfc; color: #6c757d; font-size: 11px; text-transform: uppercase; font-weight: 600; position: sticky; top: 0; z-index: 10;">
					<tr>
						<th style="padding: 10px; width: 50px; text-align: center; background: #fcfcfc; border-bottom: 1px solid #eee;">Type</th>
						<th style="padding: 10px; width: 110px; background: #fcfcfc; border-bottom: 1px solid #eee;">Timestamp</th>
						<th style="padding: 10px; width: 60px; background: #fcfcfc; border-bottom: 1px solid #eee;">Agent</th>
						<th style="padding: 10px; width: 110px; background: #fcfcfc; border-bottom: 1px solid #eee;">Status</th>
						<th style="padding: 10px; width: 80px; background: #fcfcfc; border-bottom: 1px solid #eee;">Duration</th>
						<th style="padding: 10px; background: #fcfcfc; border-bottom: 1px solid #eee;">Summary</th>
						<th style="padding: 10px; width: 90px; background: #fcfcfc; border-bottom: 1px solid #eee;"></th>
					</tr>
				</thead>
				<tbody>
					${rows_html || '<tr><td colspan="7" style="padding: 20px; text-align: center; color: #999;">No interactions logged yet.</td></tr>'}
				</tbody>
			</table>
		</div>
	</div>
	`;

	$(wrapper).html(table_html);

	// Bind Edit Event
	$(wrapper).find('.edit-interaction-btn').on('click', function () {
		let name = $(this).data('name');
		apex_crm.edit_interaction_dialog(frm, name);
	});

	// Bind Delete Event
	$(wrapper).find('.delete-interaction-btn').on('click', function () {
		let name = $(this).data('name');
		frappe.confirm('Are you sure you want to delete this interaction?', () => {
			// Remove from locals and doc list
			frappe.model.clear_doc("Apex Interaction Log", name);
			frm.doc.interaction_history = frm.doc.interaction_history.filter(r => r.name !== name);

			frm.refresh_field('interaction_history');
			frm.save();
		});
	});
};

apex_crm.render_dashboard_summary = function (frm) {
	let wrapper = frm.fields_dict['contact_manager_ui'].wrapper;
	let dash_row = $(wrapper).find('.dashboard-row');

	// If contacts render hasn't run yet, wrapper might be empty or dash_row missing.
	// But in refresh, render_contacts runs first.
	if (!dash_row.length) return;

	frappe.call({
		method: 'apex_crm.api.get_lead_dashboard_data',
		args: { lead: frm.doc.name },
		callback: function (r) {
			if (r.message) {
				let d = r.message;
				let items = [
					{
						label: 'Open Tasks',
						count: d.tasks,
						icon: 'fa fa-check-square',
						color: '#ff9800',
						doctype: 'ToDo',
						filters: { reference_type: 'Lead', reference_name: frm.doc.name, status: 'Open' },
						new_doc_args: { reference_type: 'Lead', reference_name: frm.doc.name, description: 'Follow up with ' + frm.doc.lead_name }
					},
					{
						label: 'Open Events',
						count: d.events,
						icon: 'fa fa-calendar',
						color: '#007bff',
						doctype: 'Event',
						filters: null, // Event list filters
					},
					{
						label: 'Notes',
						count: d.notes,
						icon: 'fa fa-sticky-note',
						color: '#6c757d',
						// No doctype means no List View routing
						// on_click handler for custom action (scrolling)
						on_click: function () {
							// 1. Try standard scrolling to Tab
							if (frm.fields_dict['notes_tab']) {
								frm.scroll_to_field('notes_tab');
							}
							// 2. Fallback to Section
							else if (frm.fields_dict['notes']) {
								frm.scroll_to_field('notes');
							}
							else {
								frappe.show_alert({ message: __('Could not find Notes tab'), indicator: 'orange' });
							}
						}
					}
				];

				let html = items.map((item, idx) => `
					<div class="dash-item" style="display: flex; align-items: center; background: #fff; padding: 4px; border-radius: 20px; border: 1px solid #e2e6ea; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
						
						<!-- Create New Action (Left Side) -->
						<div class="dash-action-new" data-idx="${idx}" style="display: flex; align-items: center; gap: 8px; padding: 4px 10px; cursor: pointer; border-radius: 16px; transition: background 0.1s;" title="Create New ${item.label}">
							<span style="color: ${item.color};"><i class="${item.icon}"></i></span>
							<span style="font-size: 13px; font-weight: 500; color: #333;">${item.label}</span>
						</div>

						<!-- View List Action (Count Pill) -->
						<div class="dash-action-list" data-idx="${idx}" style="background: ${item.color}20; color: ${item.color}; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; cursor: pointer; margin-left: 2px;" title="View List">
							${item.count}
						</div>
					</div>
				`).join('');

				dash_row.html(`<div style="display: flex; gap: 10px; flex-wrap: wrap;">${html}</div>`);

				// Bind Clicks
				dash_row.find('.dash-action-new').on('click', function (e) {
					e.stopPropagation();
					let idx = $(this).data('idx');
					let item = items[idx];

					if (item.label === 'Notes') {
						// Special case for Note: Use standard 'Add Note' logic (already implemented in quick_add_dialog)
						apex_crm.quick_add_dialog(frm, 'Note');
					} else if (item.doctype) {
						if (['Event', 'Note', 'ToDo'].includes(item.doctype)) {
							apex_crm.quick_add_dialog(frm, item.doctype);
						} else {
							frappe.new_doc(item.doctype, item.new_doc_args || {});
						}
					}
				});

				dash_row.find('.dash-action-list').on('click', function (e) {
					e.stopPropagation();
					let idx = $(this).data('idx');
					let item = items[idx];

					if (item.on_click) {
						item.on_click();
					} else if (item.doctype) {
						if (item.filters) {
							frappe.route_options = item.filters; // already object, no need to decode
						}
						frappe.set_route('List', item.doctype);
					}
				});
			}
		}
	});
};

apex_crm.quick_add_dialog = function (frm, doctype) {
	let fields = [];
	let title = `New ${doctype}`;
	let primary_action_label = 'Create';
	let insert_args = {};

	if (doctype === 'Event') {
		const args = {
			doc: frm.doc,
			frm: frm,
			title: __('New Event'),
		};
		let composer = new frappe.views.InteractionComposer(args);
		composer.dialog.get_field("interaction_type").set_value("Event");
		$(composer.dialog.get_field("interaction_type").wrapper).hide();

		// Attempt to bypass Google Calendar Sync error if field exists in the view
		if (composer.dialog.fields_dict.sync_with_google_calendar) {
			composer.dialog.set_value("sync_with_google_calendar", 0);
		}

	} else if (doctype === 'ToDo') {
		const args = {
			doc: frm.doc,
			frm: frm,
			title: __('New Task'),
		};
		let composer = new frappe.views.InteractionComposer(args);
		composer.dialog.get_field("interaction_type").set_value("ToDo");
		// hide column having interaction type field
		$(composer.dialog.get_field("interaction_type").wrapper).closest(".form-column").hide();
		// hide summary field if it exists (standard CRM behavior)
		if (composer.dialog.fields_dict.summary) {
			$(composer.dialog.get_field("summary").wrapper).closest(".form-section").hide();
		}

	} else if (doctype === 'Note') {
		// Use the existing "Add Note" button from standard CRM
		// This ensures we use the exact same form/dialog as the standard UI
		let $note_btn = $(frm.fields_dict.notes_html.wrapper).find('.new-note-btn');
		if ($note_btn.length > 0) {
			$note_btn.click();
		} else {
			// Fallback: try global selector if wrapper scoping fails
			let $global_btn = $('.new-note-btn');
			if ($global_btn.length > 0) {
				$global_btn.first().click();
			} else {
				frappe.msgprint(__('Could not find standard Note button. Please ensure the Notes section is visible.'));
			}
		}
	}
};


apex_crm.edit_interaction_dialog = function (frm, row_name) {
	let row = frm.doc.interaction_history.find(r => r.name === row_name);
	if (!row) return;

	let d = new frappe.ui.Dialog({
		title: `Edit Interaction Details`,
		fields: [
			{
				label: 'Status',
				fieldname: 'status',
				fieldtype: 'Select',
				options: 'Attempted\nConnected\nBusy\nNo Answer\nLeft Message\nScheduled',
				default: row.status,
				reqd: 1
			},
			{
				label: 'Duration',
				fieldname: 'duration',
				fieldtype: 'Duration',
				default: row.duration,
				description: 'e.g. 5m 30s'
			},
			{
				label: 'Summary / Notes',
				fieldname: 'summary',
				fieldtype: 'Small Text',
				default: row.summary
			}
		],
		primary_action_label: 'Save',
		primary_action: function (values) {
			frappe.model.set_value(row.doctype, row.name, 'status', values.status);
			frappe.model.set_value(row.doctype, row.name, 'duration', values.duration);
			frappe.model.set_value(row.doctype, row.name, 'summary', values.summary);
			frm.save();
			d.hide();
		}
	});
	d.show();
};

apex_crm.log_interaction = function (frm, type, value) {
	// 1. Add row to Interaction Log
	let row = frappe.model.add_child(frm.doc, 'Apex Interaction Log', 'interaction_history');
	row.type = type;

	// Use a stable timestamp for lookup
	let timestamp = frappe.datetime.now_datetime();
	row.timestamp = timestamp;

	row.user = frappe.session.user;
	row.status = 'Attempted'; // Default

	frm.refresh_field('interaction_history');

	// 2. Save Form immediately to persist log
	frm.save_or_update();

	// 3. Show "Interaction Details" Prompt (Non-blocking)
	// We use a small delay to let the user switch focus back to the CRM after the call/chat
	setTimeout(() => {
		let d = new frappe.ui.Dialog({
			title: `Log ${type} Details`,
			fields: [
				{
					label: 'Status',
					fieldname: 'status',
					fieldtype: 'Select',
					options: 'Attempted\nConnected\nBusy\nNo Answer\nLeft Message\nScheduled',
					default: 'Attempted',
					reqd: 1
				},
				{
					label: 'Duration',
					fieldname: 'duration',
					fieldtype: 'Duration',
					description: 'e.g. 5m 30s'
				},
				{
					label: 'Summary / Notes',
					fieldname: 'summary',
					fieldtype: 'Small Text'
				}
			],
			primary_action_label: 'Update Log',
			primary_action: function (values) {
				// Find the row by TIMESTAMP & TYPE instead of name (which changes on save)
				let history = frm.doc.interaction_history || [];
				// We look for a row that matches the timestamp we created
				let target_row = history.find(r => r.timestamp === timestamp && r.type === type);

				if (target_row) {
					frappe.model.set_value(target_row.doctype, target_row.name, 'status', values.status);
					frappe.model.set_value(target_row.doctype, target_row.name, 'duration', values.duration);
					frappe.model.set_value(target_row.doctype, target_row.name, 'summary', values.summary);

					frm.save(); // Save again with details
				}
				d.hide();
			}
		});
		d.show();
	}, 2000); // 2 second delay to allow app switch
};
