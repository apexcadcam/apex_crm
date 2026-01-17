# Apex CRM

Advanced CRM Application for ERPNext with mobile-optimized Lead management, universal search, and comprehensive contact tracking.

## 🚀 Features

### 📱 Mobile-Optimized Lead List View
- **Card-based UI**: Beautiful, responsive cards for mobile devices
- **Quick Actions**: One-tap access to call, WhatsApp, SMS, and add contacts
- **Status Management**: Easy status updates with visual indicators
- **Contact Switcher**: Seamlessly switch between multiple contact methods
- **Interaction History**: Quick access to notes, tasks, events, quotes, opportunities, and customers

### 🔍 Universal Search Bar
- **Multi-field Search**: Search across name, mobile, email, company, city, territory, country, and more
- **Smart Contact Search**: Search by phone, WhatsApp, Telegram, Facebook, Instagram, LinkedIn, and website
- **Dynamic Input Types**: Automatically switches between text input and select dropdowns based on field type
- **Live Search**: Real-time filtering as you type
- **Persistent State**: Maintains search context across page refreshes

### 📞 Comprehensive Contact Management
- **Multiple Contact Types**: Phone, Mobile, Email, WhatsApp, Telegram, LinkedIn, Facebook, Instagram, TikTok, Snapchat, and more
- **Country Code Support**: Automatic country code detection and formatting
- **Primary Contact**: Mark and manage primary contact methods
- **Contact Actions**: Quick access to call, message, or open links

### 📊 Custom DocTypes
- **Apex Contact Detail**: Child table for managing multiple contact methods per Lead
- **Apex Interaction Log**: Track all interactions (calls, WhatsApp, SMS, meetings) with detailed status and duration
- **Apex Ignored Duplicate**: Manage duplicate detection exceptions
- **Apex CRM Settings**: Centralized configuration for CRM features
- **Apex Device Token**: Mobile push notification support
- **Apex Notification Settings**: Customizable notification preferences

### 🎨 Custom Pages
- **Duplicate Manager**: Advanced duplicate detection and management
- **Data Migration Manager**: Import/export tools for Lead data
- **Export/Import Manager**: Excel-based data migration utilities

### ⚙️ Advanced Customizations
- **Lead Override**: Custom Lead class with enhanced functionality
- **Custom Fields**: Extensive field additions to Lead doctype
- **Client Scripts**: Enhanced form and list view behaviors
- **Property Setters**: Field visibility and behavior modifications

## 📋 Requirements

- **ERPNext**: v15.0.0 or higher
- **Frappe Framework**: v15.0.0 or higher
- **Python**: 3.10 or higher

## 🔧 Installation

### Step 1: Get the App

```bash
cd /path/to/frappe-bench/apps
git clone https://github.com/apexcadcam/apex_crm.git apex_crm
```

### Step 2: Install the App

```bash
cd /path/to/frappe-bench
bench --site [site-name] install-app apex_crm
```

### Step 3: Migrate

```bash
bench --site [site-name] migrate
```

### Step 4: Build Assets (if needed)

```bash
bench build --app apex_crm
```

## 📖 Usage

### Lead List View

The Lead list view automatically displays:
- **Desktop**: Enhanced list with universal search bar
- **Mobile**: Card-based view with quick actions and contact switcher

### Universal Search

1. Select a field from the dropdown (Name, Mobile, Status, etc.)
2. For select fields (Status, Source, City, Territory, Country), choose from dropdown
3. For text fields, type to search in real-time
4. Search results update automatically as you type

### Contact Management

1. Open any Lead
2. Navigate to "Apex Contact Details" section
3. Add multiple contact methods (Phone, Email, WhatsApp, etc.)
4. Mark one as primary
5. Use quick actions in list view to call or message

### Interaction Logging

1. Click call/WhatsApp/SMS buttons in Lead list or form
2. Log interaction with status (Connected, Busy, No Answer, etc.)
3. Add duration and notes
4. View interaction history in Lead form

