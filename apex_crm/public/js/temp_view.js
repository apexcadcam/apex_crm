// Apex CRM Lead List View Customizations
// Merge with existing listview_settings if any
if (!frappe.listview_settings['Lead']) {
    frappe.listview_settings['Lead'] = {};
}

// Store original callbacks if they exist
let original_onload = frappe.listview_settings['Lead'].onload;
let original_refresh = frappe.listview_settings['Lead'].refresh;
let original_get_filters = frappe.listview_settings['Lead'].get_filters;

// Add fields for card view
if (!frappe.listview_settings['Lead'].add_fields) {
    frappe.listview_settings['Lead'].add_fields = [];
}
frappe.listview_settings['Lead'].add_fields.push(
    'lead_name', 'status', 'lead_owner', 'source', 'city', 'state', 'country',
    'mobile_no', 'phone', 'email_id', 'creation', 'modified', 'custom_item__products',
    'territory', 'smart_contact_details'
);

// Merge onload callback
frappe.listview_settings['Lead'].onload = function (listview) {
    console.log('Apex CRM: onload called');
    // Call original onload if exists
    if (original_onload) {
        original_onload(listview);
    }

    // Setup Apex CRM features
    console.log('Apex CRM: Setting up buttons in onload');
    setupApexCRMButtons(listview);
    // Advanced search disabled
    // setupAdvancedSearch(listview);

    // Setup Card View for mobile
    setupLeadCardView(listview);
};

// Merge refresh callback
frappe.listview_settings['Lead'].refresh = function (listview) {
    console.log('Apex CRM: refresh called');
    // Call original refresh if exists
    if (original_refresh) {
        original_refresh(listview);
    }

    // Debounce - Prevent multiple executions
    if (listview.apex_crm_buttons_rendered) {
        console.log('Apex CRM: Already rendered, skipping');
        return;
    }
    listview.apex_crm_buttons_rendered = true;

    // Use requestAnimationFrame for better performance (runs after browser paint)
    requestAnimationFrame(function () {
        try {
            if (!listview || !listview.page || !listview.page.inner_toolbar) {
                console.log('Apex CRM: Toolbar not ready, retrying...');
                // If toolbar not ready, try again after short delay
                setTimeout(function () {
                    if (listview && listview.page && listview.page.inner_toolbar) {
                        console.log('Apex CRM: Toolbar ready, setting up buttons');
                        setupApexCRMButtons(listview);
                        // Advanced search disabled
                        // setupAdvancedSearch(listview);
                    } else {
                        console.warn('Apex CRM: Toolbar still not ready after timeout');
                    }
                }, 50);
                return;
            }

            console.log('Apex CRM: Setting up buttons in refresh');
            setupApexCRMButtons(listview);
            // Advanced search disabled
            // setupAdvancedSearch(listview);
        } catch (e) {
            console.error('Apex CRM UI Error:', e);
        }
    });
};

// Merge get_filters callback
frappe.listview_settings['Lead'].get_filters = function (listview) {
    // Call original get_filters if exists
    let original_filters = [];
    if (original_get_filters) {
        original_filters = original_get_filters(listview) || [];
    }

    // Apply custom search filters if search type is set
    let search_type = listview.apex_search_type || frappe.route_options?.apex_search_type;
    let search_value = listview.apex_search_value || frappe.route_options?.apex_search_value;

    if (search_type && search_value) {
        // For phone, note, email, and all - we need to get lead IDs first via API
        // For now, return empty and let the search function handle it
        if (search_type === 'name') {
            original_filters.push(['Lead', 'lead_name', 'like', `%${search_value}%`]);
        }
    }

    return original_filters;
};

// Format modified date
if (!frappe.listview_settings['Lead'].formatters) {
    frappe.listview_settings['Lead'].formatters = {};
}
frappe.listview_settings['Lead'].formatters.modified = function (value) {
    return value ? frappe.datetime.str_to_user(value) : '';
};

// Optimized button setup function (extracted for better performance)
function setupApexCRMButtons(listview) {
    const group_label = __('Apex CRM');

    // 1. Fetch permissions (async, non-blocking)
    frappe.call({
        method: 'apex_crm.api.get_apex_crm_button_permissions',
        callback: function (r) {
            if (!r.message || !listview || !listview.page) {
                console.warn('Apex CRM: No permissions or listview not ready');
                return;
            }

            let permissions = r.message;
            console.log('Apex CRM: Permissions received:', permissions);

            let actions = [];

            // Export/Import Manager
            if (permissions.export_import) {
                actions.push({
                    label: __('Export/Import Manager'),
                    action: function () {
                        frappe.set_route('exportimportmanager');
                    }
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
                    action: function () {
                        frappe.set_route('datamigrationmanager');
                    }
                });
            }

            // 3. Render Buttons (batch operation for better performance)
            if (actions.length > 0 && listview.page) {
                console.log('Apex CRM: Adding', actions.length, 'buttons to dropdown');

                // Clear potential duplicates first
                const existing_group = listview.page.inner_toolbar.find(`[data-label="${group_label}"]`);
                if (existing_group.length) {
                    listview.page.remove_inner_button(group_label);
                }

                // Add all buttons in one batch
                actions.forEach(item => {
                    listview.page.add_inner_button(item.label, item.action, group_label);
                });

                console.log('Apex CRM: ✓ Buttons added successfully');
            } else {
                console.warn('Apex CRM: No actions to add or listview.page not available');
            }

            // 4. Add Lead Search button (standalone, not in dropdown)
            if (listview.page && !listview.lead_search_button_added) {
                addLeadSearchButton(listview);
                listview.lead_search_button_added = true;
            }

            // 5. Add Kanban View button (standalone)
            if (listview.page && !listview.kanban_button_added) {
                listview.page.add_inner_button(__('Kanban View'), function () {
                    frappe.set_route('List', 'Lead', 'Kanban', 'Lead Status Kanban');
                });
                listview.kanban_button_added = true;
            }
        },
        error: function () {
            // Silently fail if permissions check fails
            console.warn('Apex CRM: Failed to fetch permissions');
        }
    });
}

