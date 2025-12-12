// GRPS MEP Module
let grpsData = {
    electrical: {
        bidItems: null,
        contractItems: null,
        scopeItems: null
    },
    mechanical: {
        bidItems: null,
        contractItems: null,
        scopeItems: null
    },
    plumbing: {
        bidItems: null,
        contractItems: null,
        scopeItems: null
    }
};

let currentGrpsScope = 'electrical';
let currentGrpsType = 'bid-items';

// Build contract items map based on discipline structure
function buildContractItemsMap(contractItemsRaw, discipline) {
    if (!contractItemsRaw) return {};
    
    const idMap = {};
    
    if (discipline === 'electrical') {
        // Electrical: {"1": "description", "2": "description", ...}
        return contractItemsRaw;
    } else if (discipline === 'mechanical') {
        // Mechanical: {"description": {"id": 1, ...}}
        for (const [desc, itemData] of Object.entries(contractItemsRaw)) {
            if (itemData && typeof itemData === 'object' && 'id' in itemData) {
                const itemId = String(itemData.id);
                idMap[itemId] = desc; // Use the key (description) as the value
            }
        }
    } else if (discipline === 'plumbing') {
        // Plumbing: {"short desc": "full desc"} - index by position (1-indexed)
        const itemsList = Object.entries(contractItemsRaw);
        itemsList.forEach(([shortDesc, fullDesc], idx) => {
            idMap[String(idx + 1)] = fullDesc; // Use full description
        });
    }
    
    return idMap;
}

// Load GRPS data
async function loadGrpsData() {
    const disciplines = ['electrical', 'mechanical', 'plumbing'];
    
    for (const discipline of disciplines) {
        try {
            const [bidItems, contractItemsRaw, scopeItems] = await Promise.all([
                fetch(`grps_${discipline}_bid_items.json`).then(async r => {
                    const text = await r.text();
                    // Remove markdown code block if present
                    let cleaned = text.trim();
                    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
                    if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
                    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
                    return JSON.parse(cleaned.trim());
                }),
                fetch(`grps_${discipline}_contract_items.json`).then(async r => {
                    const text = await r.text();
                    // Remove markdown code block if present
                    let cleaned = text.trim();
                    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
                    if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
                    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
                    return JSON.parse(cleaned.trim());
                }),
                fetch(`grps_${discipline}_scope_items.json`).then(r => r.json())
            ]);
            
            // Build contract items map based on discipline structure
            const contractItems = buildContractItemsMap(contractItemsRaw, discipline);
            
            grpsData[discipline] = {
                bidItems,
                contractItems,
                contractItemsRaw, // Keep raw for contract items view
                scopeItems
            };
        } catch (error) {
            console.error(`Error loading ${discipline} GRPS data:`, error);
        }
    }
}

// Render GRPS MEP content
function renderGrpsMep() {
    const content = document.getElementById('grpsMepContent');
    if (!content) return;
    
    const data = grpsData[currentGrpsScope];
    if (!data) {
        content.innerHTML = '<div class="empty-state">Loading data...</div>';
        return;
    }
    
    let html = '';
    
    if (currentGrpsType === 'bid-items') {
        html = renderBidItemsTable(data.bidItems);
    } else if (currentGrpsType === 'contract-items') {
        html = renderContractItemsTable(data.contractItemsRaw, currentGrpsScope, data.bidItems);
    } else if (currentGrpsType === 'scope-items') {
        html = renderScopeItemsTable(
            data.scopeItems, 
            data.contractItems, 
            data.contractItemsRaw, 
            currentGrpsScope, 
            data.bidItems
        );
    }
    
    content.innerHTML = html;
}

// Render bid items table
function renderBidItemsTable(bidItems) {
    if (!bidItems || Object.keys(bidItems).length === 0) {
        return '<div class="empty-state">No bid items found</div>';
    }
    
    let html = '<table class="grps-table"><thead><tr>';
    html += '<th>ID</th><th>Description</th><th>Sheets</th><th>Specs</th>';
    html += '</tr></thead><tbody>';
    
    for (const [description, item] of Object.entries(bidItems)) {
        const sheets = item.sheets ? item.sheets.map(s => s.join(' - ')).join(', ') : '-';
        const specs = item.specs ? item.specs.map(s => s.join(' - ')).join(', ') : '-';
        
        html += `<tr>`;
        html += `<td>${item.id || '-'}</td>`;
        html += `<td>${description}</td>`;
        html += `<td>${sheets}</td>`;
        html += `<td>${specs}</td>`;
        html += `</tr>`;
    }
    
    html += '</tbody></table>';
    return html;
}

