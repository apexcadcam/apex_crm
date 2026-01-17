
import os

js_path = "/home/frappe/frappe-bench/apps/apex_crm/apex_crm/public/js/lead_list_unified.js"

# 1. Prospect View Logic
prospect_view_logic = """
// Custom Prospect View (Dialog)
window.apex_crm_show_prospects = function(lead_name) {
    const d = new frappe.ui.Dialog({
        title: __('Prospects for ' + lead_name),
        fields: [
            {
                fieldname: 'prospects_html',
                fieldtype: 'HTML'
            }
        ],
        primary_action_label: __('Close'),
        primary_action() {
            d.hide();
        }
    });

    d.fields_dict.prospects_html.$wrapper.html('<div class="text-center text-muted p-3">Loading...</div>');
    
    // We need to fetch prospects linked to this lead.
    // The API uses 'Prospect Lead' child table.
    frappe.call({
        method: 'frappe.client.get_list',
        args: {
            doctype: 'Prospect Lead',
            filters: { lead: lead_name },
            fields: ['parent'],
            limit_page_length: 50
        },
        callback: function(r) {
            const links = r.message || [];
            if (links.length === 0) {
                 d.fields_dict.prospects_html.$wrapper.html('<div class="text-center text-muted p-4">No linked prospects found.</div>');
            } else {
                const prospect_names = links.map(l => l.parent);
                // Now fetch details for these prospects
                frappe.call({
                    method: 'frappe.client.get_list',
                    args: {
                        doctype: 'Prospect',
                        filters: { name: ['in', prospect_names] },
                        fields: ['name', 'company_name', 'status', 'title']
                    },
                    callback: function(r2) {
                        const prospects = r2.message || [];
                        let html = '<div class="prospects-list" style="max-height:60vh; overflow-y:auto; padding:10px;">';
                        
                        prospects.forEach(p => {
                             html += `
                                <div class="prospect-item" onclick="frappe.set_route('Form', 'Prospect', '${p.name}')" style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:12px; margin-bottom:10px; cursor:pointer;">
                                    <div style="font-weight:600; color:#1f2937;">${p.company_name || p.name}</div>
                                    <div style="font-size:12px; color:#4b5563;">${p.title || ''}</div>
                                    <div style="font-size:10px; color:#6b7280; margin-top:4px;">Status: ${p.status}</div>
                                </div>
                            `;
                        });
                        html += '</div>';
                        d.fields_dict.prospects_html.$wrapper.html(html);
                    }
                });
            }
        }
    });

    d.show();
}
"""

with open(js_path, "r") as f:
    content = f.read()

# 1. Inject Prospect Function (if not exists)
if "window.apex_crm_show_prospects =" not in content:
    setup_start = "function setupLeadCardView(listview) {"
    # Insert it before setupLeadCardView or inside the helper block
    content = content.replace(setup_start, setup_start + "\n" + prospect_view_logic)

# 2. Fix Prospect Pill OnClick
# Old: onclick="event.stopPropagation();" (Was likely empty or broken set_route)
# The file view showed: 
# <div class="info-pill pill-prospects" data-lead-name="${doc.name}" onclick="event.stopPropagation();">
# It had NO action other than stopPropagation. That's why it "didn't open anything".

old_prospect_pill = '<div class="info-pill pill-prospects" data-lead-name="${doc.name}" onclick="event.stopPropagation();">'
new_prospect_pill = '<div class="info-pill pill-prospects" data-lead-name="${doc.name}" onclick="event.stopPropagation(); window.apex_crm_show_prospects(\'${doc.name}\');">'

content = content.replace(old_prospect_pill, new_prospect_pill)

# 3. Ensure Notes Logic is still there (it failed to copy last time??)
# I will re-apply the Notes Logic check just in case the previous step failed silently or was reverted.
if "window.apex_crm_show_notes =" not in content:
    # Re-read the notes logic from previous step artifacts effectively
    # (Just re-pasting the simplified version here for safety)
    notes_logic = """
window.apex_crm_show_notes = function(lead_name) {
    const d = new frappe.ui.Dialog({ title: 'Notes for ' + lead_name, fields: [{fieldname: 'notes_html', fieldtype: 'HTML'}], primary_action_label: 'Add Note', primary_action() { 
        const d2 = new frappe.ui.Dialog({ title: 'Add Note', fields: [{label: 'Content', fieldname: 'content', fieldtype: 'Text Editor', reqd: 1}], primary_action_label: 'Save', primary_action(v){ 
            frappe.call({ method: 'frappe.client.insert', args: { doc: { doctype: 'Note', title: 'Note for '+lead_name, content: v.content, party_name: lead_name, public: 1 }}, callback: function(r){ if(!r.exc){ d2.hide(); refresh_notes(); if(cur_list) cur_list.refresh(); } } });
        }}); d2.show();
    }});
    const refresh_notes = () => {
         frappe.call({ method: 'frappe.client.get_list', args: { doctype: 'Note', filters: { party_name: lead_name }, fields: ['title', 'content', 'owner', 'modified'], order_by: 'modified desc' }, callback: function(r) {
             let html = '<div style="padding:10px;">';
             (r.message||[]).forEach(n => { html += `<div style="background:#f9fafb; border:1px solid #ddd; padding:10px; margin-bottom:10px; border-radius:6px;"><b>${n.title}</b><br><small>${n.owner} - ${frappe.datetime.str_to_user(n.modified)}</small><p>${n.content}</p></div>`; });
             html += '</div>'; d.fields_dict.notes_html.$wrapper.html(html || 'No notes');
         }});
    };
    d.show(); refresh_notes();
}
"""
    content = content.replace(setup_start, setup_start + "\n" + notes_logic)
    
    # And fix the Note pill again
    content = content.replace(
        "onclick=\"event.stopPropagation(); frappe.set_route('Form', 'Lead', '${doc.name}');\">",
        "onclick=\"event.stopPropagation(); window.apex_crm_show_notes('${doc.name}');\">"
    )

with open(js_path, "w") as f:
    f.write(content)

print("Dialog Views (Prospects & Notes) Implemented.")