// Advanced Search Setup
function setupAdvancedSearch(listview) {
    console.log('Apex CRM: setupAdvancedSearch called');

    // Check if search already exists
    if (listview.apex_search_initialized) {
        console.log('Apex CRM: Advanced search already initialized');
        return;
    }

    if (!listview || !listview.page || !listview.page.inner_toolbar) {
        console.warn('Apex CRM: Listview or toolbar not ready');
        return;
    }

    listview.apex_search_initialized = true;

    // Check if search already exists in toolbar
    if (listview.page.inner_toolbar.find('.apex-advanced-search').length) {
        console.log('Apex CRM: Advanced search already exists in toolbar');
        return;
    }

    // Add search box directly to the toolbar
    let search_html = `
        <div class="apex-advanced-search" style="display: inline-flex; align-items: center; gap: 8px; margin-left: 10px; padding: 4px 8px; background: #fff; border: 1px solid #d1d8dd; border-radius: 4px;">
            <i class="fa fa-search" style="color: #8d99a6;"></i>
            <input type="text" class="apex-search-value form-control input-sm" 
                placeholder="${__('Search leads...')}" 
                style="border: none; width: 250px; padding: 4px; box-shadow: none;" />
            <button class="btn btn-primary btn-xs apex-search-btn">
                <i class="fa fa-search"></i>
            </button>
            <button class="btn btn-default btn-xs apex-clear-search-btn">
                <i class="fa fa-times"></i>
            </button>
        </div>
    `;

    // Find Apex CRM button and add search after it
    let $apex_btn = listview.page.$page.find(`[data-label="Apex CRM"]`).closest(`.btn-group`);
    if ($apex_btn.length) {
        $apex_btn.after(search_html);
        console.log(`Apex CRM: Search box added after Apex CRM button`);
    } else {
        listview.page.inner_toolbar.append(search_html);
        console.log(`Apex CRM: Search box added to toolbar (fallback)`);
    }
    let $search_value = listview.page.$page.find(`.apex-search-value`);
    let $search_btn = listview.page.$page.find(`.apex-search-btn`);
    let $clear_btn = listview.page.$page.find(`.apex-clear-search-btn`);









    // Restore previous search if exists
    if (frappe.route_options?.apex_search_value) {
        $search_value.val(frappe.route_options.apex_search_value);
    }

    // Search on Enter key
    $search_value.on('keypress', function (e) {
        if (e.which === 13) { // Enter key
            $search_btn.click();
        }
    });

    // Search button click (searches in all fields: name, phone, note, comment)
    $search_btn.on('click', function () {
        let search_value = $search_value.val().trim();

        if (!search_value) {
            frappe.show_alert({
                message: __('Please enter a search term'),
                indicator: 'orange'
            }, 3);
            return;
        }

        // Store search in listview and route options
        listview.apex_search_value = search_value;

        if (!frappe.route_options) {
            frappe.route_options = {};
        }
        frappe.route_options.apex_search_value = search_value;

        // Search in all fields: name, phone, note, comment (like Lead Search in Form)
        frappe.call({
            method: 'apex_crm.api.search_leads_advanced',
            args: {
                search_type: 'all', // Search in all fields
                search_value: search_value
            },
            freeze: true,
            freeze_message: __('Searching...'),
            callback: function (r) {
                frappe.hide_progress();
                console.log('Apex CRM: Advanced search API response:', r);
                if (r.message && r.message && Array.isArray(r.message) && r.message.length > 0) {
                    console.log('Apex CRM: Found', r.message.length, 'leads:', r.message.slice(0, 5), '...');
                    // Clear all existing filters first (without refresh)
                    listview.filter_area.clear(false).then(function () {
                        console.log('Apex CRM: Filters cleared, adding new filter for', r.message.length, 'leads...');
                        // Add filter - add() will refresh automatically
                        return listview.filter_area.add([
                            ['Lead', 'name', 'in', r.message]
                        ]);
                    }).then(function () {
                        console.log('Apex CRM: Filter applied successfully, list should refresh now');
                        frappe.show_alert({
                            message: __('Found {0} result(s)', [r.message.length]),
                            indicator: 'green'
                        }, 3);
                    }).catch(function (err) {
                        console.error('Apex CRM: Filter error:', err);
                        frappe.show_alert({
                            message: __('Error applying filter: {0}', [err.message || String(err)]),
                            indicator: 'red'
                        }, 3);
                    });
                } else {
                    console.log('Apex CRM: No results found. Response:', r);
                    // Clear filters if no results
                    listview.filter_area.clear(true).then(function () {
                        frappe.show_alert({
                            message: __('No results found'),
                            indicator: 'orange'
                        }, 3);
                    });
                }
            }
        });
    });

    // Clear button click
    $clear_btn.on('click', function () {
        $search_value.val('');

        // Clear search
        listview.apex_search_value = null;

        if (frappe.route_options) {
            delete frappe.route_options.apex_search_value;
        }

        // Clear filter and refresh using filter_area (clear with refresh=true)
        listview.filter_area.clear(true);
    });

    console.log('Apex CRM: Advanced search UI created successfully');
}


// Lead Search Button Function
function addLeadSearchButton(listview) {
    if (!listview || !listview.page) {
        return;
    }

    // Add Lead Search button next to Apex CRM
    listview.page.add_inner_button(__('Lead Search'), function () {
        let search_timeout = null;
        let current_search = '';

        // Function to perform search
        function perform_search(search_value) {
            if (!search_value || !search_value.trim()) {
                // Clear filters if search is empty
                listview.filter_area.clear(true);
                return;
            }

            search_value = search_value.trim();

            // Don't search if it's the same as current search
            if (search_value === current_search) {
                return;
            }

            current_search = search_value;

            // Call search API
            frappe.call({
                method: 'apex_crm.api.search_leads_advanced',
                args: {
                    search_type: 'all',
                    search_value: search_value
                },
                freeze: false, // Don't freeze for live search
                callback: function (r) {
                    console.log('Apex CRM: Search API response:', r);
                    if (r.message && Array.isArray(r.message) && r.message.length > 0) {
                        console.log('Apex CRM: Found', r.message.length, 'leads:', r.message.slice(0, 5), '...');
                        // Clear all existing filters first (without refresh)
                        listview.filter_area.clear(false).then(function () {
                            console.log('Apex CRM: Filters cleared, adding new filter for', r.message.length, 'leads...');
                            // Add filter - add() will refresh automatically
                            return listview.filter_area.add([
                                ['Lead', 'name', 'in', r.message]
                            ]);
                        }).then(function () {
                            console.log('Apex CRM: Filter applied successfully, list should refresh now');
                            // Show result count in description
                            if (d && d.fields_dict && d.fields_dict.search_value) {
                                let desc_text = __('Search in names, phones, notes, comments, emails') +
                                    ' - ' + __('Found {0} result(s)', [r.message.length]);
                                d.fields_dict.search_value.df.description = desc_text;
                                d.fields_dict.search_value.refresh();
                            }
                        }).catch(function (err) {
                            console.error('Apex CRM: Filter error:', err);
                        });
                    } else {
                        console.log('Apex CRM: No results found. Response:', r);
                        // Clear filters if no results
                        listview.filter_area.clear(true).then(function () {
                            // Update description
                            if (d && d.fields_dict && d.fields_dict.search_value) {
                                let desc_text = __('Search in names, phones, notes, comments, emails') +
                                    ' - ' + __('No results found');
                                d.fields_dict.search_value.df.description = desc_text;
                                d.fields_dict.search_value.refresh();
                            }
                        });
                    }
                }
            });
        }

        // Create search dialog
        let d = new frappe.ui.Dialog({
            title: __('Lead Search'),
            fields: [
                {
                    fieldname: 'search_value',
                    fieldtype: 'Data',
                    label: __('Search Term'),
                    description: __('Search in names, phones, notes, comments, emails'),
                    reqd: 0 // Not required for live search
                }
            ],
            primary_action_label: __('Close'),
            primary_action: function (values) {
                d.hide();
            }
        });

        d.show();

        // Get the input field
        let $input = d.fields_dict.search_value.$input;

        // Focus on search input
        $input.focus();

        // Bind input event with debounce for live search
        $input.on('input', function () {
            let search_value = $(this).val();

            // Clear existing timeout
            if (search_timeout) {
                clearTimeout(search_timeout);
            }

            // Set new timeout (debounce - wait 500ms after user stops typing)
            search_timeout = setTimeout(function () {
                perform_search(search_value);
            }, 500);
        });

        // Also allow Enter key for immediate search
        $input.on('keypress', function (e) {
            if (e.which === 13) { // Enter key
                e.preventDefault();
                if (search_timeout) {
                    clearTimeout(search_timeout);
                }
                perform_search($(this).val());
            }
        });

        // Clear search when dialog is closed
        d.onhide = function () {
            if (search_timeout) {
                clearTimeout(search_timeout);
            }
            current_search = '';
        };
    });

    console.log('Apex CRM: Lead Search button added');
}

// ============================================
// Phase 3: CRM Dashboard - Card View for Mobile
// ============================================

