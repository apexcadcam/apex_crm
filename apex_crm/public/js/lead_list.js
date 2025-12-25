frappe.listview_settings['Lead'] = {
    onload: function (listview) {
        // 1. Duplicate Manager Button
        listview.page.add_inner_button(__('Duplicate Manager'), function () {
            frappe.set_route('duplicate-manager');
        });

        // 2. Custom "Smart Search" Bar (Mimics Link Field behavior)
        // We inject it into the page header or a custom wrapper
        // Creating a container in the custom_actions area

        let $search_area = listview.page.custom_actions;

        // Create a wrapper for our control
        let $control_wrapper = $('<div class="smart-search-wrapper" style="width: 300px; display: inline-block; margin-right: 10px;"></div>').prependTo($search_area);

        // Create the Link Control
        let search_field = frappe.ui.form.make_control({
            parent: $control_wrapper,
            df: {
                fieldtype: 'Link',
                options: 'Lead',
                fieldname: 'smart_search_lead',
                placeholder: __('Search Name, Phone, ID...'),
                only_select: true, // Auto clear after select? No, nav.
                change: function () {
                    let val = search_field.get_value();
                    if (val) {
                        frappe.set_route('Form', 'Lead', val);
                    }
                }
            },
            render_input: true
        });

        // Style adjustments (make it look integrated)
        $control_wrapper.find('.control-label').hide(); // Hide label
        $control_wrapper.find('.form-group').css('margin', '0');
    }
};
