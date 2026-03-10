// Sample package data based on dashboard images
const samplePackages = [
    {
        id: 'pkg-6hrs-unlimited',
        name: '6HRS UNLIMITED',
        price: 500,
        dataAmount: 100,
        validity: 1,
        activeUsers: 127,
        status: 'active'
    },
    {
        id: 'pkg-24hrs-unlimited',
        name: '24HRS UNLIMITED',
        price: 1200,
        dataAmount: 100,
        validity: 1,
        activeUsers: 732,
        status: 'active'
    },
    {
        id: 'pkg-welcome',
        name: 'WELCOME',
        price: 0,
        dataAmount: 10,
        validity: 7,
        activeUsers: 0,
        status: 'active'
    },
    {
        id: 'pkg-8hrs-unlimited',
        name: '8 HRS UNLIMITED',
        price: 700,
        dataAmount: 100,
        validity: 1,
        activeUsers: 323,
        status: 'active'
    },
    {
        id: 'pkg-7days-unlimited',
        name: '7DAYS UNLIMITED',
        price: 4200,
        dataAmount: 100,
        validity: 7,
        activeUsers: 1223,
        status: 'active'
    },
    {
        id: 'pkg-30days-unlimited',
        name: '30DAYS UNLIMITED',
        price: 3500,
        dataAmount: 100,
        validity: 30,
        activeUsers: 899,
        status: 'active'
    },
    {
        id: 'pkg-30days-vip',
        name: '30DAYS VIP',
        price: 14200,
        dataAmount: 100,
        validity: 30,
        activeUsers: 421,
        status: 'active'
    },
    {
        id: 'pkg-140days-vip',
        name: '140DAYS VIP',
        price: 7200,
        dataAmount: 100,
        validity: 140,
        activeUsers: 34,
        status: 'active'
    }
];

// Initialize packages page
document.addEventListener('DOMContentLoaded', function() {
    updateTime();
    loadPackagesData();
    populateVoucherPackageOptions();
    setInterval(updateTime, 1000);
});

// Update time
function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    });
    document.getElementById('currentTime').textContent = timeString;
}

// Load packages data
function loadPackagesData() {
    // Fetch from API
    fetchWithAuth(`${API_BASE_URL}/packages`, 'GET')
        .then(data => {
            if (data.packages && data.packages.length > 0) {
                window.loadedPackages = data.packages;
                renderPackages(data.packages);
                populateVoucherPackageOptions();
            } else {
                // Use sample data
                window.loadedPackages = samplePackages;
                renderPackages(samplePackages);
                populateVoucherPackageOptions();
            }
        })
        .catch(err => {
            console.error('Failed to load packages:', err);
            // Use sample data
            window.loadedPackages = samplePackages;
            renderPackages(samplePackages);
            populateVoucherPackageOptions();
        });
}

// Render packages
function renderPackages(packages) {
    const container = document.getElementById('packagesContainer');
    container.innerHTML = '';
    
    packages.forEach(pkg => {
        const packageRow = document.createElement('div');
        packageRow.className = 'package-row';
        
        const priceDisplay = pkg.price === 0 ? 'FREE' : `USH ${pkg.price.toLocaleString()}`;
        const arpu = pkg.price > 0 ? `<span class="arpu">USH ${(pkg.price / 30).toFixed(0)}</span>` : '';
        
        packageRow.innerHTML = `
            <div class="package-name">${pkg.name}</div>
            <div class="package-price">${priceDisplay} ${arpu}</div>
            <div class="package-data">${pkg.data_amount_gb || pkg.dataAmount} GB</div>
            <div>${pkg.validity_days || pkg.validity} Days</div>
            <div class="package-data">${pkg.activeUsers || 0}</div>
            <div style="display: flex; gap: 8px;">
                <button class="btn-small" onclick="editPackage('${pkg.id}')">Edit</button>
                <button class="btn-small" style="background: #999;" onclick="viewStats('${pkg.id}')">Stats</button>
            </div>
        `;
        
        container.appendChild(packageRow);
    });
}

// Edit package
function editPackage(packageId) {
    console.log('Editing package:', packageId);
    // Could open a modal or navigate to edit page
    alert('Edit package: ' + packageId);
}

// View package statistics
function viewStats(packageId) {
    console.log('Viewing stats for package:', packageId);
    alert('Stats for package: ' + packageId);
}