function setupLeadCardView(listview) {
    global_listview_ref = listview; // Store reference for status update
    const isMobile = () => window.innerWidth <= 768;
    let $cardsContainer = null;

    const ensureCardsContainer = () => {
        if ($cardsContainer && $cardsContainer.length) {
            return $cardsContainer;
        }

        $cardsContainer = $("#lead-cards-container");
        if (!$cardsContainer.length) {
            $cardsContainer = $('<div id="lead-cards-container"></div>');

            if (listview.$result && listview.$result.length) {
                listview.$result.before($cardsContainer);
            } else if (listview.$container) {
                listview.$container.append($cardsContainer);
            } else {
                $(listview.wrapper || document.body).append($cardsContainer);
            }
        }
        return $cardsContainer;
    };


    // Create mobile search bar
    const createMobileSearchBar = () => {
Check if search bar already exists
            ($("#lead-mobile-search-bar").length) {
            $("#lead-mobile-search-bar");
st searchBarHtml = `
id="lead-mobile-search-bar" style="
g: 12px 15px;
d: #fff;
1px solid #e2e6ea;
: sticky;
0;
dex: 100;
0 2px 4px rgba(0,0,0,0.05);
style="
: flex;
-items: center;
8px;
d: #f7f9fc;
1px solid #d1d8dd;
8px;
g: 8px 12px;
class="fa fa-search" style="color: #8d99a6; font-size: 16px;"></i>
put 
pe="text" 
put"
عن اسم، رقم، عنوان..."
le="
1;
none;
d: transparent;
t-size: 15px;
e: none;
g: 0;
#333;
 
le="
d: none;
none;
#8d99a6;
t-size: 18px;
pointer;
g: 0;
: none;
class="fa fa-times-circle"></i>
>
st $searchBar = $(searchBarHtml);
Insert search bar before cards container
st container = ensureCardsContainer();
tainer.before($searchBar);

Bind search events
st $input = $("#lead-mobile-search-input");
st $clearBtn = $("#lead-mobile-search-clear");
searchTimeout = null;

Show/hide clear button based on input
put.on('input', function() {
st value = $(this).val().trim();
(value) {
.show();
else {
.hide();
Debounce search
(searchTimeout) {

= setTimeout(() => {
500);
Clear button click
.on('click', function() {
put.val('');
.hide();

Enter key to search immediately
put.on('keypress', function(e) {
(e.which === 13) {
tDefault();
(searchTimeout) {
 $searchBar;
};

// Perform mobile search using custom_search_index
const performMobileSearch = (searchValue) => {
(!searchValue) {
Clear filter and show all leads
;
Use the custom_search_index field to filter
(() => {
 listview.filter_area.add([
'custom_search_index', 'like', `% ${ searchValue }% `]
=> {
sole.error('Mobile search filter error:', err);
__('Search error: {0}', [err.message || String(err)]),
dicator: 'red'
3);
    const formatDate = (date_str) => {
        if (!date_str) return '';
        try {
            // Use Frappe's datetime formatter (same as Datetime field formatter)
            if (frappe.boot && frappe.boot.sysdefaults) {
                const formatted = moment(frappe.datetime.convert_to_user_tz(date_str)).format(
                    (frappe.boot.sysdefaults.date_format || 'YYYY-MM-DD').toUpperCase() +
                    ' | ' +
                    (frappe.boot.sysdefaults.time_format || 'HH:mm')
                );
                return formatted;
            } else {
                // Fallback if sysdefaults not available
                return moment(frappe.datetime.convert_to_user_tz(date_str)).format('YYYY-MM-DD | HH:mm');
            }
        } catch (e) {
            console.error('Error formatting date:', e, date_str);
            return date_str;
        }
    };

    const maskPhone = (phone) => {
        if (!phone) return '';
        // Remove all non-digits
        const digits = phone.replace(/\D/g, '');
        if (digits.length <= 7) return phone;
        // Show first 6 digits and mask the rest
        const visible = digits.substring(0, 6);
        const masked = '*'.repeat(Math.min(4, digits.length - 6));
        return '+20 ' + visible.substring(0, 3) + ' ' + visible.substring(3) + ' ' + masked;
    };

    const getPrimaryMobile = (doc) => {
        // Try to get mobile from doc data
        if (doc.mobile_no) return doc.mobile_no;
        // Try custom fields
        if (doc.custom_mobile_number_1) return doc.custom_mobile_number_1;
        if (doc.phone) return doc.phone;
        return '';
    };

    // Helper to get contact icon and action
    const getContactAction = (contact) => {
        const type = contact.type || '';
        const value = contact.value || '';
        const clean_number = value.replace(/[^0-9]/g, '');
        const full_value = (contact.country_code || '') + clean_number;

        let icon = 'fa fa-globe';
        let color = '#6b7280';
        let action_type = 'Other';
        let href = '#';

        if (type === 'Mobile' || type === 'Phone') {
            icon = 'fa fa-phone';
            color = '#3b82f6';
            action_type = 'Call';
            href = `tel:${ full_value } `;
        } else if (type === 'WhatsApp') {
            icon = 'fa fa-whatsapp';
            color = '#25D366';
            action_type = 'WhatsApp';
            href = `https://wa.me/${clean_number}`;
        } else if (type === 'Email') {
            icon = 'fa fa-envelope';
            color = '#ea4335';
            action_type = 'Email';
            href = `mailto:${value}`;
        } else if (type === 'Facebook') {
            icon = 'fa fa-facebook';
            color = '#1877f2';
            action_type = 'Facebook';
            href = value.startsWith('http') ? value : `https://${value}`;
        } else if (type === 'Instagram') {
            icon = 'fa fa-instagram';
            color = '#c32aa3';
            action_type = 'Instagram';
            href = value.startsWith('http') ? value : `https://${value}`;
        } else if (type === 'LinkedIn') {
            icon = 'fa fa-linkedin';
            color = '#0077b5';
            action_type = 'LinkedIn';
            href = value.startsWith('http') ? value : `https://${value}`;
        } else if (type === 'Telegram') {
            icon = 'fa fa-telegram';
            color = '#0088cc';
            action_type = 'Telegram';
            href = value.startsWith('@') ? `https://t.me/${value.substring(1)}` : `https://t.me/${clean_number}`;
        }

        return { icon, color, action_type, href, value: full_value || value };
    };

    const createLeadCard = (doc) => {
        const lead_name = doc.lead_name || doc.name;
        const status = doc.status || 'Open';
        const mobile = getPrimaryMobile(doc);
        const masked_mobile = maskPhone(mobile);
        const formatted_date = formatDate(doc.creation || doc.modified);
        const source = doc.source || '';
        const owner = doc.lead_owner || '';
        const territory = doc.territory || '';

        // Debug: Log what createLeadCard receives
        console.log("[createLeadCard] Creating card for:", doc.name, "task_count:", doc.task_count, "note_count:", doc.note_count);
        // Ensure counts are numbers
        const task_count = parseInt(doc.task_count) || 0;
        const event_count = parseInt(doc.event_count) || 0;
        const note_count = parseInt(doc.note_count) || 0;
        const quotation_count = parseInt(doc.quotation_count) || 0;
        const prospect_count = parseInt(doc.prospect_count) || 0;
        const opportunity_count = parseInt(doc.opportunity_count) || 0;

        // Get smart_contact_details
        const contacts = doc.smart_contact_details || [];
        const primary_contact = contacts.find(c => ['Mobile', 'Phone'].includes(c.type)) || contacts[0] || null;
        const other_contacts = contacts.filter(c => c !== primary_contact).slice(0, 3); // Max 3 additional contacts

        // Status badge colors
        const statusColors = {
            'Open': 'blue',
            'Replied': 'green',
            'Interested': 'purple',
            'Converted': 'green',
            'Not Interested': 'red'
        };
        const statusColor = statusColors[status] || 'gray';

        // Build contact actions HTML
        let contactActionsHtml = '';
        if (primary_contact) {
            const contactAction = getContactAction(primary_contact);
            const clean_number = (primary_contact.value || '').replace(/[^0-9]/g, '');
            const full_value = (primary_contact.country_code || '') + clean_number;

            contactActionsHtml = `
                <a href="${contactAction.href}" 
                   class="lead-card-action-btn log-interaction-btn" 
                   data-lead-name="${frappe.utils.escape_html(doc.name)}"
                   data-action-type="${contactAction.action_type}"
                   data-value="${frappe.utils.escape_html(contactAction.value)}"
                   ${contactAction.action_type === 'Email' ? '' : 'target="_blank"'}
                   title="${contactAction.action_type}"
                   style="color: ${contactAction.color};">
                    <i class="${contactAction.icon}"></i>
                </a>
            `;

            // Add SMS button for Mobile/Phone contacts
            if (['Mobile', 'Phone'].includes(primary_contact.type) && full_value) {
                contactActionsHtml += `
                    <a href="sms:${full_value}" 
                       class="lead-card-action-btn log-interaction-btn" 
                       data-lead-name="${frappe.utils.escape_html(doc.name)}"
                       data-action-type="SMS"
                       data-value="${frappe.utils.escape_html(full_value)}"
                       title="SMS"
                       style="color: #f39c12;">
                        <i class="fa fa-comment"></i>
                    </a>
                `;
            }
        } else if (mobile) {
            const clean_mobile = mobile.replace(/\D/g, '');
            contactActionsHtml = `
                <a href="tel:${mobile}" 
                   class="lead-card-action-btn log-interaction-btn" 
                   data-lead-name="${frappe.utils.escape_html(doc.name)}"
                   data-action-type="Call"
                   data-value="${frappe.utils.escape_html(mobile)}"
                   title="Call"
                   style="color: #3b82f6;">
                    <i class="fa fa-phone"></i>
                </a>
                <a href="sms:${mobile}" 
                   class="lead-card-action-btn log-interaction-btn" 
                   data-lead-name="${frappe.utils.escape_html(doc.name)}"
                   data-action-type="SMS"
                   data-value="${frappe.utils.escape_html(mobile)}"
                   title="SMS"
                   style="color: #f39c12;">
                    <i class="fa fa-comment"></i>
                </a>
                <a href="https://wa.me/${clean_mobile}" 
                   target="_blank"
                   class="lead-card-action-btn log-interaction-btn" 
                   data-lead-name="${frappe.utils.escape_html(doc.name)}"
                   data-action-type="WhatsApp"
                   data-value="${frappe.utils.escape_html(mobile)}"
                   title="WhatsApp"
                   style="color: #25D366;">
                    <i class="fa fa-whatsapp"></i>
                </a>
            `;
        }

        // Build other contacts HTML
        let otherContactsHtml = '';
        if (other_contacts.length > 0) {
            otherContactsHtml = other_contacts.map(contact => {
                const contactAction = getContactAction(contact);
                return `
                    <a href="${contactAction.href}" 
                       class="lead-card-other-contact log-interaction-btn" 
                       data-lead-name="${frappe.utils.escape_html(doc.name)}"
                       data-action-type="${contactAction.action_type}"
                       data-value="${frappe.utils.escape_html(contactAction.value)}"
                       ${contactAction.action_type === 'Email' ? '' : 'target="_blank"'}
                       title="${contactAction.action_type}"
                       style="color: ${contactAction.color};">
                        <i class="${contactAction.icon}"></i>
                    </a>
                `;
            }).join('');
        }

        const cardHtml = `
            <div class="lead-card" data-name="${frappe.utils.escape_html(doc.name)}">
                <div class="lead-card-header">
                    <div class="lead-card-name-section">
                        <h3 class="lead-card-name">${frappe.utils.escape_html(lead_name)}</h3>
                    </div>
                    <div class="lead-card-status-badge status-${statusColor}" data-name="${frappe.utils.escape_html(doc.name)}" data-current-status="${frappe.utils.escape_html(status)}" style="cursor: pointer;">
                        ${frappe.utils.escape_html(status)}
                    </div>
                </div>
                
                <div class="lead-card-date">
                    ${formatted_date}
                </div>
                
                <div class="lead-card-details">
                    ${territory ? `
                        <div class="lead-card-detail-item">
                            <i class="fa fa-map-marker-alt"></i>
                            <span>${frappe.utils.escape_html(territory)}</span>
                        </div>
                    ` : ''}
                    ${source ? `
                        <div class="lead-card-detail-item">
                            <i class="fa fa-tag"></i>
                            <span>${frappe.utils.escape_html(source)}</span>
                        </div>
                    ` : ''}
                    ${owner ? `
                        <div class="lead-card-detail-item">
                            <i class="fa fa-user"></i>
                            <span>${frappe.utils.escape_html(owner)}</span>
                        </div>
                    ` : ''}
                </div>
                
                ${primary_contact || mobile ? `
                    <div class="lead-card-contact">
                        <div class="lead-card-phone-section">
                            ${primary_contact ? (() => {
                    let displayValue = primary_contact.value || '';
                    // If value doesn't start with + and country_code exists, prepend it
                    if (primary_contact.country_code && !displayValue.startsWith('+') && !displayValue.startsWith(primary_contact.country_code)) {
                        displayValue = primary_contact.country_code + displayValue;
                    }
                    // Fallback to mobile if value is empty
                    if (!displayValue && mobile) {
                        displayValue = mobile;
                    }
                    return `
                                    <span class="lead-card-contact-label">${frappe.utils.escape_html(primary_contact.type)}</span>
                                    <span class="lead-card-phone">${frappe.utils.escape_html(displayValue)}</span>
                                `;
                })() : `
                                <span class="lead-card-country-code">EG</span>
                                <span class="lead-card-phone">${mobile || masked_mobile}</span>
                            `}
                        </div>
                        <div class="lead-card-contact-actions">
                            ${contactActionsHtml}
                            ${otherContactsHtml}
                        </div>
                    </div>
                ` : ''}
                
                <div class="lead-card-actions">
                    <button class="lead-card-action-button task-btn" data-name="${frappe.utils.escape_html(doc.name)}" data-count="${task_count}">
                        <i class="fa fa-check-square"></i>
                        <span class="btn-label">Task</span>
                        <span class="action-count" data-lead-name="${frappe.utils.escape_html(doc.name)}" data-action="task">${task_count}</span>
                    </button>
                    <button class="lead-card-action-button event-btn" data-name="${frappe.utils.escape_html(doc.name)}" data-count="${event_count}">
                        <i class="fa fa-calendar"></i>
                        <span class="btn-label">Event</span>
                        <span class="action-count" data-lead-name="${frappe.utils.escape_html(doc.name)}" data-action="event">${event_count}</span>
                    </button>
                    <button class="lead-card-action-button note-btn" data-name="${frappe.utils.escape_html(doc.name)}" data-count="${note_count}">
                        <i class="fa fa-sticky-note"></i>
                        <span class="btn-label">Note</span>
                        <span class="action-count" data-lead-name="${frappe.utils.escape_html(doc.name)}" data-action="note">${note_count}</span>
                    </button>
                    ${quotation_count > 0 ? `
                        <button class="lead-card-action-button quotation-btn" data-name="${frappe.utils.escape_html(doc.name)}" data-count="${quotation_count}" title="Quotation">
                            <i class="fa fa-file-invoice"></i>
                            <span>Quotation</span>
                            <span class="action-count">${quotation_count}</span>
                        </button>
                    ` : ''}
                    ${prospect_count > 0 ? `
                        <button class="lead-card-action-button prospect-btn" data-name="${frappe.utils.escape_html(doc.name)}" data-count="${prospect_count}" title="Prospect">
                            <i class="fa fa-user-tie"></i>
                            <span>Prospect</span>
                            <span class="action-count">${prospect_count}</span>
                        </button>
                    ` : ''}
                    ${opportunity_count > 0 ? `
                        <button class="lead-card-action-button opportunity-btn" data-name="${frappe.utils.escape_html(doc.name)}" data-count="${opportunity_count}" title="Opportunity">
                            <i class="fa fa-briefcase"></i>
                            <span>Opportunity</span>
                            <span class="action-count">${opportunity_count}</span>
                        </button>
                    ` : ''}
                    <button class="lead-card-action-button add-btn" data-name="${frappe.utils.escape_html(doc.name)}" title="Add Action">
                        <i class="fa fa-plus"></i>
                    </button>
                </div>
            </div>
        `;

        return $(cardHtml);
    };

    const renderCards = () => {
        if (!isMobile()) {
            if ($cardsContainer) {
                $cardsContainer.hide();
            }
            return;
        }

        const container = ensureCardsContainer();

        // Create search bar for mobile view
        createMobileSearchBar();

        container.empty();

        const data = listview.data || [];
        if (!data.length) {
            container.html('<div class="lead-cards-empty">لا توجد بيانات</div>');
            return;
        }

        // Fetch counts for all leads in parallel
        const leadNames = data.map(doc => doc.name);
        frappe.call({
            method: 'apex_crm.api.get_leads_dashboard_data_batch',
            args: { leads: leadNames },
            callback: function (r) {
                const counts = r.message || {};

                console.log('API Response - counts:', counts);

                // Assign counts directly to doc objects (like desktop view does)
                data.forEach((doc) => {
                    const leadCounts = counts[doc.name] || {};

                    // Directly assign counts to doc object
                    doc.task_count = parseInt(leadCounts.tasks) || 0;
                    doc.event_count = parseInt(leadCounts.events) || 0;
                    doc.note_count = parseInt(leadCounts.notes) || 0;
                    doc.quotation_count = parseInt(leadCounts.quotations) || 0;
                    doc.prospect_count = parseInt(leadCounts.prospects) || 0;
                    doc.opportunity_count = parseInt(leadCounts.opportunities) || 0;

                    // Debug: Log counts
                    console.log('Lead counts for', doc.name, doc.lead_name, {
                        tasks: doc.task_count,
                        events: doc.event_count,
                        notes: doc.note_count,
                        from_api: leadCounts
                    });
                });

                // Render cards with counts
                data.forEach((doc) => {
                    const card = createLeadCard(doc);
                    container.append(card);
                });

                // Bind events after rendering
                bindCardEvents(container);

                // Re-bind status badge clicks (they were already bound, but ensure they work)
                container.find('.lead-card-status-badge').off('click').on('click', function (e) {
                    e.stopPropagation();
                    const lead_name = $(this).attr('data-name');
                    const current_status = $(this).attr('data-current-status');
                    showStatusDropdown(lead_name, current_status, $(this), e);
                });
            },
            error: function () {
                // If API fails, render without counts
                data.forEach((doc) => {
                    doc.task_count = 0;
                    doc.event_count = 0;
                    doc.note_count = 0;
                    doc.quotation_count = 0;
                    doc.prospect_count = 0;
                    doc.opportunity_count = 0;
                    const card = createLeadCard(doc);
                    container.append(card);
                });
                bindCardEvents(container);
            }
        });
    };

    const bindCardEvents = (container) => {

        // Bind click events
        container.find('.lead-card').on('click', function (e) {
            // Don't navigate if clicking on action buttons or status badge
            if ($(e.target).closest('.lead-card-actions, .lead-card-contact-actions, .lead-card-status-badge').length) {
                return;
            }
            const name = $(this).attr('data-name');
            frappe.set_route('Form', 'Lead', name);
        });

        // Bind status badge click to show dropdown
        container.find('.lead-card-status-badge').on('click', function (e) {
            e.stopPropagation();
            const lead_name = $(this).attr('data-name');
            const current_status = $(this).attr('data-current-status');
            showStatusDropdown(lead_name, current_status, $(this), e);
        });

        // Bind interaction logging buttons
        container.find('.log-interaction-btn').on('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            const lead_name = $(this).attr('data-lead-name');
            const action_type = $(this).attr('data-action-type');
            const value = $(this).attr('data-value');

            // First, execute the action (call, WhatsApp, etc.)
            const href = $(this).attr('href');
            if (href && href !== '#') {
                if (action_type === 'Email') {
                    window.location.href = href;
                } else {
                    window.open(href, action_type === 'Call' || action_type === 'SMS' ? '_self' : '_blank');
                }
            }

            // Then open Lead form and log interaction
            frappe.set_route('Form', 'Lead', lead_name).then(() => {
                // Wait for form to load
                setTimeout(() => {
                    if (window.apex_crm && window.apex_crm.log_interaction && cur_frm && cur_frm.doc.name === lead_name) {
                        window.apex_crm.log_interaction(cur_frm, action_type, value);
                    } else {
                        // Fallback: try again after a longer delay
                        setTimeout(() => {
                            if (window.apex_crm && window.apex_crm.log_interaction && cur_frm && cur_frm.doc.name === lead_name) {
                                window.apex_crm.log_interaction(cur_frm, action_type, value);
                            }
                        }, 1000);
                    }
                }, 800);
            });
        });

        // Bind action buttons - separate handlers for count badge and button
        // Task button - click on count badge to view, click on button to create
        container.find('.task-btn .action-count').on('click', function (e) {
            e.stopPropagation();
            e.preventDefault();
            const name = $(this).attr('data-lead-name');
            const count = parseInt($(this).closest('.task-btn').attr('data-count')) || 0;

            console.log('Task count clicked:', { name, count });

            if (count > 0) {
                frappe.set_route('List', 'ToDo', {
                    'reference_type': 'Lead',
                    'reference_name': name,
                    'status': 'Open'
                });
            } else {
                frappe.show_alert({
                    message: __('No tasks found for this lead'),
                    indicator: 'orange'
                }, 3);
            }
        });

        container.find('.task-btn').on('click', function (e) {
            // Don't trigger if clicking on the count badge
            if ($(e.target).hasClass('action-count') || $(e.target).closest('.action-count').length > 0) {
                return;
            }

            e.stopPropagation();
            const name = $(this).attr('data-name');

            console.log('Task button clicked:', { name });

            frappe.db.get_doc('Lead', name).then(function (lead_doc) {
                const args = {
                    doc: lead_doc,
                    frm: cur_frm || null,
                    title: __('New Task'),
                };
                let composer = new frappe.views.InteractionComposer(args);
                composer.dialog.get_field("interaction_type").set_value("ToDo");
                $(composer.dialog.get_field("interaction_type").wrapper).closest(".form-column").hide();
                if (composer.dialog.fields_dict.summary) {
                    $(composer.dialog.get_field("summary").wrapper).closest(".form-section").hide();
                }
            });
        });

        // Event button - click on count badge to view, click on button to create
        container.find('.event-btn .action-count').on('click', function (e) {
            e.stopPropagation();
            e.preventDefault();
            const name = $(this).attr('data-lead-name');
            const count = parseInt($(this).closest('.event-btn').attr('data-count')) || 0;

            console.log('Event count clicked:', { name, count });

            if (count > 0) {
                frappe.set_route('List', 'Event', {
                    'ref_type': 'Lead',
                    'ref_name': name,
                    'status': 'Open'
                });
            } else {
                frappe.show_alert({
                    message: __('No events found for this lead'),
                    indicator: 'orange'
                }, 3);
            }
        });

        container.find('.event-btn').on('click', function (e) {
            // Don't trigger if clicking on the count badge
            if ($(e.target).hasClass('action-count') || $(e.target).closest('.action-count').length > 0) {
                return;
            }

            e.stopPropagation();
            const name = $(this).attr('data-name');

            console.log('Event button clicked:', { name });

            frappe.db.get_doc('Lead', name).then(function (lead_doc) {
                const args = {
                    doc: lead_doc,
                    frm: cur_frm || null,
                    title: __('New Event'),
                };
                let composer = new frappe.views.InteractionComposer(args);
                composer.dialog.get_field("interaction_type").set_value("Event");
                $(composer.dialog.get_field("interaction_type").wrapper).hide();
                if (composer.dialog.fields_dict.sync_with_google_calendar) {
                    composer.dialog.set_value("sync_with_google_calendar", 0);
                }
            });
        });

        // Note button - click on count badge to view, click on button to create
        container.find('.note-btn .action-count').on('click', function (e) {
            e.stopPropagation();
            e.preventDefault();
            const name = $(this).attr('data-lead-name');
            const count = parseInt($(this).closest('.note-btn').attr('data-count')) || 0;

            console.log('Note count clicked:', { name, count });

            // Always open Lead form and show notes tab (like desktop view)
            frappe.set_route('Form', 'Lead', name).then(() => {
                // Wait for form to load
                let checkCount = 0;
                const checkForm = setInterval(() => {
                    checkCount++;
                    if (cur_frm && cur_frm.doc && cur_frm.doc.name === name) {
                        clearInterval(checkForm);

                        // Find and show Comments/Notes tab
                        if (cur_frm.tabs && cur_frm.tabs.length > 0) {
                            cur_frm.tabs.forEach(function (tab) {
                                const tabLabel = tab.label || tab.df.label;
                                if (tabLabel && (
                                    tabLabel.includes('Comment') ||
                                    tabLabel.includes('Note') ||
                                    tabLabel.includes('تعليق') ||
                                    tabLabel.includes('ملاحظ')
                                )) {
                                    cur_frm.tabs.show(tab);
                                }
                            });
                        }

                        // Scroll to notes section after tab is shown
                        setTimeout(() => {
                            if (cur_frm.fields_dict.notes_html && cur_frm.fields_dict.notes_html.wrapper) {
                                const $notesWrapper = $(cur_frm.fields_dict.notes_html.wrapper);
                                if ($notesWrapper.length) {
                                    $('html, body').animate({
                                        scrollTop: $notesWrapper.offset().top - 150
                                    }, 400);
                                }
                            }
                        }, 300);
                    } else if (checkCount > 20) {
                        clearInterval(checkForm);
                        console.error('Form not loaded after 10 seconds');
                    }
                }, 500);
            });
        });

        container.find('.note-btn').on('click', function (e) {
            // Don't trigger if clicking on the count badge
            if ($(e.target).hasClass('action-count') || $(e.target).closest('.action-count').length > 0) {
                return;
            }

            e.stopPropagation();
            const name = $(this).attr('data-name');

            console.log('Note button clicked:', { name });

            // Open new note dialog
            frappe.db.get_doc('Lead', name).then(function (lead_doc) {
                frappe.set_route('Form', 'Lead', name).then(() => {
                    setTimeout(() => {
                        if (cur_frm && cur_frm.fields_dict.notes_html) {
                            let $note_btn = $(cur_frm.fields_dict.notes_html.wrapper).find('.new-note-btn');
                            if ($note_btn.length > 0) {
                                $note_btn.click();
                            } else {
                                let $global_btn = $('.new-note-btn');
                                if ($global_btn.length > 0) {
                                    $global_btn.first().click();
                                }
                            }
                        }
                    }, 500);
                });
            });
        });

        container.find('.quotation-btn').on('click', function (e) {
            e.stopPropagation();
            const name = $(this).attr('data-name');
            frappe.set_route('List', 'Quotation', {
                'party_name': name,
                'quotation_to': 'Lead'
            });
        });

        container.find('.prospect-btn').on('click', function (e) {
            e.stopPropagation();
            const name = $(this).attr('data-name');
            // Prospect is linked through Prospect Lead child table
            // Open Lead form to see linked prospects
            frappe.set_route('Form', 'Lead', name);
        });

        container.find('.opportunity-btn').on('click', function (e) {
            e.stopPropagation();
            const name = $(this).attr('data-name');
            frappe.set_route('List', 'Opportunity', {
                'opportunity_from': 'Lead',
                'party_name': name
            });
        });

        container.find('.add-btn').on('click', function (e) {
            e.stopPropagation();
            const name = $(this).attr('data-name');
            showAddActionsDialog(name);
        });
    };

    // Override render function
    const originalRender = listview.render.bind(listview);
    listview.render = function () {
        originalRender();
        // Use setTimeout to ensure data is loaded
        setTimeout(() => {
            renderCards();
        }, 100);
    };

    // Re-render on window resize
    const debounceResize = frappe.utils.debounce(() => {
        renderCards();
    }, 300);
    $(window).on('resize', debounceResize);

    // Initial render
    setTimeout(() => {
        renderCards();
    }, 500);

    // Add styles
    addLeadCardStyles();
}

