frappe.pages['datamigrationmanager'].on_page_load = function (wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Data Migration Manager',
        single_column: true
    });

    // Add Migrate buttons
    page.add_inner_button(__('Start Migration'), function () {
        startMigration();
    }, __('Actions'));
    
    page.add_inner_button(__('Import Addresses'), function () {
        importAddresses();
    }, __('Actions'));

    // Show welcome message
    $(frappe.render_template('migration_welcome', {})).appendTo(page.body);
};

function startMigration() {
    frappe.confirm(
        __('This will migrate old contact data (custom_mobile_number_1, custom_mobile_number_2, etc.) to the new Apex Contact Detail format, and also migrate address data (city, state, country) to Address DocType. Continue?'),
        function () {
            frappe.show_alert({
                message: __('Starting migration...'),
                indicator: 'blue'
            });

            frappe.call({
                method: 'apex_crm.api.migrate_old_contacts_to_apex',
                callback: function (r) {
                    if (r.message) {
                        let msg = `✅ ${__('Migration Complete')}\n\n`;
                        msg += `📊 ${__('Total Leads')}: ${r.message.total_leads}\n`;
                        msg += `✅ ${__('Migrated')}: ${r.message.success}\n`;
                        msg += `⏭️ ${__('Skipped')}: ${r.message.skipped}\n`;
                        if (r.message.contacts_added) {
                            msg += `📞 ${__('Contacts Added')}: ${r.message.contacts_added}\n`;
                        }
                        if (r.message.addresses_added) {
                            msg += `📍 ${__('Addresses Added')}: ${r.message.addresses_added}\n`;
                        }

                        if (r.message.error_list && r.message.error_list.length > 0) {
                            msg += `\n❌ ${__('Errors')}:\n`;
                            r.message.error_list.forEach(err => {
                                msg += `  • ${err}\n`;
                            });
                        }

                        frappe.msgprint({
                            title: __('Migration Complete'),
                            message: msg,
                            indicator: r.message.errors && r.message.errors.length > 0 ? 'orange' : 'green'
                        });
                    }
                },
                error: function (r) {
                    frappe.show_alert({
                        message: __('Migration failed. Please check the error log.'),
                        indicator: 'red'
                    });
                }
            });
        }
    );
}

