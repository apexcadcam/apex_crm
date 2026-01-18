
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
        // Normalize common variations
        const lowerType = type.toLowerCase();

        const iconMap = {
            'facebook': '<i class="fa fa-facebook-official" style="color: #1877F2; font-size: 14px;"></i>',
            'instagram': '<i class="fa fa-instagram" style="color: #E4405F; font-size: 14px;"></i>',
            'linkedin': '<i class="fa fa-linkedin-square" style="color: #0A66C2; font-size: 14px;"></i>',
            'twitter': '<i class="fa fa-twitter" style="color: #1DA1F2; font-size: 14px;"></i>',
            'x': '<i class="fa fa-times" style="color: #000000; font-size: 14px;"></i>', // Using 'times' as FA 4.7 doesn't have X logo, or use text X
            'telegram': '<i class="fa fa-telegram" style="color: #0088cc; font-size: 14px;"></i>',
            'whatsapp': '<i class="fa fa-whatsapp" style="color: #25D366; font-size: 14px;"></i>',
            'tiktok': '<i class="fa fa-music" style="color: #000000; font-size: 14px;"></i>', // Fallback as FA 4.x lacks tiktok
            'snapchat': '<i class="fa fa-snapchat-ghost" style="color: #FFFC00; font-size: 14px; text-shadow: 0px 0px 1px #000;"></i>',
            'youtube': '<i class="fa fa-youtube-play" style="color: #FF0000; font-size: 14px;"></i>',
            'website': '<i class="fa fa-globe" style="color: #555; font-size: 14px;"></i>',
            'email': '<i class="fa fa-envelope" style="color: #555; font-size: 14px;"></i>',
            'mobile': '<i class="fa fa-mobile" style="color: #555; font-size: 16px;"></i>',
            'phone': '<i class="fa fa-phone" style="color: #555; font-size: 14px;"></i>',
            'address': '<i class="fa fa-map-marker" style="color: #E74C3C; font-size: 14px;"></i>',
            'location': '<i class="fa fa-map-marker" style="color: #E74C3C; font-size: 14px;"></i>'
        };

        // Specific checks/overrides
        if (lowerType === 'x') return '<span style="font-family: sans-serif; font-weight: 900; font-size: 14px; color: #000;">𝕏</span>'; // Unicode fallback for X

        return iconMap[lowerType] || null;
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

        if (countryCode && !socialIcon && ['Mobile', 'Phone', 'WhatsApp'].includes(type)) {
            let normalizedCC = countryCode.trim();
            if (!normalizedCC.startsWith('+')) normalizedCC = '+' + normalizedCC;
            if (!displayVal.startsWith(normalizedCC)) {
                displayVal = displayVal.replace(/^\+\d{1,4}\s*/, '').trim();
                displayVal = normalizedCC + displayVal;
            }
        }

        let flagSpan = parent.querySelector('.sw-flag');
        if (socialIcon) {
            flagSpan.innerHTML = socialIcon;
        } else {
            // For non-social/non-specific types, clear or show default
            flagSpan.innerHTML = '';
        }

        let linkAnchor = parent.querySelector('a.sw-link');
        let textSpan = parent.querySelector('.sw-value');

        // Update Link Logic
        let href = '#';
        const lowerType = type.toLowerCase();

        if (val.startsWith('http')) {
            href = val;
        } else if (lowerType === 'email') {
            href = `mailto:${val}`;
        } else if (['mobile', 'phone'].includes(lowerType)) {
            href = `tel:${val}`;
        } else if (lowerType === 'whatsapp') {
            let clean = val.replace(/\D/g, '');
            href = `https://wa.me/${clean}`;
        } else if (lowerType === 'telegram') {
            let clean = val.replace('@', '');
            href = `https://t.me/${clean}`;
        } else if (lowerType === 'instagram') {
            let clean = val.replace('@', '');
            if (!clean.startsWith('http')) href = `https://instagram.com/${clean}`;
        } else if (lowerType === 'facebook') {
            if (!val.startsWith('http')) href = `https://facebook.com/${val}`;
        } else if (lowerType === 'twitter' || lowerType === 'x') {
            let clean = val.replace('@', '');
            if (!clean.startsWith('http')) href = `https://x.com/${clean}`;
        } else if (lowerType === 'tiktok') {
            let clean = val.replace('@', '');
            if (!clean.startsWith('http')) href = `https://tiktok.com/@${clean}`;
        } else if (lowerType === 'snapchat') {
            let clean = val.replace('@', '');
            if (!clean.startsWith('http')) href = `https://snapchat.com/add/${clean}`;
        } else if (lowerType === 'linkedin') {
            if (!val.startsWith('http')) href = `https://linkedin.com/in/${val}`;
        }

        if (href !== '#') {
            // If it was just text, replace with link structure if needed, 
            // BUT simpler is to just update the existing anchor if present, or toggle structure.
            // Current structure is complex, let's just update the HREF if it's an anchor, 
            // or the parent onclick if we want the whole pill clickable (but we have a select covering it).
            // Actually, the structure in formatters.smart_contact_summary puts the link INSIDE the .switcher-display

            if (linkAnchor) {
                linkAnchor.href = href;
                linkAnchor.querySelector('.sw-value').textContent = displayVal;
                // Icon update handled above via flagSpan check, but linkAnchor might have its own icon span?
                // In formatters, the link wraps the icon and text.
                // Let's re-render the content area to be safe or target specific children.
                let iconContainer = linkAnchor.querySelector('.sw-flag') || linkAnchor.querySelector('i') || linkAnchor.querySelector('span:first-child');
                if (iconContainer) iconContainer.outerHTML = socialIcon || '';
            } else {
                // Convert Text to Link? Too complex for this handler?
                // Let's just update text for now if no link anchor exists.
                if (textSpan) textSpan.textContent = displayVal;
            }
        } else {
            if (textSpan) textSpan.textContent = displayVal;
        }

        // Re-bind click on the new selected link if we updated href? 
        // The select is on top, so click goes to select... 
        // Wait, if select covers everything, we can't click the link!
        // The select has opacity 0. 
        // DESIGN FLAW: If we want clickable links, the select cannot cover the link area.
        // The user wants to click the icon/text to go to the link.
        // We might need a small "Edit/Switch" arrow for the select, and leave the main area for the link.
        // checking the HTML structure: 
        // <div class="switcher-display"> ... link ... <select ... width:100% ...> </div>
        // The select covers EVERYTHING. So links are UNCLICKABLE currently!
        // The "Action" logic needs to handle this.

        // FIX: We need to detecting "Change" vs "Click".
        // But select intercepts clicks.
        // Alternative: The select is only for switching. 
        // Once switched, how do we click?
        // Maybe the select should be small arrow only?
    }
};