let global_listview_ref = null;

function showStatusDropdown(lead_name, current_status, $badge, event) {
    // Status options from Lead DocType
    const status_options = ['Lead', 'Open', 'Replied', 'Opportunity', 'Quotation', 'Lost Quotation', 'Interested', 'Converted', 'Do Not Contact'];

    // Status colors mapping
    const statusColors = {
        'Open': 'blue',
        'Replied': 'green',
        'Interested': 'purple',
        'Converted': 'green',
        'Lost Quotation': 'red',
        'Do Not Contact': 'red',
        'Lead': 'gray',
        'Opportunity': 'blue',
        'Quotation': 'blue'
    };

    // Remove any existing dropdown
    $('.status-dropdown-menu').remove();

    // Create dropdown menu HTML
    const dropdown_id = 'status-dropdown-' + frappe.utils.get_random(8);
    const $dropdown_wrapper = $(`
        <div class="dropdown" style="position: relative; display: inline-block;">
            <ul class="dropdown-menu status-dropdown-menu" id="${dropdown_id}" style="display: block; position: absolute; top: 100%; left: 0; z-index: 1000; min-width: 150px; padding: 5px 0; margin: 2px 0 0; background-color: #fff; border: 1px solid rgba(0,0,0,.15); border-radius: 4px; box-shadow: 0 6px 12px rgba(0,0,0,.175);">
            </ul>
        </div>
    `);

    // Add status options to dropdown
    status_options.forEach(status => {
        const $item = $(`
            <li>
                <a href="#" class="dropdown-item status-dropdown-item" data-status="${frappe.utils.escape_html(status)}" style="display: block; padding: 8px 20px; clear: both; font-weight: normal; line-height: 1.42857143; color: #333; white-space: nowrap; text-decoration: none;">
                    ${frappe.utils.escape_html(status)}
                </a>
            </li>
        `);

        $item.find('a').on('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            const new_status = $(this).attr('data-status');

            if (new_status === current_status) {
                $dropdown_wrapper.remove();
                return;
            }

            frappe.call({
                method: 'frappe.client.set_value',
                args: {
                    doctype: 'Lead',
                    name: lead_name,
                    fieldname: 'status',
                    value: new_status
                },
                freeze: true,
                callback: function (r) {
                    if (!r.exc) {
                        // Update badge
                        $badge.attr('data-current-status', new_status);
                        $badge.text(new_status);

                        // Update badge color
                        const newColor = statusColors[new_status] || 'gray';
                        $badge.removeClass('status-blue status-green status-purple status-red status-gray');
                        $badge.addClass('status-' + newColor);

                        frappe.show_alert({
                            message: __('Status updated successfully'),
                            indicator: 'green'
                        }, 3);

                        // Refresh listview to update data
                        if (global_listview_ref && global_listview_ref.refresh) {
                            setTimeout(() => {
                                global_listview_ref.refresh();
                            }, 500);
                        }
                    }
                    $dropdown_wrapper.remove();
                }
            });
        });

        $dropdown_wrapper.find('ul').append($item);
    });

    // Position dropdown relative to badge
    const badge_position = $badge.position();
    const badge_offset = $badge.offset();
    $dropdown_wrapper.css({
        position: 'absolute',
        left: badge_offset.left + 'px',
        top: (badge_offset.top + $badge.outerHeight() + 2) + 'px',
        zIndex: 1050
    });

    // Append to body and show
    $('body').append($dropdown_wrapper);

    // Close dropdown when clicking outside
    $(document).on('click.status-dropdown', function (e) {
        if (!$(e.target).closest('.status-dropdown-menu, .lead-card-status-badge').length) {
            $dropdown_wrapper.remove();
            $(document).off('click.status-dropdown');
        }
    });
}