// Render contract items table
function renderContractItemsTable(contractItemsRaw, discipline, bidItems) {
    if (!contractItemsRaw || Object.keys(contractItemsRaw).length === 0) {
        return '<div class="empty-state">No contract items found</div>';
    }
    
    let html = '<table class="grps-table"><thead><tr>';
    html += '<th>ID</th><th>Description</th><th>Sheets</th><th>Specs</th>';
    html += '</tr></thead><tbody>';
    
    // Helper to get sheets and specs from bid items by ID
    function getSheetsAndSpecs(id, bidItems) {
        if (!bidItems) return { sheets: '-', specs: '-' };
        
        // Find bid item with matching ID
        for (const [desc, item] of Object.entries(bidItems)) {
            if (item.id === parseInt(id) || item.id === id) {
                const sheets = item.sheets ? item.sheets.map(s => Array.isArray(s) ? s.join(' - ') : s).join(', ') : '-';
                const specs = item.specs ? item.specs.map(s => Array.isArray(s) ? s.join(' - ') : s).join(', ') : '-';
                return { sheets, specs };
            }
        }
        return { sheets: '-', specs: '-' };
    }
    
    if (discipline === 'electrical') {
        // Electrical: {"1": "description", ...} - need to get sheets/specs from bid items
        for (const [id, description] of Object.entries(contractItemsRaw)) {
            const { sheets, specs } = getSheetsAndSpecs(id, bidItems);
            html += `<tr>`;
            html += `<td>${id}</td>`;
            html += `<td>${description}</td>`;
            html += `<td>${sheets}</td>`;
            html += `<td>${specs}</td>`;
            html += `</tr>`;
        }
    } else if (discipline === 'mechanical') {
        // Mechanical: {"description": {"id": 1, "sheets": [...], "specs": [...]}}
        const sortedItems = Object.entries(contractItemsRaw)
            .map(([desc, data]) => ({ 
                id: data?.id || 0, 
                desc,
                sheets: data?.sheets || [],
                specs: data?.specs || []
            }))
            .sort((a, b) => a.id - b.id);
        
        for (const item of sortedItems) {
            const sheets = item.sheets.length > 0 
                ? item.sheets.map(s => Array.isArray(s) ? s.join(' - ') : s).join(', ')
                : '-';
            const specs = item.specs.length > 0
                ? item.specs.map(s => Array.isArray(s) ? s.join(' - ') : s).join(', ')
                : '-';
            
            html += `<tr>`;
            html += `<td>${item.id}</td>`;
            html += `<td>${item.desc}</td>`;
            html += `<td>${sheets}</td>`;
            html += `<td>${specs}</td>`;
            html += `</tr>`;
        }
    } else if (discipline === 'plumbing') {
        // Plumbing: {"short desc": "full desc"} - need to get sheets/specs from bid items
        // For plumbing, contract item position (1-indexed) should match bid item ID
        const itemsList = Object.entries(contractItemsRaw);
        itemsList.forEach(([shortDesc, fullDesc], idx) => {
            const contractItemId = idx + 1;
            // Try to find bid item with matching ID
            let sheets = '-';
            let specs = '-';
            if (bidItems) {
                for (const [bidDesc, bidItem] of Object.entries(bidItems)) {
                    if (bidItem.id === contractItemId) {
                        sheets = bidItem.sheets ? bidItem.sheets.map(s => Array.isArray(s) ? s.join(' - ') : s).join(', ') : '-';
                        specs = bidItem.specs ? bidItem.specs.map(s => Array.isArray(s) ? s.join(' - ') : s).join(', ') : '-';
                        break;
                    }
                }
            }
            html += `<tr>`;
            html += `<td>${contractItemId}</td>`;
            html += `<td>${fullDesc}</td>`;
            html += `<td>${sheets}</td>`;
            html += `<td>${specs}</td>`;
            html += `</tr>`;
        });
    }
    
    html += '</tbody></table>';
    return html;
}