frappe.listview_settings['Lead'] = {
    add_fields: ['title', 'status', 'mobile_no', 'company_name', 'email_id', 'city', 'territory', 'lead_owner', 'type', 'request_type', 'source', 'lead_name', 'smart_contact_details', 'smart_contact_summary', 'custom_search_index'],

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
            if (countryCode0 && !socialIcon0 && ['Mobile', 'Phone'].includes(type0)) {
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

            let href = '#';
            const lowerType = type0.toLowerCase();
            if (val0.startsWith('http')) {
                href = val0;
            } else if (lowerType === 'email') {
                href = `mailto:${val0}`;
            } else if (['mobile', 'phone'].includes(lowerType)) {
                href = `tel:${val0}`;
            } else if (lowerType === 'whatsapp') {
                let clean = val0.replace(/\D/g, '');
                href = `https://wa.me/${clean}`;
            } else if (lowerType === 'telegram') {
                let clean = val0.replace('@', '');
                href = `https://t.me/${clean}`;
            } else if (lowerType === 'instagram') {
                let clean = val0.replace('@', '');
                if (!clean.startsWith('http')) href = `https://instagram.com/${clean}`;
            } else if (lowerType === 'facebook') {
                if (!val0.startsWith('http')) href = `https://facebook.com/${val0}`;
            } else if (lowerType === 'twitter' || lowerType === 'x') {
                let clean = val0.replace('@', '');
                if (!clean.startsWith('http')) href = `https://x.com/${clean}`;
            } else if (lowerType === 'tiktok') {
                let clean = val0.replace('@', '');
                if (!clean.startsWith('http')) href = `https://tiktok.com/@${clean}`;
            } else if (lowerType === 'snapchat') {
                let clean = val0.replace('@', '');
                if (!clean.startsWith('http')) href = `https://snapchat.com/add/${clean}`;
            } else if (lowerType === 'linkedin') {
                if (!val0.startsWith('http')) href = `https://linkedin.com/in/${val0}`;
            }

            // Interaction Logic:
            // Design Adjustment: The SELECT currently covers everything (width: 100%, height: 100%).
            // This prevents clicking the link.
            // Solution: Make the SELECT only cover a small "switcher" area (the caret), 
            // or use a different interaction model.
            // Request: User wants "Direct to the right links".
            // So clicking the icon/text MUST open the link.
            // The switcher should be secondary (e.g., small caret).

            return `
            <div class="contact-switcher-widget-list" style="display:flex; align-items:center;">
                 <div class="switcher-display" style="position: relative; background: transparent; border: 1px solid transparent; border-radius: 4px; padding: 2px 4px; display: inline-flex; align-items: center; gap: 6px; max-width: 300px;">
                        <a href="${href}" target="_blank" class="sw-link" style="text-decoration: none; display: inline-flex; align-items: center; gap: 6px; color: inherit;" onclick="event.stopPropagation();">
                            <span class="sw-flag">${countryCodeHtml0}</span>
                            <span class="sw-value" style="font-weight: 400; color: #333; font-size: 13px;">${displayVal}</span>
                        </a>
                        
                        <div style="position: relative; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; margin-left: 4px;">
                            <i class="fa fa-caret-down" style="color: #888; font-size: 10px;"></i>
                            <select class="switcher-select"
                                onchange="window.apex_crm_list.handle_switch(this)"
                                onclick="event.stopPropagation();"
                                data-contacts="${contactsJson}"
                                style="position: absolute; top:0; left:0; width: 100%; height: 100%; opacity: 0; cursor: pointer;"
                                title="Switch Contact">
                                ${optionsHtml}
                            </select>
                        </div>
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
// HELPER: Quick Add Smart Contact
window.apex_crm_quick_add = function (lead_name) {
    const d = new frappe.ui.Dialog({
        title: __('Add Contact'),
        fields: [
            {
                label: 'Type',
                fieldname: 'type',
                fieldtype: 'Select',
                options: 'Mobile\nPhone\nWhatsApp\nEmail\nFacebook\nInstagram\nLinkedIn\nTikTok\nSnapchat\nX\nTelegram\nWebsite\nAddress\nLocation\nOther',
                reqd: 1,
                default: 'Mobile',
                onchange: function () {
                    const val = this.get_value();
                    const isPhone = ['Mobile', 'Phone', 'WhatsApp'].includes(val);
                    d.set_df_property('country_code', 'hidden', !isPhone);
                    d.set_df_property('country_code', 'reqd', isPhone);
                }
            },
            {
                label: 'Country Code',
                fieldname: 'country_code',
                fieldtype: 'Select',
                options: '\n+20\n+966\n+971\n+965\n+974\n+973\n+968\n+967\n+964\n+249\n+218\n+213\n+212\n+216\n+962\n+961\n+963\n+970\n+252\n+253\n+269\n+222\n+1\n+44',
                default: '+20',
                hidden: 0 // Default since Mobile is default
            },
            {
                label: 'Value / Number',
                fieldname: 'value',
                fieldtype: 'Data',
                reqd: 1,
                onchange: function () {
                    let val = this.get_value();
                    if (!val) return;
                    val = val.toLowerCase();
                    let type = '';
                    // Basic heuristic for common social links
                    if (val.includes('instagram.com')) type = 'Instagram';
                    else if (val.includes('facebook.com')) type = 'Facebook';
                    else if (val.includes('tiktok.com')) type = 'TikTok';
                    else if (val.includes('snapchat.com')) type = 'Snapchat';
                    else if (val.includes('linkedin.com')) type = 'LinkedIn';
                    else if (val.includes('x.com') || val.includes('twitter.com')) type = 'X';
                    else if (val.includes('t.me')) type = 'Telegram';
                    else if (val.includes('whatsapp.com') || val.includes('wa.me')) type = 'WhatsApp';
                    else if (val.includes('@') && !val.includes(' ') && !val.startsWith('http')) type = 'Email';

                    if (type) {
                        d.set_value('type', type);
                        // Trigger type change to update country code visibility
                        if (d.fields_dict.type && d.fields_dict.type.df.onchange) {
                            d.fields_dict.type.df.onchange.apply(d.fields_dict.type);
                        }
                    }
                }
            }
        ],
        primary_action_label: 'Add',
        primary_action(values) {
            frappe.call({
                method: 'apex_crm.api.add_smart_contact',
                args: {
                    lead: lead_name,
                    type: values.type,
                    value: values.value,
                    country_code: values.country_code
                },
                freeze: true,
                callback: function (r) {
                    if (!r.exc) {
                        d.hide();
                        frappe.show_alert({ message: __('Contact Added'), indicator: 'green' });
                        // Refresh data if available
                        if (window.global_listview_ref && window.global_listview_ref.data) {
                            if (window.apex_crm_fetch_data) {
                                window.apex_crm_fetch_data(window.global_listview_ref.data);
                            } else {
                                window.location.reload();
                            }
                        } else {
                            window.location.reload();
                        }
                    }
                }
            });
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
        const showMap = t.includes('address') || t.includes('location');

        // Strict Mobile Check: explicit phone types OR fallback if empty type & numeric-ish interaction
        const showMobile = ['mobile', 'phone', 'whatsapp', 'sms'].some(x => t.includes(x)) || (!t && !currentVal.includes('http') && !currentVal.includes('@'));

        // Everything else is a Link (Web, Social, etc.)
        const showLink = !showMobile && !showEmail && !showMap;

        // Dynamic Icon for the Link Button
        let linkIconHtml = '<i class="fa fa-globe"></i>';
        if (showLink) {
            let specificIcon = window.apex_crm_list.get_icon_for_type(currentType);
            if (specificIcon) linkIconHtml = specificIcon;
        }

        // Truncate for Display
        let displayText = currentVal || 'Select Contact';
        if (displayText.length > 25 && (displayText.includes('http') || showFb || showWeb)) {
            displayText = displayText.substring(0, 25) + '...';
        }

        // Icon HTML
        // Icon HTML - Refactored to use centralized helper
        let iconHtml = '';
        let helperIcon = window.apex_crm_list.get_icon_for_type(currentType);

        if (helperIcon) {
            // Helper returns full <i> tag or <span>. Use it directly.
            // But we need to wrap it in flag-icon for styling consistency if needed
            iconHtml = `<span class="flag-icon" style="margin-right:6px;">${helperIcon}</span>`;
        } else {
            // Fallback
            iconHtml = `<span class="flag-icon" style="margin-right:6px;">${currentIcon || '📞'}</span>`;
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
            // Update Icon
            const socialIcon = window.apex_crm_list.get_icon_for_type(type);
            if (socialIcon) {
                $flag.html(socialIcon);
            } else {
                // Fallback
                const iconMap = { 'WhatsApp': '💬', 'Mobile': '📱', 'Phone': '📞', 'Email': '✉️', 'Facebook': 'fa-facebook', 'Website': '🌐', 'Address': '📍', 'Location': '📍' };
                let fallback = iconMap[type] || '📞';
                if (fallback.startsWith('fa-')) $flag.html(`<i class="fa ${fallback}"></i>`);
                else $flag.text(fallback);
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
            // ADDRESS / LOCATION TYPE
            else if (typeLower.includes('address') || typeLower.includes('location')) {
                $btns.find('.btn-map').attr('onclick', `event.stopPropagation(); window.open('https://maps.google.com/?q=${encodeURIComponent(value)}', '_blank');`).show();
            }
            // PHONE / MOBILE / WHATSAPP TYPE
            else if (['mobile', 'phone', 'whatsapp', 'sms'].some(x => typeLower.includes(x)) || (!type && !value.includes('http') && !value.includes('@'))) {
                $btns.find('.btn-call').attr('onclick', `event.stopPropagation(); window.apex_crm_log_interaction_dialog('${lead_name}', 'Call', '${value}');`).show();

                // Show/Hide WhatsApp/SMS based on type logic
                if (['Mobile', 'WhatsApp'].includes(type) || !type) {
                    $btns.find('.btn-whatsapp').attr('onclick', `event.stopPropagation(); window.apex_crm_log_interaction_dialog('${lead_name}', 'WhatsApp', '${value}');`).show();
                    $btns.find('.btn-sms').attr('onclick', `event.stopPropagation(); window.apex_crm_log_interaction_dialog('${lead_name}', 'SMS', '${value}');`).show();
                }
            }
            // DYNAMIC LINK TYPE (Everything else)
            else {
                let linkBtn = $btns.find('.btn-link-action');
                if (linkBtn.length === 0) {
                    // Fallback if cached version missing class
                    linkBtn = $btns.find('.btn-website');
                    if (linkBtn.length === 0) {
                        // Inject if missing (rare case of old DOM)
                        $btns.append(`<button class="quick-btn btn-link-action" onclick="event.stopPropagation();"><i class="fa fa-globe"></i></button>`);
                        linkBtn = $btns.find('.btn-link-action');
                    }
                }

                // Update Icon
                let socialIcon = window.apex_crm_list.get_icon_for_type(type);
                if (socialIcon) linkBtn.html(socialIcon);
                else linkBtn.html('<i class="fa fa-globe"></i>');

                // Update Action
                linkBtn.attr('onclick', `event.stopPropagation(); window.open('${value.startsWith('http') ? value : 'https://' + value}', '_blank');`).show();
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
                            // Correct Icon Mapping using Central Helper
                            // const typeLower = (c.type || '').toLowerCase(); // Not needed if we use helper
                            let listIconHtml = window.apex_crm_list.get_icon_for_type(c.type);
                            if (!listIconHtml) {
                                // Fallbacks if helper returns null (unlikely with "Other")
                                if ((c.type || '').toLowerCase().includes('mobile')) listIconHtml = '<i class="fa fa-mobile" style="font-size:16px;"></i>';
                                else listIconHtml = '<i class="fa fa-circle-o"></i>';
                            }

                            // displayIcon is passed to select_contact. 
                            // select_contact now uses get_icon_for_type(type) so we can pass null or dummy.
                            let displayIcon = 'circle';

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
                                ${doc.source ? `<span style="background:#f3f4f6; color:#1f2937; border:1px solid #e5e7eb; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:500;">${doc.source}</span>` : ''}
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
                        <!-- Email Action -->
                         <button class="quick-btn btn-email" style="${showEmail ? '' : 'display:none;'}" onclick="event.stopPropagation(); window.location.href = 'mailto:${currentVal}';"><i class="fa fa-envelope"></i></button>
                         
                         <!-- Dynamic Link Action (Web/Social) -->
                         <button class="quick-btn btn-link-action" style="${showLink ? '' : 'display:none;'}" onclick="event.stopPropagation(); window.open('${currentVal.startsWith('http') ? currentVal : 'https://' + currentVal}', '_blank');">${linkIconHtml}</button>
                         
                         <!-- Map Action -->
                         <button class="quick-btn btn-map" style="${showMap ? '' : 'display:none;'}" onclick="event.stopPropagation(); window.open('https://maps.google.com/?q=${encodeURIComponent(currentVal)}', '_blank');"><i class="fa fa-map-marker"></i></button>
                         <!-- Map Action -->
                         <button class="quick-btn btn-map" style="${showMap ? '' : 'display:none;'}" onclick="event.stopPropagation(); window.open('https://maps.google.com/?q=${encodeURIComponent(currentVal)}', '_blank');"><i class="fa fa-map-marker"></i></button>
                    </div>
                </div>

                <div class="card-info-body" style="display: flex !important; flex-wrap: wrap !important; overflow: visible !important; gap: 4px !important; padding: 4px 0 !important; width: 100% !important;">
                    <div class="info-pill pill-notes" style="height: 22px !important; min-height: 0 !important; padding: 0 8px !important; font-size: 11px !important; display: flex !important; align-items: center !important; flex: 0 0 auto !important;" onclick="event.stopPropagation(); window.apex_crm_show_notes('${doc.name}');"><i class="fa fa-sticky-note" style="font-size: 10px !important; margin-right: 4px;"></i> Notes <span class="count-notes" style="margin-left: 4px;">0</span></div>
                    <div class="info-pill pill-tasks" style="height: 22px !important; min-height: 0 !important; padding: 0 8px !important; font-size: 11px !important; display: flex !important; align-items: center !important; flex: 0 0 auto !important;" onclick="event.stopPropagation(); window.apex_crm_show_tasks('${doc.name}');"><i class="fa fa-check-square" style="font-size: 10px !important; margin-right: 4px;"></i> Tasks <span class="count-tasks" style="margin-left: 4px;">0</span></div>
                    
                    <!-- Event: Dialog -->
                    <div class="info-pill pill-events" style="height: 22px !important; min-height: 0 !important; padding: 0 8px !important; font-size: 11px !important; display: flex !important; align-items: center !important; flex: 0 0 auto !important;" onclick="event.stopPropagation(); window.apex_crm_show_events('${doc.name}');"><i class="fa fa-calendar" style="font-size: 10px !important; margin-right: 4px;"></i> Events <span class="count-events" style="margin-left: 4px;">0</span></div>
                    
                    <div class="info-pill pill-quotes" style="height: 22px !important; min-height: 0 !important; padding: 0 8px !important; font-size: 11px !important; display: flex !important; align-items: center !important; flex: 0 0 auto !important;" onclick="event.stopPropagation(); window.apex_crm_show_quotes('${doc.name}');"><i class="fa fa-file-text" style="font-size: 10px !important; margin-right: 4px;"></i> Quotes <span class="count-quotes" style="margin-left: 4px;">0</span></div>
                    
                    <!-- Prospect: Dialog -->
                    <div class="info-pill pill-prospects" style="height: 22px !important; min-height: 0 !important; padding: 0 8px !important; font-size: 11px !important; display: flex !important; align-items: center !important; flex: 0 0 auto !important;" onclick="event.stopPropagation(); window.apex_crm_show_prospects('${doc.name}');"><i class="fa fa-users" style="font-size: 10px !important; margin-right: 4px;"></i> Prosp <span class="count-prospects" style="margin-left: 4px;">0</span></div>
                    
                    <div class="info-pill pill-opportunities" style="height: 22px !important; min-height: 0 !important; padding: 0 8px !important; font-size: 11px !important; display: flex !important; align-items: center !important; flex: 0 0 auto !important;" onclick="event.stopPropagation(); window.apex_crm_show_opportunities('${doc.name}');"><i class="fa fa-lightbulb-o" style="font-size: 10px !important; margin-right: 4px;"></i> Opp <span class="count-opportunities" style="margin-left: 4px;">0</span></div>
                    <div class="info-pill pill-customers" style="height: 22px !important; min-height: 0 !important; padding: 0 8px !important; font-size: 11px !important; display: flex !important; align-items: center !important; flex: 0 0 auto !important;" onclick="event.stopPropagation(); window.apex_crm_show_customers('${doc.name}');"><i class="fa fa-user-circle" style="font-size: 10px !important; margin-right: 4px;"></i> Cust <span class="count-customers" style="margin-left: 4px;">0</span></div>
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
        const styleId = 'apex-mobile-cleaner-v7';
        // Remove old versions if they exist to prevent conflicts
        $('#apex-mobile-cleaner-v6').remove();

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
                        
                        /* Hide scrollbar styles */
                        .card-info-body::-webkit-scrollbar {
                            display: none;
                        }
                        
                        /* NEW: Compact Pills */
                        .info-pill {
                            flex: 0 0 auto !important;
                            padding: 4px 10px !important; /* REDUCED HEIGHT */
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

        // STABILIZATION FIX:
        // Do NOT detach/re-attach if it's already in the right place.
        // This prevents input focus loss during re-renders.

        const $expectedParent = $frappeList;
        const $currentParent = $searchBar.parent();

        // Check if already correctly positioned (first child of frappe-list)
        const isCorrectlyPositioned = $currentParent.is($frappeList) &&
            $frappeList.children().first().is($searchBar);

        // Also check if it's in the special mobile wrapper we created
        const isInMobileWrapper = $currentParent.hasClass('apex-mobile-search-wrapper');

        if (isCorrectlyPositioned || isInMobileWrapper) {
            // It's safe, don't move it.
            // Just ensure it's visible.
            $searchBar.css({
                'display': 'block',
                'visibility': 'visible',
                'opacity': '1',
                'width': '100%'
            }).show();
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

            // CRITICAL: Prevent text selection during touch scroll on mobile
            // Optimized touch handlers for smoother scrolling while preventing text selection
            $cards.find('.card-info-body').each(function () {
                const $scrollContainer = $(this);
                let isScrolling = false;
                let touchStartX = 0;
                let touchStartY = 0;
                let scrollStartX = 0;
                let touchStartTime = 0;

                // Prevent text selection during touch drag
                $scrollContainer.on('touchstart', function (e) {
                    touchStartX = e.originalEvent.touches[0].clientX;
                    touchStartY = e.originalEvent.touches[0].clientY;
                    scrollStartX = this.scrollLeft;
                    touchStartTime = Date.now();
                    isScrolling = false;

                    // Prevent text selection
                    if (window.getSelection) {
                        window.getSelection().removeAllRanges();
                    }
                });

                $scrollContainer.on('touchmove', function (e) {
                    const touchX = e.originalEvent.touches[0].clientX;
                    const touchY = e.originalEvent.touches[0].clientY;
                    const deltaX = Math.abs(touchX - touchStartX);
                    const deltaY = Math.abs(touchY - touchStartY);

                    // If horizontal movement is more than vertical, it's a scroll
                    if (deltaX > deltaY && deltaX > 5) {
                        isScrolling = true;

                        // Prevent text selection during scroll - use requestAnimationFrame for smoother scrolling
                        e.preventDefault();

                        // Use requestAnimationFrame for smoother scroll performance
                        requestAnimationFrame(() => {
                            this.scrollLeft = scrollStartX - (touchX - touchStartX);
                        });

                        // Clear any selection
                        if (window.getSelection) {
                            window.getSelection().removeAllRanges();
                        }
                    }
                });

                $scrollContainer.on('touchend', function (e) {
                    // If it was a scroll, prevent click events that might select text
                    if (isScrolling) {
                        // Only prevent if it was clearly a scroll gesture
                        const touchDuration = Date.now() - touchStartTime;
                        if (touchDuration < 300) {
                            e.preventDefault();
                            e.stopPropagation();
                        }

                        // Clear selection
                        if (window.getSelection) {
                            window.getSelection().removeAllRanges();
                        }
                    }
                    isScrolling = false;
                });

                // Also prevent text selection on mouse drag (desktop)
                $scrollContainer.on('mousedown', function (e) {
                    if (e.target.closest('.info-pill')) {
                        // Only prevent if dragging, not clicking
                        let isDragging = false;
                        const startX = e.clientX;
                        const startScrollLeft = this.scrollLeft;

                        const onMouseMove = (moveE) => {
                            const deltaX = moveE.clientX - startX;
                            if (Math.abs(deltaX) > 5) {
                                isDragging = true;
                                this.scrollLeft = startScrollLeft - deltaX;
                                // Prevent text selection during drag
                                if (window.getSelection) {
                                    window.getSelection().removeAllRanges();
                                }
                            }
                        };

                        const onMouseUp = () => {
                            $(document).off('mousemove', onMouseMove);
                            $(document).off('mouseup', onMouseUp);
                        };

                        $(document).on('mousemove', onMouseMove);
                        $(document).on('mouseup', onMouseUp);
                    }
                });
            });

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
    const selectFields = ['status', 'source', 'city', 'territory', 'country',
        'quotation_search', 'prospect_search', 'opportunity_search', 'customer_search',
        'lead_owner', 'assigned_to', 'type', 'request_type'];

    // Get field options
    const getFieldOptions = (fieldName) => {
        // Custom Options for Document Searches
        if (fieldName === 'quotation_search') return ['HasQuotation'];
        if (fieldName === 'prospect_search') return ['HasProspect'];
        if (fieldName === 'opportunity_search') return ['HasOpportunity'];
        if (fieldName === 'customer_search') return ['HasCustomer'];

        // Dynamic User List for Owner/Assigned
        if (fieldName === 'lead_owner' || fieldName === 'assigned_to') {
            return getActiveUserOptions();
        }

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

    // Get Active Users - returns Promise
    const getActiveUserOptions = async () => {
        try {
            const users = await frappe.db.get_list('User', {
                fields: ['email', 'full_name'],
                filters: { enabled: 1, user_type: 'System User' },
                limit: 200
            });
            return users.map(u => u.email).sort();
        } catch (e) {
            return [];
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
                <option value="lead_owner">Lead Owner</option>
                <option value="assigned_to">Assigned To</option>
                <option value="type">Lead Type</option>
                <option value="request_type">Request Type</option>
                <option value="quotation_search">Quotation</option>
                    <option value="prospect_search">Prospect</option>
                    <option value="opportunity_search">Opportunity</option>
                    <option value="customer_search">Customer</option>
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

    // INJECTION LOGIC
    // Consolidate to single logic: Prefer "Standard Filter Section" (Bottom)
    // Only fallback to "Page Head" (Top) on Mobile/Missing Filter Section

    // 1. Clean up old/duplicate wrappers
    $('.apex-fixed-search-wrapper').remove();
    $('.apex-search-wrapper').remove();
    $('.apex-stable-search-container').remove(); // Remove stable wrapper that forced top view

    const $stdFilterSection = listview.$page.find('.standard-filter-section');

    // Check if we act like Desktop (Filter section exists and visible)
    if ($stdFilterSection.length && $stdFilterSection.is(':visible')) {
        // Inject into standard filter section (Bottom)
        if ($stdFilterSection.find('.apex-universal-search').length === 0) {
            $stdFilterSection.prepend($searchBar);
        }
    } else {
        // Mobile / Fallback: Inject after Page Head (Top)
        // This ensures it is visible on mobile where standard filter section might be hidden or different
        const $anchor = $('.page-head').first();
        // Use a simple wrapper for spacing if needed
        if ($anchor.next('.apex-mobile-search-wrapper').length === 0) {
            $anchor.after('<div class="apex-mobile-search-wrapper" style="background:#fff; z-index:99; padding-bottom:5px;"></div>');
        }
        const $mobileWrapper = $anchor.next('.apex-mobile-search-wrapper');
        if ($mobileWrapper.find('.apex-universal-search').length === 0) {
            $mobileWrapper.html($searchBar);
        }

        // Adjust spacing for list
        if ($('.frappe-list').length) {
            $('.frappe-list').css('margin-top', '0px');
        }
    }

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
            'interaction_search': __('Search in interactions...'),
            'quotation_search': __('Search by Quotation ID...'),
            'prospect_search': __('Search by Prospect Name...'),
            'opportunity_search': __('Search by Opportunity Name...'),
            'customer_search': __('Search by Customer Name...')
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

        // Exact Match Fields (New Filters)
        if (['lead_owner', 'type', 'request_type'].includes(field)) {
            actualField = field;
            operator = '=';
            filterValue = val;
        }

        // Assigned To (JSON list search)
        if (field === 'assigned_to') {
            actualField = '_assign';
            operator = 'like';
            filterValue = `%${val}%`;
        }

        // Document Search Fields (New)
        if (['quotation_search', 'prospect_search', 'opportunity_search', 'customer_search'].includes(field)) {
            actualField = 'custom_search_index';
            operator = 'like';
            // Search for specific token prefix
            const docTypeMap = {
                'quotation_search': 'Quotation',
                'prospect_search': 'Prospect',
                'opportunity_search': 'Opportunity',
                'customer_search': 'Customer'
            };
            const prefix = docTypeMap[field];
            // Loose match to allow partial typing, but prioritize the specific doc type section
            // Ideally backend indexes as "Quotation: QTN-2023-001"
            filterValue = `%${val}%`;
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