function importAddresses() {
    // Create dialog for file upload or direct data input
    let d = new frappe.ui.Dialog({
        title: __('Import Addresses from External Server'),
        fields: [
            {
                fieldtype: 'Section Break',
                label: __('Import Options')
            },
            {
                fieldtype: 'Select',
                fieldname: 'import_method',
                label: __('Import Method'),
                options: [
                    {value: 'file', label: __('Upload JSON File')},
                    {value: 'paste', label: __('Paste JSON Data')}
                ],
                default: 'file',
                reqd: 1
            },
            {
                fieldtype: 'Column Break'
            },
            {
                fieldtype: 'Attach',
                fieldname: 'address_file',
                label: __('Address File (JSON)'),
                depends_on: 'eval:doc.import_method == "file"'
            },
            {
                fieldtype: 'Section Break',
                depends_on: 'eval:doc.import_method == "paste"'
            },
            {
                fieldtype: 'Code',
                fieldname: 'address_data',
                label: __('Address Data (JSON)'),
                options: 'json',
                depends_on: 'eval:doc.import_method == "paste"',
                description: __('Paste JSON array of addresses. Format: [{"Lead ID": "LEAD-XXX", "address_line1": "...", "city": "...", "state": "...", "country": "..."}, ...]')
            }
        ],
        primary_action_label: __('Import'),
        primary_action: function(values) {
            let addresses_data = null;
            
            if (values.import_method === 'file') {
                if (!values.address_file) {
                    frappe.msgprint(__('Please select a file'));
                    return;
                }
                // File will be read server-side
                frappe.call({
                    method: 'apex_crm.api.import_addresses_from_external',
                    args: {
                        file_path: values.address_file
                    },
                    callback: function(r) {
                        if (r.message) {
                            let msg = `✅ ${__('Import Complete')}\n\n`;
                            msg += `📊 ${__('Total Addresses')}: ${r.message.total_addresses}\n`;
                            msg += `✅ ${__('Imported')}: ${r.message.success}\n`;
                            msg += `⏭️ ${__('Skipped')}: ${r.message.skipped}\n`;
                            
                            if (r.message.error_list && r.message.error_list.length > 0) {
                                msg += `\n❌ ${__('Errors')}:\n`;
                                r.message.error_list.forEach(err => {
                                    msg += `  • ${err}\n`;
                                });
                            }
                            
                            frappe.msgprint({
                                title: __('Import Complete'),
                                message: msg,
                                indicator: r.message.error_list && r.message.error_list.length > 0 ? 'orange' : 'green'
                            });
                        }
                        d.hide();
                    }
                });
            } else {
                // Parse pasted JSON
                try {
                    addresses_data = JSON.parse(values.address_data);
                } catch (e) {
                    frappe.msgprint({
                        title: __('Invalid JSON'),
                        message: __('Please check your JSON format. Error: ') + e.message,
                        indicator: 'red'
                    });
                    return;
                }
                
                frappe.call({
                    method: 'apex_crm.api.import_addresses_from_external',
                    args: {
                        addresses_data: addresses_data
                    },
                    callback: function(r) {
                        if (r.message) {
                            let msg = `✅ ${__('Import Complete')}\n\n`;
                            msg += `📊 ${__('Total Addresses')}: ${r.message.total_addresses}\n`;
                            msg += `✅ ${__('Imported')}: ${r.message.success}\n`;
                            msg += `⏭️ ${__('Skipped')}: ${r.message.skipped}\n`;
                            
                            if (r.message.error_list && r.message.error_list.length > 0) {
                                msg += `\n❌ ${__('Errors')}:\n`;
                                r.message.error_list.forEach(err => {
                                    msg += `  • ${err}\n`;
                                });
                            }
                            
                            frappe.msgprint({
                                title: __('Import Complete'),
                                message: msg,
                                indicator: r.message.error_list && r.message.error_list.length > 0 ? 'orange' : 'green'
                            });
                        }
                        d.hide();
                    }
                });
            }
        }
    });
    
    d.show();
}

// Template for welcome message
frappe.templates['migration_welcome'] = `
<div class="migration-welcome" style="padding: 40px; text-align: center;">
	<div style="font-size: 48px; margin-bottom: 20px;">🔄</div>
	<h3>Data Migration Manager</h3>
	<p style="color: #888; margin-top: 10px;">
		Migrate old contact data to new format
	</p>
	<div style="margin-top: 30px; max-width: 600px; margin-left: auto; margin-right: auto;">
		<div style="padding: 20px; border: 1px solid #ddd; border-radius: 8px; background: #f9f9f9;">
			<h4 style="margin-top: 0;">What does this do?</h4>
			<p style="color: #666; font-size: 14px; text-align: left;">
				This tool migrates contact data from old custom fields to the new Apex Contact Detail format:
			</p>
			<ul style="text-align: left; color: #666; font-size: 14px;">
				<li><code>custom_mobile_number_1</code> → Apex Contact Detail (Mobile)</li>
				<li><code>custom_mobile_number_2</code> → Apex Contact Detail (Mobile)</li>
				<li><code>custom_whatsapp_number</code> → Apex Contact Detail (WhatsApp)</li>
				<li><code>custom_facebook</code> → Apex Contact Detail (Facebook)</li>
				<li><code>city, state, country</code> → Address Document (for ERPNext & Website)</li>
			</ul>
			<div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-radius: 4px; border-left: 4px solid #ffc107;">
				<strong>⚠️ Note:</strong> This migration is safe and will not delete old data.
			</div>
		</div>
	</div>
	<p style="margin-top: 30px; color: #888; font-size: 12px;">
		Use the Actions menu above to start migration
	</p>
</div>
`;
