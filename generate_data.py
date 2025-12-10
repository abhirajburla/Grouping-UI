import pandas as pd
import json
import os
import re

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

def read_package_mapping(package_file, scope_type):
    """Read package mapping file and return dictionary mapping item number to package"""
    package_mapping = {}
    if not os.path.exists(package_file):
        return package_mapping
    
    try:
        with open(package_file, 'r', encoding='utf-8') as f:
            content = f.read()
            # Try to fix incomplete JSON by finding the last complete entry
            if scope_type in ['mechanical', 'plumbing']:
                # Find the last complete object in the array
                last_complete = content.rfind('}')
                if last_complete > 0:
                    # Check if we need to close the array and object
                    if content[last_complete+1:].strip() and not content[last_complete+1:].strip().startswith(']'):
                        # Try to complete the JSON
                        content = content[:last_complete+1] + '\n  ]\n}'
            
            data = json.loads(content)
    except json.JSONDecodeError as e:
        print(f"Warning: Error parsing {package_file}: {e}")
        # Try to extract what we can
        try:
            # For electrical format, try to parse line by line
            if scope_type == 'electrical':
                with open(package_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    # Try to extract key-value pairs manually
                    import re
                    pattern = r'"(\d+)":\s*"([^"]+)"'
                    matches = re.findall(pattern, content)
                    for item_num, package in matches:
                        package_mapping[item_num.strip()] = package.strip()
            else:
                # For mechanical/plumbing, try to extract complete entries
                with open(package_file, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                    for line in lines:
                        if '"item_number"' in line:
                            # Try to extract item number and group/category
                            item_match = re.search(r'"item_number":\s*"(\d+)"', line)
                            if item_match:
                                item_num = item_match.group(1)
                                # Look for group or category in nearby lines
                                # This is a simplified approach
                                pass
        except Exception as e2:
            print(f"Warning: Could not recover data from {package_file}: {e2}")
        return package_mapping
    
    if scope_type == 'electrical':
        # Format: {"1": "package 10: others", ...}
        for item_num, package in data.items():
            package_mapping[item_num.strip()] = package.strip()
    elif scope_type in ['mechanical', 'plumbing']:
        # Format: {"bid_items": [{"item_number": "1", "description": "...", "group": "..."}, ...]}
        if 'bid_items' in data:
            for item in data['bid_items']:
                item_num = str(item.get('item_number', '')).strip()
                package = item.get('group' if scope_type == 'mechanical' else 'category', '').strip()
                if item_num and package:
                    package_mapping[item_num] = package
    
    return package_mapping

def generate_data():
    scope_files = {
        'Electrical by masterformat': {
            'code': '26 00 00',
            'txt': 'Data/electrical.txt',
            'csv': 'Data/26 00 00 - Electrical_BidItems.csv'
        },
        'Mechanical by masterformat': {
            'code': '23 00 00',
            'txt': 'Data/mechanical.txt',
            'csv': 'Data/23 00 00 - Mechanical_BidItems.csv'
        },
        'Plumbing by masterformat': {
            'code': '22 00 00',
            'txt': 'Data/plumbing.txt',
            'csv': 'Data/22 00 00 - Plumbing_BidItems.csv'
        }
    }
    
    package_grouping_files = {
        'Electrical by package grouping': {
            'code': '26 00 00',
            'package_file': 'elec_package_bid items.txt',
            'csv': 'Data/26 00 00 - Electrical_BidItems.csv',
            'scope_type': 'electrical'
        },
        'Mechanical by package grouping': {
            'code': '23 00 00',
            'package_file': 'mech_package_bid items.txt',
            'csv': 'Data/23 00 00 - Mechanical_BidItems.csv',
            'scope_type': 'mechanical'
        },
        'Plumbing by package grouping': {
            'code': '22 00 00',
            'package_file': 'plumb_package_bid items.txt',
            'csv': 'Data/22 00 00 - Plumbing_BidItems.csv',
            'scope_type': 'plumbing'
        }
    }
    
    output_data = {
        'scopes': [],
        'bidItems': {}
    }
    
    # Process masterformat scopes (renamed)
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
        
        # Create scope ID
        scope_id = scope_name.lower().replace(' ', '-')
        
        # Add scope info
        output_data['scopes'].append({
            'code': files['code'],
            'name': scope_name,
            'id': scope_id
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
        
        output_data['bidItems'][scope_id] = bid_items_by_category
    
    # Create "Plumbing by Spec" scope - group plumbing items by specification
    if 'plumbing-by-masterformat' in output_data['bidItems']:
        print("Processing Plumbing by Spec...")
        plumbing_items = output_data['bidItems']['plumbing-by-masterformat']
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
    
    # Process package grouping scopes
    for scope_name, files in package_grouping_files.items():
        print(f"Processing {scope_name}...")
        
        # Read package mapping
        package_mapping = read_package_mapping(files['package_file'], files['scope_type'])
        
        # Read CSV data
        df = read_csv_data(files['csv'])
        
        if df.empty:
            continue
        
        # Extract item number
        df['Item #'] = df.iloc[:, 0].astype(str).str.strip().str.strip('"').str.strip()
        
        # Add package column
        df['Package'] = df['Item #'].map(package_mapping).fillna('Others')
        
        # Create scope ID
        scope_id = scope_name.lower().replace(' ', '-')
        
        # Add scope info
        output_data['scopes'].append({
            'code': files['code'],
            'name': scope_name,
            'id': scope_id
        })
        
        # Group by package
        grouped = df.groupby('Package')
        bid_items_by_package = {}
        
        for package, group_df in grouped:
            if package not in bid_items_by_package:
                bid_items_by_package[package] = []
            
            for _, row in group_df.iterrows():
                item = {
                    'itemNumber': str(row.get('Item #', '')).strip().strip('"').strip(),
                    'description': str(row.get('Bid Item Description', '')).strip().strip('"').strip(),
                    'status': str(row.get('Status', 'Pending')).strip().strip('"').strip() or 'Pending',
                    'drawingRefs': parse_drawing_references(row.get('Drawing Reference', '')),
                    'specRefs': parse_spec_references(row.get('Specification Reference', ''))
                }
                bid_items_by_package[package].append(item)
        
        output_data['bidItems'][scope_id] = bid_items_by_package
    
    # Write to JSON file
    with open('data.json', 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)
    
    print(f"\nData file 'data.json' created successfully!")
    print(f"Scopes: {len(output_data['scopes'])}")
    for scope in output_data['scopes']:
        if scope['id'] in output_data['bidItems']:
            categories = len(output_data['bidItems'][scope['id']])
            total_items = sum(len(items) for items in output_data['bidItems'][scope['id']].values())
            print(f"  - {scope['name']}: {categories} groups, {total_items} items")

if __name__ == "__main__":
    generate_data()