// Render scope items table with derived contract items
function renderScopeItemsTable(scopeItems, contractItems, contractItemsRaw, discipline, bidItems) {
    if (!scopeItems || Object.keys(scopeItems).length === 0) {
        return '<div class="empty-state">No scope items found</div>';
    }
    
    // Helper to get sheets and specs for a contract item
    function getContractItemSheetsAndSpecs(contractId, discipline) {
        const idStr = String(contractId);
        
        if (discipline === 'electrical') {
            // Get from bid items by ID
            if (bidItems) {
                for (const [desc, item] of Object.entries(bidItems)) {
                    if (item.id === parseInt(contractId) || item.id === contractId) {
                        return {
                            sheets: item.sheets || [],
                            specs: item.specs || []
                        };
                    }
                }
            }
        } else if (discipline === 'mechanical') {
            // Get from contract items raw (they have sheets/specs)
            if (contractItemsRaw) {
                for (const [desc, data] of Object.entries(contractItemsRaw)) {
                    if (data && data.id === parseInt(contractId)) {
                        return {
                            sheets: data.sheets || [],
                            specs: data.specs || []
                        };
                    }
                }
            }
        } else if (discipline === 'plumbing') {
            // Get from bid items by ID (contract item position should match bid item ID)
            if (bidItems) {
                const targetId = parseInt(contractId);
                for (const [desc, item] of Object.entries(bidItems)) {
                    if (item.id === targetId) {
                        return {
                            sheets: item.sheets || [],
                            specs: item.specs || []
                        };
                    }
                }
            }
        }
        
        return { sheets: [], specs: [] };
    }
    
    // Collect all sheets and specs from derived contract items
    function getScopeItemSheetsAndSpecs(derivedFrom) {
        const allSheets = new Set();
        const allSpecs = new Set();
        
        derivedFrom.forEach(contractId => {
            const { sheets, specs } = getContractItemSheetsAndSpecs(contractId, discipline);
            sheets.forEach(s => {
                const sheetStr = Array.isArray(s) ? s.join(' - ') : s;
                if (sheetStr) allSheets.add(sheetStr);
            });
            specs.forEach(s => {
                const specStr = Array.isArray(s) ? s.join(' - ') : s;
                if (specStr) allSpecs.add(specStr);
            });
        });
        
        return {
            sheets: Array.from(allSheets).join(', ') || '-',
            specs: Array.from(allSpecs).join(', ') || '-'
        };
    }
    
    let html = '<table class="grps-table"><thead><tr>';
    html += '<th>Scope Item ID</th><th>Scope Item Name</th><th>Derived From Contract Items</th><th>Sheets</th><th>Specs</th>';
    html += '</tr></thead><tbody>';
    
    for (const [name, item] of Object.entries(scopeItems)) {
        const derivedFrom = item.combined_from || [];
        const contractItemList = derivedFrom.map(id => {
            const idStr = String(id);
            const contractDesc = contractItems && contractItems[idStr] ? contractItems[idStr] : `Contract Item ${id}`;
            // Escape quotes for HTML attribute
            const escapedDesc = contractDesc.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            return `<span class="contract-item-badge" data-tooltip="${escapedDesc}">${id}</span>`;
        }).join(' ');
        
        const { sheets, specs } = getScopeItemSheetsAndSpecs(derivedFrom);
        
        html += `<tr>`;
        html += `<td>${item.scope_item_id || '-'}</td>`;
        html += `<td>${name}</td>`;
        html += `<td class="derived-items">${contractItemList || '-'}</td>`;
        html += `<td>${sheets}</td>`;
        html += `<td>${specs}</td>`;
        html += `</tr>`;
    }
    
    html += '</tbody></table>';
    
    // After rendering, set up tooltip positioning
    setTimeout(() => {
        setupTooltips();
    }, 0);
    
    return html;
}

