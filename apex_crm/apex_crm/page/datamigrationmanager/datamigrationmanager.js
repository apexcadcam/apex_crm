frappe.pages['datamigrationmanager'].on_page_load = function (wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Data Migration Manager',
        single_column: true
    });

    // Add Migrate button
    page.add_inner_button(__('Start Migration'), function () {
        startMigration();
    }, __('Actions'));

    // Show welcome message
    $(frappe.render_template('migration_welcome', {})).appendTo(page.body);
};

function startMigration() {
    frappe.confirm(
        __('This will migrate old contact data (custom_mobile_number_1, custom_mobile_number_2, etc.) to the new Apex Contact Detail format. Continue?'),
        function () {
            frappe.show_alert({
                message: __('Starting migration...'),
                indicator: 'blue'
            });

            frappe.call({
                method: 'apex_crm.api.migrate_old_contact_data',
                callback: function (r) {
                    if (r.message) {
                        let msg = `✅ ${__('Migration Complete')}\n\n`;
                        msg += `📊 ${__('Total Leads')}: ${r.message.total_leads}\n`;
                        msg += `✅ ${__('Migrated')}: ${r.message.migrated_leads}\n`;
                        msg += `⏭️ ${__('Skipped')}: ${r.message.skipped_leads}\n`;

                        if (r.message.errors && r.message.errors.length > 0) {
                            msg += `\n❌ ${__('Errors')}:\n`;
                            r.message.errors.forEach(err => {
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
