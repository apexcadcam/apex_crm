frappe.pages['exportimportmanager'].on_page_load = function (wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Export/Import Manager',
        single_column: true
    });

    // Add Export Section
    page.add_inner_button(__('Export Contacts'), function () {
        exportContacts();
    }, __('Actions'));

    // Add Import Section
    page.add_inner_button(__('Import Contacts'), function () {
        importContacts();
    }, __('Actions'));

    // Show welcome message
    $(frappe.render_template('export_import_welcome', {})).appendTo(page.body);
};

function exportContacts() {
    frappe.show_alert({
        message: __('Preparing export...'),
        indicator: 'blue'
    });

    frappe.call({
        method: 'apex_crm.api.export_apex_contacts_to_excel',
        callback: function (r) {
            if (r.message && r.message.file_url) {
                frappe.show_alert({
                    message: __('Export successful!'),
                    indicator: 'green'
                });

                // Download file
                window.open(r.message.file_url, '_blank');
            }
        },
        error: function (r) {
            frappe.show_alert({
                message: __('Export failed. Please try again.'),
                indicator: 'red'
            });
        }
    });
}

function importContacts() {
    // Create file upload dialog
    let d = new frappe.ui.Dialog({
        title: __('Import Contacts'),
        fields: [
            {
                label: __('Excel File'),
                fieldname: 'excel_file',
                fieldtype: 'Attach',
                reqd: 1,
                options: {
                    restrictions: {
                        allowed_file_types: ['.xlsx', '.xls']
                    }
                }
            }
        ],
        primary_action_label: __('Import'),
        primary_action(values) {
            frappe.show_alert({
                message: __('Importing contacts...'),
                indicator: 'blue'
            });

            frappe.call({
                method: 'apex_crm.api.import_apex_contacts_from_excel',
                args: {
                    file_url: values.excel_file
                },
                callback: function (r) {
                    if (r.message) {
                        let msg = `✅ ${__('Import Complete')}\n`;
                        msg += `📊 ${__('Processed')}: ${r.message.total}\n`;
                        msg += `✅ ${__('Success')}: ${r.message.success}\n`;

                        if (r.message.errors > 0) {
                            msg += `❌ ${__('Errors')}: ${r.message.errors}`;
                        }

                        frappe.msgprint({
                            title: __('Import Complete'),
                            message: msg,
                            indicator: r.message.errors > 0 ? 'orange' : 'green'
                        });
                    }
                    d.hide();
                },
                error: function (r) {
                    frappe.show_alert({
                        message: __('Import failed. Please check your file format.'),
                        indicator: 'red'
                    });
                }
            });
        }
    });

    d.show();
}

// Template for welcome message
frappe.templates['export_import_welcome'] = `
<div class="export-import-welcome" style="padding: 40px; text-align: center;">
	<div style="font-size: 48px; margin-bottom: 20px;">📊</div>
	<h3>Export/Import Manager</h3>
	<p style="color: #888; margin-top: 10px;">
		Manage your contact data exports and imports
	</p>
	<div style="margin-top: 30px; display: flex; gap: 20px; justify-content: center;">
		<div style="flex: 1; max-width: 300px; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
			<div style="font-size: 32px; margin-bottom: 10px;">📤</div>
			<h4>Export Contacts</h4>
			<p style="color: #666; font-size: 14px;">
				Export all contacts to Excel with smart flattening
			</p>
		</div>
		<div style="flex: 1; max-width: 300px; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
			<div style="font-size: 32px; margin-bottom: 10px;">📥</div>
			<h4>Import Contacts</h4>
			<p style="color: #666; font-size: 14px;">
				Import contacts from Excel file
			</p>
		</div>
	</div>
	<p style="margin-top: 30px; color: #888; font-size: 12px;">
		Use the Actions menu above to get started
	</p>
</div>
`;