// Add new package
function addNewPackage() {
    console.log('Adding new package...');
    // Could open a modal or navigate to create page
    alert('Add new package functionality coming soon');
}

// Logout function
function logout() {
    fetchWithAuth(`${API_BASE_URL}/auth/logout`, 'POST')
        .then(() => {
            window.location.href = 'login.html';
        })
        .catch(err => {
            window.location.href = 'login.html';
        });
}

// ---------------------------
// Voucher generation helpers
// ---------------------------

function openVoucherModal() {
    document.getElementById('voucherModal').style.display = 'flex';
}

function closeVoucherModal() {
    document.getElementById('voucherModal').style.display = 'none';
}

function populateVoucherPackageOptions() {
    const sel = document.getElementById('voucherPackage');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Select package or enter value --</option>';
    // Use currently loaded packages if available, else samplePackages
    const list = window.loadedPackages || samplePackages;
    list.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id || p.name || p.price;
        opt.textContent = `${p.name || p.id} — ${p.price === 0 ? 'FREE' : 'USH ' + (p.price || p.value)}`;
        sel.appendChild(opt);
    });
}

function generateVouchersFromForm() {
    const quantity = parseInt(document.getElementById('voucherQuantity').value, 10) || 0;
    const prefix = (document.getElementById('voucherPrefix').value || '').toUpperCase();
    const expiryDays = parseInt(document.getElementById('voucherExpiry').value, 10) || 0;
    const notes = document.getElementById('voucherNotes').value || '';
    const packageSelect = document.getElementById('voucherPackage');
    const amountInput = document.getElementById('voucherAmount');

    if (quantity < 1) {
        alert('Quantity must be at least 1');
        return;
    }

    // Determine value/amount
    let value = null;
    const selectedPackageId = packageSelect.value;
    if (selectedPackageId) {
        // find in loadedPackages or samplePackages
        const list = window.loadedPackages || samplePackages;
        const pkg = list.find(p => (p.id || p.name) === selectedPackageId || p.id === selectedPackageId);
        if (pkg) value = pkg.price || null;
    }
    if (!value) {
        const entered = parseInt(amountInput.value, 10);
        if (!isNaN(entered) && entered > 0) value = entered;
    }

    if (!value && value !== 0) {
        if (!confirm('No fixed amount detected. Continue creating vouchers without assigned monetary value?')) {
            return;
        }
    }

    const vouchers = [];
    for (let i = 0; i < quantity; i++) {
        const code = createVoucherCode(prefix);
        vouchers.push({ code, value, expiry_days: expiryDays, notes });
    }

    // Render in modal
    renderGeneratedVouchers(vouchers);

    // Optionally send to backend API to persist
    // Example (uncomment and adapt if API exists):
    // fetchWithAuth(`${API_BASE_URL}/vouchers/batch`, 'POST', { vouchers })
    //   .then(res => { console.log('Saved vouchers', res); })
    //   .catch(err => { console.error('Failed saving vouchers', err); });
}

function createVoucherCode(prefix) {
    const rand = Math.random().toString(36).substring(2, 9).toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
    return `${prefix}${rand}${timestamp}`;
}

function renderGeneratedVouchers(vouchers) {
    const list = document.getElementById('generatedVouchersList');
    if (!list) return;
    list.innerHTML = '';
    vouchers.forEach(v => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.padding = '6px 8px';
        row.style.borderBottom = '1px dashed #e0e0e0';
        row.innerHTML = `<div style="font-family:monospace;">${v.code}</div>
                         <div style="color:#555;">${v.value === 0 ? 'FREE' : (v.value ? 'USH ' + v.value : '—')}</div>`;
        list.appendChild(row);
    });

    // Add export / copy actions
    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '8px';
    actions.style.marginTop = '8px';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn-small';
    copyBtn.textContent = 'Copy Codes';
    copyBtn.onclick = () => {
        const text = vouchers.map(v => v.code).join('\n');
        navigator.clipboard.writeText(text).then(()=> alert('Copied to clipboard'));
    };

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'btn-small';
    downloadBtn.textContent = 'Download CSV';
    downloadBtn.onclick = () => {
        const rows = ['code,value,expiry_days,notes'];
        vouchers.forEach(v => rows.push(`${v.code},${v.value || ''},${v.expiry_days || ''},"${(v.notes||'').replace(/"/g,'""')}"`));
        const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'vouchers.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    actions.appendChild(copyBtn);
    actions.appendChild(downloadBtn);
    list.appendChild(actions);
}
