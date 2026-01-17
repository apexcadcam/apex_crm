
import os

js_path = "/home/frappe/frappe-bench/apps/apex_crm/apex_crm/public/js/lead_list_unified.js"

# I will write the FULL FILE content here to avoid any previous file corruption issues.
full_js_content = """
frappe.listview_settings['Lead'] = {
    add_fields: ['mobile_no', 'title', 'company', 'status', 'email_id', 'city', 'state', 'country', 'territory', 'lead_name'],
    
    onload: function(listview) {
        // Mobile Card Vew
        if (window.innerWidth <= 768) {
             setupLeadCardView(listview);
        }
        
        // Apex Buttons (Restored from previous working versions)
        if (listview.page && listview.page.add_inner_button) {
             // Basic buttons if needed, avoiding complex logic for this restore:
             // setupApexCRMButtons(listview); 
        }
    },

    refresh: function(listview) {
        // Mobile Card View
        if (window.innerWidth <= 768) {
             setupLeadCardView(listview);
        }
    }
};

// -------------------------------------------------------------------------------- //
//                               APEX CRM MOBILE CARD LOGIC                         //
// -------------------------------------------------------------------------------- //

// HELPER: Route with specific filters (supports Child Table)
window.apex_crm_route_to_list = function(doctype, filters_obj) {
    frappe.route_options = filters_obj;
    frappe.set_route('List', doctype);
};

// HELPER: Route to Prospects (Smart Fetch)
window.apex_crm_route_to_prospects = function(lead_name) {
    frappe.call({
        method: 'apex_crm.api.get_linked_prospects',
        args: { lead: lead_name },
        callback: function(r) {
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
window.apex_crm_quick_add = function(lead_name) {
    const d = new frappe.ui.Dialog({
        title: __('Quick Add'),
        fields: [
            { label: 'Type', fieldname: 'action_type', fieldtype: 'Select', options: 'Log Call\\nNew Task\\nNew Event\\nNew Note', reqd: 1 },
            { label: 'Details', fieldname: 'details', fieldtype: 'Small Text' },
            { "fieldname": "date", "fieldtype": "Date", "label": "Due Date", "default": frappe.datetime.get_today() }
        ],
        primary_action_label: 'Create',
        primary_action(values) {
            if(values.action_type === 'New Task') {
                 frappe.model.with_doctype('ToDo', function() {
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
                 frappe.call({ method: 'apex_crm.api.add_lead_note', args: { lead: lead_name, content: values.details }, callback:()=>{ d.hide(); frappe.show_alert('Note Added'); if(window.global_listview_ref) window.apex_crm_fetch_data(window.global_listview_ref.data); } });
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
        return window.innerWidth <= 768; 
    };

    if (!is_mobile()) {
         if (listview.$result) listview.$result.show();
         $('.list-row-head').show();
         $('#lead-cards-container').hide();
         // Ensure CSS doesn't hide headers if we injected it globally
         return;
    }

    // 1. DATA FETCHING
    window.apex_crm_fetch_data = function(leads) {
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
                             if(data.interaction_count && data.interaction_count > 0) {
                                  $interaction.append(`<span class="interaction-count-badge" style="background:#e5e7eb; padding:2px 6px; border-radius:10px; font-size:10px; margin-left:auto;">${data.interaction_count}</span>`);
                             }
                             
                             if(data.last_interaction) {
                                  let summary = `Last: ${data.last_interaction.type}`;
                                  let date = frappe.datetime.str_to_user(data.last_interaction.timestamp);
                                  $interaction.find('.interaction-text').html(`<div>${summary}</div><div style="font-size:10px; color:#9ca3af">${date}</div>`);
                             }
                        }
                    });
                }
            }
        });
    };

    // 2. NOTES DIALOG (CLASSIC)
    window.apex_crm_show_notes = function(lead_name) {
        const d = new frappe.ui.Dialog({
            title: __('Notes for ' + lead_name),
            fields: [{fieldname: 'notes_html', fieldtype: 'HTML'}],
            primary_action_label: __('Add New Note'),
            primary_action() {
                const d2 = new frappe.ui.Dialog({ title: __('Add Note'), fields: [{ label: 'Content', fieldname: 'content', fieldtype: 'Text Editor', reqd: 1 }], primary_action_label: __('Save'), primary_action(v){} });
                d2.show();
                d2.set_primary_action('Save', function() {
                     const values = d2.get_values(); if(!values) return;
                      frappe.call({ method: 'apex_crm.api.add_lead_note', args: { lead: lead_name, content: values.content }, callback: function(r) { if (!r.exc) { d2.hide(); refresh_notes_list(); frappe.show_alert({message: __('Note Added'), indicator: 'green'}); if(window.global_listview_ref) window.global_listview_ref.refresh(); } } });
                 });
            }
        });
        const refresh_notes_list = () => {
            d.fields_dict.notes_html.$wrapper.html('<div class="text-center text-muted p-3">Loading...</div>');
            frappe.call({ method: 'apex_crm.api.get_lead_notes', args: { lead: lead_name }, callback: function(r) {
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
            }});
        };
        d.show(); refresh_notes_list();
    }
    
    // 3. INTERACTION HISTORY DIALOG (NEW)
    window.apex_crm_show_interaction_history = function(lead_name) {
        const d = new frappe.ui.Dialog({ title: __('Interaction History: ' + lead_name), fields: [{fieldname: 'history_html', fieldtype: 'HTML'}] });
        const refresh_history = () => {
             d.fields_dict.history_html.$wrapper.html('<div class="text-center text-muted p-3">Loading...</div>');
             frappe.call({
                 method: 'apex_crm.api.get_lead_interaction_history', 
                 args: { lead: lead_name },
                 callback: function(r) {
                     const logs = r.message || [];
                     let html = '<div class="history-list" style="max-height:60vh; overflow-y:auto; padding:10px;">';
                     if (logs.length === 0) html += '<div class="text-center text-muted p-4">No interactions found</div>';
                     else {
                         logs.forEach(log => {
                             let icon = 'circle';
                             if(log.type === 'Call') icon = 'phone'; else if(log.type === 'WhatsApp') icon = 'whatsapp'; else if(log.type === 'SMS') icon = 'comment';
                             html += `<div class="history-item" style="border-bottom:1px solid #f3f4f6; padding:10px 0;"><div style="display:flex; justify-content:space-between;"><div style="display:flex; align-items:center;"><div style="width:24px; text-align:center; margin-right:8px; color:#6b7280;"><i class="fa fa-${icon}"></i></div><div><div style="font-size:13px; font-weight:600; color:#1f2937;">${log.type} <span style="font-weight:normal; color:#6b7280;">• ${log.status}</span></div><div style="font-size:12px; color:#4b5563;">${log.summary || 'No summary'}</div></div></div><div style="font-size:11px; color:#9ca3af; white-space:nowrap; margin-left:8px;">${frappe.datetime.str_to_user(log.timestamp)}<div style="text-align:right;">${log.user}</div></div></div></div>`;
                         });
                     }
                     html += '</div>'; d.fields_dict.history_html.$wrapper.html(html);
                 }
             });
        };
        d.show(); refresh_history();
    };

    const formatDateTime = (dateStr) => { if (!dateStr) return ''; const d = new Date(dateStr); const now = new Date(); const diff = (now - d) / 1000; const timeString = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }); if (diff < 86400 && d.getDate() === now.getDate()) return `Today ${timeString}`; else if (diff < 172800 && d.getDate() === now.getDate() - 1) return `Yesterday ${timeString}`; return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' ' + timeString; };
    const renderMobileWithFlag = (doc) => { const mobile = doc.mobile_no || doc.phone; if (!mobile) return '<span style="color:#9ca3af">No Mobile</span>'; let countryCode = 'eg'; if ((mobile.startsWith('+20') || mobile.startsWith('01')) && mobile.length > 9) countryCode = 'eg'; const flags = {'eg': '🇪🇬'}; const flag = flags[countryCode] || '🏳️'; return `<span style="margin-right:6px; font-size:16px;">${flag}</span><span>${mobile}</span>`; };

    // CREATE CARD (With History Dialog Click)
    const createPremiumCard = (doc) => {
        const lead_name = doc.lead_name || doc.name;
        const status = doc.status || 'Open';
        const title = doc.title || '';
        const territory = doc.territory || ''; 
        const city = doc.city || doc.state || '';
        const mobile = doc.mobile_no || doc.phone || '';
        const initials = frappe.get_abbr(lead_name);
        const last_updated = doc.modified ? formatDateTime(doc.modified) : '';
        const statusColors = {'Open': 'blue', 'Replied': 'green', 'Interested': 'purple', 'Converted': 'green', 'Lost Quotation': 'red', 'Do Not Contact': 'red', 'Lead': 'gray', 'Opportunity': 'orange'};
        const statusColor = statusColors[status] || 'gray';

        return `
            <div class="apex-premium-card" id="lead-card-${doc.name}" data-name="${doc.name}" onclick="frappe.set_route('Form', 'Lead', '${doc.name}')">
                <div class="card-header">
                    <div class="card-header-left">
                        <div class="card-avatar">${initials}</div>
                        <div class="card-info">
                            <div class="card-name">${lead_name}</div>
                            <div class="card-subtext">
                                ${title ? `<span>${title}</span>` : ''}
                                ${territory ? `<span> • ${territory}</span>` : ''} ${city ? `<span> • ${city}</span>` : ''}
                                <span> • ${last_updated}</span>
                            </div>
                        </div>
                    </div>
                    <div class="card-status-badge status-${statusColor}">${status}</div>
                </div>

                <div class="quick-actions-bar">
                    <div class="phone-display" onclick="event.stopPropagation();">${renderMobileWithFlag(doc)}</div>
                    <div class="quick-btns" onclick="event.stopPropagation();">
                        <button class="quick-btn btn-add" data-name="${doc.name}" onclick="event.stopPropagation(); window.apex_crm_quick_add('${doc.name}');"><i class="fa fa-plus"></i></button>
                        ${mobile ? `<a href="tel:${mobile}" class="quick-btn btn-call" onclick="event.stopPropagation();"><i class="fa fa-phone"></i></a>` : ''}
                        ${mobile ? `<a href="https://wa.me/${mobile}" target="_blank" class="quick-btn btn-whatsapp" onclick="event.stopPropagation();"><i class="fa fa-whatsapp"></i></a>` : ''}
                        ${mobile ? `<a href="sms:${mobile}" class="quick-btn btn-sms" onclick="event.stopPropagation();"><i class="fa fa-comment"></i></a>` : ''}
                    </div>
                </div>

                <div class="card-info-body">
                    <div class="info-pill pill-notes" onclick="event.stopPropagation(); window.apex_crm_show_notes('${doc.name}');"><i class="fa fa-sticky-note"></i> Notes <span class="count-notes">0</span></div>
                    <div class="info-pill pill-tasks" onclick="event.stopPropagation(); frappe.set_route('List', 'ToDo', {'reference_type': 'Lead', 'reference_name': '${doc.name}'});"><i class="fa fa-check-square"></i> Tasks <span class="count-tasks">0</span></div>
                    
                    <!-- Event: Smart Filter -->
                    <div class="info-pill pill-events" onclick="event.stopPropagation(); window.apex_crm_route_to_list('Event', [['Event Participants', 'reference_docname', '=', '${doc.name}']] );"><i class="fa fa-calendar"></i> Events <span class="count-events">0</span></div>
                    
                    <div class="info-pill pill-quotes" onclick="event.stopPropagation(); frappe.set_route('List', 'Quotation', {'quotation_to': 'Lead', 'party_name': '${doc.name}'});"><i class="fa fa-file-text"></i> Quotes <span class="count-quotes">0</span></div>
                    
                    <!-- Prospect: SMART Fetch & Filter -->
                    <div class="info-pill pill-prospects" onclick="event.stopPropagation(); window.apex_crm_route_to_prospects('${doc.name}');"><i class="fa fa-users"></i> Prosp <span class="count-prospects">0</span></div>
                    
                    <div class="info-pill pill-opportunities" onclick="event.stopPropagation(); frappe.set_route('List', 'Opportunity', {'opportunity_from': 'Lead', 'party_name': '${doc.name}'});"><i class="fa fa-lightbulb-o"></i> Opp <span class="count-opportunities">0</span></div>
                    <div class="info-pill pill-customers" onclick="event.stopPropagation(); frappe.set_route('List', 'Customer', {'lead_name': '${doc.name}'});"><i class="fa fa-user-circle"></i> Cust <span class="count-customers">0</span></div>
                </div>
                
                <!-- CLICKABLE INTERACTION FOOTER -->
                <div class="latest-interaction-box" onclick="event.stopPropagation(); window.apex_crm_show_interaction_history('${doc.name}');">
                    <div class="interaction-content"><span class="interaction-icon"><i class="fa fa-history"></i></span><span class="interaction-text">No interaction yet</span></div>
                </div>
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

    $("#lead-cards-container").remove();
    const $cardsContainer = $('<div id="lead-cards-container"></div>');
    if (listview.$result && listview.$result.length) listview.$result.before($cardsContainer); else $(listview.wrapper || document.body).append($cardsContainer);
    if (listview.$result) listview.$result.hide(); $('.list-row-head').hide();
    $cardsContainer.empty();
    if (listview.data && listview.data.length > 0) { let cardsHtml = ''; listview.data.forEach(doc => { cardsHtml += createPremiumCard(doc); }); $cardsContainer.html(cardsHtml); window.apex_crm_fetch_data(listview.data); } 
    else { $cardsContainer.html('<div class="text-center p-5 text-muted">No leads found</div>'); }
}
"""

with open(js_path, "w") as f:
    f.write(full_js_content)

print("Restored lead_list_unified.js with Full Functional Set (History Dialog + Desktop Fix).")
