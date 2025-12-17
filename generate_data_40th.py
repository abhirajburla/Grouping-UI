import json
import os

def process_40th_data():
    """Process 40th PL MEP data files and generate data.json"""
    
    # File mappings
    mep_files = {
        'Electrical': {
            'file': '40th_E.json',
            'code': '26 00 00',
            'id': 'electrical'
        },
        'Mechanical': {
            'file': '40th_M.json',
            'code': '23 00 00',
            'id': 'mechanical'
        },
        'Plumbing': {
            'file': '40th_P.json',
            'code': '22 00 00',
            'id': 'plumbing'
        }
    }
    
    output_data = {
        'scopes': [],
        'bidItems': {}
    }
    
    # Process each MEP discipline
    for scope_name, config in mep_files.items():
        file_path = config['file']
        
        if not os.path.exists(file_path):
            print(f"Warning: {file_path} not found, skipping {scope_name}")
            continue
        
        # Read JSON file
        with open(file_path, 'r', encoding='utf-8') as f:
            bid_items_raw = json.load(f)
        
        # Group bid items by "grouping text" (category)
        categories = {}
        
        for item in bid_items_raw:
            # Get category from "grouping text", default to "Uncategorized"
            category = item.get('grouping text', 'Uncategorized')
            if not category or category.strip() == '':
                category = 'Uncategorized'
            
            # Initialize category if not exists
            if category not in categories:
                categories[category] = []
            
            # Build bid item object
            bid_item = {
                'itemNumber': str(item.get('id', '')),
                'description': item.get('bid item', ''),
                'status': 'Pending',  # Default status
                'drawingRefs': [],
                'specRefs': []
            }
            
            # Add sheet information to drawingRefs
            sheet_number = item.get('sheet number', '')
            sheet_name = item.get('sheet name', '')
            if sheet_number and sheet_name:
                # Determine category for drawing reference
                # You can customize this logic based on sheet number patterns
                drawing_category = 'General'
                if sheet_number.startswith('E'):
                    drawing_category = 'Electrical'
                elif sheet_number.startswith('M'):
                    drawing_category = 'Mechanical'
                elif sheet_number.startswith('P'):
                    drawing_category = 'Plumbing'
                elif sheet_number.startswith('D'):
                    drawing_category = 'Demolition'
                elif sheet_number.startswith('CIV'):
                    drawing_category = 'Civil'
                
                bid_item['drawingRefs'].append({
                    'category': drawing_category,
                    'count': 1,
                    'items': [f"{sheet_number} - {sheet_name}"]
                })
            
            # Add spec information to specRefs
            spec_code = item.get('spec code', '')
            spec_name = item.get('spec name', '')
            if spec_code or spec_name:
                spec_category = 'General'
                if scope_name == 'Electrical':
                    spec_category = 'Div 26 - Electrical'
                elif scope_name == 'Mechanical':
                    spec_category = 'Div 23 - Mechanical'
                elif scope_name == 'Plumbing':
                    spec_category = 'Div 22 - Plumbing'
                
                spec_display = f"{spec_code} - {spec_name}".strip(' - ')
                if spec_display:
                    bid_item['specRefs'].append({
                        'category': spec_category,
                        'count': 1,
                        'items': [spec_display]
                    })
            
            categories[category].append(bid_item)
        
        # Add scope to output
        output_data['scopes'].append({
            'code': config['code'],
            'name': scope_name,
            'id': config['id']
        })
        
        # Add bid items grouped by category
        output_data['bidItems'][config['id']] = categories
        
        print(f"Processed {scope_name}: {len(bid_items_raw)} bid items in {len(categories)} categories")
    
    # Write output file
    with open('data.json', 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)
    
    print(f"\nData file 'data.json' created successfully!")
    print(f"Total scopes: {len(output_data['scopes'])}")
    for scope in output_data['scopes']:
        scope_id = scope['id']
        total_items = sum(len(items) for items in output_data['bidItems'][scope_id].values())
        print(f"  - {scope['name']}: {total_items} bid items")

if __name__ == '__main__':
    process_40th_data()

