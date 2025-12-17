#!/usr/bin/env python3
"""
Simple HTTP server to serve the UI files.
Run this script and open http://localhost:8000 in your browser.
"""

import http.server
import socketserver
import os
import subprocess
import tempfile

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/export-grps-excel':
            try:
                # Run the export script
                result = subprocess.run(
                    ['python', 'export_grps_excel.py'],
                    capture_output=True,
                    text=True,
                    cwd=os.path.dirname(os.path.abspath(__file__))
                )
                
                if result.returncode != 0:
                    self.send_error(500, f"Error generating Excel: {result.stderr}")
                    return
                
                # Read the generated Excel file
                excel_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'Data', 'GRPS_Scope_Items_Mapping.xlsx')
                if not os.path.exists(excel_file):
                    self.send_error(404, "Excel file not found")
                    return
                
                with open(excel_file, 'rb') as f:
                    excel_data = f.read()
                
                # Send the file
                self.send_response(200)
                self.send_header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
                self.send_header('Content-Disposition', 'attachment; filename="GRPS_Scope_Items_Mapping.xlsx"')
                self.send_header('Content-Length', str(len(excel_data)))
                self.end_headers()
                self.wfile.write(excel_data)
            except Exception as e:
                self.send_error(500, f"Server error: {str(e)}")
        else:
            # Default file serving
            super().do_GET()
    
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        # Prevent caching of data.json to ensure fresh data
        if self.path.endswith('data.json'):
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
        super().end_headers()

if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        print(f"Server running at http://localhost:{PORT}/")
        print("Press Ctrl+C to stop the server")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
