
// Helper for list view column formatter (Placed globally to be accessible)
window.apex_crm_list = {
    guess_country_code: function (val) {
        if (!val) return '';
        val = val.trim();
        if (val.startsWith('+')) {
            let match = val.match(/^(\+\d{1,4})/);
            return match ? match[1] : '';
        }
        return '';
    },
    get_icon_for_type: function (type) {
        if (!type) return null;
        type = type.trim();
        const iconMap = {
            'Facebook': '<i class="fa fa-facebook" style="color: #1877F2; font-size: 14px;"></i>',
            'Instagram': '<i class="fa fa-instagram" style="color: #E4405F; font-size: 14px;"></i>',
            'LinkedIn': '<i class="fa fa-linkedin" style="color: #0A66C2; font-size: 14px;"></i>',
            'Twitter': '<i class="fa fa-twitter" style="color: #1DA1F2; font-size: 14px;"></i>',
            'Telegram': '<i class="fa fa-telegram" style="color: #0088cc; font-size: 14px;"></i>'
        };
        // Handles case insensitivity roughly via fallback
        return iconMap[type] || iconMap[type.charAt(0).toUpperCase() + type.slice(1)] || null;
    },
    handle_switch: function (select) {
        let idx = parseInt(select.value);
        let contacts = JSON.parse(decodeURIComponent(select.dataset.contacts));
        let c = contacts[idx];

        let parent = select.closest('.switcher-display');
        let val = c.value || '';
        let type = c.type || '';
        let countryCode = c.country_code || '';
        let socialIcon = this.get_icon_for_type(type);
        let countryCodeHtml = '';
        let displayVal = val.replace(/[📱☎️📧📍🌐🏠💬]/g, '').trim();

        if (countryCode && !socialIcon) {
            let normalizedCC = countryCode.trim();
            if (!normalizedCC.startsWith('+')) normalizedCC = '+' + normalizedCC;
            if (!displayVal.startsWith(normalizedCC)) {
                displayVal = displayVal.replace(/^\+\d{1,4}\s*/, '').trim();
                displayVal = normalizedCC + displayVal;
            }
        }

        if (socialIcon) countryCodeHtml = socialIcon;
        else countryCodeHtml = ''; // No flag needed if number has country code

        let flagSpan = parent.querySelector('.sw-flag');
        if (flagSpan) flagSpan.innerHTML = countryCodeHtml;

        let valSpan = parent.querySelector('.sw-value');
        if (valSpan) {
            valSpan.textContent = displayVal;
            valSpan.title = displayVal;
        }
    }
};

frappe.listview_settings['Lead'] = {
    add_fields: ['mobile_no', 'title', 'company', 'status', 'email_id', 'city', 'state', 'country', 'territory', 'lead_name', 'smart_contact_details', 'smart_contact_summary', 'custom_search_index', 'lead_owner', 'type', 'request_type'],

    formatters: {
        smart_contact_summary: function (value, doc) {
            let contacts = [];
            if (doc.smart_contact_details) {
                if (typeof doc.smart_contact_details === 'string') {
                    try { contacts = JSON.parse(doc.smart_contact_details); } catch (e) { contacts = []; }
                } else if (Array.isArray(doc.smart_contact_details)) {
                    contacts = doc.smart_contact_details;
                }
            }

            // Fallback for empty contacts but existing value string (legacy/simple)
            if (contacts.length === 0 && value) {
                let parts = value.split('|').map(p => p.trim());
                contacts = parts.map(p => ({
                    type: 'Other', value: p, country_code: window.apex_crm_list.guess_country_code(p)
                }));
            }

            if (contacts.length === 0) return value || ''; // Fallback to raw value if nothing parsed

            // Logic to pick primary (Mobile/Phone first)
            let primaryIdx = contacts.findIndex(c => ['Mobile', 'Phone'].includes(c.type));
            if (primaryIdx === -1) primaryIdx = 0;
            let c0 = contacts[primaryIdx];
            let val0 = c0.value || '';
            let type0 = c0.type || '';
            let countryCode0 = c0.country_code || '';
            let socialIcon0 = window.apex_crm_list.get_icon_for_type(type0);
            let displayVal = val0.replace(/[📱☎️📧📍🌐🏠💬]/g, '').trim();
            if (countryCode0 && !socialIcon0) {
                let normalizedCC = countryCode0.trim();
                if (!normalizedCC.startsWith('+')) normalizedCC = '+' + normalizedCC;
                if (!displayVal.startsWith(normalizedCC)) {
                    displayVal = displayVal.replace(/^\+\d{1,4}\s*/, '').trim();
                    displayVal = normalizedCC + displayVal;
                }
            }
            let countryCodeHtml0 = socialIcon0 || '';

            let optionsHtml = contacts.map((c, i) => {
                return `<option value="${i}" ${i === primaryIdx ? 'selected' : ''}>${c.type}: ${c.value}</option>`;
            }).join('');
            let contactsJson = encodeURIComponent(JSON.stringify(contacts));

            let linkHtml = '';
            if (socialIcon0) {
                let href = '#';
                // Simple link generation logic (expand if needed)
                if (val0.startsWith('http')) href = val0;
                else if (type0 === 'Telegram' && val0.startsWith('@')) href = `https://t.me/${val0.substring(1)}`;

                if (href !== '#') {
                    linkHtml = `<a href="${href}" target="_blank" onclick="event.stopPropagation();" style="text-decoration: none; display: inline-flex; align-items: center; gap: 6px; cursor: pointer;">${countryCodeHtml0} <span style="font-weight: 400; color: #333; font-size: 13px;">${displayVal}</span></a>`;
                }
            }

            return `
            <div class="contact-switcher-widget-list" style="display:flex; align-items:center;">
                 <div class="switcher-display" style="position: relative; background: transparent; border: 1px solid transparent; border-radius: 4px; padding: 2px 4px; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; max-width: 300px;">
                        ${linkHtml || `<span class="sw-flag">${countryCodeHtml0}</span><span class="sw-value" style="font-weight: 400; color: #333; font-size: 13px;">${displayVal}</span>`}
                        <i class="fa fa-caret-down" style="color: #888; font-size: 10px; margin-left: 4px;"></i>
                        <select class="switcher-select"
                            onchange="window.apex_crm_list.handle_switch(this)"
                            onclick="event.stopPropagation();"
                            data-contacts="${contactsJson}"
                            style="position: absolute; top:0; left:0; width: 100%; height: 100%; opacity: 0; cursor: pointer;">
                            ${optionsHtml}
                        </select>
                 </div>
            </div>`;
        }
    },

    onload: function (listview) {
        // Mobile Card View - Initial Load
        // Ensure strictly called after standard load
        setTimeout(() => setupLeadCardView(listview), 100);

        // Dynamic Resize Handler (Debounced)
        if (!window.lead_list_resize_observer) {
            let resizeTimer;
            window.lead_list_resize_observer = function () {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => {
                    setupLeadCardView(listview);
                }, 200);
            };
            $(window).on('resize', window.lead_list_resize_observer);
        }

        // Apex Buttons (Restored Full Logic)
        setupApexCRMButtons(listview);

        // Universal Search (Desktop & Mobile)
        setupUniversalSearchBar(listview);
    },

    refresh: function (listview) {
        // Mobile Card View - Refresh
        // Use timeout to ensure it overrides any framework reset
        setTimeout(() => {
            setupLeadCardView(listview);
            // Ensure buttons are present on refresh too
            setupApexCRMButtons(listview);
            // Ensure Search Bar is present
            setupUniversalSearchBar(listview);
        }, 100);
    }
};

// ... (existing code) ...

// -------------------------------------------------------------------------------- //
//                       APEX CRM BUTTONS LOGIC                                     //
// -------------------------------------------------------------------------------- //

function setupApexCRMButtons(listview) {
    if (!listview || !listview.page) return;

    const group_label = __('Apex CRM');

    // 1. Fetch permissions (async, non-blocking)
    frappe.call({
        method: 'apex_crm.api.get_apex_crm_button_permissions',
        callback: function (r) {
            if (!r.message || !listview || !listview.page) return;

            let permissions = r.message || {};
            // Force enable for now to fix missing buttons issue
            permissions.export_import = true;
            permissions.duplicate_manager = true;

            let actions = [];

            // Export/Import Manager
            if (permissions.export_import) {
                actions.push({
                    label: __('Export/Import Manager'),
                    action: function () { frappe.set_route('exportimportmanager'); }
                });
            }

            // Duplicate Manager
            if (permissions.duplicate_manager) {
                actions.push({
                    label: __('Duplicate Manager'),
                    action: function () { frappe.set_route('duplicate-manager'); }
                });
            }

            // Data Migration Manager
            if (permissions.migrate_contacts) {
                actions.push({
                    label: __('Data Migration Manager'),
                    action: function () { frappe.set_route('datamigrationmanager'); }
                });
            }

            // 3. Render Buttons
            if (actions.length > 0 && listview.page) {
                // Clear potential duplicates first
                const existing_group = listview.page.inner_toolbar.find(`[data-label="${group_label}"]`);
                if (existing_group.length) {
                    listview.page.remove_inner_button(group_label);
                }

                // Add all buttons in one batch
                actions.forEach(item => {
                    listview.page.add_inner_button(item.label, item.action, group_label);
                });

                // Fix Z-Index for dropdown
                $(document).on('show.bs.dropdown', `.btn-group:has([data-label="${group_label}"])`, function () {
                    const $dropdownMenu = $(this).find('.dropdown-menu');
                    if ($dropdownMenu.length) {
                        $dropdownMenu.css({ 'z-index': '99999', 'position': 'absolute' });
                    }
                });
            }
        }
    });
}

// -------------------------------------------------------------------------------- //
//                               APEX CRM MOBILE CARD LOGIC                         //
// -------------------------------------------------------------------------------- //

// HELPER: Route with specific filters (supports Child Table)
window.apex_crm_route_to_list = function (doctype, filters_obj) {
    frappe.route_options = filters_obj;
    frappe.set_route('List', doctype);
};

// HELPER: Route to Prospects (Smart Fetch)
window.apex_crm_route_to_prospects = function (lead_name) {
    frappe.call({
        method: 'apex_crm.api.get_linked_prospects',
        args: { lead: lead_name },
        callback: function (r) {
            const list = r.message || [];
            if (list.length) {
                const names = list.map(p => p.name);
                frappe.route_options = { 'name': ['in', names] };
                frappe.set_route('List', 'Prospect');
            } else {
                frappe.msgprint(__('No prospects found for this lead.'));
            }
        }
    });
};