## 🔄 Uninstallation

```bash
bench --site [site-name] uninstall-app apex_crm
```

**Note**: Uninstallation will:
- Remove all custom fields added by Apex CRM
- Remove all client scripts
- Remove all custom DocTypes
- Clean up all related data

## 🏗️ Architecture

### Overrides

The app overrides the standard `Lead` doctype class:

```python
# hooks.py
override_doctype_class = {
    "Lead": "apex_crm.overrides.lead.ApexLead"
}
```

This allows for:
- Custom validation logic
- Enhanced save behavior
- Automatic contact synchronization
- Custom search indexing

### Fixtures

All customizations are exported as fixtures:
- `fixtures/custom_field.json`: Custom fields for Lead
- `fixtures/property_setter.json`: Field property modifications
- `fixtures/client_script.json`: Client-side JavaScript enhancements

### JavaScript Files

- `public/js/lead.js`: Lead form customizations
- `public/js/lead_list_unified.js`: List view with mobile cards and universal search
- `public/js/site_switcher.js`: Multi-site switching functionality

### CSS Files

- `public/css/apex_cards.css`: Mobile card styling
- `public/css/large_screen.css`: Desktop optimizations

## 📁 Project Structure

```
apex_crm/
├── apex_crm/
│   ├── __init__.py
│   ├── hooks.py              # App configuration
│   ├── api.py                # API endpoints
│   ├── install.py            # Installation logic
│   ├── uninstall.py          # Uninstallation logic
│   ├── fixtures/             # Exported customizations
│   │   ├── custom_field.json
│   │   ├── property_setter.json
│   │   └── client_script.json
│   ├── doctype/               # Custom DocTypes
│   │   ├── apex_contact_detail/
│   │   ├── apex_interaction_log/
│   │   ├── apex_ignored_duplicate/
│   │   ├── apex_crm_role/
│   │   └── apex_crm_settings/
│   ├── page/                 # Custom pages
│   │   ├── duplicate_manager/
│   │   ├── datamigrationmanager/
│   │   └── exportimportmanager/
│   ├── public/
│   │   ├── js/              # JavaScript files
│   │   └── css/             # Stylesheets
│   ├── overrides/            # DocType class overrides
│   │   └── lead.py
│   ├── migration/           # Data migration scripts
│   └── patches.txt          # Database patches
├── MANIFEST.in
├── README.md
├── LICENSE
└── pyproject.toml
```

## 🔐 Permissions

All custom DocTypes include proper permission definitions. Permissions are managed through:
- DocType JSON files (permissions array)
- Role-based access control
- Custom permission methods (if needed)

## 🧪 Development

### Running Tests

```bash
bench --site [site-name] run-tests --app apex_crm
```

### Building Assets

```bash
bench build --app apex_crm
```

### Creating Fixtures

```bash
bench --site [site-name] export-fixtures
```

## 📝 Notes

### Lead Override

The app overrides the standard Lead class to provide:
- Automatic contact synchronization
- Custom search index building
- Enhanced validation
- Custom save behavior

**Important**: If you have other apps that also override Lead, ensure compatibility.

### Custom Search Index

The app maintains a `custom_search_index` field on Lead that indexes:
- Contact details (phone, email, WhatsApp, etc.)
- Notes and comments
- Tasks and events
- Address information
- Interaction history

This enables fast, comprehensive search across all Lead data.

### Mobile Cards

The mobile card view is automatically enabled on screens smaller than 992px. Cards include:
- Lead name and title
- Status badge
- Quick contact actions
- Info pills (Notes, Tasks, Events, Quotes, Prospects, Opportunities, Customers)
- Latest interaction summary

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues, questions, or feature requests:
- Open an issue on GitHub
- Contact: info@apex-solutions.com

## 🙏 Acknowledgments

Built for ERPNext v15+ with Frappe Framework.

---

**Version**: 1.0.0  
**Last Updated**: January 2025