function showAddActionsDialog(lead_name) {
    let d = new frappe.ui.Dialog({
        title: __('Add Actions'),
        fields: [],
        size: 'large',
        primary_action_label: __('Close'),
        primary_action: function () {
            d.hide();
        }
    });

    // Make dialog background transparent
    $(d.wrapper).css({
        'background': 'rgba(0, 0, 0, 0.5)',
        'backdrop-filter': 'blur(4px)'
    });

    $(d.wrapper).find('.modal-content').css({
        'background': 'rgba(255, 255, 255, 0.95)',
        'backdrop-filter': 'blur(10px)',
        'border': '1px solid rgba(255, 255, 255, 0.3)',
        'box-shadow': '0 8px 32px rgba(0, 0, 0, 0.1)'
    });

    // Create action buttons container
    const actionsContainer = $(`
        <div class="add-actions-container" style="padding: 20px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
        </div>
    `);

    // Define actions
    const actions = [
        {
            label: __('New Note'),
            icon: 'fa fa-sticky-note',
            color: '#fbbf24',
            action: () => {
                d.hide();
                // Open Note dialog (same as standard CRM Notes)
                let note_dialog = new frappe.ui.Dialog({
                    title: __('Add a Note'),
                    fields: [
                        {
                            label: __('Note'),
                            fieldname: 'note',
                            fieldtype: 'Text Editor',
                            reqd: 1,
                            enable_mentions: true,
                        },
                    ],
                    primary_action: function () {
                        let note_data = note_dialog.get_values();
                        // Get Lead document and call add_note method
                        frappe.db.get_doc('Lead', lead_name).then(function (lead_doc) {
                            frappe.call({
                                method: 'add_note',
                                doc: lead_doc,
                                args: {
                                    note: note_data.note,
                                },
                                freeze: true,
                                callback: function (result) {
                                    if (!result.exc) {
                                        frappe.show_alert({
                                            message: __('Note added successfully'),
                                            indicator: 'green'
                                        }, 3);
                                    } else {
                                        frappe.show_alert({
                                            message: __('Failed to add note'),
                                            indicator: 'red'
                                        }, 3);
                                    }
                                    note_dialog.hide();
                                },
                            });
                        }).catch(function (error) {
                            frappe.show_alert({
                                message: __('Error: Could not load Lead'),
                                indicator: 'red'
                            }, 3);
                            note_dialog.hide();
                        });
                    },
                    primary_action_label: __('Add'),
                });
                note_dialog.show();
            }
        },
        {
            label: __('New Task'),
            icon: 'fa fa-check-square-o',
            color: '#3b82f6',
            action: () => {
                d.hide();
                frappe.new_doc('ToDo', {
                    reference_type: 'Lead',
                    reference_name: lead_name,
                    status: 'Open'
                });
            }
        },
        {
            label: __('Set A Meeting'),
            icon: 'fa fa-calendar',
            color: '#ef4444',
            action: () => {
                d.hide();
                frappe.new_doc('Event', {
                    subject: __('Meeting with {0}', [lead_name]),
                    event_type: 'Private',
                    starts_on: frappe.datetime.now_datetime()
                });
            }
        },
        {
            label: __('New Quotation'),
            icon: 'fa fa-file-text-o',
            color: '#10b981',
            action: () => {
                d.hide();
                frappe.model.open_mapped_doc({
                    method: 'erpnext.crm.doctype.lead.lead.make_quotation',
                    source_name: lead_name
                });
            }
        },
        {
            label: __('New Opportunity'),
            icon: 'fa fa-briefcase',
            color: '#10b981',
            action: () => {
                d.hide();
                frappe.model.open_mapped_doc({
                    method: 'erpnext.crm.doctype.lead.lead.make_opportunity',
                    source_name: lead_name
                });
            }
        },
        {
            label: __('New Prospect'),
            icon: 'fa fa-user-o',
            color: '#8b5cf6',
            action: () => {
                d.hide();
                // Get Lead data first
                frappe.db.get_doc('Lead', lead_name).then(function (lead_doc) {
                    frappe.model.with_doctype('Prospect', function () {
                        let prospect = frappe.model.get_new_doc('Prospect');

                        // Fill required and optional fields from Lead
                        prospect.company_name = lead_doc.company_name || lead_doc.lead_name || '';
                        prospect.company = lead_doc.company || frappe.defaults.get_default('company');
                        prospect.no_of_employees = lead_doc.no_of_employees;
                        prospect.industry = lead_doc.industry;
                        prospect.market_segment = lead_doc.market_segment;
                        prospect.territory = lead_doc.territory;
                        prospect.fax = lead_doc.fax;
                        prospect.website = lead_doc.website;
                        prospect.prospect_owner = lead_doc.lead_owner;

                        // Add Lead to Prospect's leads table
                        let leads_row = frappe.model.add_child(prospect, 'leads');
                        leads_row.lead = lead_name;

                        // Navigate to form and ensure fields are visible
                        frappe.set_route('Form', 'Prospect', prospect.name).then(function () {
                            // Wait for form to load, then refresh to show all fields
                            setTimeout(function () {
                                if (cur_frm && cur_frm.doctype === 'Prospect') {
                                    // Refresh the form to ensure all fields are visible
                                    cur_frm.refresh();
                                    // Ensure all fields in Overview tab are visible
                                    if (cur_frm.fields_dict) {
                                        ['company_name', 'customer_group', 'no_of_employees', 'annual_revenue',
                                            'market_segment', 'industry', 'territory', 'prospect_owner',
                                            'website', 'fax', 'company'].forEach(function (fieldname) {
                                                if (cur_frm.fields_dict[fieldname]) {
                                                    cur_frm.set_df_property(fieldname, 'hidden', 0);
                                                }
                                            });
                                    }
                                }
                            }, 500);
                        });
                    });
                }).catch(function (error) {
                    frappe.show_alert({
                        message: __('Error: Could not load Lead'),
                        indicator: 'red'
                    }, 3);
                });
            }
        },
        {
            label: __('New Customer'),
            icon: 'fa fa-users',
            color: '#6366f1',
            action: () => {
                d.hide();
                frappe.model.open_mapped_doc({
                    method: 'erpnext.crm.doctype.lead.lead.make_customer',
                    source_name: lead_name
                });
            }
        }
    ];

    // Create buttons for each action
    actions.forEach(action => {
        const button = $(`
            <button class="add-action-button" style="
                padding: 16px;
                border: none;
                border-radius: 12px;
                background: ${action.color}15;
                color: ${action.color};
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 8px;
                transition: all 0.2s;
                min-height: 80px;
            ">
                <i class="${action.icon}" style="font-size: 24px;"></i>
                <span>${action.label}</span>
            </button>
        `);

        button.on('click', function (e) {
            e.preventDefault();
            action.action();
        });

        button.on('mouseenter', function () {
            $(this).css({
                'background': action.color + '25',
                'transform': 'translateY(-2px)',
                'box-shadow': '0 4px 8px rgba(0,0,0,0.1)'
            });
        });

        button.on('mouseleave', function () {
            $(this).css({
                'background': action.color + '15',
                'transform': 'translateY(0)',
                'box-shadow': 'none'
            });
        });

        actionsContainer.append(button);
    });

    d.$body.append(actionsContainer);
    d.show();
}

