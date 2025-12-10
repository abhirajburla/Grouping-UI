# Bid Items UI - Hotel 3 Project

A web application for viewing and managing bid items organized by category with accordion functionality.

## Setup Instructions

1. **Generate the data file:**
   ```bash
   python generate_data.py
   ```
   This will create `data.json` from your CSV and TXT files.

2. **Start the web server:**
   ```bash
   python server.py
   ```

3. **Open in browser:**
   Navigate to `http://localhost:8000`

## Features

- **Three Scopes:** Electrical, Mechanical, and Plumbing
- **Category Accordions:** Bid items are grouped by category with expandable/collapsible sections
- **Filtering:** Filter by All, Yes, No, or Pending status
- **Responsive Design:** Clean, modern UI matching the original design

## File Structure

- `index.html` - Main HTML structure
- `styles.css` - Styling and layout
- `app.js` - JavaScript functionality
- `generate_data.py` - Script to process CSV/TXT files into JSON
- `server.py` - Simple HTTP server
- `data.json` - Generated data file (created by generate_data.py)

## Data Files Required

- `electrical.txt`, `mechanical.txt`, `plumbing.txt` - Category mappings
- `26 00 00 - Electrical_BidItems.csv` - Electrical bid items
- `23 00 00 - Mechanical_BidItems.csv` - Mechanical bid items
- `22 00 00 - Plumbing_BidItems.csv` - Plumbing bid items



