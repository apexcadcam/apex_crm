
import os

js_path = "/home/frappe/frappe-bench/apps/apex_crm/apex_crm/public/js/lead_list_unified.js"

# 1. Define New Logic Blocks
new_prospects_logic = """
    // Custom Prospect View (Dialog) - FIXED API
    window.apex_crm_show_prospects = function(lead_name) {
        const d = new frappe.ui.Dialog({
            title: __('Prospects for ' + lead_name),
            fields: [{fieldname: 'prospects_html', fieldtype: 'HTML'}],
            primary_action_label: __('Close'),
            primary_action() { d.hide(); }
        });

        d.fields_dict.prospects_html.$wrapper.html('<div class="text-center text-muted p-3">Loading...</div>');
        
        frappe.call({
            method: 'apex_crm.api.get_linked_prospects',
            args: { lead: lead_name },
            callback: function(r) {
                const prospects = r.message || [];
                let html = '<div class="prospects-list" style="max-height:60vh; overflow-y:auto; padding:10px;">';
                
                if (prospects.length === 0) {
                     html += '<div class="text-center text-muted p-4">No linked prospects found.</div>';
                } else {
                    prospects.forEach(p => {
                         html += `
                            <div class="prospect-item" onclick="frappe.set_route('Form', 'Prospect', '${p.name}')" style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:12px; margin-bottom:10px; cursor:pointer;">
                                <div style="font-weight:600; color:#1f2937;">${p.company_name || p.name}</div>
                                <div style="font-size:12px; color:#4b5563;">${p.title || ''}</div>
                                <div style="font-size:10px; color:#6b7280; margin-top:4px;">Status: ${p.status}</div>
                            </div>
                        `;
                    });
                }
                html += '</div>';
                d.fields_dict.prospects_html.$wrapper.html(html);
            }
        });

        d.show();
    }
"""

new_notes_logic = """
    // Custom Notes View (Dialog) - FIXED API and COMMIT
    window.apex_crm_show_notes = function(lead_name) {
        const d = new frappe.ui.Dialog({
            title: __('Notes for ' + lead_name),
            fields: [{fieldname: 'notes_html', fieldtype: 'HTML'}],
            primary_action_label: __('Add New Note'),
            primary_action() {
                const d2 = new frappe.ui.Dialog({
                    title: __('Add Note'),
                    fields: [{ label: 'Content', fieldname: 'content', fieldtype: 'Text Editor', reqd: 1 }],
                    primary_action_label: __('Save'),
                    primary_action(values) {
                         // Overridden below
                    }
                });
                d2.show();
                
                d2.set_primary_action('Save', function() {
                     const values = d2.get_values();
                     if(!values) return;
                     
                      frappe.call({
                            method: 'apex_crm.api.add_lead_note',
                            args: {
                                lead: lead_name,
                                content: values.content
                            },
                            callback: function(r) {
                                if (!r.exc) {
                                    d2.hide();
                                    refresh_notes_list();
                                    frappe.show_alert({message: __('Note Added'), indicator: 'green'});
                                    if(window.global_listview_ref) window.global_listview_ref.refresh();
                                }
                            }
                      });
                 });
            }
        });

        const refresh_notes_list = () => {
            d.fields_dict.notes_html.$wrapper.html('<div class="text-center text-muted p-3">Loading...</div>');
            frappe.call({
                method: 'apex_crm.api.get_lead_notes',
                args: { lead: lead_name },
                callback: function(r) {
                    const notes = r.message || [];
                    let html = '<div class="notes-list" style="max-height:60vh; overflow-y:auto; padding:10px;">';
                    
                    if (notes.length === 0) {
                        html += '<div class="text-center text-muted p-4">No notes found</div>';
                    } else {
                        notes.forEach(n => {
                            html += `
                                <div class="note-item" style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:12px; margin-bottom:10px;">
                                    <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                                        <strong style="font-size:13px; color:#1f2937;">${n.title || 'Note'}</strong>
                                        <span style="font-size:11px; color:#6b7280;">${frappe.datetime.str_to_user(n.added_on || n.modified)}</span>
                                    </div>
                                    <div style="font-size:12px; color:#4b5563;">${n.content}</div>
                                    <div style="font-size:10px; color:#9ca3af; margin-top:6px;">By ${n.owner}</div>
                                </div>
                            `;
                        });
                    }
                    html += '</div>';
                    d.fields_dict.notes_html.$wrapper.html(html);
                }
            });
        };

        d.show();
        refresh_notes_list();
    }
"""

with open(js_path, "r") as f:
    content = f.read()

# 2. Identify Old Blocks to Replace
# We can find the old function definitions by their signature
prospect_start = "window.apex_crm_show_prospects = function(lead_name) {"
prospect_end_marker = "d.show();\n}" # Risky if indented

# Let's use the PRECISE content I read from the file to match invalid blocks.
# I will match the 'frappe.client.get_list' part inside 'window.apex_crm_show_prospects'
# and replace the WHOLE FUNCTION block.

# STRATEGY: 
# Since I can't easily parse matching braces with regex in a complex file,
# I will search for the START of the functions, and assume the OLD implementation ends before the NEXT function starts?
# The next function after `apex_crm_show_prospects` is `apex_crm_show_notes`.
# The next function after `apex_crm_show_notes` is `renderMobileWithFlag`.

# Find indices
idx_prospects = content.find("window.apex_crm_show_prospects = function(lead_name) {")
idx_notes = content.find("window.apex_crm_show_notes = function(lead_name) {")
idx_render = content.find("const renderMobileWithFlag = (doc) => {")

if idx_prospects != -1 and idx_notes != -1 and idx_render != -1:
    # Replace the chunks
    # Chunk 1: Prospects (from idx_prospects to idx_notes)
    # We need to be careful about whitespace/comments between them.
    # Actually, idx_notes is strictly AFTER idx_prospects.
    
    # We will slice:
    # content[:idx_prospects] + new_prospects + "\n\n" + new_notes_logic + "\n\n" + content[idx_render:]
    
    # Wait, what about the code BETWEEN `apex_crm_show_notes` end and `renderMobileWithFlag`?
    # Usually empty space.
    # Is it safe? 
    # `apex_crm_show_notes` ends, then `renderMobileWithFlag` starts.
    # Yes, replacing everything between `window.apex_crm_show_prospects` start and `renderMobileWithFlag` start
    # with the TWO new functions is the cleanest wipe.
    
    new_content = content[:idx_prospects] + new_prospects_logic + "\n" + new_notes_logic + "\n" + content[idx_render:]
    
    with open(js_path, "w") as f:
        f.write(new_content)
    print("Successfully REPLACED both functions in setupLeadCardView.")

else:
    print("Could not find function markers. Dumping snippets for debugging...")
    print(f"prospects: {idx_prospects}, notes: {idx_notes}, render: {idx_render}")
