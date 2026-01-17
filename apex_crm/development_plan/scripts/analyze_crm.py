#!/usr/bin/env python3
"""
CRM Module Analysis Script
Analyzes ERPNext CRM module to identify standard vs customized components
"""

import frappe
import json
from frappe.utils import now


def analyze_crm_module():
    """Main analysis function"""
    
    print("=" * 80)
    print("ERPNext CRM Module Analysis Report")
    print("=" * 80)
    print(f"Generated: {now()}\n")
    
    # 1. Get all CRM DocTypes
    print("\n1. CRM DocTypes Analysis")
    print("-" * 80)
    crm_doctypes = frappe.get_all('DocType', 
        filters={'module': 'CRM'}, 
        fields=['name', 'custom', 'is_submittable', 'istable'],
        order_by='custom, name')
    
    standard_doctypes = [dt for dt in crm_doctypes if not dt.custom]
    custom_doctypes = [dt for dt in crm_doctypes if dt.custom]
    
    print(f"Total DocTypes: {len(crm_doctypes)}")
    print(f"  - Standard (ERPNext): {len(standard_doctypes)}")
    print(f"  - Custom: {len(custom_doctypes)}")
    
    print("\nStandard DocTypes:")
    for dt in standard_doctypes:
        submittable = " [Submittable]" if dt.is_submittable else ""
        table = " [Child Table]" if dt.istable else ""
        print(f"  - {dt.name}{submittable}{table}")
    
    if custom_doctypes:
        print("\nCustom DocTypes:")
        for dt in custom_doctypes:
            print(f"  - {dt.name}")
    
    # 2. Get Custom Fields
    print("\n\n2. Custom Fields Analysis")
    print("-" * 80)
    
    crm_doctype_names = [dt.name for dt in crm_doctypes]
    custom_fields = frappe.get_all('Custom Field',
        filters={'dt': ['in', crm_doctype_names]},
        fields=['dt', 'fieldname', 'label', 'fieldtype', 'module'],
        order_by='dt, idx')
    
    print(f"Total Custom Fields: {len(custom_fields)}")
    
    if custom_fields:
        # Group by DocType
        cf_by_doctype = {}
        for cf in custom_fields:
            if cf.dt not in cf_by_doctype:
                cf_by_doctype[cf.dt] = []
            cf_by_doctype[cf.dt].append(cf)
        
        for dt_name, fields in cf_by_doctype.items():
            print(f"\n{dt_name}: ({len(fields)} custom fields)")
            for cf in fields:
                print(f"  - {cf.fieldname} ({cf.label}) - {cf.fieldtype} [Module: {cf.module}]")
    else:
        print("No custom fields found in CRM DocTypes")
    
    # 3. Get Client Scripts
    print("\n\n3. Client Scripts Analysis")
    print("-" * 80)
    
    client_scripts = frappe.get_all('Client Script',
        filters={'dt': ['in', crm_doctype_names], 'enabled': 1},
        fields=['name', 'dt', 'module'],
        order_by='dt, name')
    
    print(f"Total Active Client Scripts: {len(client_scripts)}")
    if client_scripts:
        cs_by_doctype = {}
        for cs in client_scripts:
            if cs.dt not in cs_by_doctype:
                cs_by_doctype[cs.dt] = []
            cs_by_doctype[cs.dt].append(cs)
        
        for dt_name, scripts in cs_by_doctype.items():
            print(f"\n{dt_name}: ({len(scripts)} scripts)")
            for cs in scripts:
                print(f"  - {cs.name} [Module: {cs.module}]")
    else:
        print("No client scripts found")
    
    # 4. Get Server Scripts
    print("\n\n4. Server Scripts Analysis")
    print("-" * 80)
    
    server_scripts = frappe.get_all('Server Script',
        filters={'reference_doctype': ['in', crm_doctype_names], 'disabled': 0},
        fields=['name', 'reference_doctype', 'module'],
        order_by='reference_doctype, name')
    
    print(f"Total Active Server Scripts: {len(server_scripts)}")
    if server_scripts:
        for ss in server_scripts:
            print(f"  - {ss.name} (DocType: {ss.reference_doctype}) [Module: {ss.module}]")
    else:
        print("No server scripts found")
    
    # 5. Get Property Setters
    print("\n\n5. Property Setters Analysis")
    print("-" * 80)
    
    property_setters = frappe.get_all('Property Setter',
        filters={'doc_type': ['in', crm_doctype_names]},
        fields=['doc_type', 'field_name', 'property', 'value', 'module'],
        order_by='doc_type, field_name')
    
    print(f"Total Property Setters: {len(property_setters)}")
    if property_setters:
        ps_by_doctype = {}
        for ps in property_setters:
            if ps.doc_type not in ps_by_doctype:
                ps_by_doctype[ps.doc_type] = []
            ps_by_doctype[ps.doc_type].append(ps)
        
        for dt_name, setters in ps_by_doctype.items():
            print(f"\n{dt_name}: ({len(setters)} property setters)")
            for ps in setters:
                field = f" > {ps.field_name}" if ps.field_name else ""
                print(f"  - {ps.property}{field} = {ps.value} [Module: {ps.module}]")
    else:
        print("No property setters found")
    
    # 6. Get Workspaces
    print("\n\n6. Workspaces Analysis")
    print("-" * 80)
    
    workspaces = frappe.get_all('Workspace',
        filters={'module': 'CRM'},
        fields=['name', 'title', 'public', 'module'],
        order_by='name')
    
    print(f"Total CRM Workspaces: {len(workspaces)}")
    for ws in workspaces:
        public = " [Public]" if ws.public else " [Private]"
        print(f"  - {ws.name} ({ws.title}){public}")
    
    # 7. Summary and Recommendations
    print("\n\n7. Summary & Recommendations")
    print("=" * 80)
    
    print("\nCurrent State:")
    print(f"  ✓ Standard DocTypes: {len(standard_doctypes)}")
    print(f"  ✓ Custom DocTypes: {len(custom_doctypes)}")
    print(f"  ✓ Custom Fields: {len(custom_fields)}")
    print(f"  ✓ Client Scripts: {len(client_scripts)}")
    print(f"  ✓ Server Scripts: {len(server_scripts)}")
    print(f"  ✓ Property Setters: {len(property_setters)}")
    
    print("\nRecommendations:")
    print("  1. Move all customizations to apex_crm app")
    print("  2. Export custom fields to fixtures")
    print("  3. Convert client/server scripts to app-based hooks")
    print("  4. Document all customizations in apex_crm")
    print("  5. Keep ERPNext CRM module untouched for updates")
    
    print("\n" + "=" * 80)
    print("Analysis Complete!")
    print("=" * 80)


if __name__ == "__main__":
    frappe.init(site='site1')
    frappe.connect()
    analyze_crm_module()
