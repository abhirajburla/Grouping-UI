import pandas as pd
import json
import os

def read_categories(txt_file):
    """Read categories from txt file and return a dictionary mapping item number to category"""
    categories = {}
    if not os.path.exists(txt_file):
        return categories
    
    with open(txt_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        # Skip header line
        for line in lines[1:]:
            parts = line.strip().split('\t')
            if len(parts) >= 3:
                item_num = parts[0].strip()
                category = parts[2].strip()
                categories[item_num] = category
    return categories

def read_csv_data(csv_file):
    """Read CSV file and return DataFrame"""
    if not os.path.exists(csv_file):
        return pd.DataFrame()
    
    # Skip first two rows (Project Name and empty row)
    df = pd.read_csv(csv_file, skiprows=2, encoding='utf-8')
    # Clean column names (remove leading/trailing spaces and quotes)
    df.columns = df.columns.str.strip().str.strip('"')
    return df

def parse_drawing_references(ref_string):
    """Parse drawing reference string into categorized links"""
    if pd.isna(ref_string) or ref_string == '' or str(ref_string).strip() == '':
        return []
    
    ref_string = str(ref_string).strip()
    
    # Split by comma
    refs = [r.strip() for r in ref_string.split(',') if r.strip()]
    
    if not refs:
        return []
    
    categories = {}
    
    for ref in refs:
        # Determine category based on content
        ref_lower = ref.lower()
        if 'civil' in ref_lower or (ref.startswith('C') and not ref.startswith('C5')):
            cat = 'Civil'
        elif 'architectural' in ref_lower or ref.startswith('A') or ref.startswith('NO. A'):
            cat = 'Architectural'
        elif 'mechanical' in ref_lower or ref.startswith('M') or ref.startswith('NO. M'):
            cat = 'Mechanical'
        elif 'electrical' in ref_lower or ref.startswith('E') or ref.startswith('NO. E'):
            cat = 'Electrical'
        elif 'plumbing' in ref_lower or ref.startswith('P') or ref.startswith('NO. P'):
            cat = 'Plumbing'
        elif 'landscape' in ref_lower or ref.startswith('L'):
            cat = 'Landscape'
        elif 'general' in ref_lower or ref.startswith('G') or ref.startswith('NO. S') or ref.startswith('S'):
            cat = 'General'
        else:
            cat = 'General'
        
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(ref)
    
    # Format as list of {category, count, items}
    result = []
    for cat, items in sorted(categories.items()):
        result.append({
            'category': cat,
            'count': len(items),
            'items': items  # Show all items
        })
    
    return result

def parse_spec_references(ref_string):
    """Parse specification reference string into categorized links"""
    if pd.isna(ref_string) or ref_string == '' or str(ref_string).strip() == '':
        return []
    
    ref_string = str(ref_string).strip()
    
    # Split by comma
    refs = [r.strip() for r in ref_string.split(',') if r.strip()]
    
    if not refs:
        return []
    
    categories = {}
    
    for ref in refs:
        # Extract division number (e.g., "26 05 19 - ..." -> "Div 26 - Electrical")
        if ' - ' in ref:
            parts = ref.split(' - ')
            div_code = parts[0].strip()
            div_num = div_code.split()[0] if div_code.split() else '26'
            
            if div_num.startswith('26'):
                cat = 'Div 26 - Electrical'
            elif div_num.startswith('23'):
                cat = 'Div 23 - Mechanical'
            elif div_num.startswith('22'):
                cat = 'Div 22 - Plumbing'
            else:
                cat = f'Div {div_num}'
        elif ref.startswith('26'):
            cat = 'Div 26 - Electrical'
        elif ref.startswith('23'):
            cat = 'Div 23 - Mechanical'
        elif ref.startswith('22'):
            cat = 'Div 22 - Plumbing'
        else:
            cat = 'Div 26 - Electrical'
        
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(ref)
    
    # Format as list of {category, count, items}
    result = []
    for cat, items in sorted(categories.items()):
        result.append({
            'category': cat,
            'count': len(items),
            'items': items  # Show all items
        })
    
    return result

def generate_data():
    scope_files = {
        'Electrical': {
            'code': '26 00 00',
            'txt': 'electrical.txt',
            'csv': '26 00 00 - Electrical_BidItems.csv'
        },
        'Mechanical': {
            'code': '23 00 00',
            'txt': 'mechanical.txt',
            'csv': '23 00 00 - Mechanical_BidItems.csv'
        },
        'Plumbing': {
            'code': '22 00 00',
            'txt': 'plumbing.txt',
            'csv': '22 00 00 - Plumbing_BidItems.csv'
        }
    }
    
    output_data = {
        'scopes': [],
        'bidItems': {}
    }
    
    for scope_name, files in scope_files.items():
        print(f"Processing {scope_name}...")
        
        # Read categories
        categories = read_categories(files['txt'])
        
        # Read CSV data
        df = read_csv_data(files['csv'])
        
        if df.empty:
            continue
        
        # Extract item number
        df['Item #'] = df.iloc[:, 0].astype(str).str.strip().str.strip('"').str.strip()
        
        # Add category column
        df['Category'] = df['Item #'].map(categories).fillna('Others')
        
        # Add scope info
        output_data['scopes'].append({
            'code': files['code'],
            'name': scope_name,
            'id': scope_name.lower()
        })
        
        # Group by category
        grouped = df.groupby('Category')
        bid_items_by_category = {}
        
        for category, group_df in grouped:
            if category not in bid_items_by_category:
                bid_items_by_category[category] = []
            
            for _, row in group_df.iterrows():
                item = {
                    'itemNumber': str(row.get('Item #', '')).strip().strip('"').strip(),
                    'description': str(row.get('Bid Item Description', '')).strip().strip('"').strip(),
                    'status': str(row.get('Status', 'Pending')).strip().strip('"').strip() or 'Pending',
                    'drawingRefs': parse_drawing_references(row.get('Drawing Reference', '')),
                    'specRefs': parse_spec_references(row.get('Specification Reference', ''))
                }
                bid_items_by_category[category].append(item)
        
        output_data['bidItems'][scope_name.lower()] = bid_items_by_category
    
    # Create "Plumbing by Spec" scope - group plumbing items by specification
    if 'plumbing' in output_data['bidItems']:
        print("Processing Plumbing by Spec...")
        plumbing_items = output_data['bidItems']['plumbing']
        bid_items_by_spec = {}
        
        # Collect all items from all categories
        all_plumbing_items = []
        for category_items in plumbing_items.values():
            all_plumbing_items.extend(category_items)
        
        # Group by specification
        for item in all_plumbing_items:
            # Extract all spec references from the item
            spec_refs = item.get('specRefs', [])
            
            if not spec_refs:
                # Items without specs go to "No Specification" group
                spec_key = "No Specification"
                if spec_key not in bid_items_by_spec:
                    bid_items_by_spec[spec_key] = []
                bid_items_by_spec[spec_key].append(item)
            else:
                # Each item can belong to multiple specs
                for spec_category in spec_refs:
                    for spec_item in spec_category.get('items', []):
                        # Extract only the spec name (part after " - ")
                        spec_key = spec_item.strip()
                        if ' - ' in spec_key:
                            # Split on " - " and take only the name part
                            spec_key = spec_key.split(' - ', 1)[1].strip()
                        
                        # If spec doesn't have format "code - name", use as is
                        if spec_key:
                            if spec_key not in bid_items_by_spec:
                                bid_items_by_spec[spec_key] = []
                            # Only add if not already in this spec's list (avoid duplicates)
                            if item not in bid_items_by_spec[spec_key]:
                                bid_items_by_spec[spec_key].append(item)
        
        # Add the new scope
        output_data['scopes'].append({
            'code': '22 00 00',
            'name': 'Plumbing by Spec',
            'id': 'plumbing-by-spec'
        })
        
        output_data['bidItems']['plumbing-by-spec'] = bid_items_by_spec
    
    # Write to JSON file
    with open('data.json', 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)
    
    print(f"\nData file 'data.json' created successfully!")
    print(f"Scopes: {len(output_data['scopes'])}")
    for scope in output_data['scopes']:
        if scope['id'] in output_data['bidItems']:
            categories = len(output_data['bidItems'][scope['id']])
            total_items = sum(len(items) for items in output_data['bidItems'][scope['id']].values())
            print(f"  - {scope['name']}: {categories} categories, {total_items} items")

if __name__ == "__main__":
    generate_data()