// HELPER: Quick Add
window.apex_crm_quick_add = function (lead_name) {
    const d = new frappe.ui.Dialog({
        title: __('Quick Add'),
        fields: [
            { label: 'Type', fieldname: 'action_type', fieldtype: 'Select', options: 'Log Call\nNew Task\nNew Event\nNew Note', reqd: 1 },
            { label: 'Details', fieldname: 'details', fieldtype: 'Small Text' },
            { "fieldname": "date", "fieldtype": "Date", "label": "Due Date", "default": frappe.datetime.get_today() }
        ],
        primary_action_label: 'Create',
        primary_action(values) {
            if (values.action_type === 'New Task') {
                frappe.model.with_doctype('ToDo', function () {
                    var doc = frappe.model.get_new_doc('ToDo');
                    doc.description = values.details || 'Follow up with ' + lead_name;
                    doc.date = values.date;
                    doc.reference_type = 'Lead';
                    doc.reference_name = lead_name;
                    frappe.set_route('Form', 'ToDo', doc.name);
                    d.hide();
                });
            } else if (values.action_type === 'Log Call') {
                // Route to Interaction Log? Or just simple log?
                // Let's route to Interaction Log list for now or open a simple dialog?
                // Simple:
                frappe.new_doc('Apex Interaction Log', { parent: lead_name, parenttype: 'Lead', summary: values.details });
                d.hide();
            } else if (values.action_type === 'New Note') {
                frappe.call({ method: 'apex_crm.api.add_lead_note', args: { lead: lead_name, content: values.details }, callback: () => { d.hide(); frappe.show_alert('Note Added'); if (window.global_listview_ref) window.apex_crm_fetch_data(window.global_listview_ref.data); } });
            } else {
                d.hide();
            }
        }
    });
    d.show();
};