function addLeadCardStyles() {
    if (document.getElementById('lead-card-view-styles')) return;

    const style = document.createElement('style');
    style.id = 'lead-card-view-styles';
    style.textContent = `
        /* Hide cards on desktop by default */
        #lead-cards-container {
            display: none;
        }

        /* Mobile Card View */
        @media (max-width: 768px) {
            /* Hide list on mobile */
            body[data-route^="List/Lead"] .frappe-list .result {
                display: none !important;
            }

            /* Show cards container on mobile */
            #lead-cards-container {
                display: block !important;
                padding: 12px;
            }

            /* Lead Card Style - Modern like Item Price */
            .lead-card {
                background: #fff;
                border: 1px solid #e5e7eb;
                border-radius: 10px;
                padding: 14px 16px 12px;
                margin-bottom: 10px;
                box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
                transition: all 0.2s ease;
            }
            
            .lead-card:active {
                transform: scale(0.98);
            }

            .lead-card-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 8px;
            }

            .lead-card-name {
                font-size: 18px;
                font-weight: 600;
                color: #1f2937;
                margin: 0;
                line-height: 1.3;
            }

            .lead-card-status-badge {
                padding: 4px 12px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 600;
                white-space: nowrap;
            }

            .lead-card-status-badge.status-blue {
                background: #dbeafe;
                color: #1e40af;
            }

            .lead-card-status-badge.status-green {
                background: #d1fae5;
                color: #065f46;
            }

            .lead-card-status-badge.status-purple {
                background: #e9d5ff;
                color: #6b21a8;
            }

            .lead-card-status-badge.status-red {
                background: #fee2e2;
                color: #991b1b;
            }

            .lead-card-status-badge.status-gray {
                background: #f3f4f6;
                color: #4b5563;
            }

            .lead-card-date {
                font-size: 12px;
                color: #6b7280;
                margin-bottom: 12px;
            }

            .lead-card-details {
                display: flex;
                flex-direction: column;
                gap: 8px;
                margin-bottom: 12px;
            }

            .lead-card-detail-item {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 14px;
                color: #4b5563;
            }

            .lead-card-detail-item i {
                color: #9ca3af;
                width: 16px;
            }

            .lead-card-contact {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 12px;
                background: #f1f5f9;
                border-radius: 8px;
                margin-bottom: 10px;
                border: 1px solid #e5e7eb;
            }

            .lead-card-phone-section {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .lead-card-country-code {
                padding: 4px 8px;
                background: #e5e7eb;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 600;
                color: #374151;
            }

            .lead-card-phone {
                font-size: 15px;
                font-weight: 600;
                color: #1f2937;
                word-break: break-all;
            }
            
            .lead-card-contact-label {
                font-size: 11px;
                color: #94a3b8;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.3px;
                margin-right: 6px;
            }

            .lead-card-contact-actions {
                display: flex;
                gap: 8px;
            }

            .lead-card-action-btn {
                width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 8px;
                background: #fff;
                border: 1px solid #e5e7eb;
                text-decoration: none;
                transition: all 0.15s ease;
                font-size: 16px;
            }

            .lead-card-action-btn:hover {
                background: #f3f4f6;
                border-color: #d1d5db;
                transform: scale(1.1);
            }
            
            .lead-card-other-contact {
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 6px;
                background: #fff;
                border: 1px solid #e5e7eb;
                text-decoration: none;
                transition: all 0.15s ease;
                font-size: 14px;
                margin-left: 4px;
            }

            .lead-card-other-contact:hover {
                background: #f3f4f6;
                border-color: #d1d5db;
                transform: scale(1.1);
            }
            
            .lead-card-contact-label {
                font-size: 11px;
                color: #94a3b8;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.3px;
                margin-right: 6px;
            }

            .lead-card-actions {
                display: flex;
                gap: 8px;
                align-items: center;
            }

            .lead-card-actions {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
                gap: 8px;
            }

            .lead-card-action-button {
                padding: 10px 12px;
                border-radius: 8px;
                border: none;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 6px;
                transition: all 0.15s ease;
                position: relative;
                flex-wrap: nowrap !important;
                white-space: nowrap !important;
            }
            
            .lead-card-action-button > span:not(.action-count) {
                display: flex;
                align-items: center;
                gap: 4px;
                flex-shrink: 0;
            }
            
            .lead-card-action-button > i {
                flex-shrink: 0;
            }
            
            .lead-card-action-button .action-count {
                border-radius: 12px !important;
                padding: 2px 8px !important;
                font-size: 12px !important;
                font-weight: 700 !important;
                min-width: 24px !important;
                min-height: 20px !important;
                text-align: center !important;
                margin-left: 6px !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                color: #ffffff !important;
                visibility: visible !important;
                opacity: 1 !important;
                line-height: 1 !important;
                white-space: nowrap !important;
                flex-shrink: 0 !important;
                z-index: 10 !important;
                pointer-events: auto !important;
                cursor: pointer !important;
            }
            
            /* Ensure action count is always visible - especially on mobile */
            .lead-card-action-button span.action-count {
                display: inline-flex !important;
                visibility: visible !important;
                opacity: 1 !important;
                pointer-events: auto !important;
                cursor: pointer !important;
            }
            
            @media (max-width: 768px) {
                .lead-card-action-button span.action-count {
                    display: inline-flex !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    pointer-events: auto !important;
                    cursor: pointer !important;
                    width: 22px !important;
                    height: 22px !important;
                    padding: 0 !important;
                }
                
                /* Force show action count on mobile */
                .lead-card-action-button .action-count {
                    display: inline-flex !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    pointer-events: auto !important;
                    cursor: pointer !important;
                    width: 22px !important;
                    height: 22px !important;
                    padding: 0 !important;
                }
                
                /* Override any hiding rules - strongest priority */
                .lead-card-action-button .action-count,
                .lead-card-action-button span.action-count,
                button .action-count,
                .lead-card-action-button button .action-count {
                    display: inline-flex !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    width: 22px !important;
                    height: 22px !important;
                }
            }
            
            .lead-card-action-button.task-btn .action-count {
                background: #f97316 !important;
                color: #ffffff !important;
                border-radius: 50% !important;
            }
            
            .lead-card-action-button.event-btn .action-count {
                background: #60a5fa !important;
                color: #ffffff !important;
                border-radius: 50% !important;
            }
            
            .lead-card-action-button.note-btn .action-count {
                background: #9ca3af !important;
                color: #ffffff !important;
                border-radius: 50% !important;
            }
            
            .lead-card-action-button.quotation-btn {
                background: #a78bfa;
                color: #fff;
            }
            
            .lead-card-action-button.quotation-btn {
                background: #ffffff;
                border: 1px solid #e5e7eb;
                color: #374151;
            }
            
            .lead-card-action-button.quotation-btn i {
                color: #a78bfa;
            }
            
            .lead-card-action-button.quotation-btn .action-count {
                background: #a78bfa !important;
                color: #ffffff !important;
            }
            
            .lead-card-action-button.prospect-btn {
                background: #ffffff;
                border: 1px solid #e5e7eb;
                color: #374151;
            }
            
            .lead-card-action-button.prospect-btn i {
                color: #34d399;
            }
            
            .lead-card-action-button.prospect-btn .action-count {
                background: #34d399 !important;
                color: #ffffff !important;
            }
            
            .lead-card-action-button.opportunity-btn {
                background: #ffffff;
                border: 1px solid #e5e7eb;
                color: #374151;
            }
            
            .lead-card-action-button.opportunity-btn i {
                color: #fbbf24;
            }
            
            .lead-card-action-button.opportunity-btn .action-count {
                background: #fbbf24 !important;
                color: #ffffff !important;
            }

            .lead-card-action-button.task-btn {
                background: #ffffff;
                border: 1px solid #e5e7eb;
                color: #374151;
            }
            
            .lead-card-action-button.task-btn i {
                color: #f97316;
            }

            .lead-card-action-button.task-btn:hover {
                background: #f9fafb;
                transform: translateY(-1px);
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }

            .lead-card-action-button.event-btn {
                background: #ffffff;
                border: 1px solid #e5e7eb;
                color: #374151;
            }
            
            .lead-card-action-button.event-btn i {
                color: #3b82f6;
            }

            .lead-card-action-button.event-btn:hover {
                background: #f9fafb;
                transform: translateY(-1px);
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }

            .lead-card-action-button.note-btn {
                background: #ffffff;
                border: 1px solid #e5e7eb;
                color: #374151;
            }
            
            .lead-card-action-button.note-btn i {
                color: #374151;
            }

            .lead-card-action-button.note-btn:hover {
                background: #f9fafb;
                transform: translateY(-1px);
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            
            .lead-card-action-button.add-btn {
                flex: 0 0 auto;
                width: 40px;
                height: 40px;
                padding: 0;
                background: #818cf8;
                color: #fff;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .lead-card-action-button.add-btn:hover {
                background: #6366f1;
                transform: translateY(-1px) scale(1.05);
                box-shadow: 0 2px 4px rgba(129, 140, 248, 0.3);
            }

            .lead-cards-empty {
                text-align: center;
                padding: 60px 20px;
                color: #9ca3af;
                font-size: 16px;
            }
        }

        /* Desktop - Hide cards, show list normally */
        @media (min-width: 769px) {
            #lead-cards-container {
                display: none !important;
            }

            body[data-route^="List/Lead"] .frappe-list .result {
                display: block !important;
            }
        }
    `;
    document.head.appendChild(style);
}
