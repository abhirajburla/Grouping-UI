// Global state
let currentScope = 'electrical-by-masterformat';
let currentFilter = 'all';
let expandedCategories = new Set();
let bidItemsData = {};
let packageMappingData = {};
let currentView = 'scopes'; // 'scopes' or 'packageMapping'

// Load data
async function loadData() {
    try {
        const response = await fetch('data.json');
        const data = await response.json();
        bidItemsData = data.bidItems;
        renderScopes(data.scopes);
        populateCategoryFilter(currentScope);
        renderBidItems(currentScope);
        
        // Load package mapping data
        await loadPackageMappingData();
    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('bidItemsBody').innerHTML = 
            '<tr><td colspan="6" class="empty-state">Error loading data. Please run generate_data.py first.</td></tr>';
    }
}

// Load package mapping data
async function loadPackageMappingData() {
    try {
        const [elecResponse, mechResponse, plumbingResponse] = await Promise.all([
            fetch('Data/elec_package.txt'),
            fetch('Data/mech_package.txt'),
            fetch('Data/plumbing_package.txt')
        ]);
        
        if (!elecResponse.ok || !mechResponse.ok || !plumbingResponse.ok) {
            throw new Error('Failed to fetch package mapping files');
        }
        
        packageMappingData.electrical = await elecResponse.json();
        packageMappingData.mechanical = await mechResponse.json();
        packageMappingData.plumbing = await plumbingResponse.json();
    } catch (error) {
        console.error('Error loading package mapping data:', error);
        // Set empty data so UI doesn't break
        packageMappingData.electrical = {};
        packageMappingData.mechanical = {};
        packageMappingData.plumbing = {};
    }
}

// Populate category filter dropdown
function populateCategoryFilter(scopeId) {
    const categoryList = document.getElementById('categoryList');
    if (!categoryList || !bidItemsData[scopeId]) return;
    
    // Clear existing options
    categoryList.innerHTML = '';
    
    // Get all categories for current scope
    const categories = Object.keys(bidItemsData[scopeId]).sort();
    
    categories.forEach(category => {
        const label = document.createElement('label');
        label.className = 'category-checkbox-label';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = category;
        checkbox.checked = true; // All selected by default
        checkbox.addEventListener('change', () => updateCategoryFilter());
        
        const checkmark = document.createElement('span');
        checkmark.className = 'checkmark';
        
        const text = document.createElement('span');
        text.className = 'checkbox-text';
        const itemCount = bidItemsData[scopeId][category].filter(item => 
            !item.description || !item.description.toLowerCase().includes('all document references')
        ).length;
        text.innerHTML = `${category} <span style="color: #999; margin-left: 8px;">(${itemCount} items)</span>`;
        
        label.appendChild(checkbox);
        label.appendChild(checkmark);
        label.appendChild(text);
        
        categoryList.appendChild(label);
    });
    
    // Update select all checkbox
    updateSelectAllCheckbox();
}

// Toggle category dropdown
function toggleCategoryDropdown() {
    const filterGrouping = document.querySelector('.filter-grouping');
    filterGrouping.classList.toggle('open');
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const filterGrouping = document.querySelector('.filter-grouping');
    if (filterGrouping && !filterGrouping.contains(e.target)) {
        filterGrouping.classList.remove('open');
    }
});

// Toggle select all categories
function toggleSelectAllCategories() {
    const selectAll = document.getElementById('selectAllCategories');
    const checkboxes = document.querySelectorAll('#categoryList input[type="checkbox"]');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
    });
    
    updateCategoryFilter();
}

// Update select all checkbox state
function updateSelectAllCheckbox() {
    const checkboxes = document.querySelectorAll('#categoryList input[type="checkbox"]');
    const selectAll = document.getElementById('selectAllCategories');
    
    if (checkboxes.length === 0) {
        selectAll.checked = false;
        selectAll.indeterminate = false;
        return;
    }
    
    const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
    
    if (checkedCount === 0) {
        selectAll.checked = false;
        selectAll.indeterminate = false;
    } else if (checkedCount === checkboxes.length) {
        selectAll.checked = true;
        selectAll.indeterminate = false;
    } else {
        selectAll.checked = false;
        selectAll.indeterminate = true;
    }
}

// Update category filter (for future filtering functionality)
function updateCategoryFilter() {
    updateSelectAllCheckbox();
    // Future: Add filtering logic here
}