function setupLeadCardView(listview) {
    // 0. MOBILE GUARD (SAFE CHECK)
    const is_mobile = () => {
        // Return true only for smaller screens (Tablets/Phones)
        // Check both window width and user agent to be safe on mobile devices
        return window.innerWidth <= 992 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    };

    // Explicitly handle Desktop/Mobile visibility
    if (!is_mobile()) {
        if (listview.$result) listview.$result.show();
        $('.list-row-head').show();
        $('#lead-cards-container').hide();
        $('#mobile-layout-container').hide(); // Hide our custom mobile container

        // Ensure standard list view is fully visible
        $('.list-row-container').show();

        // RESTORE FILTERS TO DESKTOP LOCATION
        // If filters were moved to #mobile-layout-container, we must put them back
        const $filters = $('.standard-filter-section');
        const $pageForm = $('.page-form');
        const $mobileContainer = $('#mobile-layout-container');
        const $searchBar = $('.apex-universal-search');

        // 1. Recover Filters
        if ($filters.length && $mobileContainer.length && $mobileContainer[0].contains($filters[0])) {
            const $base = $('.page-form');
            if ($base.length) $base.prepend($filters);
            else $(listview.wrapper).prepend($filters);
        }
        $filters.show();

        // 2. Recover Search Bar (CRITICAL FIX for Desktop)
        if ($searchBar.length) {
            // If search bar is in mobile container, move it out
            if ($mobileContainer.length && $mobileContainer[0].contains($searchBar[0])) {
                $(listview.wrapper).prepend($searchBar);
            }
            // Ensure search bar is visible and positioned correctly
            $searchBar.show().css({
                'display': 'flex',
                'visibility': 'visible',
                'opacity': '1'
            });

            // Position in .frappe-list if not already there
            const $frappeList = $('.frappe-list').first();
            if ($frappeList.length && !$frappeList[0].contains($searchBar[0])) {
                $frappeList.prepend($searchBar);
            }
        } else {
            // Search bar doesn't exist - create it
            setupUniversalSearchBar(listview);
        }

        // Force re-render of buttons if missing
        if (listview.page) {
            setupApexCRMButtons(listview);
        }
        return;
    }

    // --- MOBILE VIEW LOGIC STARTS HERE ---

    // Clean up Desktop Artifacts for Mobile
    $('.list-row-filters').hide(); // Hides ID/Title input row

    // CRITICAL: Inject CSS to completely hide ID/Title fields in mobile
    const mobileIDFieldCSS = 'apex-mobile-id-field-hide';
    if ($(`#${mobileIDFieldCSS}`).length === 0) {
        $('head').append(`
            <style id="${mobileIDFieldCSS}">
                @media (max-width: 992px) {
                    .list-row-filters,
                    .list-row-filters *,
                    .list-row-head input,
                    .list-row-head .form-control {
                        display: none !important;
                        visibility: hidden !important;
                        opacity: 0 !important;
                        position: absolute !important;
                        left: -9999px !important;
                        width: 0 !important;
                        height: 0 !important;
                        overflow: hidden !important;
                        pointer-events: none !important;
                        z-index: -9999 !important;
                    }
                }
            </style>
        `);
    }

    // CRITICAL: Prevent ID/Title fields from receiving input in mobile
    // Disable and hide ID/Title fields completely to prevent text from appearing there
    const disableIDFields = () => {
        // Disable all filter inputs (ID, Title, etc.)
        const $idFields = $('.list-row-filters input, .list-row-head input');
        $idFields.prop('disabled', true)
            .attr('readonly', true)
            .attr('tabindex', '-1')
            .css({
                'pointer-events': 'none',
                'opacity': '0',
                'position': 'absolute',
                'left': '-9999px',
                'width': '0',
                'height': '0',
                'overflow': 'hidden',
                'display': 'none',
                'visibility': 'hidden'
            })
            .off('focus blur input keydown keypress keyup change')
            .val('')
            .blur();
    };

    // Disable immediately
    disableIDFields();

    // Mobile Input Safety
    // Disable inputs initially
    $('.list-row-filters input, .list-row-head input').prop('disabled', true).hide();



    // 1. DATA FETCHING
    window.apex_crm_fetch_data = function (leads) {
        if (!leads || !leads.length) return;
        const lead_names = leads.map(d => d.name);
        frappe.call({
            method: 'apex_crm.api.get_leads_dashboard_data_batch',
            args: { leads: lead_names },
            callback: function (r) {
                if (r.message) {
                    Object.keys(r.message).forEach(lead_name => {
                        const data = r.message[lead_name];
                        const $card = $(`#lead-card-${lead_name}`);
                        if ($card.length) {
                            $card.find('.count-notes').text(data.notes || 0);
                            $card.find('.count-tasks').text(data.tasks || 0);
                            $card.find('.count-events').text(data.events || 0);
                            $card.find('.count-quotes').text(data.quotations || 0);
                            $card.find('.count-prospects').text(data.prospects || 0);
                            $card.find('.count-opportunities').text(data.opportunities || 0);
                            $card.find('.count-customers').text(data.customers || 0);

                            const $interaction = $card.find('.latest-interaction-box');
                            $interaction.find('.interaction-count-badge').remove();
                            if (data.interaction_count && data.interaction_count > 0) {
                                $interaction.append(`<span class="interaction-count-badge" style="background:#e5e7eb; padding:2px 6px; border-radius:10px; font-size:10px; margin-left:auto;">${data.interaction_count}</span>`);
                            }

                            if (data.last_interaction) {
                                let type_html = `<span style="font-weight:600; color:#111827;">${data.last_interaction.type}</span>`;
                                let date_html = `<span style="font-size:10px; color:#6b7280;">${frappe.datetime.str_to_user(data.last_interaction.timestamp)}</span>`;
                                let summary_text = data.last_interaction.summary
                                    ? `<div style="font-size:12px; color:#4b5563; margin-top:2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${data.last_interaction.summary}</div>`
                                    : `<div style="font-size:11px; color:#9ca3af; font-style:italic; margin-top:2px;">No summary</div>`;

                                $interaction.find('.interaction-text').html(`
                                    <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                                        ${type_html}
                                        ${date_html}
                                    </div>
                                    ${summary_text}
                                `);
                            }
                        }
                    });
                }
            }
        });
    };

    // 2. NOTES DIALOG (CLASSIC)
    window.apex_crm_show_notes = function (lead_name) {
        const d = new frappe.ui.Dialog({
            title: __('Notes for ' + lead_name),
            fields: [{ fieldname: 'notes_html', fieldtype: 'HTML' }],
            primary_action_label: __('Add New Note'),
            primary_action() {
                const d2 = new frappe.ui.Dialog({ title: __('Add Note'), fields: [{ label: 'Content', fieldname: 'content', fieldtype: 'Text Editor', reqd: 1 }], primary_action_label: __('Save'), primary_action(v) { } });
                d2.show();
                d2.set_primary_action('Save', function () {
                    const values = d2.get_values(); if (!values) return;
                    frappe.call({
                        method: 'apex_crm.api.add_lead_note',
                        args: { lead: lead_name, content: values.content },
                        callback: function (r) {
                            if (!r.exc) {
                                d2.hide();
                                refresh_notes_list();
                                frappe.show_alert({ message: __('Note Added'), indicator: 'green' });
                                if (window.global_listview_ref) {
                                    setTimeout(() => {
                                        window.global_listview_ref.refresh();
                                    }, 500);
                                }
                            }
                        }
                    });
                });
            }
        });
        const refresh_notes_list = () => {
            d.fields_dict.notes_html.$wrapper.html('<div class="text-center text-muted p-3">Loading...</div>');
            frappe.call({
                method: 'apex_crm.api.get_lead_notes', args: { lead: lead_name }, callback: function (r) {
                    const notes = r.message || [];
                    let html = '<div class="notes-list" style="max-height:60vh; overflow-y:auto; padding:10px;">';
                    if (notes.length === 0) html += '<div class="text-center text-muted p-4">No notes found</div>';
                    else {
                        notes.forEach(n => {
                            html += `<div class="note-item" style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:12px; margin-bottom:10px;">
                                    <div style="display:flex; justify-content:space-between; margin-bottom:6px;"><strong style="font-size:13px; color:#1f2937;">${n.title || 'Note'}</strong><span style="font-size:11px; color:#6b7280;">${frappe.datetime.str_to_user(n.added_on || n.modified)}</span></div>
                                    <div style="font-size:12px; color:#4b5563;">${n.content}</div><div style="font-size:10px; color:#9ca3af; margin-top:6px;">By ${n.owner}</div></div>`;
                        });
                    }
                    html += '</div>'; d.fields_dict.notes_html.$wrapper.html(html);
                }
            });
        };
        d.show(); refresh_notes_list();
    }

    // 3. INTERACTION HISTORY DIALOG (NEW)
    window.apex_crm_show_interaction_history = function (lead_name) {
        const d = new frappe.ui.Dialog({ title: __('Interaction History: ' + lead_name), fields: [{ fieldname: 'history_html', fieldtype: 'HTML' }] });
        const refresh_history = () => {
            d.fields_dict.history_html.$wrapper.html('<div class="text-center text-muted p-3">Loading...</div>');
            frappe.call({
                method: 'apex_crm.api.get_lead_interaction_history',
                args: { lead: lead_name },
                callback: function (r) {
                    const logs = r.message || [];
                    let html = '<div class="history-list" style="max-height:60vh; overflow-y:auto; padding:10px;">';
                    if (logs.length === 0) html += '<div class="text-center text-muted p-4">No interactions found</div>';
                    else {
                        logs.forEach(log => {
                            let icon = 'circle';
                            if (log.type === 'Call') icon = 'phone'; else if (log.type === 'WhatsApp') icon = 'whatsapp'; else if (log.type === 'SMS') icon = 'comment';
                            html += `<div class="history-item" style="border-bottom:1px solid #f3f4f6; padding:10px 0;"><div style="display:flex; justify-content:space-between;"><div style="display:flex; align-items:center;"><div style="width:24px; text-align:center; margin-right:8px; color:#6b7280;"><i class="fa fa-${icon}"></i></div><div><div style="font-size:13px; font-weight:600; color:#1f2937;">${log.type} <span style="font-weight:normal; color:#6b7280;">• ${log.status}</span></div><div style="font-size:12px; color:#4b5563;">${log.summary || 'No summary'}</div></div></div><div style="font-size:11px; color:#9ca3af; white-space:nowrap; margin-left:8px;">${frappe.datetime.str_to_user(log.timestamp)}<div style="text-align:right;">${log.user}</div></div></div></div>`;
                        });
                    }
                    html += '</div>'; d.fields_dict.history_html.$wrapper.html(html);
                }
            });
        };
        d.show(); refresh_history();
    };

    // 4. LOG INTERACTION DIALOG
    window.apex_crm_log_interaction_dialog = function (lead_name, type, value) {
        // Trigger the actual action immediately (Call/WhatsApp)
        if (value) {
            if (type === 'Call') window.location.href = `tel:${value}`;
            else if (type === 'WhatsApp') window.open(`https://wa.me/${value}`, '_blank');
            else if (type === 'SMS') window.location.href = `sms:${value}`;
            else if (type === 'Email') window.location.href = `mailto:${value}`;
        }

        // Show Log Dialog after a short delay
        setTimeout(() => {
            const d = new frappe.ui.Dialog({
                title: __('Log ' + type),
                fields: [
                    { label: 'Status', fieldname: 'status', fieldtype: 'Select', options: 'Attempted\nConnected\nBusy\nNo Answer\nLeft Message\nScheduled\nCompleted', default: 'Attempted', reqd: 1 },
                    { label: 'Duration', fieldname: 'duration', fieldtype: 'Duration', description: 'e.g. 5m 30s' },
                    { label: 'Summary / Notes', fieldname: 'summary', fieldtype: 'Small Text' }
                    // Voice Note omitted until DB column issues resolved purely
                ],
                primary_action_label: __('Save Log'),
                primary_action(values) {
                    frappe.call({
                        method: 'apex_crm.api.log_interaction',
                        args: {
                            lead: lead_name,
                            type: type,
                            status: values.status,
                            summary: values.summary,
                            duration: values.duration
                        },
                        callback: function (r) {
                            if (!r.exc) {
                                frappe.show_alert({ message: __('Interaction Logged'), indicator: 'green' });
                                d.hide();
                                if (window.apex_crm_fetch_data && window.global_listview_ref) window.apex_crm_fetch_data(window.global_listview_ref.data);
                            }
                        }
                    });
                }
            });
            d.show();
        }, 1000);
    };

    // 5. HELPER DIALOGS FOR LINKED DOCS (Mobile Friendly)

    // TASKS
    window.apex_crm_show_tasks = function (lead) {
        const d = new frappe.ui.Dialog({ title: __('Tasks: ' + lead), fields: [{ fieldname: 'html', fieldtype: 'HTML' }] });
        d.fields_dict.html.$wrapper.html('<div class="text-center text-muted p-3">Loading...</div>');
        frappe.call({
            method: 'apex_crm.api.get_linked_tasks', args: { lead: lead },
            callback: (r) => {
                const data = r.message || [];
                let html = '<div class="list-group list-group-flush" style="max-height:60vh; overflow-y:auto;">';
                if (!data.length) html += '<div class="text-center text-muted p-4">No open tasks</div>';
                else {
                    data.forEach(item => {
                        html += `<div class="list-group-item" onclick="frappe.set_route('Form', 'ToDo', '${item.name}')" style="cursor:pointer;">
                            <div class="d-flex w-100 justify-content-between">
                                <h6 class="mb-1">${item.description || 'No Description'}</h6>
                                <small>${frappe.datetime.str_to_user(item.date)}</small>
                            </div>
                            <small class="text-muted">Status: ${item.status}</small>
                        </div>`;
                    });
                }
                html += '</div>';

                // Add Create Button
                html += `<div style="padding:10px; border-top:1px solid #eee; text-align:center;">
                    <button class="btn btn-sm btn-primary" onclick="frappe.new_doc('ToDo', {reference_type:'Lead', reference_name:'${lead}'})">Create Task</button>
                </div>`;

                d.fields_dict.html.$wrapper.html(html);
            }
        });
        d.show();
    };

    // EVENTS
    window.apex_crm_show_events = function (lead) {
        const d = new frappe.ui.Dialog({ title: __('Events: ' + lead), fields: [{ fieldname: 'html', fieldtype: 'HTML' }] });
        d.fields_dict.html.$wrapper.html('<div class="text-center text-muted p-3">Loading...</div>');
        frappe.call({
            method: 'apex_crm.api.get_linked_events', args: { lead: lead },
            callback: (r) => {
                const data = r.message || [];
                let html = '<div class="list-group list-group-flush" style="max-height:60vh; overflow-y:auto;">';
                if (!data.length) html += '<div class="text-center text-muted p-4">No upcoming events</div>';
                else {
                    data.forEach(item => {
                        html += `<div class="list-group-item" onclick="frappe.set_route('Form', 'Event', '${item.name}')" style="cursor:pointer;">
                            <div class="d-flex w-100 justify-content-between">
                                <h6 class="mb-1">${item.subject}</h6>
                                <small>${frappe.datetime.str_to_user(item.starts_on)}</small>
                            </div>
                            <small>${item.event_type}</small>
                        </div>`;
                    });
                }
                html += '</div>';
                // Add Create Button
                html += `<div style="padding:10px; border-top:1px solid #eee; text-align:center;">
                    <button class="btn btn-sm btn-primary" onclick="frappe.new_doc('Event')">Create Event</button>
                </div>`;
                d.fields_dict.html.$wrapper.html(html);
            }
        });
        d.show();
    };

    // QUOTES
    window.apex_crm_show_quotes = function (lead) {
        const d = new frappe.ui.Dialog({ title: __('Quotations: ' + lead), fields: [{ fieldname: 'html', fieldtype: 'HTML' }] });
        d.fields_dict.html.$wrapper.html('<div class="text-center text-muted p-3">Loading...</div>');
        frappe.call({
            method: 'apex_crm.api.get_linked_quotations', args: { lead: lead },
            callback: (r) => {
                const data = r.message || [];
                let html = '<div class="list-group list-group-flush" style="max-height:60vh; overflow-y:auto;">';
                if (!data.length) html += '<div class="text-center text-muted p-4">No quotations found</div>';
                else {
                    data.forEach(item => {
                        html += `<div class="list-group-item" onclick="frappe.set_route('Form', 'Quotation', '${item.name}')" style="cursor:pointer;">
                            <div class="d-flex w-100 justify-content-between">
                                <h6 class="mb-1">${item.name}</h6>
                                <small>${formatCurrency(item.grand_total, item.currency)}</small>
                            </div>
                            <small class="text-muted">${item.status}</small>
                        </div>`;
                    });
                }
                html += '</div>';
                // Add Create Button
                html += `<div style="padding:10px; border-top:1px solid #eee; text-align:center;">
                    <button class="btn btn-sm btn-primary" onclick="frappe.new_doc('Quotation', {quotation_to:'Lead', party_name:'${lead}'})">Create Quote</button>
                </div>`;
                d.fields_dict.html.$wrapper.html(html);
            }
        });
        d.show();
    };

    // PROSPECTS
    window.apex_crm_show_prospects = function (lead) {
        const d = new frappe.ui.Dialog({ title: __('Prospects: ' + lead), fields: [{ fieldname: 'html', fieldtype: 'HTML' }] });
        d.fields_dict.html.$wrapper.html('<div class="text-center text-muted p-3">Loading...</div>');
        frappe.call({
            method: 'apex_crm.api.get_linked_prospects', args: { lead: lead },
            callback: (r) => {
                const data = r.message || [];
                let html = '<div class="list-group list-group-flush" style="max-height:60vh; overflow-y:auto;">';
                if (!data.length) html += '<div class="text-center text-muted p-4">No linked prospects</div>';
                else {
                    data.forEach(item => {
                        html += `<div class="list-group-item" onclick="frappe.set_route('Form', 'Prospect', '${item.name}')" style="cursor:pointer;">
                            <h6 class="mb-1">${item.company_name || item.name}</h6>
                            <small>${item.industry || ''}</small>
                        </div>`;
                    });
                }
                html += '</div>';

                // Add Create Button
                html += `<div style="padding:10px; border-top:1px solid #eee; text-align:center;">
                    <button class="btn btn-sm btn-primary" onclick="frappe.new_doc('Prospect')">Create Prospect</button>
                </div>`;

                d.fields_dict.html.$wrapper.html(html);
            }
        });
        d.show();
    };

    // OPPORTUNITIES
    window.apex_crm_show_opportunities = function (lead) {
        const d = new frappe.ui.Dialog({ title: __('Opportunities: ' + lead), fields: [{ fieldname: 'html', fieldtype: 'HTML' }] });
        d.fields_dict.html.$wrapper.html('<div class="text-center text-muted p-3">Loading...</div>');
        frappe.call({
            method: 'apex_crm.api.get_linked_opportunities', args: { lead: lead },
            callback: (r) => {
                const data = r.message || [];
                let html = '<div class="list-group list-group-flush" style="max-height:60vh; overflow-y:auto;">';
                if (!data.length) html += '<div class="text-center text-muted p-4">No opportunities found</div>';
                else {
                    data.forEach(item => {
                        html += `<div class="list-group-item" onclick="frappe.set_route('Form', 'Opportunity', '${item.name}')" style="cursor:pointer;">
                            <div class="d-flex w-100 justify-content-between">
                                <h6 class="mb-1">${item.name}</h6>
                                <small>${formatCurrency(item.opportunity_amount, item.currency)}</small>
                            </div>
                            <small class="text-muted">${item.status}</small>
                        </div>`;
                    });
                }
                html += '</div>';
                // Add Create Button
                html += `<div style="padding:10px; border-top:1px solid #eee; text-align:center;">
                    <button class="btn btn-sm btn-primary" onclick="frappe.new_doc('Opportunity', {opportunity_from:'Lead', party_name:'${lead}'})">Create Opportunity</button>
                </div>`;
                d.fields_dict.html.$wrapper.html(html);
            }
        });
        d.show();
    };

    // CUSTOMERS
    window.apex_crm_show_customers = function (lead) {
        const d = new frappe.ui.Dialog({ title: __('Customers: ' + lead), fields: [{ fieldname: 'html', fieldtype: 'HTML' }] });
        d.fields_dict.html.$wrapper.html('<div class="text-center text-muted p-3">Loading...</div>');
        frappe.call({
            method: 'apex_crm.api.get_linked_customers', args: { lead: lead },
            callback: (r) => {
                const data = r.message || [];
                let html = '<div class="list-group list-group-flush" style="max-height:60vh; overflow-y:auto;">';
                if (!data.length) html += '<div class="text-center text-muted p-4">No linked customers</div>';
                else {
                    data.forEach(item => {
                        html += `<div class="list-group-item" onclick="frappe.set_route('Form', 'Customer', '${item.name}')" style="cursor:pointer;">
                            <h6 class="mb-1">${item.customer_name}</h6>
                            <small class="text-muted">${item.customer_group}</small>
                        </div>`;
                    });
                }
                html += '</div>';
                d.fields_dict.html.$wrapper.html(html);
            }
        });
        d.show();
    };

    // Currency Flag Helper
    const formatCurrency = (amount, currency) => {
        return (amount || 0).toLocaleString('en-US', { style: 'currency', currency: currency || 'EGP' });
    };


    const formatDateTime = (dateStr) => { if (!dateStr) return ''; const d = new Date(dateStr); const now = new Date(); const diff = (now - d) / 1000; const timeString = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }); if (diff < 86400 && d.getDate() === now.getDate()) return `Today ${timeString}`; else if (diff < 172800 && d.getDate() === now.getDate() - 1) return `Yesterday ${timeString}`; return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' ' + timeString; };
    const renderMobileWithFlag = (doc) => { const mobile = doc.mobile_no || doc.phone; if (!mobile) return '<span style="color:#9ca3af">No Mobile</span>'; let countryCode = 'eg'; if ((mobile.startsWith('+20') || mobile.startsWith('01')) && mobile.length > 9) countryCode = 'eg'; const flags = { 'eg': '🇪🇬' }; const flag = flags[countryCode] || '🏳️'; return `<span style="margin-right:6px; font-size:16px;">${flag}</span><span>${mobile}</span>`; };

    // 5. CHANGE STATUS POPOVER (Direct Dropdown)
    window.apex_crm_show_status_popover = function (event, lead_name, current_status) {
        // Close any existing popovers
        $('.apex-status-popover').remove();

        const statusColors = {
            'Open': 'red',
            'Replied': 'blue',
            'Interested': 'yellow',
            'Converted': 'green',
            'Lost Quotation': 'black',
            'Do Not Contact': 'red',
            'Lead': 'gray',
            'Opportunity': 'orange'
        };
        const statuses = Object.keys(statusColors);

        // Calculate Position
        const target = $(event.currentTarget);
        const offset = target.offset();
        const height = target.outerHeight();

        // Create Popover HTML
        let popoverHtml = `
            <div class="apex-status-popover" style="
                position: absolute;
                top: ${offset.top + height + 5}px;
                left: ${offset.left - 50}px; /* Adjust slightly left alignment */
                min-width: 160px;
                background: white;
                border: 1px solid #e5e7eb;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                border-radius: 8px;
                padding: 6px;
                z-index: 1000;
                display: flex;
                flex-direction: column;
                gap: 4px;
            ">
        `;

        statuses.forEach(status => {
            const colorClass = statusColors[status] || 'gray';
            const isActive = status === current_status;
            const activeStyle = isActive ? 'background-color: #f3f4f6;' : '';

            popoverHtml += `
                <div onclick="window.apex_crm_update_status_submit('${lead_name}', '${status}', this)"
                     class="popover-item status-${colorClass}"
                     style="
                        padding: 8px 12px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 13px;
                        font-weight: 500;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        ${activeStyle}
                        color: #111827; 
                        transition: background-color 0.15s;
                     "
                     onmouseover="this.style.backgroundColor='#f9fafb'"
                     onmouseout="this.style.backgroundColor='${isActive ? '#f3f4f6' : 'transparent'}'"
                >
                    <span class="status-dot" style="width:8px; height:8px; border-radius:50%; background-color: var(--text-color-${colorClass}, #6b7280); margin-right:8px; display:inline-block;"></span>
                    ${status}
                    ${isActive ? '<i class="fa fa-check" style="color:#111827; margin-left: auto;"></i>' : ''}
                </div>
            `;
        });
        popoverHtml += '</div>';

        // Append to body to avoid clipping
        $('body').append(popoverHtml);

        // Click Outside to Close
        setTimeout(() => {
            $(document).on('click.apex_popover', function (e) {
                if (!$(e.target).closest('.apex-status-popover').length && !$(e.target).closest(target).length) {
                    $('.apex-status-popover').remove();
                    $(document).off('click.apex_popover');
                }
            });
        }, 100);
    };

    // Helper for Update
    window.apex_crm_update_status_submit = function (lead, new_status, btn) {
        if ($(btn).hasClass('processing')) return;
        $(btn).addClass('processing').css('opacity', '0.6');

        frappe.call({
            method: 'apex_crm.api.update_lead_status',
            args: {
                lead: lead,
                status: new_status
            },
            callback: function (r) {
                if (!r.exc) {
                    frappe.show_alert({ message: __('Status Updated'), indicator: 'green' });
                    $('.apex-status-popover').remove();
                    if (window.apex_crm_fetch_data && window.global_listview_ref) {
                        setTimeout(() => {
                            window.global_listview_ref.refresh();
                        }, 500);
                    }
                }
                $(btn).removeClass('processing').css('opacity', '1');
            }
        });
    };


    // CREATE CARD (With History Dialog Click)
    const createPremiumCard = (doc) => {
        const lead_name = doc.lead_name || doc.name;
        const status = doc.status || 'Open';
        const title = doc.title || '';
        const territory = doc.territory || '';
        const city = doc.city || doc.state || '';
        const mobile = doc.mobile_no || doc.phone || '';

        // --- RESTORE PERSISTED STATE ---
        let currentVal = mobile;
        let currentType = mobile ? 'Mobile' : '';
        let currentIcon = mobile ? '📱' : '📞';

        if (window.apex_crm_selected_contacts && window.apex_crm_selected_contacts[doc.name]) {
            const saved = window.apex_crm_selected_contacts[doc.name];
            currentVal = saved.value;
            currentType = saved.type;
            currentIcon = saved.icon;
        }

        // Determine Button Visibility based on Current Type
        const t = (currentType || '').toLowerCase();
        const showEmail = t.includes('email');
        const showFb = t.includes('facebook');
        const showWeb = t.includes('website');
        const showMap = t.includes('address') || t.includes('location');
        const showMobile = !showEmail && !showFb && !showWeb && !showMap; // Default Group

        // Truncate for Display
        let displayText = currentVal || 'Select Contact';
        if (displayText.length > 25 && (displayText.includes('http') || showFb || showWeb)) {
            displayText = displayText.substring(0, 25) + '...';
        }

        // Icon HTML
        let iconHtml = `<span class="flag-icon" style="margin-right:6px;">${currentIcon}</span>`;
        if (currentIcon && currentIcon.startsWith('fa-')) {
            iconHtml = `<span class="flag-icon" style="margin-right:6px;"><i class="fa ${currentIcon}"></i></span>`;
        }

        // 6. TOGGLE CONTACT DETAILS (INTERACTIVE)


        // 7. SELECT CONTACT HANDLER

        // 7. SELECT CONTACT HANDLER
        window.apex_crm_select_contact = function (lead_name, type, value, icon) {
            const $card = $(`#lead-card-${lead_name}`);
            const $phoneDisplay = $card.find('.phone-text');
            const $flag = $card.find('.flag-icon');

            // PERSIST SELECTION (Crucial for Mobile Refresh)
            if (!window.apex_crm_selected_contacts) window.apex_crm_selected_contacts = {};
            window.apex_crm_selected_contacts[lead_name] = { type: type, value: value, icon: icon };

            // Update Display
            // Truncate long URLs for display
            let displayValue = value;
            if (value && value.length > 25 && (value.includes('http') || type.toLowerCase().includes('facebook') || type.toLowerCase().includes('website'))) {
                displayValue = value.substring(0, 25) + '...';
            }
            $phoneDisplay.text(displayValue);

            // Update Icon
            const iconMap = { 'WhatsApp': '💬', 'Mobile': '📱', 'Phone': '📞', 'Email': '✉️', 'Facebook': 'fa-facebook', 'Website': '🌐', 'Address': '📍', 'Location': '📍' };
            // Use passed icon or map fallback
            let finalIcon = icon;
            if (!finalIcon || finalIcon === 'circle') finalIcon = iconMap[type] || '📞';

            // Handle FA icons in selection display
            if (finalIcon && finalIcon.startsWith('fa-')) {
                $flag.html(`<i class="fa ${finalIcon}"></i>`);
            } else if (finalIcon && !finalIcon.match(/[\u0000-\u007F]/)) {
                $flag.text(finalIcon);
            } else {
                $flag.text('📞'); // default
            }

            // Update Data Current
            $card.attr('data-current-mobile', value);

            // Update Buttons Logic
            const $btns = $card.find('.quick-btns');
            $btns.find('.quick-btn').hide(); // Hide all first
            $btns.find('.btn-add').show(); // Always show add

            const typeLower = (type || '').toLowerCase();

            // EMAIL TYPE
            if (typeLower.includes('email')) {
                $btns.find('.btn-email').attr('onclick', `event.stopPropagation(); window.location.href = 'mailto:${value}';`).show();
            }
            // FACEBOOK TYPE
            else if (typeLower.includes('facebook')) {
                $btns.find('.btn-facebook').attr('onclick', `event.stopPropagation(); window.open('${value.startsWith('http') ? value : 'https://' + value}', '_blank');`).show();
            }
            // WEBSITE TYPE
            else if (typeLower.includes('website')) {
                $btns.find('.btn-website').attr('onclick', `event.stopPropagation(); window.open('${value.startsWith('http') ? value : 'https://' + value}', '_blank');`).show();
            }
            // ADDRESS / LOCATION TYPE
            else if (typeLower.includes('address') || typeLower.includes('location')) {
                $btns.find('.btn-map').attr('onclick', `event.stopPropagation(); window.open('https://maps.google.com/?q=${encodeURIComponent(value)}', '_blank');`).show();
            }
            // PHONE / MOBILE / WHATSAPP TYPE
            else {
                $btns.find('.btn-call').attr('onclick', `event.stopPropagation(); window.apex_crm_log_interaction_dialog('${lead_name}', 'Call', '${value}');`).show();

                // Show/Hide WhatsApp/SMS based on type logic
                if (['Mobile', 'WhatsApp'].includes(type) || !type) {
                    $btns.find('.btn-whatsapp').attr('onclick', `event.stopPropagation(); window.apex_crm_log_interaction_dialog('${lead_name}', 'WhatsApp', '${value}');`).show();
                    $btns.find('.btn-sms').attr('onclick', `event.stopPropagation(); window.apex_crm_log_interaction_dialog('${lead_name}', 'SMS', '${value}');`).show();
                }
            }

            // Close updated popover
            $(`#contact-popover-${lead_name}`).remove();
        };

        // 8. TOGGLE CONTACTS POPOVER
        window.apex_crm_toggle_contacts = function (event, lead_name) {
            event.stopPropagation();
            const $card = $(`#lead-card-${lead_name}`);
            const $container = $card.find('.card-header'); // Anchor to header

            // Close if exists
            if ($(`#contact-popover-${lead_name}`).length) {
                $(`#contact-popover-${lead_name}`).remove();
                return;
            }

            // Fetch Data
            const $btn = $(event.currentTarget);
            const offset = $btn.offset();

            // Create Popover appended to BODY to avoid clipping
            // Position carefully
            const $popover = $(`<div id="contact-popover-${lead_name}" 
                style="position:absolute; top:${offset.top + 38}px; left:${offset.left}px; z-index:9999; background:white; border:1px solid #e5e7eb; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1); border-radius:8px; width:220px; padding:6px;">
                <div class="text-muted" style="font-size:11px; padding:8px;">Loading contacts...</div>
            </div>`);

            $('body').append($popover);

            // Close on outside click
            $(document).one('click', function () {
                $(`#contact-popover-${lead_name}`).remove();
            });

            frappe.call({
                method: 'apex_crm.api.get_lead_contact_details',
                args: { lead: lead_name },
                callback: function (r) {
                    const contacts = r.message || [];
                    $popover.empty(); // Clear loading state

                    if (contacts.length === 0) {
                        $popover.append('<div class="text-muted" style="font-size:11px; padding:8px;">No contacts found</div>');
                    } else {
                        contacts.forEach(c => {
                            // Correct Icon Mapping
                            const typeLower = (c.type || '').toLowerCase();
                            let listIconHtml = '';
                            let displayIcon = '📞';

                            if (typeLower.includes('email')) { listIconHtml = '<span>✉️</span>'; displayIcon = '✉️'; }
                            else if (typeLower.includes('mobile')) { listIconHtml = '<span>📱</span>'; displayIcon = '📱'; }
                            else if (typeLower.includes('phone')) { listIconHtml = '<span>📞</span>'; displayIcon = '📞'; }
                            else if (typeLower.includes('whatsapp')) { listIconHtml = '<span>💬</span>'; displayIcon = '💬'; }
                            else if (typeLower.includes('website')) { listIconHtml = '<span>🌐</span>'; displayIcon = '🌐'; }
                            else if (typeLower.includes('facebook')) { listIconHtml = '<i class="fa fa-facebook"></i>'; displayIcon = 'fa-facebook'; }
                            else if (typeLower.includes('address') || typeLower.includes('location')) { listIconHtml = '<span>📍</span>'; displayIcon = '📍'; }
                            else if (c.icon && c.icon.startsWith('fa-')) { listIconHtml = `<i class="${c.icon}"></i>`; displayIcon = c.icon; }
                            else if (c.icon && !c.icon.includes('-')) { listIconHtml = `<i class="fa fa-${c.icon}"></i>`; displayIcon = c.icon; }
                            else { listIconHtml = '<span>📞</span>'; }

                            // Create jQuery element safely
                            const $item = $(`
                                <div style="padding:8px; border-radius:6px; cursor:pointer; display:flex; align-items:center; gap:8px; border-bottom:1px solid #f3f4f6;">
                                    ${listIconHtml}
                                    <div style="display:flex; flex-direction:column;">
                                        <span style="font-weight:600; font-size:13px; color:#374151;">${c.type}</span>
                                        <span style="font-size:12px; color:#6b7280; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:180px;"></span>
                                    </div>
                                </div>
                            `);

                            // Set text safely to avoid XSS/breaking
                            $item.find('span').last().text(c.value);

                            // Bind logic without string interpolation
                            $item.on('click', function (e) {
                                e.stopPropagation();
                                window.apex_crm_select_contact(lead_name, c.type, c.value, displayIcon);
                            });

                            $popover.append($item);
                        });
                    }
                }
            });
        };

        const initials = frappe.get_abbr(lead_name);
        const last_updated = doc.modified ? formatDateTime(doc.modified) : '';
        // Status Color Mapping (Direct CSS Values)
        const statusColors = {
            'Open': '#dc2626', // Red
            'Replied': '#2563eb', // Blue
            'Interested': '#eab308', // Yellow
            'Converted': '#16a34a', // Green
            'Lost Quotation': '#000000', // Black
            'Do Not Contact': '#dc2626', // Red
            'Lead': '#6b7280', // Gray
            'Opportunity': '#f97316' // Orange
        };
        const statusColorValue = statusColors[status] || '#6b7280';

        return `
            <div class="apex-premium-card" id="lead-card-${doc.name}" data-name="${doc.name}" data-current-mobile="${mobile}" onclick="frappe.set_route('Form', 'Lead', '${doc.name}')">
                <div class="card-header" style="align-items: flex-start;">
                    <div class="card-header-left" style="min-width: 0; flex: 1;">
                        <!-- Avatar Removed as per user request -->
                        <div class="card-info" style="min-width: 0; width: 100%;">
                            <div class="card-name" style="margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; font-weight:700; font-size:15px;">${lead_name}</div>
                            
                            <div class="card-subtext" style="display: flex; flex-direction: row; flex-wrap: wrap; gap: 6px; align-items: center; margin-bottom:4px;">
                                ${(title && title !== lead_name) ? `<span style="font-weight: 500; color: #4b5563; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${title}</span>` : ''}
                                ${title && last_updated ? `<span style="color:#d1d5db; font-size:10px;">•</span>` : ''}
                                ${last_updated ? `<span style="font-size: 11px; color: #6b7280;"><i class="fa fa-clock-o" style="margin-right:2px;"></i>${last_updated}</span>` : ''}
                                ${(last_updated && (territory || city)) ? `<span style="color:#d1d5db; font-size:10px;">•</span>` : ''}
                                ${(territory || city) ? `<span style="font-size: 11px; color: #6b7280;"><i class="fa fa-map-marker" style="margin-right:2px;"></i>${[territory, city].filter(Boolean).join(', ')}</span>` : ''}
                            </div>
                            
                            <!-- New Fields: Owner, Type, Request -->
                            <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:6px; margin-bottom: 2px;">
                                ${doc.lead_owner ? `<span style="background:#f3f4f6; color:#1f2937; border:1px solid #e5e7eb; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:500;">${doc.lead_owner}</span>` : ''}
                                ${doc.type ? `<span style="background:#f3f4f6; color:#1f2937; border:1px solid #e5e7eb; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:500;">${doc.type}</span>` : ''}
                                ${doc.request_type ? `<span style="background:#f3f4f6; color:#1f2937; border:1px solid #e5e7eb; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:500;">${doc.request_type}</span>` : ''}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Status Badge (Clickable) -->
                    <div class="card-status-badge" 
                         onclick="event.stopPropagation(); window.apex_crm_show_status_popover(event, '${doc.name}', '${status}');"
                         style="cursor: pointer; display: flex; align-items: center; gap: 4px; color: ${statusColorValue}; font-weight: 700; font-size: 12px; text-transform: uppercase;">
                        ${status} <i class="fa fa-caret-down" style="opacity: 0.6; font-size: 10px;"></i>
                    </div>
                </div>

                <div class="quick-actions-bar">
                    <!-- Dropdown Trigger Look -->
                    <div class="phone-display" onclick="window.apex_crm_toggle_contacts(event, '${doc.name}')" 
                         style="display:flex; align-items:center; background:#f3f4f6; padding:4px 8px; border-radius:6px; cursor:pointer; border:1px solid #e5e7eb;">
                        ${iconHtml}
                        <span class="phone-text" style="font-weight:600; font-size:13px; color:#374151; margin-right:4px;">${displayText}</span>
                        <i class="fa fa-caret-down" style="color:#6b7280; font-size:11px;"></i>
                    </div>
                
                    <div class="quick-btns" onclick="event.stopPropagation();">
                        <button class="quick-btn btn-add" data-name="${doc.name}" onclick="event.stopPropagation(); window.apex_crm_quick_add('${doc.name}');"><i class="fa fa-plus"></i></button>
                        
                        <!-- Phone Actions -->
                        <button class="quick-btn btn-call" style="${showMobile ? '' : 'display:none;'}" onclick="event.stopPropagation(); window.apex_crm_log_interaction_dialog('${doc.name}', 'Call', '${currentVal}');"><i class="fa fa-phone"></i></button>
                        <button class="quick-btn btn-whatsapp" style="${showMobile ? '' : 'display:none;'}" onclick="event.stopPropagation(); window.apex_crm_log_interaction_dialog('${doc.name}', 'WhatsApp', '${currentVal}');"><i class="fa fa-whatsapp"></i></button>
                        <button class="quick-btn btn-sms" style="${showMobile ? '' : 'display:none;'}" onclick="event.stopPropagation(); window.apex_crm_log_interaction_dialog('${doc.name}', 'SMS', '${currentVal}');"><i class="fa fa-comment"></i></button>
                        
                        <!-- Email Action -->
                         <button class="quick-btn btn-email" style="${showEmail ? '' : 'display:none;'}" onclick="event.stopPropagation(); window.location.href = 'mailto:${currentVal}';"><i class="fa fa-envelope"></i></button>
                         <!-- Website Action -->
                         <button class="quick-btn btn-website" style="${showWeb ? '' : 'display:none;'}" onclick="event.stopPropagation(); window.open('${currentVal.startsWith('http') ? currentVal : 'https://' + currentVal}', '_blank');"><i class="fa fa-globe"></i></button>
                         <!-- Facebook Action -->
                         <button class="quick-btn btn-facebook" style="${showFb ? '' : 'display:none;'}" onclick="event.stopPropagation(); window.open('${currentVal.startsWith('http') ? currentVal : 'https://' + currentVal}', '_blank');"><i class="fa fa-facebook"></i></button>
                         <!-- Map Action -->
                         <button class="quick-btn btn-map" style="${showMap ? '' : 'display:none;'}" onclick="event.stopPropagation(); window.open('https://maps.google.com/?q=${encodeURIComponent(currentVal)}', '_blank');"><i class="fa fa-map-marker"></i></button>
                    </div>
                </div>

                <div class="card-info-body">
                    <div class="info-pill pill-notes" onclick="event.stopPropagation(); window.apex_crm_show_notes('${doc.name}');"><i class="fa fa-sticky-note"></i> Notes <span class="count-notes">0</span></div>
                    <div class="info-pill pill-tasks" onclick="event.stopPropagation(); window.apex_crm_show_tasks('${doc.name}');"><i class="fa fa-check-square"></i> Tasks <span class="count-tasks">0</span></div>
                    
                    <!-- Event: Dialog -->
                    <div class="info-pill pill-events" onclick="event.stopPropagation(); window.apex_crm_show_events('${doc.name}');"><i class="fa fa-calendar"></i> Events <span class="count-events">0</span></div>
                    
                    <div class="info-pill pill-quotes" onclick="event.stopPropagation(); window.apex_crm_show_quotes('${doc.name}');"><i class="fa fa-file-text"></i> Quotes <span class="count-quotes">0</span></div>
                    
                    <!-- Prospect: Dialog -->
                    <div class="info-pill pill-prospects" onclick="event.stopPropagation(); window.apex_crm_show_prospects('${doc.name}');"><i class="fa fa-users"></i> Prosp <span class="count-prospects">0</span></div>
                    
                    <div class="info-pill pill-opportunities" onclick="event.stopPropagation(); window.apex_crm_show_opportunities('${doc.name}');"><i class="fa fa-lightbulb-o"></i> Opp <span class="count-opportunities">0</span></div>
                    <div class="info-pill pill-customers" onclick="event.stopPropagation(); window.apex_crm_show_customers('${doc.name}');"><i class="fa fa-user-circle"></i> Cust <span class="count-customers">0</span></div>
                </div>
                
                <!-- CLICKABLE INTERACTION FOOTER -->
                <div class="latest-interaction-box" onclick="event.stopPropagation(); window.apex_crm_show_interaction_history('${doc.name}');">
                    <div class="interaction-content"><span class="interaction-icon"><i class="fa fa-history"></i></span><span class="interaction-text">No interaction yet</span></div>
                </div>

                <!-- EXPANDED CONTACT DETAILS CONTAINER -->
                <div id="contact-details-${doc.name}" style="display:none; background:#ffffff; padding:0 10px 10px 10px; border-top:1px solid #f3f4f6; border-radius: 0 0 8px 8px; box-shadow:inset 0 2px 4px rgba(0,0,0,0.02);"></div>
            </div>
        `;
    };

    // Auto-inject Styles if missing (Fallback)
    if ($('#apex-cards-style').length === 0) {
        // Assuming CSS file is loaded. If not, we might need to inject here.
        // <link rel="stylesheet" href="/assets/apex_crm/css/apex_cards.css">
    }

    global_listview_ref = listview;

    // Only remove/add if mobile
    if (!is_mobile()) return;

    // CLEANUP: Remove legacy container only
    $("#mobile-layout-container").remove();

    console.log("Apex CRM: setupLeadCardView Called. Mobile:", is_mobile(), "Data:", listview.data ? listview.data.length : 0);

    // WRAP IN TIMEOUT to ensure Frappe DOM is ready/settled
    setTimeout(() => {

        // A. INJECT CSS FORCEFULLY - Clean up empty space
        const styleId = 'apex-mobile-cleaner-v6';
        if ($(`#${styleId}`).length === 0) {
            $('head').append(`
                <style id="${styleId}">
                    @media (max-width: 992px) {
                        /* Hide Standard List Rows CONTAINER to remove whitespace */
                        .list-row-container,
                        .web-list-table,
                        .list-row-head,
                        .result-list,
                        .list-headers,
                        .list-loading {
                            display: none !important;
                            height: 0 !important;
                            min-height: 0 !important;
                            padding: 0 !important;
                            margin: 0 !important;
                        }

                        /* Clean up .result container - Remove empty space */
                        .result {
                            display: block !important;
                            padding: 0 !important;
                            margin: 0 !important;
                            min-height: 0 !important;
                        }

                        /* Ensure no empty space from .result-list */
                        .result .result-list {
                            display: none !important;
                            height: 0 !important;
                            min-height: 0 !important;
                        }

                        /* Restore Pagination/Load More - MUST be visible */
                        .list-paging-area { 
                            display: block !important; 
                            margin-top: 15px; 
                            clear: both; 
                            padding: 10px 0;
                        }

                        /* Ensure Cards have space and are visible - NO extra spacing */
                        #lead-cards-container {
                            display: block !important;
                            width: 100%;
                            padding: 0 !important;
                            margin: 0 !important;
                            min-height: 0 !important;
                        }

                        /* Universal Search Bar - MUST be visible at top */
                        .apex-universal-search { 
                            display: block !important;
                            margin-bottom: 10px; 
                            width: 100%; 
                            position: relative;
                            z-index: 10;
                            visibility: visible !important;
                            opacity: 1 !important;
                        }

                        /* Remove any padding/margin from frappe-list that causes empty space */
                        .frappe-list .result {
                            padding: 0 !important;
                            margin: 0 !important;
                        }
                        
                        /* NEW: Wrapped Grid for Pills (User Request) */
                        .card-info-body {
                            display: flex !important;
                            flex-wrap: wrap !important; /* Wrap to next line */
                            overflow: visible !important; /* No scrolling */
                            gap: 8px !important;
                            padding: 8px 0 !important;
                            width: 100% !important;
                        }
                        
                        /* Hide scrollbar styles as no longer needed */
                        .card-info-body::-webkit-scrollbar {
                            display: none;
                        }
                        
                        /* NEW: Larger Pills */
                        .info-pill {
                            flex: 0 0 auto !important;
                            padding: 8px 12px !important;
                            font-size: 13px !important;
                            border-radius: 20px !important;
                            background: #f3f4f6;
                            border: 1px solid #e5e7eb;
                            display: flex;
                            align-items: center;
                            gap: 6px;
                            white-space: nowrap;
                        }

                        /* NEW: Horizontal Scroll for Quick Buttons */
                        .quick-btns {
                            display: flex !important;
                            overflow-x: auto !important;
                            white-space: nowrap !important;
                            gap: 8px !important;
                            -webkit-overflow-scrolling: touch !important; /* Critical for smooth iOS scroll */
                            scrollbar-width: none; /* Firefox */
                            padding-bottom: 4px; /* Space for scrollbar if visible */
                        }
                        .quick-btns::-webkit-scrollbar {
                            display: none; /* Chrome/Safari */
                        }
                    }
                </style>
            `);
        }

        // B. FIND CONTAINER - Multiple fallback strategies
        const $wrapper = $(listview.wrapper || listview.page?.body || 'body');

        // Strategy 1: Use listview.$frappe_list if available
        let $frappeList = listview.$frappe_list;

        // Strategy 2: Find .frappe-list in wrapper
        if (!$frappeList || !$frappeList.length) {
            $frappeList = $wrapper.find('.frappe-list');
        }

        // Strategy 3: Find .frappe-list anywhere in page
        if (!$frappeList || !$frappeList.length) {
            $frappeList = $('.frappe-list').first();
        }

        // Strategy 4: Use result area directly
        if (!$frappeList || !$frappeList.length) {
            console.warn("Apex CRM: frappe-list not found, using result area directly");
            const $resultArea = $wrapper.find('.result').first();
            if ($resultArea.length) {
                // Create a virtual container
                $frappeList = $resultArea.closest('.frappe-list');
                if (!$frappeList.length) {
                    $frappeList = $resultArea.parent();
                }
            }
        }

        // Final check - if still not found, log and use wrapper
        if (!$frappeList || !$frappeList.length) {
            console.error("Apex CRM: Could not find container, using wrapper as fallback");
            $frappeList = $wrapper;
        }

        console.log("Apex CRM: Using container:", $frappeList.length ? $frappeList[0].className : 'NOT FOUND');

        // B. UNIVERSAL SEARCH (Top) - MUST be first element
        // Setup search bar first (this creates it if doesn't exist)
        let $searchBar = setupUniversalSearchBar(listview);

        // CRITICAL: If search bar is already in stable wrapper, DO NOT TOUCH IT
        if ($('.apex-stable-search-container').find('.apex-universal-search').length > 0) {
            console.log("Apex CRM: Search bar is in stable container, skipping re-attachment");
            $searchBar.show();
        } else if ($searchBar && $searchBar.length) {
            // Remove from current parent if exists
            $searchBar.detach();

            // Find the best position - at the very top of frappe-list
            // Before list-filters, list-toolbar, or any other content
            const $firstChild = $frappeList.children().first();

            if ($firstChild.length && !$firstChild.hasClass('apex-universal-search')) {
                // Insert before first child
                $firstChild.before($searchBar);
            } else {
                // Prepend to frappe-list (first element)
                $frappeList.prepend($searchBar);
            }

            // Force visibility with important styles
            $searchBar.css({
                'display': 'block',
                'visibility': 'visible',
                'opacity': '1',
                'width': '100%'
            }).show();

            console.log("Apex CRM: Search bar positioned at top of frappe-list");
        } else {
            console.warn("Apex CRM: Search bar not created or not found");
        }

        // C. FILTERS - Keep visible
        $('.standard-filter-section').show();

        // D. CARDS - Insert BEFORE pagination, clean up .result first
        // Check for existing container
        let $cards = $('#lead-cards-container');


        // Clean up .result container - Remove empty children that cause space
        const $resultArea = $frappeList.find('.result').first();
        if ($resultArea.length) {
            // Hide/remove empty elements that cause space
            $resultArea.find('.list-loading, .list-headers, .result-list').css({
                'display': 'none',
                'height': '0',
                'min-height': '0',
                'padding': '0',
                'margin': '0'
            });
        }

        // Create fresh container if missing
        if (!$cards.length) {
            $cards = $('<div id="lead-cards-container"></div>');
        }

        // Find pagination
        const $paging = $frappeList.find('.list-paging-area').first();

        console.log("Apex CRM: Result area found:", $resultArea.length, "Pagination found:", $paging.length);

        if ($paging.length && $resultArea.length) {
            if (!$('#lead-cards-container').length) {
                if ($paging.closest('.result').length) {
                    $paging.before($cards);
                } else {
                    $paging.before($cards);
                }
            }
        } else if ($resultArea.length) {
            if (!$('#lead-cards-container').length) {
                $resultArea.append($cards);
            }
        } else if ($paging.length) {
            if (!$('#lead-cards-container').length) {
                $paging.before($cards);
            }
        } else {
            if (!$('#lead-cards-container').length) {
                $frappeList.append($cards);
            }
            console.warn("Apex CRM: Cards appended to frappe-list (fallback)");
        }


        // Force show cards with explicit styles - NO extra spacing
        $cards.css({
            'display': 'block',
            'visibility': 'visible',
            'opacity': '1',
            'width': '100%',
            'padding': '0',
            'margin': '0',
            'min-height': '0'
        });

        // Render Data
        if (listview.data && listview.data.length) {
            console.log("Apex CRM: Rendering", listview.data.length, "cards");
            let cards_html = '';
            listview.data.forEach(doc => {
                cards_html += createPremiumCard(doc);
            });
            $cards.html(cards_html);

            // Fetch Async Data (Stats)
            if (window.apex_crm_fetch_data) {
                window.apex_crm_fetch_data(listview.data);
            }
        } else {
            $cards.html('<div class="text-muted text-center" style="padding:20px;">No leads found</div>');
        }

    }, 300); // Increased delay to 300ms for better DOM readiness
}