// Setup tooltips with proper positioning
function setupTooltips() {
    const badges = document.querySelectorAll('.contract-item-badge[data-tooltip]');
    
    badges.forEach(badge => {
        // Skip if already has event listeners (check for data attribute)
        if (badge.dataset.tooltipSetup) return;
        badge.dataset.tooltipSetup = 'true';
        
        const tooltipText = badge.getAttribute('data-tooltip');
        if (!tooltipText) return;
        
        let tooltip = null;
        let tooltipArrow = null;
        
        badge.addEventListener('mouseenter', (e) => {
            // Create tooltip element
            tooltip = document.createElement('div');
            tooltip.className = 'contract-item-tooltip';
            tooltip.textContent = tooltipText;
            document.body.appendChild(tooltip);
            
            // Create arrow
            tooltipArrow = document.createElement('div');
            tooltipArrow.className = 'contract-item-tooltip-arrow';
            document.body.appendChild(tooltipArrow);
            
            // Position tooltip
            positionTooltip(e.target, tooltip, tooltipArrow);
        });
        
        badge.addEventListener('mouseleave', () => {
            if (tooltip) {
                tooltip.remove();
                tooltip = null;
            }
            if (tooltipArrow) {
                tooltipArrow.remove();
                tooltipArrow = null;
            }
        });
        
        badge.addEventListener('mousemove', (e) => {
            if (tooltip) {
                positionTooltip(e.target, tooltip, tooltipArrow);
            }
        });
    });
}

function positionTooltip(badge, tooltip, arrow) {
    const rect = badge.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    
    // Position above the badge
    const top = rect.top - tooltipRect.height - 8;
    const left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
    
    // Ensure tooltip doesn't go off screen
    const finalLeft = Math.max(10, Math.min(left, window.innerWidth - tooltipRect.width - 10));
    const finalTop = Math.max(10, top);
    
    tooltip.style.left = finalLeft + 'px';
    tooltip.style.top = finalTop + 'px';
    
    if (arrow) {
        const arrowLeft = rect.left + (rect.width / 2) - 5;
        const arrowTop = rect.top - 8;
        arrow.style.left = arrowLeft + 'px';
        arrow.style.top = arrowTop + 'px';
    }
}

// Initialize GRPS MEP
document.addEventListener('DOMContentLoaded', () => {
    // Navigation click handler
    const navGrpsMep = document.getElementById('navGrpsMep');
    if (navGrpsMep) {
        navGrpsMep.addEventListener('click', () => {
            // Hide other panels
            document.getElementById('bidItemsPanel').style.display = 'none';
            document.getElementById('packageMappingPanel').style.display = 'none';
            document.querySelector('.scopes-panel').style.display = 'none';
            
            // Update navigation colors
            document.getElementById('navScopes').style.color = '#94a3b8';
            document.getElementById('navGroupingMapping').style.color = '#94a3b8';
            navGrpsMep.style.color = '#ffffff';
            
            // Update breadcrumb
            const breadcrumbProject = document.getElementById('breadcrumbProject');
            if (breadcrumbProject) {
                breadcrumbProject.textContent = 'GRPS MEP';
            }
            
            // Show GRPS MEP panel
            const grpsPanel = document.getElementById('grpsMepPanel');
            if (grpsPanel) {
                grpsPanel.style.display = 'flex';
                loadGrpsData().then(() => renderGrpsMep());
            }
        });
    }
    
    // Scope tab handlers
    document.querySelectorAll('.grps-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.grps-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            currentGrpsScope = e.target.dataset.scope;
            renderGrpsMep();
        });
    });
    
    // Toggle button handlers
    document.querySelectorAll('.grps-toggle-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.grps-toggle-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentGrpsType = e.target.dataset.type;
            renderGrpsMep();
        });
    });
    
    // Export Excel button
    const exportBtn = document.getElementById('exportGrpsExcel');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            exportGrpsToExcel();
        });
    }
});

// Export to Excel
async function exportGrpsToExcel() {
    try {
        const response = await fetch('/export-grps-excel');
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'GRPS_Scope_Items_Mapping.xlsx';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } else {
            alert('Error exporting Excel file. Please check the server.');
        }
    } catch (error) {
        console.error('Export error:', error);
        alert('Error exporting Excel file.');
    }
}

