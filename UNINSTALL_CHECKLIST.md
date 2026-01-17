# Apex CRM - Uninstall/Reinstall Checklist

## ✅ Current Status (Verified)

### Custom Fields (9 fields)
- ✅ `apex_contacts_section` - Section Break (visible)
- ✅ `contact_manager_ui` - HTML field (visible)
- ✅ `interaction_history` - Table field (visible)
- ✅ `interaction_history_ui` - HTML field (visible)
- ✅ `custom_mobile_number_1` - Custom field (visible)
- ✅ `custom_mobile_number_2` - Custom field (visible)
- ✅ `custom_facebook` - Custom field (visible)
- ✅ `custom_column_break_lyb5r` - Column Break (visible)
- ℹ️ `smart_contact_details` - From apex_contacts app (NOT deleted by uninstall)

### Property Setters
- ✅ **NO Property Setters hiding Lead fields** (verified)
- ✅ Property Setter fixture is **DISABLED** in hooks.py (commented out)

### Client Scripts (12 scripts)
- ✅ `Lead List Apex CRM Buttons` - **Enabled** (main list view script)
- ✅ `Lead Default Contact Rows` - **Enabled**
- ✅ `Lead Show Hide Comment` - **Enabled**
- ✅ `Opportunity Show Hide Comment` - **Enabled**
- ℹ️ Other scripts are disabled (intentionally)

### Custom DocTypes
- ✅ `Apex Contact Detail` - Child table (exists)
- ✅ `Apex Interaction Log` - Child table (exists)
- ✅ `Apex Ignored Duplicate` - Regular DocType (exists, 0 records)

### Pages
- ✅ `duplicate-manager` - Page exists

### JavaScript Functionality
- ✅ Edit interaction - Working (with frm.dirty())
- ✅ Delete interaction - Working (with frm.dirty())
- ✅ Add interaction - Working
- ✅ Custom UI rendering - Working
- ✅ Date/time formatting in list view - Working

## 🔒 Data Safety

### What WILL be preserved:
1. ✅ **Lead data** - All Lead records remain intact
2. ✅ **Standard Lead fields** - Phone, Email, Mobile, etc. remain visible
3. ✅ **smart_contact_details** - From apex_contacts app (NOT deleted)
4. ✅ **Data in child tables** - Will be preserved if Custom Fields are recreated

### What WILL be deleted on uninstall:
1. ⚠️ Custom Fields (9 fields) - Will be deleted
2. ⚠️ Custom DocTypes - Will be deleted (but data in Lead records remains)
3. ⚠️ Client Scripts - Will be deleted
4. ⚠️ Property Setters - Will be deleted
5. ⚠️ Pages - Will be deleted

### What will be RESTORED on reinstall:
1. ✅ Custom Fields - Will be recreated from fixtures
2. ✅ Custom DocTypes - Will be recreated
3. ✅ Client Scripts - Will be recreated from fixtures
4. ✅ Pages - Will be recreated
5. ✅ **Data in child tables** - Will be accessible again after reinstall

## 📋 Pre-Uninstall Checklist

Before uninstalling, ensure:
- [x] All interactions are saved (Edit/Delete working correctly)
- [x] All contacts are saved in smart_contact_details
- [x] No Property Setters hiding standard Lead fields
- [x] Custom Fields fixtures are correct
- [x] Client Scripts fixtures are correct
- [x] uninstall.py is ready (only deletes Apex CRM module items)

## 🚀 Uninstall Process

1. **Backup** (optional but recommended):
   ```bash
   bench --site [site-name] backup --with-files
   ```

2. **Uninstall**:
   ```bash
   bench --site [site-name] uninstall-app apex_crm
   ```

3. **Verify cleanup**:
   - Check that Custom Fields are deleted
   - Check that DocTypes are deleted
   - Check that Client Scripts are deleted
   - **Verify Lead data is still intact**

## 🔄 Reinstall Process

1. **Install**:
   ```bash
   bench --site [site-name] install-app apex_crm
   bench --site [site-name] migrate
   ```

2. **Verify restoration**:
   - Check that Custom Fields are recreated
   - Check that DocTypes are recreated
   - Check that Client Scripts are recreated
   - **Verify data in child tables is accessible**

## ⚠️ Important Notes

1. **Data Preservation**: 
   - Child table data (Apex Contact Detail, Apex Interaction Log) is stored in Lead records
   - When Custom Fields are deleted, the data structure is removed but data may remain in database
   - When Custom Fields are recreated, data should be accessible again

2. **Standard Fields**:
   - Standard Lead fields (phone, mobile_no, email_id, etc.) are NOT affected
   - They remain visible and functional

3. **smart_contact_details**:
   - This field is from `apex_contacts` app, NOT `apex_crm`
   - It will NOT be deleted by uninstall
   - It will remain functional

4. **Property Setters**:
   - No Property Setters are hiding Lead fields
   - Property Setter fixture is disabled in hooks.py
   - No fields will be hidden after reinstall

## ✅ Final Verification

After reinstall, verify:
- [ ] Apex Contacts section is visible
- [ ] Contact Manager UI is working
- [ ] Interaction History UI is working
- [ ] Edit/Delete interactions work
- [ ] Add interaction works
- [ ] Standard Lead fields are visible
- [ ] Duplicate Manager page is accessible
- [ ] List view buttons are visible
- [ ] Date/time formatting is correct

---

**Last Updated**: 2025-12-29
**Status**: ✅ Ready for Uninstall/Reinstall




















