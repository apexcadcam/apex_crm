frappe.pages['duplicate-manager'].on_page_load = function (wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Duplicate Manager',
        single_column: true
    });

    apex_crm.duplicate_manager.make(page);
};

frappe.provide('apex_crm.duplicate_manager');

apex_crm.duplicate_manager = {
    make: function (page) {
        this.page = page;
        this.make_ui();
        this.load_duplicates();
    },

    make_ui: function () {
        console.log('Duplicate Manager (v2) loaded');
        let me = this;
        this.page.add_menu_item('Refresh', () => me.load_duplicates());

        this.wrapper = $('<div>').appendTo(this.page.main);
        this.wrapper.html('<div class="text-center text-muted" style="padding: 50px;">Loading...</div>');
    },

    load_duplicates: function () {
        let me = this;
        console.log('Starting API call to get_duplicate_groups...');
        frappe.call({
            method: 'apex_crm.api.get_duplicate_groups',
            freeze: true,
            freeze_message: 'Searching for duplicates...',
            callback: function (r) {
                console.log('API Response:', r);
                if (r.message && r.message.length > 0) {
                    console.log('Found duplicates:', r.message.length);
                    me.render_results(r.message);
                } else {
                    console.log('No duplicates found');
                    me.wrapper.html(`
						<div class="text-center text-muted" style="padding: 100px;">
							<i class="fa fa-check-circle" style="font-size: 48px; color: #72b380; margin-bottom: 20px;"></i><br>
							No duplicates found! All clean.
						</div>
					`);
                }
            },
            error: function (r) {
                console.error('Duplicate Manager Error:', r);
                console.error('Full error object:', JSON.stringify(r, null, 2));
                me.wrapper.html(`
                    <div class="text-center text-danger" style="padding: 50px;">
                        <i class="fa fa-exclamation-triangle" style="font-size: 32px; margin-bottom: 15px;"></i><br>
                        Error loading duplicates.<br>
                        <small>${r.message || r._server_messages || 'Please check console logs'}</small>
                    </div>
                `);
            }
        });
    },

    render_results: function (groups) {
        let me = this;
        let html = `
			<div class="duplicate-groups" style="padding: 20px;">
				<div class="alert alert-warning">
					<i class="fa fa-info-circle"></i> Found ${groups.length} duplicate groups based on Contact Details.
				</div>
				${groups.map(g => me.get_group_html(g)).join('')}
			</div>
		`;
        me.wrapper.html(html);

        // Bind Events
        me.wrapper.find('.merge-btn').on('click', function () {
            let group_val = $(this).data('value').toString();
            let group = groups.find(g => (g.value || "").toString() === group_val);
            if (group) me.merge_group(group);
        });

        me.wrapper.find('.ignore-btn').on('click', function () {
            let val = $(this).data('value');
            let count = $(this).data('count');
            me.ignore_group(val, count, $(this));
        });

        me.wrapper.find('.delete-lead-btn').on('click', function () {
            let lead = $(this).data('lead');
            me.delete_lead(lead, $(this));
        });
    },

    get_group_html: function (group) {
        let safe_val = (group.value || "").toString().replace(/"/g, '&quot;');
        // Enforce string for data-value to prevent type coercion issues
        let raw_val = (group.value || "").toString();

        let rows = group.leads.map(l => `
			<div class="lead-row" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 15px; background: white; margin-bottom: 8px; border-radius: 6px; border: 1px solid #f0f4f7;">
				<div style="display: flex; align-items: center; gap: 10px;">
					<a href="/app/lead/${l.name}" target="_blank" style="font-weight: 600; font-size: 14px; text-decoration: none; color: #333;">
						${l.lead_name}
					</a>
					<span class="text-muted" style="font-size: 11px; background: #f0f0f0; padding: 2px 6px; border-radius: 4px;">${l.name}</span>
				</div>
				<div style="display: flex; align-items: center; gap: 15px;">
                    <div class="delete-lead-btn" data-lead="${l.name}" title="Delete Lead" style="cursor: pointer; color: #e24c4c; padding: 4px;">
                        <i class="fa fa-trash"></i>
                    </div>
					<label style="font-weight: normal; cursor: pointer; margin: 0; display: flex; align-items: center;">
						<input type="radio" name="master_lead_${safe_val}" value="${l.name}" style="margin-right: 6px;">
						<span style="font-size: 12px;">Keep as Master</span>
					</label>
				</div>
			</div>
		`).join('');

        return `
			<div class="card duplicate-card" style="margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid #ebebeb; border-radius: 8px; overflow: hidden;">
				<div class="card-header" style="background: #fafbfc; border-bottom: 1px solid #ebebeb; padding: 12px 15px; display: flex; justify-content: space-between; align-items: center;">
					<h5 style="margin: 0; font-size: 15px; font-weight: 600; color: #444;">
						<span class="indicator red" style="margin-right: 8px;"></span> 
						Duplicate: <span style="font-family: monospace; background: #fcf1f1; color: #d04444; padding: 2px 6px; border-radius: 4px;">${safe_val}</span>
					</h5>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn btn-default btn-xs ignore-btn" data-value="${raw_val}" data-count="${group.count}" style="color: #666;">
                            <i class="fa fa-ban"></i> Ignore Group
                        </button>
					    <button class="btn btn-primary btn-xs merge-btn" data-value="${raw_val}">Merge Selected</button>
                    </div>
				</div>
				<div class="card-body" style="padding: 15px; background: #fdfdfd;">
					<div class="text-muted" style="margin-bottom: 12px; font-size: 12px;">Select one Lead to keep. Others will be merged into it, copying their connection and data.</div>
					${rows}
				</div>
			</div>
		`;
    },

    merge_group: function (group) {
        let me = this;
        let safe_val = (group.value || "").toString().replace(/"/g, '&quot;');

        let radios = document.getElementsByName(`master_lead_${safe_val}`);
        let master_lead = null;
        for (let i = 0; i < radios.length; i++) {
            if (radios[i].checked) master_lead = radios[i].value;
        }

        if (!master_lead) {
            frappe.msgprint('Please select a Master Lead first.');
            return;
        }

        let secondaries = group.leads.filter(l => l.name !== master_lead).map(l => l.name);

        if (secondaries.length === 0) {
            frappe.msgprint('No secondary leads to merge.');
            return;
        }

        frappe.confirm(`Are you sure you want to merge <b>${secondaries.length}</b> lead(s) into <b>${master_lead}</b>?<br>This action cannot be undone.`, () => {
            let chain = Promise.resolve();
            let success_count = 0;
            frappe.dom.freeze('Merging Leads...');

            secondaries.forEach(sec => {
                chain = chain.then(() => {
                    return frappe.call({
                        method: 'apex_crm.api.merge_leads',
                        args: {
                            master_lead: master_lead,
                            secondary_lead: sec
                        }
                    }).then(r => {
                        if (r.message && r.message.status === 'success') {
                            success_count++;
                        }
                    });
                });
            });

            chain.then(() => {
                frappe.dom.unfreeze();
                frappe.show_alert({ message: `Merged ${success_count} leads successfully`, indicator: 'green' });
                me.load_duplicates();
            }).catch(err => {
                frappe.dom.unfreeze();
                frappe.msgprint('An error occurred during merge. Please check logs.');
            });
        });
    },

    ignore_group: function (val, count, btn) {
        let me = this;
        frappe.confirm(`Ignore this duplicate group (${val})? It will not appear in future checks <b>unless the count changes</b>.`, () => {
            frappe.call({
                method: 'apex_crm.api.ignore_group',
                args: { value: val, count: count },
                freeze: true,
                callback: function (r) {
                    if (r.message && r.message.status === 'success') {
                        frappe.show_alert({ message: 'Group Ignored', indicator: 'green' });
                        btn.closest('.card').fadeOut();
                    }
                }
            });
        });
    },

    delete_lead: function (lead, btn) {
        let me = this;
        frappe.confirm(`Are you sure you want to delete lead <b>${lead}</b>? This cannot be undone.`, () => {
            frappe.call({
                method: 'apex_crm.api.delete_lead',
                args: { lead_name: lead },
                freeze: true,
                callback: function (r) {
                    if (r.message && r.message.status === 'success') {
                        frappe.show_alert({ message: 'Lead Deleted', indicator: 'green' });
                        // Remove row
                        let row = btn.closest('.lead-row');
                        let card = btn.closest('.card');
                        row.remove();

                        // Check if card leads < 2, remove card if so
                        if (card.find('.lead-row').length < 2) {
                            card.fadeOut();
                        }
                    }
                }
            });
        });
    }
};