// Render scopes list
function renderScopes(scopes) {
    const scopesList = document.getElementById('scopesList');
    scopesList.innerHTML = '';
    
    scopes.forEach(scope => {
        const scopeItem = document.createElement('div');
        scopeItem.className = 'scope-item';
        scopeItem.dataset.scopeId = scope.id; // Store scope ID as data attribute
        if (scope.id === currentScope) {
            scopeItem.classList.add('active');
        }
        scopeItem.addEventListener('click', () => selectScope(scope.id));
        
        // Hide code for masterformat scopes and Plumbing by Spec
        const hideCode = !scope.code || scope.code.trim() === '';
        scopeItem.innerHTML = `
            ${hideCode ? '' : `<div class="scope-code">${scope.code}</div>`}
            <div class="scope-name">${scope.name}</div>
        `;
        
        scopesList.appendChild(scopeItem);
    });
}

// Select scope
function selectScope(scopeId) {
    currentScope = scopeId;
    expandedCategories.clear();
    
    // Update active scope in UI
    document.querySelectorAll('.scope-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.scopeId === scopeId) {
            item.classList.add('active');
        }
    });
    
        populateCategoryFilter(scopeId);
        renderBidItems(scopeId);
        
        // Close dropdown when switching scopes
        document.querySelector('.filter-grouping')?.classList.remove('open');
}

// Render bid items with accordion categories
function renderBidItems(scopeId) {
    const tbody = document.getElementById('bidItemsBody');
    tbody.innerHTML = '';
    
    if (!bidItemsData[scopeId]) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No bid items found</td></tr>';
        updateCounts();
        return;
    }
    
    const categories = bidItemsData[scopeId];
    const sortedCategories = Object.keys(categories).sort();
    
    let allCount = 0;
    let pendingCount = 0;
    let yesCount = 0;
    let noCount = 0;
    
    sortedCategories.forEach(category => {
        const items = categories[category];
        // Filter out "All Document References" items
        const itemsWithoutDocRefs = items.filter(item => 
            !item.description || !item.description.toLowerCase().includes('all document references')
        );
        const filteredItems = filterItems(itemsWithoutDocRefs);
        
        if (filteredItems.length === 0) return;
        
        allCount += itemsWithoutDocRefs.length;
        itemsWithoutDocRefs.forEach(item => {
            if (item.status === 'Pending' || item.status === '') pendingCount++;
            else if (item.status === 'Yes') yesCount++;
            else if (item.status === 'No') noCount++;
        });
        
        // Create category accordion row
        const categoryRow = document.createElement('tr');
        categoryRow.className = 'category-row';
        const isExpanded = expandedCategories.has(category);
        if (isExpanded) {
            categoryRow.classList.add('expanded');
        }
        
        categoryRow.onclick = () => toggleCategory(category);
        
        categoryRow.innerHTML = `
            <td class="checkbox-col"></td>
            <td colspan="5">
                <div class="category-header">
                    <span class="category-arrow">▶</span>
                    <span class="category-name">${category} (${itemsWithoutDocRefs.length} items)</span>
                </div>
            </td>
        `;
        
        tbody.appendChild(categoryRow);
        
        // Create bid item rows
        filteredItems.forEach(item => {
            const itemRow = document.createElement('tr');
            itemRow.className = 'bid-item-row';
            if (!isExpanded) {
                itemRow.classList.add('hidden');
            }
            
            const statusIcon = getStatusIcon(item.status);
            
            itemRow.innerHTML = `
                <td class="checkbox-col">
                    <input type="checkbox" class="item-checkbox">
                </td>
                <td class="number-col">
                    <span class="item-number">${item.itemNumber}</span>
                </td>
                <td class="description-col">
                    <span class="status-icon">${statusIcon}</span>
                    <span class="item-description">${item.description}</span>
                </td>
                <td class="drawing-col">
                    <div class="drawing-refs">${renderRefs(item.drawingRefs)}</div>
                </td>
                <td class="spec-col">
                    <div class="spec-refs">${renderRefs(item.specRefs)}</div>
                </td>
                <td class="action-col">
                    <span class="action-arrow">›</span>
                </td>
            `;
            
            tbody.appendChild(itemRow);
        });
    });
    
    updateCounts(allCount, pendingCount, yesCount, noCount);
}

// Toggle category accordion
function toggleCategory(category) {
    if (expandedCategories.has(category)) {
        expandedCategories.delete(category);
    } else {
        expandedCategories.add(category);
    }
    
    renderBidItems(currentScope);
}

// Filter items based on current filter
function filterItems(items) {
    if (currentFilter === 'all') {
        return items;
    } else if (currentFilter === 'pending') {
        return items.filter(item => item.status === 'Pending' || item.status === '');
    } else if (currentFilter === 'yes') {
        return items.filter(item => item.status === 'Yes');
    } else if (currentFilter === 'no') {
        return items.filter(item => item.status === 'No');
    }
    return items;
}

