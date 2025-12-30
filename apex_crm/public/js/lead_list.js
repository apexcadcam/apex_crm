// Apex CRM Lead List View Customizations
frappe.listview_settings['Lead'] = {
    refresh: function (listview) {
        console.log('Apex CRM: Lead listview refresh called (v3)');

        // Debounce/Prevent multiple runs
        if (listview.apex_crm_buttons_processing) return;
        listview.apex_crm_buttons_processing = true;

        setTimeout(function () {
            try {
                if (!listview || !listview.page) {
                    listview.apex_crm_buttons_processing = false;
                    return;
                }

                console.log('Apex CRM: Adding dropdown menu (v3)...');

                // CLEANUP OLD BUTTONS FORCEFULLY
                // We do this on every refresh to be safe
                const old_labels = [
                    'Duplicate Manager', 'Duplicate Manager (v2)',
                    'Migrate Old Contacts', 'Migrate Old Contacts (v2)',
                    'Export Apex Contacts', 'Import Apex Contacts'
                ];

                if (listview.page.inner_toolbar) {
                    old_labels.forEach(label => {
                        listview.page.remove_inner_button(label);
                        listview.page.remove_inner_button(label, 'Apex CRM');
                    });
                    // Clear the group itself if empty? No easy way, but we can re-add.
                }

                // Fetch permissions from Server (Role-based)
                frappe.call({
                    method: 'apex_crm.api.get_apex_crm_button_permissions',
                    callback: function (r) {
                        listview.apex_crm_buttons_processing = false; // Reset lock

                        if (!r.message) return;
                        let permissions = r.message;

                        let menu_items = [];

                        // 1. Duplicate Manager
                        if (permissions.duplicate_manager) {
                            menu_items.push({
                                label: __('Duplicate Manager'),
                                action: function () { frappe.set_route('duplicate-manager'); }
                            });
                        }

                        // 2. Migrate Old Contacts - requires Write permission on Lead
                        if (permissions.migrate_contacts) {
                            menu_items.push({
                                label: __('Migrate Old Contacts'),
                                action: function () {
                                    frappe.confirm(
                                        __('هل تريد نقل جميع بيانات الاتصال القديمة (phone, mobile_no, email, etc.) إلى Apex Contacts تلقائياً؟'),
                                        function () {
                                            frappe.call({
                                                method: 'apex_crm.api.migrate_old_contacts_to_apex',
                                                freeze: true,
                                                freeze_message: __('جاري نقل البيانات...'),
                                                callback: function (r) {
                                                    if (r.message) {
                                                        let msg = __('تم نقل {0} Lead بنجاح', [r.message.success]);
                                                        if (r.message.contacts_added > 0) {
                                                            msg += __(' ({0} سجل اتصال تم إضافته)', [r.message.contacts_added]);
                                                        }
                                                        if (r.message.skipped > 0) {
                                                            msg += __(' ({0} تم تخطيهم)', [r.message.skipped]);
                                                        }

                                                        frappe.show_alert({
                                                            message: msg,
                                                            indicator: 'green'
                                                        }, 8);

                                                        if (r.message.error_list && r.message.error_list.length > 0) {
                                                            frappe.msgprint({
                                                                title: __('أخطاء النقل'),
                                                                message: r.message.error_list.join('<br>'),
                                                                indicator: 'orange'
                                                            });
                                                        }

                                                        listview.refresh();
                                                    }
                                                }
                                            });
                                        }
                                    );
                                }
                            });
                        }

                        // 3. Export Apex Contacts - requires Export permission on Lead (or Read as fallback)
                        if (permissions.export_contacts) {
                            menu_items.push({
                                label: __('Export Apex Contacts'),
                                action: function () {
                                    frappe.call({
                                        method: 'apex_crm.api.export_apex_contacts_to_excel',
                                        callback: function (r) {
                                            if (r.message && r.message.file_url) {
                                                window.open(r.message.file_url, '_blank');
                                                frappe.show_alert({
                                                    message: __('تم تصدير {0} سجل بنجاح', [r.message.total_records]),
                                                    indicator: 'green'
                                                }, 5);
                                            } else {
                                                frappe.msgprint(__('حدث خطأ أثناء التصدير'));
                                            }
                                        }
                                    });
                                }
                            });
                        }

                        // 4. Import Apex Contacts - requires Import permission on Lead (or Write as fallback)
                        if (permissions.import_contacts) {
                            menu_items.push({
                                label: __('Import Apex Contacts'),
                                action: function () {
                                    new frappe.ui.FileUploader({
                                        method: 'apex_crm.api.import_apex_contacts_from_excel',
                                        on_success: function (file_doc, r) {
                                            if (r.message) {
                                                let msg = __('تم استيراد {0} Lead بنجاح', [r.message.success]);
                                                if (r.message.errors > 0) {
                                                    msg += __(' ({0} أخطاء)', [r.message.errors]);
                                                }
                                                frappe.show_alert({
                                                    message: msg,
                                                    indicator: r.message.errors > 0 ? 'orange' : 'green'
                                                }, 5);

                                                if (r.message.error_list && r.message.error_list.length > 0) {
                                                    frappe.msgprint({
                                                        title: __('أخطاء الاستيراد'),
                                                        message: r.message.error_list.join('<br>'),
                                                        indicator: 'orange'
                                                    });
                                                }

                                                listview.refresh();
                                            }
                                        },
                                        restrictions: {
                                            allowed_file_types: ['.xlsx', '.xls']
                                        }
                                    });
                                }
                            });
                        }

                        console.log('Apex CRM: Menu items count:', menu_items.length);

                        // Only add dropdown if user has at least one permission
                        if (menu_items.length > 0) {
                            // Use explicit string for group to ensure key consistency
                            const group_label = 'Apex CRM';

                            // STRICT CLEANUP: 
                            // Remove any existing buttons with these specific labels.
                            // We target the buttons directly in the toolbar.
                            menu_items.forEach(function (item) {
                                if (listview.page.inner_toolbar) {
                                    // Remove standalone buttons
                                    listview.page.remove_inner_button(item.label);
                                    // Remove from group if exists
                                    listview.page.remove_inner_button(item.label, group_label);
                                }
                            });

                            // Add each menu item to the dropdown group
                            menu_items.forEach(function (item) {
                                listview.page.add_inner_button(item.label, item.action, group_label);
                            });

                            console.log('Apex CRM: ✓ Dropdown menu added with', menu_items.length, 'items');
                        } else {
                            console.log('Apex CRM: No permissions, skipping dropdown menu');
                        }

                    }
                });
            } catch (e) {
                console.error('Apex CRM: Error adding dropdown menu', e);
            }
        }, 500);
    },

    // Format modified date to show full date and time
    formatters: {
        modified: function (value, df, doc) {
            if (!value) return '';
            return frappe.datetime.str_to_user(value);
        }
    }
};