// -------------------------------------------------------------------------------- //
//                       UNIVERSAL SEARCH BAR LOGIC (Simple & Clean)              //
// -------------------------------------------------------------------------------- //

function setupUniversalSearchBar(listview) {
    // SINGLETON: Reuse existing search bar to maintain focus/state
    if ($('.apex-universal-search').length > 0 && $('.apex-universal-search').is(':visible')) {
        return $('.apex-universal-search');
    }
    $('.apex-universal-search').remove(); // Clean up only if hidden/broken

    // Simple debounce function
    const debounce = (func, wait) => {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    };

    // Fields that need select dropdown
    const selectFields = ['status', 'source', 'city', 'territory', 'country'];

    // Get field options
    const getFieldOptions = (fieldName) => {
        try {
            const meta = frappe.get_meta('Lead');
            if (!meta || !meta.fields) return getFallbackOptions(fieldName);

            const field = meta.fields.find(f => f.fieldname === fieldName);
            if (!field) return getFallbackOptions(fieldName);

            // For Select fields, return options
            if (field.fieldtype === 'Select' && field.options) {
                return field.options.split('\n').filter(o => o.trim());
            }

            // For Link fields like Territory, fetch from database
            if (field.fieldtype === 'Link' && field.options) {
                return getLinkFieldOptions(fieldName, field.options);
            }

            // For Data fields like City, fetch distinct values from database
            if (field.fieldtype === 'Data' && fieldName === 'city') {
                // Return empty array initially, will be populated async
                return [];
            }

            return getFallbackOptions(fieldName);
        } catch (e) {
            return getFallbackOptions(fieldName);
        }
    };

    // Get options for Link fields (like Territory) - returns Promise
    const getLinkFieldOptions = async (fieldName, doctype) => {
        try {
            // For Territory, fetch from Territory doctype
            if (doctype === 'Territory') {
                const territories = await frappe.db.get_list('Territory', {
                    fields: ['name'],
                    order_by: 'name',
                    limit: 100
                });
                return territories.map(t => t.name);
            }

            // For Country, fetch from Country doctype (same as desktop)
            if (doctype === 'Country') {
                const countries = await frappe.db.get_list('Country', {
                    fields: ['name'],
                    order_by: 'country_name',
                    limit: 500 // Country list can be large
                });
                // Country doctype uses 'name' field which is the country_name
                return countries.map(c => c.name).sort();
            }

            return getFallbackOptions(fieldName);
        } catch (e) {
            console.error('Apex CRM: Error fetching link field options:', e);
            return getFallbackOptions(fieldName);
        }
    };

    // Get City options from database - returns Promise
    const getCityOptions = async () => {
        try {
            const leads = await frappe.db.get_list('Lead', {
                fields: ['city'],
                filters: { city: ['!=', ''] },
                distinct: true,
                order_by: 'city',
                limit: 200
            });
            const cities = leads.map(l => l.city).filter(c => c && c.trim());
            return [...new Set(cities)].sort();
        } catch (e) {
            return getFallbackOptions('city');
        }
    };

    const getFallbackOptions = (fieldName) => {
        const fallback = {
            'status': ['Lead', 'Open', 'Replied', 'Opportunity', 'Quotation', 'Lost Quotation', 'Interested', 'Converted', 'Do Not Contact'],
            'source': ['Advertisement', 'Campaign', 'Cold Calling', "Customer's Vendor", 'Exhibition', 'Existing Customer', 'Facebook', 'Instagram', 'LinkedIn', 'Twitter', 'Customer Event', 'Employee Referral', 'External Referral', 'In Store', 'On Site', 'Partner', 'Sales Team Activity', 'Seminar', 'Trade Show', 'Web', 'Chat']
        };
        return fallback[fieldName] || [];
    };

    // Inject CSS
    if ($('#apex-universal-search-css').length === 0) {
        $('head').append(`
            <style id="apex-universal-search-css">
                .apex-universal-search {
                    display: flex !important;
                    flex-direction: row !important;
                    align-items: center !important;
                    background: #fff !important;
                    border: 1px solid #d1d5db !important;
                    border-radius: 8px !important;
                    padding: 8px 12px !important;
                    margin: 10px 15px !important;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.08) !important;
                    width: calc(100% - 30px) !important;
                    box-sizing: border-box !important;
                }
                .apex-universal-search .search-field-wrapper {
                    flex: 0 0 auto !important;
                    border-right: 1px solid #e5e7eb !important;
                    padding-right: 8px !important;
                    margin-right: 8px !important;
                    min-width: 120px !important;
                }
                .apex-universal-search #lead-search-field {
                    border: none !important;
                    background: transparent !important;
                    font-size: 13px !important;
                    color: #4b5563 !important;
                    outline: none !important;
                    cursor: pointer !important;
                }
                .apex-universal-search #lead-search-input-wrapper {
                    flex: 1 1 auto !important;
                    display: flex !important;
                    align-items: center !important;
                    min-width: 0 !important;
                }
                .apex-universal-search .search-icon {
                    color: #9ca3af !important;
                    margin-right: 6px !important;
                    font-size: 13px !important;
                }
                .apex-universal-search #lead-search-input,
                .apex-universal-search #lead-search-select {
                    border: none !important;
                    outline: none !important;
                    width: 100% !important;
                    font-size: 14px !important;
                    color: #111827 !important;
                    background: transparent !important;
                    padding: 0 !important;
                }
                .apex-universal-search #lead-search-select {
                    cursor: pointer !important;
                }
                .apex-universal-search #lead-search-clear {
                    flex: 0 0 auto !important;
                    cursor: pointer !important;
                    color: #9ca3af !important;
                    padding: 4px !important;
                    margin-left: 8px !important;
                    display: none !important;
                }
                @media (max-width: 768px) {
                    .apex-universal-search {
                        margin: 10px 5px !important;
                        width: calc(100% - 10px) !important;
                        padding: 6px 8px !important;
                    }
                    .apex-universal-search .search-field-wrapper {
                        min-width: 90px !important;
                    }
                }
            </style>
        `);
    }

    // Create HTML
    const $searchBar = $(`
        <div class="apex-universal-search">
            <div class="search-field-wrapper">
                <select id="lead-search-field">
                    <option value="custom_search_index">Global Search</option>
                    <option value="lead_name">Name</option>
                    <option value="mobile_no">Mobile</option>
                    <option value="status">Status</option>
                    <option value="title">Title</option>
                    <option value="email_id">Email</option>
                    <option value="company_name">Company</option>
                    <option value="city">City</option>
                    <option value="territory">Territory</option>
                    <option value="country">Country</option>
                    <option value="source">Source</option>
                    <option value="phone_search">Phone</option>
                    <option value="whatsapp_search">WhatsApp</option>
                    <option value="telegram_search">Telegram</option>
                    <option value="facebook_search">Facebook</option>
                    <option value="instagram_search">Instagram</option>
                    <option value="linkedin_search">LinkedIn</option>
                    <option value="website_search">Website</option>
                    <option value="note_search">Notes</option>
                    <option value="comment_search">Comments</option>
                    <option value="task_search">Tasks</option>
                    <option value="event_search">Events</option>
                    <option value="address_search">Address</option>
                    <option value="interaction_search">Interactions</option>
                </select>
            </div>
            <div id="lead-search-input-wrapper">
                <i class="fa fa-search search-icon"></i>
                <input type="text" id="lead-search-input" placeholder="Search..." autocomplete="off">
                <select id="lead-search-select" style="display:none;">
                    <option value="">Select...</option>
                </select>
            </div>
            <div id="lead-search-clear">
                <i class="fa fa-times-circle"></i>
            </div>
        </div>
    `);

    // STABLE POSITIONING: Inject securely after the page header
    // This allows it to scroll naturally but stay separate from the refreshing list.
    setTimeout(() => {
        // 1. Clean up fixed wrapper if exists (reverting user dislike)
        $('.apex-fixed-search-wrapper').remove();
        $('.apex-search-wrapper').remove(); // Clean old regular wrapper

        // 2. Create a stable home for the search bar
        // We inject it AFTER .page-head so it sits between header and list
        const $anchor = $('.page-head').first();
        const $wrapperClass = 'apex-stable-search-container';

        if ($(`.${$wrapperClass}`).length === 0) {
            $anchor.after(`<div class="${$wrapperClass}" style="
                background: #fff; 
                z-index: 99; 
                position: relative; 
                padding: 10px 15px 0 15px; 
                border-bottom: 1px solid #f3f4f6;
            "></div>`);
        }

        const $wrapper = $(`.${$wrapperClass}`);

        // 3. Move search bar to this stable wrapper if not already there
        // This check prevents re-appending on every refresh, saving focus
        if ($wrapper.find('.apex-universal-search').length === 0) {
            $wrapper.append($searchBar);
        }

        // 4. Adjust spacing
        if ($('.frappe-list').length) {
            $('.frappe-list').css('margin-top', '0px'); // Reset margin
        }

    }, 100);

    // Get elements
    const $input = $searchBar.find('#lead-search-input');
    const $selectValue = $searchBar.find('#lead-search-select');
    const $selectField = $searchBar.find('#lead-search-field');
    const $clear = $searchBar.find('#lead-search-clear');

    // Switch input type
    const switchInputType = (fieldName) => {
        const fieldMap = {
            'lead_name': 'name',
            'mobile_no': 'mobile_no',
            'status': 'status',
            'title': 'title',
            'email_id': 'email_id',
            'company_name': 'company_name',
            'city': 'city',
            'territory': 'territory',
            'country': 'country',
            'source': 'source'
        };
        const actualField = fieldMap[fieldName] || fieldName;
        const needsSelect = selectFields.includes(actualField);

        if (needsSelect) {
            $input.hide();
            $selectValue.show().empty().append(`<option value="">Select...</option>`);

            // Get options (async for Link/Data fields)
            const options = getFieldOptions(actualField);

            // Handle Promise for async options (City, Territory)
            if (options && typeof options.then === 'function') {
                options.then(opts => {
                    opts.forEach(opt => {
                        if (opt && opt.trim()) {
                            $selectValue.append(`<option value="${opt.trim()}">${opt.trim()}</option>`);
                        }
                    });
                }).catch(() => {
                    // Use fallback if async fails
                    const fallback = getFallbackOptions(actualField);
                    fallback.forEach(opt => {
                        if (opt && opt.trim()) {
                            $selectValue.append(`<option value="${opt.trim()}">${opt.trim()}</option>`);
                        }
                    });
                });
            } else {
                // Synchronous options (Status, Source)
                options.forEach(opt => {
                    if (opt && opt.trim()) {
                        $selectValue.append(`<option value="${opt.trim()}">${opt.trim()}</option>`);
                    }
                });
            }
        } else {
            $selectValue.hide();
            $input.show().focus();
        }

        // Update placeholder for alias fields
        const placeholderMap = {
            'custom_search_index': __('Search anything...'),
            'lead_name': __('Search by name...'),
            'mobile_no': __('Search by mobile...'),
            'title': __('Search by title...'),
            'email_id': __('Search by email...'),
            'company_name': __('Search by company...'),
            'city': __('Search by city...'),
            'territory': __('Search by territory...'),
            'country': __('Search by country...'),
            'phone_search': __('Search phone numbers...'),
            'whatsapp_search': __('Search WhatsApp numbers...'),
            'telegram_search': __('Search Telegram IDs...'),
            'facebook_search': __('Search Facebook profiles...'),
            'instagram_search': __('Search Instagram profiles...'),
            'linkedin_search': __('Search LinkedIn profiles...'),
            'website_search': __('Search websites...'),
            'note_search': __('Search in notes...'),
            'comment_search': __('Search in comments...'),
            'task_search': __('Search in tasks...'),
            'event_search': __('Search in events...'),
            'address_search': __('Search in address...'),
            'interaction_search': __('Search in interactions...')
        };

        if (placeholderMap[fieldName]) {
            $input.attr('placeholder', placeholderMap[fieldName]);
        }
    };

    // Search function
    const doSearch = () => {
        const field = $selectField.val();
        const isSelect = $selectValue.is(':visible');
        const val = isSelect ? $selectValue.val() : $input.val().trim();

        // CRITICAL: Save field selection before any operations
        const savedField = field;
        const savedValue = val;
        const savedIsSelect = isSelect;

        if (!val) {
            listview.filter_area.clear().then(() => {
                // Simple refresh without undefined safeRefresh
                setTimeout(() => {
                    listview.refresh();
                    // Restore field selection after refresh
                    setTimeout(() => {
                        if ($selectField.val() !== savedField) {
                            $selectField.val(savedField);
                            switchInputType(savedField);
                        }
                    }, 200);
                }, 50);
            });
            return;
        }

        const fieldMap = {
            'lead_name': 'name',
            'mobile_no': 'mobile_no',
            'status': 'status',
            'title': 'title',
            'email_id': 'email_id',
            'company_name': 'company_name',
            'city': 'city',
            'territory': 'territory',
            'source': 'source'
        };

        let actualField = fieldMap[field] || field;
        let operator = 'like';
        let filterValue = `%${val}%`;

        // Exact match fields (use '=' instead of 'like')
        if (['status', 'source', 'city', 'territory', 'country'].includes(actualField)) {
            operator = '=';
            filterValue = val;
        }

        // Smart contact search fields - search in smart_contact_details JSON
        if (['phone_search', 'whatsapp_search', 'telegram_search', 'facebook_search', 'instagram_search', 'linkedin_search', 'website_search'].includes(field)) {
            actualField = 'custom_search_index';
            operator = 'like';
            // Map field to contact type
            const contactTypeMap = {
                'phone_search': 'Phone',
                'whatsapp_search': 'WhatsApp',
                'telegram_search': 'Telegram',
                'facebook_search': 'Facebook',
                'instagram_search': 'Instagram',
                'linkedin_search': 'LinkedIn',
                'website_search': 'Website'
            };
            const contactType = contactTypeMap[field];
            // Search for the contact type and value in custom_search_index
            filterValue = `%${contactType}:${val}%`; // Format: "Phone:01234567890"
        }

        // Alias fields - use custom_search_index for these
        if (['note_search', 'comment_search', 'task_search', 'event_search', 'address_search', 'interaction_search'].includes(field)) {
            actualField = 'custom_search_index';
            operator = 'like';
            filterValue = `%${val}%`; // Partial match for search index
        }

        if (field === 'custom_search_index') {
            actualField = 'custom_search_index';
        }


        listview.filter_area.clear(true).then(() => {
            return listview.filter_area.add([['Lead', actualField, operator, filterValue]]);
        }).then(() => {
            listview.refresh();
            // Singleton pattern maintains focus naturally; no need to force it.
        });
    };

    // Simple debounce
    const debouncedSearch = debounce(doSearch, 600);


    // Field selector change
    $selectField.on('change', function () {
        $input.val('');
        $selectValue.val('');
        $clear.hide();
        switchInputType($(this).val());
    });

    // Input event - CRITICAL: Prevent focus loss
    $input.on('input', function (e) {
        // Stop event propagation
        e.stopPropagation();
        e.stopImmediatePropagation();

        const val = $(this).val();
        if (val) {
            $clear.show();
        } else {
            $clear.hide();
        }

        // Search on input change (standard behavior)
        if (val.length >= 2 || val.length === 0) {
            debouncedSearch();
        }
    });


    // CRITICAL: Prevent keyboard events from reaching Title field
    $input.on('keydown keypress keyup', function (e) {
        e.stopPropagation();
        e.stopImmediatePropagation();

        // Clear Title field immediately
        $('.list-row-filters input, .list-row-head input').val('').blur().prop('disabled', true);
    });

    // Select change - CRITICAL: Preserve field selection after search
    $selectValue.on('change', function () {
        const selectedValue = $(this).val();
        const currentField = $selectField.val(); // Save current field

        if (selectedValue) {
            $clear.show();
            doSearch();

            // CRITICAL: After search completes, restore field selection
            setTimeout(() => {
                const $fieldAfter = $('.apex-universal-search #lead-search-field');
                const $selectAfter = $('.apex-universal-search #lead-search-select');
                if ($fieldAfter.length && $fieldAfter.val() !== currentField) {
                    $fieldAfter.val(currentField);
                    switchInputType(currentField);
                    // Restore select value after switching type
                    setTimeout(() => {
                        if ($selectAfter.length && $selectAfter.is(':visible')) {
                            $selectAfter.val(selectedValue);
                        }
                    }, 150);
                }
            }, 400);
        } else {
            $clear.hide();
            listview.filter_area.clear().then(() => {
                listview.refresh();
                // Restore field selection after refresh
                setTimeout(() => {
                    const $fieldAfter = $('.apex-universal-search #lead-search-field');
                    if ($fieldAfter.length && $fieldAfter.val() !== currentField) {
                        $fieldAfter.val(currentField);
                        switchInputType(currentField);
                    }
                }, 200);
            });
        }
    });

    // Enter key
    $input.on('keypress', function (e) {
        if (e.which === 13) {
            e.preventDefault();
            doSearch();
        }
    });

    // Clear button
    $clear.on('click', function () {
        $input.val('');
        $selectValue.val('');
        $clear.hide();
        listview.filter_area.clear().then(() => {
            listview.refresh();
        });
    });

    // Initialize
    switchInputType('custom_search_index');

    // CRITICAL: Prevent ID/Title fields from capturing input on ALL devices
    const preventTitleCapture = (e) => {
        // If our search input is focused or has value, prevent Title field from capturing
        if ($input.is(':focus') || $input.val()) {
            const $titleFields = $('.list-row-filters input, .list-row-head input');
            if ($titleFields.length) {
                // Check if event target is Title field
                const $target = $(e.target);
                if ($target.closest('.list-row-filters').length ||
                    $target.closest('.list-row-head').length ||
                    $target.is('.list-row-filters input') ||
                    $target.is('.list-row-head input')) {
                    // Prevent event
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    e.preventDefault();

                    // Clear and disable Title fields
                    $titleFields.val('').blur().prop('disabled', true);

                    // Force focus back to search input
                    setTimeout(() => {
                        if ($input.is(':visible')) {
                            $input.focus();
                            const len = $input.val().length;
                            if ($input[0] && $input[0].setSelectionRange) {
                                $input[0].setSelectionRange(len, len);
                            }
                        }
                    }, 0);
                    return false;
                }
            }
        }
    };

    // Use capture phase to intercept BEFORE Frappe handles it
    document.addEventListener('keydown', preventTitleCapture, true);
    document.addEventListener('keypress', preventTitleCapture, true);
    document.addEventListener('input', preventTitleCapture, true);
    document.addEventListener('focus', preventTitleCapture, true);

    // Also prevent Title field from getting focus
    $(document).on('focus', '.list-row-filters input, .list-row-head input', function (e) {
        if ($input.is(':focus') || $input.val()) {
            $(this).blur().prop('disabled', true);
            setTimeout(() => {
                if ($input.is(':visible')) {
                    $input.focus();
                }
            }, 0);
        }
    });

    return $searchBar;
}
