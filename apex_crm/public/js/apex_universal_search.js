
// -------------------------------------------------------------------------------- //
//                       APEX UNIVERSAL SEARCH BAR LOGIC                            //
// -------------------------------------------------------------------------------- //

function setupUniversalSearchBar(listview) {
    if ($('.apex-universal-search').length && $('.apex-universal-search').is(':visible')) {
        return;
    }

    // Create Search Bar HTML
    const $searchBar = $(`
        <div class="apex-universal-search" style="
            display: flex;
            align-items: center;
            background: #fff;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            padding: 4px 8px;
            margin: 10px 15px;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
            max-width: 600px;
        ">
            <!-- Field Selector -->
            <div class="search-field-select-wrapper" style="
                border-right: 1px solid #e5e7eb;
                margin-right: 8px;
                padding-right: 8px;
                position: relative;
            ">
                <select id="lead-mobile-search-field" style="
                    border: none;
                    background: transparent;
                    font-size: 13px;
                    color: #4b5563;
                    font-weight: 500;
                    outline: none;
                    appearance: none;
                    cursor: pointer;
                    padding-right: 16px;
                ">
                    <option value="custom_search_index" selected>Global Search</option>
                    <option value="lead_name">Name</option>
                    <option value="mobile_no">Mobile</option>
                    <option value="status">Status</option>
                    <option value="title">Title</option>
                    <option value="email_id">Email</option>
                    <option value="company_name">Company</option>
                    <option value="city">City</option>
                    <option value="territory">Territory</option>
                    <option value="source">Source</option>
                    <!-- Alias Maps -->
                    <option value="note_search">Notes</option>
                    <option value="comment_search">Comments</option>
                    <option value="task_search">Tasks</option>
                    <option value="address_search">Address</option>
                    <option value="interaction_search">Interactions</option>
                </select>
                <i class="fa fa-caret-down" style="
                    position: absolute;
                    right: 0;
                    top: 50%;
                    transform: translateY(-50%);
                    font-size: 10px;
                    color: #9ca3af;
                    pointer-events: none;
                "></i>
            </div>

            <!-- Search Input -->
            <div id="lead-mobile-search-input-wrapper" style="flex: 1; display: flex; align-items: center;">
                 <i class="fa fa-search search-icon" style="color: #9ca3af; margin-right: 8px;"></i>
                 <input type="text" id="lead-mobile-search-input" placeholder="Search anything..." style="
                    border: none;
                    outline: none;
                    width: 100%;
                    font-size: 14px;
                    color: #111827;
                 " autocomplete="off">
            </div>

            <!-- Action Buttons -->
            <div id="lead-mobile-search-clear" style="display: none; cursor: pointer; color: #9ca3af; padding: 4px;">
                <i class="fa fa-times-circle"></i>
            </div>
            <div id="lead-mobile-search-btn" style="
                cursor: pointer;
                color: #4f46e5;
                font-weight: 600;
                font-size: 13px;
                padding-left: 12px;
                border-left: 1px solid #e5e7eb;
                margin-left: 8px;
            ">
                GO
            </div>
        </div>
    `);

    // Injection Logic
    const $stdFilterSection = listview.$page.find('.standard-filter-section');
    if ($stdFilterSection.length) {
        $stdFilterSection.prepend($searchBar);
    } else {
        // Fallback injection
        $('.page-head').after($searchBar);
    }

    // Event Handling logic inline for simplicity
    const $input = $searchBar.find('#lead-mobile-search-input');
    const $select = $searchBar.find('#lead-mobile-search-field');
    const $clear = $searchBar.find('#lead-mobile-search-clear');
    const $go = $searchBar.find('#lead-mobile-search-btn');

    const doSearch = () => {
        const val = $input.val().trim();
        const field = $select.val();

        if (!val) {
            listview.filter_area.clear().then(() => listview.refresh());
            return;
        }

        let operator = 'like';
        let filterValue = `%${val}%`;
        let actualField = field;

        // Exact match fields
        if (['status', 'source', 'lead_owner', 'gender', 'territory'].includes(field)) {
            operator = '=';
            filterValue = val;
        }

        // Alias fields
        if (['note_search', 'comment_search', 'interaction_search'].includes(field)) {
            actualField = 'custom_search_index';
        }

        listview.filter_area.clear(true).then(() => {
            return listview.filter_area.add([
                ['Lead', actualField, operator, filterValue]
            ]);
        }).then(() => listview.refresh());
    };

    $input.on('input', function () {
        if ($(this).val()) $clear.show(); else $clear.hide();
    });

    $input.on('keypress', function (e) {
        if (e.which === 13) doSearch();
    });

    $go.on('click', doSearch);

    $clear.on('click', function () {
        $input.val('');
        $clear.hide();
        doSearch();
    });
}
