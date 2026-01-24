frappe.provide('apex_crm.utils');

apex_crm.utils = {
    // 1. Icon Helper
    get_icon_for_type: function (type) {
        if (!type) return null;
        const t = type.toLowerCase();

        // Social Media & Messaging
        if (t.includes('whatsapp')) return '<i class="fa fa-whatsapp" style="color:#25D366; font-size:16px;"></i>';
        if (t.includes('facebook') || t.includes('fb')) return '<i class="fa fa-facebook-official" style="color:#1877F2; font-size:16px;"></i>';
        if (t.includes('instagram')) return '<i class="fa fa-instagram" style="color:#E4405F; font-size:16px;"></i>';
        if (t.includes('linkedin')) return '<i class="fa fa-linkedin-square" style="color:#0A66C2; font-size:16px;"></i>';
        if (t.includes('twitter') || t.includes('x.com')) return '<i class="fa fa-twitter" style="color:#1DA1F2; font-size:16px;"></i>';
        if (t.includes('telegram')) return '<i class="fa fa-telegram" style="color:#0088cc; font-size:16px;"></i>';
        if (t.includes('tiktok')) return '<i class="fa fa-music" style="color:#000000; font-size:16px;"></i>';
        if (t.includes('snapchat')) return '<i class="fa fa-snapchat-ghost" style="color:#FFFC00; text-shadow:0 0 1px #000; font-size:16px;"></i>';
        if (t.includes('youtube')) return '<i class="fa fa-youtube-play" style="color:#FF0000; font-size:16px;"></i>';

        // Generic Contacts
        if (t === 'mobile') return '<i class="fa fa-mobile" style="color:#374151; font-size:18px;"></i>';
        if (t === 'phone') return '<i class="fa fa-phone" style="color:#374151; font-size:16px;"></i>';
        if (t === 'email') return '<i class="fa fa-envelope" style="color:#EA4335; font-size:16px;"></i>';
        if (t === 'website') return '<i class="fa fa-globe" style="color:#4b5563; font-size:16px;"></i>';
        if (t === 'address' || t === 'location') return '<i class="fa fa-map-marker" style="color:#DC2626; font-size:16px;"></i>';

        return null;
    },

    // 2. Card Renderer
    create_card_html: function (doc, options = {}) {
        const lead_name = doc.lead_name || doc.name;
        const status = doc.status || 'Open';
        const title = doc.title || '';
        const territory = doc.territory || '';
        const city = doc.city || doc.state || '';
        const mobile = doc.mobile_no || doc.phone || '';
        const last_updated = doc.modified ? frappe.datetime.comment_when(doc.modified) : '';

        // Status Colors
        const statusColors = {
            'Open': '#dc2626', 'Replied': '#2563eb', 'Interested': '#eab308',
            'Converted': '#16a34a', 'Lost Quotation': '#000000',
            'Do Not Contact': '#dc2626', 'Lead': '#6b7280', 'Opportunity': '#f97316'
        };
        const statusColorValue = statusColors[status] || '#6b7280';

        // Persisted State Logic
        let currentVal = options.currentVal || mobile;
        let currentType = options.currentType || (mobile ? 'Mobile' : '');
        let currentIcon = options.currentIcon || (mobile ? '📱' : '📞');

        if (window.apex_crm_selected_contacts && window.apex_crm_selected_contacts[doc.name]) {
            const saved = window.apex_crm_selected_contacts[doc.name];
            currentVal = saved.value;
            currentType = saved.type;
            currentIcon = saved.icon;
        }

        // Logic for Buttons
        const t = (currentType || '').toLowerCase();
        const showEmail = t.includes('email');
        const showMap = t.includes('address') || t.includes('location');
        const showMobile = ['mobile', 'phone', 'whatsapp', 'sms'].some(x => t.includes(x)) || (!t && !currentVal.includes('http') && !currentVal.includes('@'));
        const showLink = !showMobile && !showEmail && !showMap;

        // Icons
        let linkIconHtml = '<i class="fa fa-globe"></i>';
        if (showLink) {
            let specificIcon = this.get_icon_for_type(currentType);
            if (specificIcon) linkIconHtml = specificIcon;
        }

        let iconHtml = '';
        let helperIcon = this.get_icon_for_type(currentType);
        if (helperIcon) {
            iconHtml = `<span class="flag-icon" style="margin-right:6px;">${helperIcon}</span>`;
        } else {
            iconHtml = `<span class="flag-icon" style="margin-right:6px;">${currentIcon || '📞'}</span>`;
        }

        // Truncate Text
        let displayText = currentVal || 'Select Contact';
        if (displayText.length > 25 && (displayText.includes('http') || displayText.includes('@'))) {
            displayText = displayText.substring(0, 25) + '...';
        }

        // --- HTML TEMPLATE ---
        return `
            <div class="apex-premium-card" id="lead-card-${doc.name}" data-name="${doc.name}" onclick="frappe.set_route('Form', 'Lead', '${doc.name}')">
                <div class="card-header" style="align-items: flex-start;">
                    <div class="card-header-left" style="min-width: 0; flex: 1;">
                        <div class="card-info" style="min-width: 0; width: 100%;">
                            <div class="card-name" style="font-weight:700; font-size:15px; margin-bottom: 2px;">${lead_name}</div>
                            
                            <div class="card-subtext" style="display: flex; gap: 6px; align-items: center; margin-bottom:4px; font-size:11px; color:#6b7280;">
                                ${(title && title !== lead_name) ? `<span style="font-weight: 500; color: #4b5563;">${title}</span>` : ''}
                                ${last_updated ? `<span><i class="fa fa-clock-o"></i> ${last_updated}</span>` : ''}
                                ${(last_updated && (territory || city)) ? `<span style="color:#d1d5db;">•</span>` : ''}
                                ${(territory || city) ? `<span><i class="fa fa-map-marker"></i> ${[territory, city].filter(Boolean).join(', ')}</span>` : ''}
                            </div>
                            
                            <!-- Pills Area -->
                            <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:6px;">
                                ${doc.source ? `<span class="badge-pill" style="background:#f3f4f6; padding:2px 8px; border-radius:4px; font-size:11px;">${doc.source}</span>` : ''}
                                ${doc.lead_owner ? `<span class="badge-pill" style="background:#f3f4f6; padding:2px 8px; border-radius:4px; font-size:11px;">${doc.lead_owner}</span>` : ''}
                                ${doc.type ? `<span class="badge-pill" style="background:#f3f4f6; padding:2px 8px; border-radius:4px; font-size:11px;">${doc.type}</span>` : ''}
                                ${doc.request_type ? `<span class="badge-pill" style="background:#f3f4f6; padding:2px 8px; border-radius:4px; font-size:11px;">${doc.request_type}</span>` : ''}
                                
                                <!-- Qualification Status Pill -->
                                <span onclick="event.stopPropagation(); apex_crm.utils.show_qa_popover(event, '${doc.name}', '${doc.qualification_status}');" 
                                      class="qa-pill" 
                                      style="background:${doc.qualification_status === 'Qualified' ? '#dcfce7' : (doc.qualification_status === 'In Process' ? '#dbeafe' : '#f3f4f6')}; 
                                             color:${doc.qualification_status === 'Qualified' ? '#166534' : (doc.qualification_status === 'In Process' ? '#1e40af' : '#4b5563')}; 
                                             border:1px solid ${doc.qualification_status === 'Qualified' ? '#bbf7d0' : (doc.qualification_status === 'In Process' ? '#bfdbfe' : '#e5e7eb')}; 
                                             padding:2px 8px; border-radius:4px; font-size:11px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:4px;">
                                    ${doc.qualification_status || 'Unqualified'} <i class="fa fa-caret-down"></i>
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Status Badge -->
                    <div class="card-status-badge" 
                         onclick="event.stopPropagation(); apex_crm.utils.show_status_popover(event, '${doc.name}', '${status}');"
                         style="color: ${statusColorValue}; font-weight: 700; font-size: 12px; text-transform: uppercase; cursor: pointer;">
                        ${status} <i class="fa fa-caret-down" style="opacity: 0.6; font-size: 10px;"></i>
                    </div>
                </div>

                <!-- Action Bar -->
                <div class="quick-actions-bar">
                    <div class="phone-display" onclick="apex_crm.utils.toggle_contacts(event, '${doc.name}')" 
                         style="display:flex; align-items:center; background:#f3f4f6; padding:4px 8px; border-radius:6px; cursor:pointer; border:1px solid #e5e7eb;">
                        ${iconHtml}
                        <span class="phone-text" style="font-weight:600; font-size:13px; color:#374151; margin-right:4px;">${displayText}</span>
                        <i class="fa fa-caret-down" style="color:#6b7280; font-size:11px;"></i>
                    </div>
                
                    <div class="quick-btns" onclick="event.stopPropagation();">
                        <button class="quick-btn btn-add" onclick="event.stopPropagation(); apex_crm.utils.quick_add('${doc.name}');"><i class="fa fa-plus"></i></button>
                        
                        <button class="quick-btn btn-call" style="${showMobile ? '' : 'display:none;'}" onclick="event.stopPropagation(); apex_crm.utils.log_interaction('${doc.name}', 'Call', '${currentVal}');"><i class="fa fa-phone"></i></button>
                        <button class="quick-btn btn-whatsapp" style="${showMobile ? '' : 'display:none;'}" onclick="event.stopPropagation(); apex_crm.utils.log_interaction('${doc.name}', 'WhatsApp', '${currentVal}');"><i class="fa fa-whatsapp"></i></button>
                        
                        <button class="quick-btn btn-email" style="${showEmail ? '' : 'display:none;'}" onclick="event.stopPropagation(); window.location.href = 'mailto:${currentVal}';"><i class="fa fa-envelope"></i></button>
                        <button class="quick-btn btn-map" style="${showMap ? '' : 'display:none;'}" onclick="event.stopPropagation(); window.open('https://maps.google.com/?q=${encodeURIComponent(currentVal)}', '_blank');"><i class="fa fa-map-marker"></i></button>
                         <button class="quick-btn btn-link-action" style="${showLink ? '' : 'display:none;'}" onclick="event.stopPropagation(); window.open('${currentVal.startsWith('http') ? currentVal : 'https://' + currentVal}', '_blank');">${linkIconHtml}</button>
                    </div>
                </div>
            </div>`;
    },

    // 3. Popover Handlers
    show_qa_popover: function (event, lead_name, current_status) {
        $('.apex-status-popover').remove();
        const statuses = ['Unqualified', 'In Process', 'Qualified'];
        const qColors = { 'Unqualified': '#6b7280', 'In Process': '#2563eb', 'Qualified': '#16a34a' };

        const target = $(event.currentTarget);
        const offset = target.offset();
        const height = target.outerHeight();

        let popoverHtml = `<div class="apex-status-popover" style="position: absolute; top: ${offset.top + height + 5}px; left: ${offset.left - 20}px; min-width: 140px; background: white; border: 1px solid #e5e7eb; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border-radius: 8px; padding: 6px; z-index: 1000; display: flex; flex-direction: column; gap: 4px;">`;

        statuses.forEach(status => {
            const isActive = status === (current_status || 'Unqualified');
            popoverHtml += `<div onclick="apex_crm.utils.update_qa_submit('${lead_name}', '${status}', this)" 
                  style="padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; display: flex; align-items: center; justify-content: space-between; color: ${qColors[status]}; ${isActive ? 'background-color: #f3f4f6;' : ''}">
                  <span>${status}</span>${isActive ? '<i class="fa fa-check"></i>' : ''}</div>`;
        });
        popoverHtml += '</div>';
        $('body').append(popoverHtml);
        this.bind_outside_click('.apex-status-popover', target);
    },

    update_qa_submit: function (lead, new_status, btn) {
        if ($(btn).hasClass('processing')) return;
        $(btn).addClass('processing').css('opacity', '0.6');
        frappe.call({
            method: 'apex_crm.api.update_qualification_status',
            args: { lead: lead, status: new_status },
            callback: (r) => {
                if (!r.exc) {
                    frappe.show_alert({ message: __('Qualification Updated'), indicator: 'green' });
                    $('.apex-status-popover').remove();
                    this.trigger_refresh();
                }
                $(btn).removeClass('processing');
            }
        });
    },

    show_status_popover: function (event, lead_name, current_status) {
        $('.apex-status-popover').remove();
        const statuses = ['Open', 'Replied', 'Interested', 'Converted', 'Do Not Contact', 'Lead', 'Opportunity', 'Quotation', 'Lost Quotation'];
        const target = $(event.currentTarget);
        const offset = target.offset();

        let popoverHtml = `<div class="apex-status-popover" style="position:absolute; top:${offset.top + 30}px; left:${offset.left - 100}px; min-width:160px; background:white; border:1px solid #e5e7eb; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1); z-index:9999; padding:6px; border-radius:8px;">`;
        statuses.forEach(s => {
            const isActive = s === current_status;
            popoverHtml += `<div onclick="apex_crm.utils.update_status_submit('${lead_name}', '${s}')" style="padding:8px; cursor:pointer; font-size:13px; ${isActive ? 'background:#f3f4f6; font-weight:600;' : ''}">${s}</div>`;
        });
        popoverHtml += '</div>';
        $('body').append(popoverHtml);
        this.bind_outside_click('.apex-status-popover', target);
    },

    update_status_submit: function (lead, status) {
        frappe.call({
            method: 'frappe.client.set_value',
            args: { doctype: 'Lead', name: lead, fieldname: 'status', value: status },
            callback: (r) => {
                if (!r.exc) {
                    frappe.show_alert({ message: 'Status updated', indicator: 'green' });
                    $('.apex-status-popover').remove();
                    this.trigger_refresh();
                }
            }
        });
    },

    // 4. Contact Toggle & Selection
    toggle_contacts: function (event, lead_name) {
        event.stopPropagation();
        const $btn = $(event.currentTarget);

        if ($(`#contact-popover-${lead_name}`).length) {
            $(`#contact-popover-${lead_name}`).remove();
            return;
        }

        const offset = $btn.offset();
        const $popover = $(`<div id="contact-popover-${lead_name}" 
            style="position:absolute; top:${offset.top + 38}px; left:${offset.left}px; z-index:9999; background:white; border:1px solid #e5e7eb; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1); border-radius:8px; width:220px; padding:6px;">
            <div class="text-muted" style="font-size:11px; padding:8px;">Loading contacts...</div>
        </div>`);

        $('body').append($popover);
        this.bind_outside_click(`#contact-popover-${lead_name}`, $btn);

        frappe.call({
            method: 'apex_crm.api.get_lead_contact_details',
            args: { lead: lead_name },
            callback: (r) => {
                const contacts = r.message || [];
                $popover.empty();

                if (contacts.length === 0) {
                    $popover.append('<div class="text-muted" style="font-size:11px; padding:8px;">No contacts found</div>');
                } else {
                    contacts.forEach(c => {
                        let listIconHtml = this.get_icon_for_type(c.type);
                        if (!listIconHtml) {
                            if ((c.type || '').toLowerCase().includes('mobile')) listIconHtml = '<i class="fa fa-mobile" style="font-size:16px;"></i>';
                            else listIconHtml = '<i class="fa fa-circle-o"></i>';
                        }

                        const $item = $(`
                            <div style="padding:8px; border-radius:6px; cursor:pointer; display:flex; align-items:center; gap:8px; border-bottom:1px solid #f3f4f6;">
                                ${listIconHtml}
                                <div style="display:flex; flex-direction:column;">
                                    <span style="font-weight:600; font-size:13px; color:#374151;">${c.type}</span>
                                    <span style="font-size:12px; color:#6b7280; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:180px;">${c.value}</span>
                                </div>
                            </div>
                        `);

                        $item.on('click', (e) => {
                            e.stopPropagation();
                            this.select_contact(lead_name, c.type, c.value);
                            $(`#contact-popover-${lead_name}`).remove();
                        });

                        $popover.append($item);
                    });
                }
            }
        });
    },

    select_contact: function (lead_name, type, value) {
        if (!window.apex_crm_selected_contacts) window.apex_crm_selected_contacts = {};
        window.apex_crm_selected_contacts[lead_name] = { type, value, icon: '📱' };

        const $card = $(`#lead-card-${lead_name}`);
        const $phoneDisplay = $card.find('.phone-text');
        const $flag = $card.find('.flag-icon');

        // Update Text
        let displayValue = value;
        if (value && value.length > 25 && (value.includes('http') || type.toLowerCase().includes('facebook'))) {
            displayValue = value.substring(0, 25) + '...';
        }
        $phoneDisplay.text(displayValue);

        // Update Icon
        const socialIcon = this.get_icon_for_type(type);
        if (socialIcon) {
            $flag.html(socialIcon);
        } else {
            $flag.text('📞');
        }

        // Update Buttons Visibility
        const $btns = $card.find('.quick-btns');
        $btns.find('.quick-btn').hide();
        $btns.find('.btn-add').show();

        const typeLower = (type || '').toLowerCase();

        if (typeLower.includes('email')) {
            $btns.find('.btn-email').attr('onclick', `event.stopPropagation(); window.location.href = 'mailto:${value}';`).show();
        } else if (['mobile', 'phone', 'whatsapp'].some(x => typeLower.includes(x))) {
            $btns.find('.btn-call').attr('onclick', `event.stopPropagation(); apex_crm.utils.log_interaction('${lead_name}', 'Call', '${value}');`).show();
            // Assuming basic logic, can expand for SMS/WhatsApp specific buttons
            $btns.find('.btn-whatsapp').attr('onclick', `event.stopPropagation(); apex_crm.utils.log_interaction('${lead_name}', 'WhatsApp', '${value}');`).show();
        } else {
            // Link/Map Fallback
            $btns.find('.btn-link-action').attr('onclick', `event.stopPropagation(); window.open('${value.startsWith('http') ? value : 'https://' + value}', '_blank');`).show();
        }
    },

    // 5. Interaction Dialogs
    log_interaction: function (lead, type, value) {
        // Simple Interaction Log (For now just alert/open)
        // In real app, open a dialog to log note + type
        if (type === 'Call') window.open(`tel:${value}`);
        if (type === 'WhatsApp') window.open(`https://wa.me/${value}`);
        frappe.msgprint(`Interaction Logged: ${type} to ${value}`);
    },

    quick_add: function (lead) {
        frappe.msgprint("Quick Add Feature Coming Soon");
    },

    // Helper: Bind Outside Click
    bind_outside_click: function (selector, $target) {
        setTimeout(() => {
            $(document).on('click.apex_popover', function (e) {
                if (!$(e.target).closest(selector).length && !$(e.target).closest($target).length) {
                    $(selector).remove(); // Close
                    $(document).off('click.apex_popover');
                }
            });
        }, 100);
    },

    trigger_refresh: function () {
        // Tries to find the active controller to refresh
        if (window.cur_page_widget && window.cur_page_widget.crm_controller) {
            window.cur_page_widget.crm_controller.load_data();
        } else if (window.global_listview_ref) {
            window.global_listview_ref.refresh();
        } else {
            // Last resort
            frappe.route_options = {};
            frappe.reload_doc('Apex CRM', 'Page', 'crm-dashboard');
        }
    }
};