// Render reference links
function renderRefs(refs) {
    if (!refs || refs.length === 0) {
        return '<span style="color: #999;">-</span>';
    }
    
    return refs.map(ref => {
        const itemsText = ref.items.length > 0 ? ` (${ref.count})` : '';
        return `<a href="#" class="ref-link" title="${ref.items.join(', ')}">${ref.category}${itemsText}</a>`;
    }).join('');
}

// Get status icon
function getStatusIcon(status) {
    if (status === 'Yes') return '✓';
    if (status === 'No') return '✗';
    return '🕐'; // Pending
}

// Update filter counts
function updateCounts(all = 0, pending = 0, yes = 0, no = 0) {
    document.getElementById('countAll').textContent = all;
    document.getElementById('countPending').textContent = pending;
    document.getElementById('countYes').textContent = yes;
    document.getElementById('countNo').textContent = no;
}

// Navigation handlers
function showScopesView() {
    currentView = 'scopes';
    document.getElementById('bidItemsPanel').style.display = 'flex';
    document.getElementById('packageMappingPanel').style.display = 'none';
    document.getElementById('grpsMepPanel').style.display = 'none';
    document.querySelector('.scopes-panel').style.display = 'flex';
    document.getElementById('navScopes').style.color = '#ffffff';
    document.getElementById('navGroupingMapping').style.color = '#94a3b8';
    const navGrpsMep = document.getElementById('navGrpsMep');
    if (navGrpsMep) navGrpsMep.style.color = '#94a3b8';
}

function showPackageMappingView() {
    currentView = 'packageMapping';
    document.getElementById('bidItemsPanel').style.display = 'none';
    document.getElementById('packageMappingPanel').style.display = 'flex';
    document.getElementById('grpsMepPanel').style.display = 'none';
    document.querySelector('.scopes-panel').style.display = 'none';
    document.getElementById('navScopes').style.color = '#94a3b8';
    document.getElementById('navGroupingMapping').style.color = '#ffffff';
    const navGrpsMep = document.getElementById('navGrpsMep');
    if (navGrpsMep) navGrpsMep.style.color = '#94a3b8';
    renderPackageMapping('electrical');
}

// Render package mapping tables
function renderPackageMapping(scope) {
    const content = document.getElementById('packageMappingContent');
    
    // Check if data exists and is loaded
    if (!packageMappingData[scope] || Object.keys(packageMappingData[scope]).length === 0) {
        content.innerHTML = '<div class="empty-state">Loading package mapping data...</div>';
        // Try to load data if not already loaded
        loadPackageMappingData().then(() => {
            if (packageMappingData[scope] && Object.keys(packageMappingData[scope]).length > 0) {
                renderPackageMapping(scope); // Re-render after loading
            } else {
                content.innerHTML = '<div class="empty-state">No package mapping data available. Please ensure the package files exist in the Data folder.</div>';
            }
        });
        return;
    }
    
    const data = packageMappingData[scope];
    let html = '<table class="package-mapping-table"><thead><tr><th>Package Group</th><th>Specs</th></tr></thead><tbody>';
    
    for (const [packageGroup, specs] of Object.entries(data)) {
        let specsText = '';
        if (Array.isArray(specs)) {
            if (specs.length > 0 && typeof specs[0] === 'object' && specs[0].code) {
                // Plumbing format: objects with code and title
                specsText = specs.map(spec => `${spec.code} - ${spec.title}`).join('<br>');
            } else {
                // Electrical/Mechanical format: strings
                specsText = specs.join('<br>');
            }
        }
        
        html += `<tr>
            <td class="package-group-cell">${packageGroup}</td>
            <td class="specs-cell">${specsText || '-'}</td>
        </tr>`;
    }
    
    html += '</tbody></table>';
    content.innerHTML = html;
}

// Filter tab click handler
document.addEventListener('DOMContentLoaded', () => {
    // Filter tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.dataset.filter;
            renderBidItems(currentScope);
        });
    });
    
    // Package mapping tabs
    document.querySelectorAll('.package-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.package-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            const scope = e.target.dataset.scope;
            renderPackageMapping(scope);
        });
    });
    
    // Navigation items
    document.getElementById('navScopes')?.addEventListener('click', showScopesView);
    document.getElementById('navGroupingMapping')?.addEventListener('click', showPackageMappingView);
    
    // Select all checkbox
    document.getElementById('selectAll')?.addEventListener('change', (e) => {
        const checkboxes = document.querySelectorAll('.item-checkbox');
        checkboxes.forEach(cb => cb.checked = e.target.checked);
    });
    
    // Category filter dropdown toggle
    document.querySelector('.filter-grouping-label')?.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleCategoryDropdown();
    });
    
    // Select all categories checkbox
    document.getElementById('selectAllCategories')?.addEventListener('change', toggleSelectAllCategories);
    
    // Load data
    loadData();
});

// Fix scope selection - handled in renderScopes now

