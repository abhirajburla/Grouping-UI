# Bid Items UI - Hotel 3 Project

A web application for viewing and managing bid items organized by category with accordion functionality, plus GRPS MEP (Mechanical, Electrical, Plumbing) management.

## Setup Instructions

1. **Generate the data file:**
   ```bash
   python generate_data.py
   ```
   This will create `data.json` from your CSV and TXT files in the `Data/` folder.

2. **Start the web server:**
   ```bash
   python server.py
   ```
   This will start a local server on port 8000.

3. **Open in browser:**
   Navigate to `http://localhost:8000`

## Features

- **Three Scopes:** Electrical, Mechanical, and Plumbing
- **Category Accordions:** Bid items are grouped by category with expandable/collapsible sections
- **Filtering:** Filter by All, Yes, No, or Pending status
- **GRPS MEP Module:** View and manage Bid Items, Contract Items, and Scope Items
- **Excel Export:** Export GRPS scope items mapping to Excel
- **Responsive Design:** Clean, modern UI

## File Structure

### Root Files
- `index.html` - Main HTML structure
- `styles.css` - Styling and layout
- `app.js` - JavaScript functionality for main scopes view
- `grps-mep.js` - JavaScript functionality for GRPS MEP module
- `generate_data.py` - Script to process CSV/TXT files into JSON
- `export_grps_excel.py` - Script to export GRPS scope items mapping to Excel
- `server.py` - Simple HTTP server
- `data.json` - Generated data file (created by generate_data.py)

### Data Folder (`Data/`)
All data files are organized in the `Data/` folder:

**Bid Items Data:**
- `26 00 00 - Electrical_BidItems.csv` - Electrical bid items
- `23 00 00 - Mechanical_BidItems.csv` - Mechanical bid items
- `22 00 00 - Plumbing_BidItems.csv` - Plumbing bid items

**Category Mappings:**
- `electrical.txt`, `mechanical.txt`, `plumbing.txt` - Category mappings

**Package Grouping Files:**
- `elec_package_bid items.txt` - Electrical package grouping
- `mech_package_bid items.txt` - Mechanical package grouping
- `plumb_package_bid items.txt` - Plumbing package grouping

**GRPS Data Files:**
- `grps_electrical_bid_items.json` - Electrical bid items for GRPS
- `grps_electrical_contract_items.json` - Electrical contract items for GRPS
- `grps_electrical_scope_items.json` - Electrical scope items for GRPS
- `grps_mechanical_bid_items.json` - Mechanical bid items for GRPS
- `grps_mechanical_contract_items.json` - Mechanical contract items for GRPS
- `grps_mechanical_scope_items.json` - Mechanical scope items for GRPS
- `grps_plumbing_bid_items.json` - Plumbing bid items for GRPS
- `grps_plumbing_contract_items.json` - Plumbing contract items for GRPS
- `grps_plumbing_scope_items.json` - Plumbing scope items for GRPS

**Generated Files:**
- `GRPS_Scope_Items_Mapping.xlsx` - Generated Excel export (created by export_grps_excel.py)

## Hosting

This project can be hosted on GitHub Pages or any static hosting service. The `data.json` file should be generated and committed to the repository before deployment.
