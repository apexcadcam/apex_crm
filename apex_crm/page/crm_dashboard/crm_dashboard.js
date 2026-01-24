frappe.pages['crm-dashboard'].on_page_load = function (wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'CRM Dashboard',
        single_column: true
    });

    // Add CSS
    frappe.require('/assets/apex_crm/apex_crm/page/crm_dashboard/crm_dashboard.css');

    // Create Main Layout
    const $container = $(`<div class="crm-dashboard-wrapper">
        <!-- Search & Filters (Shared) -->
        <div class="row crm-controls" style="margin-bottom: 15px; align-items:center;">
            <div class="col-xs-12 col-md-4">
                <input type="text" class="form-control crm-search" placeholder="Search leads by name, phone, or note..." style="background: white; border: 1px solid #d1d5db; height: 36px; border-radius: 6px;">
            </div>
            <div class="col-xs-12 col-md-8 text-right buttons-area" style="display:flex; justify-content:flex-end; gap:10px; flex-wrap: wrap;">
                <!-- Filters will go here -->
            </div>
        </div>

        <!-- Mobile Card View -->
        <div class="crm-card-view">
            <div class="text-center text-muted loading-msg" style="padding: 20px;">
                <i class="fa fa-spinner fa-spin"></i> Loading Leads...
            </div>
        </div>

        <!-- Desktop Grid View -->
        <div class="crm-grid-view">
            <!-- Datatable will render here -->
        </div>
    </div>`).appendTo(page.main);

    // Initial Load
    const controller = new CRMDashboardController(page, $container);
    page.wrapper.crm_controller = controller;

    // Hook for utils `trigger_refresh` to find this controller
    window.cur_page_widget = { crm_controller: controller };
};

class CRMDashboardController {
    constructor(page, $container) {
        this.page = page;
        this.$container = $container;
        this.leads = [];
        this.filters = {};
        this.datatable = null;
        this.filter_group = null;

        this.init_actions();

        // Wait for field group to render before loading data
        setTimeout(() => this.load_data(), 200);
    }

    init_actions() {
        const me = this;
        // Search
        this.$container.find('.crm-search').on('change', function (e) {
            me.filters.search = $(this).val();
            me.load_data();
        });

        // Add Lead Button
        this.page.set_primary_action('Add Lead', () => frappe.new_doc('Lead'), 'fa fa-plus');

        // Render Filters
        this.filter_group = new frappe.ui.FieldGroup({
            fields: [
                {
                    label: 'Status',
                    fieldname: 'status',
                    fieldtype: 'Select',
                    options: ['', 'Open', 'Replied', 'Interested', 'Converted', 'Do Not Contact', 'Lead', 'Opportunity', 'Quotation', 'Lost Quotation'],
                    change: () => me.load_data(),
                    input_class: 'input-xs'
                },
                {
                    label: 'Owner',
                    fieldname: 'lead_owner',
                    fieldtype: 'Link',
                    options: 'User',
                    change: () => me.load_data(),
                    input_class: 'input-xs'
                }
            ],
            body: this.$container.find('.buttons-area')
        });
        this.filter_group.make();

        // Style adjustments for inline appearance
        this.$container.find('.buttons-area .form-group').css({ 'margin-bottom': '0', 'display': 'inline-block', 'width': '140px' });
        this.$container.find('.buttons-area .form-column').css({ 'width': 'auto' });
        this.$container.find('.buttons-area .section-body').css({ 'margin-bottom': '0' });
    }

    load_data() {
        this.$container.find('.loading-msg').show();

        // Build filters
        const filters = {};
        if (this.filters.search) {
            filters['lead_name'] = ['like', '%' + this.filters.search + '%'];
        }

        if (this.filter_group) {
            const status = this.filter_group.get_value('status');
            if (status) filters['status'] = status;

            const owner = this.filter_group.get_value('lead_owner');
            if (owner) filters['lead_owner'] = owner;
        }

        // Fetch leads similar to list view but optimized
        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'Lead',
                fields: ['name', 'lead_name', 'status', 'mobile_no', 'email_id', 'title', 'territory', 'city', 'state', 'qualification_status', 'source', 'lead_owner', 'type', 'request_type', 'modified'],
                filters: filters,
                limit_page_length: 500, // Higher limit for grid
                order_by: 'modified desc'
            },
            callback: (r) => {
                this.$container.find('.loading-msg').hide();
                if (r.message) {
                    this.leads = r.message;
                    this.refresh_view();
                }
            }
        });
    }

    refresh_view() {
        if (this.leads.length === 0) {
            this.$container.find('.crm-card-view').html('<div class="text-muted text-center" style="padding:20px;">No leads found</div>');
            this.$container.find('.crm-grid-view').html('<div class="text-muted text-center" style="padding:20px;">No leads found</div>');
            return;
        }

        // 1. Mobile Render (Card View)
        const $cardView = this.$container.find('.crm-card-view').empty();
        this.leads.forEach(lead => {
            if (frappe.provide('apex_crm.utils') && apex_crm.utils.create_card_html) {
                const cardHtml = apex_crm.utils.create_card_html(lead);
                $cardView.append(cardHtml);
            }
        });

        // 2. Desktop Render (Grid View)
        // Only render if container is likely visible
        if (window.innerWidth >= 768) {
            this.render_grid();
        }
    }

    render_grid() {
        const $gridView = this.$container.find('.crm-grid-view');

        const columns = [
            { id: 'lead_name', name: 'Name', width: 220, editable: false },
            {
                id: 'status', name: 'Status', width: 140, format: (value) => {
                    const map = { 'Open': 'red', 'Replied': 'blue', 'Interested': 'orange', 'Converted': 'green', 'Do Not Contact': 'gray' };
                    const color = map[value] || 'gray';
                    return `<span class="indicator-pill ${color} no-indicator-dot" style="font-size:12px;">${value}</span>`;
                }
            },
            {
                id: 'qualification_status', name: 'Qual. Status', width: 140, format: (value) => {
                    const color = value === 'Qualified' ? '#166534' : (value === 'In Process' ? '#1e40af' : '#4b5563');
                    const bg = value === 'Qualified' ? '#dcfce7' : (value === 'In Process' ? '#dbeafe' : '#f3f4f6');
                    return `<span style="background:${bg}; color:${color}; padding:2px 8px; border-radius:12px; font-size:11px; font-weight:600;">${value || 'Unqualified'}</span>`;
                }
            },
            { id: 'mobile_no', name: 'Mobile', width: 150 },
            { id: 'lead_owner', name: 'Owner', width: 140, format: (value) => value || 'Unassigned' },
            { id: 'source', name: 'Source', width: 120 },
            { id: 'modified', name: 'Last Update', width: 140, format: (value) => frappe.datetime.str_to_user(value) }
        ];

        if (!this.datatable) {
            this.datatable = new frappe.DataTable($gridView.get(0), {
                columns: columns,
                data: this.leads,
                layout: 'fluid',
                cellHeight: 45,
                events: {
                    onRowClick: (row) => {
                        const rowIndex = row.rowIndex;
                        const doc = this.leads[rowIndex];
                        if (doc) frappe.set_route('Form', 'Lead', doc.name);
                    }
                }
            });
        } else {
            this.datatable.refresh(this.leads, columns);
        }
    }
}
