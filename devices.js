// Vendor specific column formats and metrics
const VENDOR_METRICS = {
    'mikrotik': {
        icon: '🟢',
        name: 'MikroTik',
        columns: ['board_name', 'vendor', 'cpu_usage', 'memory_usage', 'status', 'remote_access'],
        fieldMapping: {
            'board_name': 'device_name',
            'cpu_usage': d => `${d.cpu_percentage || 0}%`,
            'memory_usage': d => formatMemory(d.memory_usage_mb || 0),
            'remote_access': d => `<a href="${d.management_url || '#'}" target="_blank" class="remote-link">WinBox</a>` || 'N/A'
        }
    },
    'cisco': {
        icon: '🔴',
        name: 'Cisco',
        columns: ['device_name', 'vendor', 'cpu_usage', 'memory_usage', 'status', 'remote_access'],
        fieldMapping: {
            'cpu_usage': d => `${d.cpu_percentage || 0}%`,
            'memory_usage': d => formatMemory(d.memory_usage_mb || 0),
            'remote_access': d => `<a href="${d.management_url || '#'}" target="_blank" class="remote-link">Console</a>` || 'N/A'
        }
    },
    'ubiquiti': {
        icon: '🔵',
        name: 'Ubiquiti',
        columns: ['device_name', 'vendor', 'cpu_usage', 'memory_usage', 'status', 'remote_access'],
        fieldMapping: {
            'cpu_usage': d => `${d.cpu_percentage || 0}%`,
            'memory_usage': d => formatMemory(d.memory_usage_mb || 0),
            'remote_access': d => `<a href="${d.management_url || '#'}" target="_blank" class="remote-link">SSH</a>` || 'N/A'
        }
    },
    'meraki': {
        icon: '🔷',
        name: 'Meraki',
        columns: ['device_name', 'vendor', 'cpu_usage', 'memory_usage', 'status', 'remote_access'],
        fieldMapping: {
            'cpu_usage': d => `${d.cpu_percentage || 0}%`,
            'memory_usage': d => formatMemory(d.memory_usage_mb || 0),
            'remote_access': d => `<a href="https://dashboard.meraki.com" target="_blank" class="remote-link">Dashboard</a>` || 'N/A'
        }
    },
    'huawei': {
        icon: '🟡',
        name: 'Huawei',
        columns: ['device_name', 'vendor', 'cpu_usage', 'memory_usage', 'status', 'remote_access'],
        fieldMapping: {
            'cpu_usage': d => `${d.cpu_percentage || 0}%`,
            'memory_usage': d => formatMemory(d.memory_usage_mb || 0),
            'remote_access': d => `<a href="${d.management_url || '#'}" target="_blank" class="remote-link">Web</a>` || 'N/A'
        }
    },
    'netgear': {
        icon: '⚫',
        name: 'Netgear',
        columns: ['device_name', 'vendor', 'cpu_usage', 'memory_usage', 'status', 'remote_access'],
        fieldMapping: {
            'cpu_usage': d => `${d.cpu_percentage || 0}%`,
            'memory_usage': d => formatMemory(d.memory_usage_mb || 0),
            'remote_access': d => `<a href="${d.management_url || '#'}" target="_blank" class="remote-link">Cloud</a>` || 'N/A'
        }
    },
    'other': {
        icon: '🟣',
        name: 'Other',
        columns: ['device_name', 'vendor', 'cpu_usage', 'memory_usage', 'status', 'remote_access'],
        fieldMapping: {
            'cpu_usage': d => `${d.cpu_percentage || 0}%`,
            'memory_usage': d => formatMemory(d.memory_usage_mb || 0),
            'remote_access': d => `<a href="${d.management_url || '#'}" target="_blank" class="remote-link">Access</a>` || 'N/A'
        }
    }
};

// Sample device data with vendor-specific metrics
const sampleDevices = [
    {
        id: 'dev-001',
        device_name: 'MikroTik1',
        vendor: 'mikrotik',
        device_type: 'router',
        device_model: 'hAP ac2',
        mac_address: '00:11:22:33:44:55',
        ip_address: '192.168.1.1',
        status: 'online',
        is_online: true,
        provisioning_status: 'configured',
        cpu_percentage: 18,
        memory_usage_mb: 186.88,
        management_url: 'http://192.168.1.1:8291',
        management_type: 'winbox'
    },
    {
        id: 'dev-002',
        device_name: 'Cisco-Router1',
        vendor: 'cisco',
        device_type: 'router',
        device_model: 'ASR1001-X',
        mac_address: '00:11:22:33:44:66',
        ip_address: '192.168.1.100',
        status: 'online',
        is_online: true,
        provisioning_status: 'configured',
        cpu_percentage: 25,
        memory_usage_mb: 1024.50,
        management_url: 'https://192.168.1.100'
    },
    {
        id: 'dev-003',
        device_name: 'MikroTik2',
        vendor: 'mikrotik',
        device_type: 'router',
        device_model: 'RB750Gr3',
        mac_address: '00:11:22:33:44:77',
        ip_address: '192.168.1.2',
        status: 'offline',
        is_online: false,
        provisioning_status: 'pending'
    }
];

// Initialize devices page
document.addEventListener('DOMContentLoaded', function() {
    updateTime();
    loadDevicesData();
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
    const timeEl = document.getElementById('currentTime');
    if (timeEl) timeEl.textContent = timeString;
}

// Helper function to format memory
function formatMemory(mb) {
    if (mb < 1000) {
        return `${mb.toFixed(2)} MB`;
    } else {
        return `${(mb / 1024).toFixed(2)} GB`;
    }
}

// Communication Log Helper - for live billing ↔ vendor communication
function logCommunication(message, type = 'info') {
    const logElement = document.getElementById('deviceCommLog');
    if (!logElement) return;
    
    const timestamp = new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit',
        hour12: false 
    });
    
    const logTypes = {
        'info': `[${timestamp}] ℹ️ `,
        'success': `[${timestamp}] ✅ `,
        'error': `[${timestamp}] ❌ `,
        'warning': `[${timestamp}] ⚠️  `,
        'vendor': `[${timestamp}] 🔌 `,
        'billing': `[${timestamp}] 💳 `
    };
    
    const prefix = logTypes[type] || logTypes['info'];
    const newLog = prefix + message + '\n';
    
    logElement.textContent += newLog;
    logElement.scrollTop = logElement.scrollHeight;
}

// Clear communication log
function clearCommunicationLog() {
    const logElement = document.getElementById('deviceCommLog');
    if (logElement) {
        logElement.textContent = '[Ready for communication]\n$ Initializing connection handler...\n$ Waiting for vendor response...';
    }
}

// Toggle API Key Input Section
function toggleApiKeyInput(show) {
    const section = document.getElementById('apiKeyInputSection');
    const manualApiKey = document.getElementById('manualApiKey');
    const manualApiUsername = document.getElementById('manualApiUsername');
    
    if (show) {
        section.style.display = 'block';
        manualApiKey.focus();
        logCommunication('Enter vendor API credentials for manual connection', 'info');
    } else {
        section.style.display = 'none';
        manualApiKey.value = '';
        manualApiUsername.value = '';
        logCommunication('API credential input cancelled', 'info');
    }
}

// Start Vendor Communication with Manual API Keys
function startVendorCommunication() {
    const apiKey = document.getElementById('manualApiKey').value.trim();
    const username = document.getElementById('manualApiUsername').value.trim();
    const deviceName = document.getElementById('deviceName').value.trim();
    const vendor = document.getElementById('deviceVendor').value;
    const apiUrl = document.getElementById('apiUrl').value.trim();
    
    if (!apiKey) {
        logCommunication('API key is required to start communication', 'error');
        alert('Please enter API key');
        return;
    }
    
    logCommunication(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'info');
    logCommunication(`INITIATING VENDOR COMMUNICATION`, 'vendor');
    logCommunication(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'info');
    logCommunication(`Device: ${deviceName}`, 'info');
    logCommunication(`Vendor: ${vendor}`, 'vendor');
    logCommunication(`API Endpoint: ${apiUrl}`, 'vendor');
    
    if (username) {
        logCommunication(`Authenticating as: ${username}`, 'billing');
    }
    
    logCommunication(`Sending API credentials to vendor...`, 'billing');
    
    // Simulate vendor communication handshake
    setTimeout(() => {
        logCommunication(`✓ Connection established with ${vendor} API`, 'success');
        logCommunication(`Verifying API key...`, 'vendor');
    }, 400);
    
    setTimeout(() => {
        logCommunication(`✓ API key verified successfully`, 'success');
        logCommunication(`Requesting device configuration...`, 'vendor');
    }, 800);
    
    setTimeout(() => {
        logCommunication(`✓ Device configuration received`, 'success');
        logCommunication(`Syncing with billing system...`, 'billing');
    }, 1200);
    
    setTimeout(() => {
        logCommunication(`✓ Billing system updated`, 'success');
        logCommunication(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'info');
        logCommunication(`COMMUNICATION ESTABLISHED ✓`, 'success');
        logCommunication(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'info');
        
        // Store credentials for future use
        window.vendorCredentials = {
            apiKey: apiKey,
            username: username,
            vendor: vendor,
            timestamp: new Date().toISOString()
        };
        
        logCommunication(`Device ready for operations`, 'success');
        
        // Hide API input and show success
        toggleApiKeyInput(false);
        
        setTimeout(() => {
            alert(`Connected to ${vendor}! Device ready for provisioning.`);
        }, 300);
    }, 1600);
}

// Load devices data
function loadDevicesData() {
    console.log('Loading devices...');
    
    // Fetch from API
    fetchWithAuth(`${API_BASE_URL}/devices`, 'GET')
        .then(data => {
            if (data.devices && data.devices.length > 0) {
                window.loadedDevices = data.devices;
                renderDevicesData(data.devices);
            } else {
                // Use sample data
                window.loadedDevices = sampleDevices;
                renderDevicesData(sampleDevices);
            }
        })
        .catch(err => {
            console.error('Failed to load devices:', err);
            // Use sample data on error
            window.loadedDevices = sampleDevices;
            renderDevicesData(sampleDevices);
        });
}

// Render devices in tabs
function renderDevicesData(devices) {
    // Separate devices into Added (pending) and Provisioned (configured)
    const addedDevices = devices.filter(d => 
        d.provisioning_status === 'pending' || 
        d.provisioning_status === 'in_progress' || 
        !d.provisioning_status
    );
    const provisionedDevices = devices.filter(d => d.provisioning_status === 'configured');
    
    // Update badges
    document.getElementById('addedBadge').textContent = addedDevices.length;
    document.getElementById('provisionedBadge').textContent = provisionedDevices.length;
    
    // Render Added Devices
    renderDeviceTable(addedDevices, 'addedDevicesContainer', false);
    
    // Render Provisioned Devices
    renderDeviceTable(provisionedDevices, 'provisionedDevicesContainer', true);
}

// Render device table with vendor-specific format
function renderDeviceTable(devices, containerId, showRemote = false) {
    const container = document.getElementById(containerId);
    
    if (!devices || devices.length === 0) {
        container.innerHTML = '<div class="no-devices">No devices in this category</div>';
        return;
    }
    
    container.innerHTML = devices.map(device => createDeviceRow(device, showRemote)).join('');
}

// Create device row with vendor-specific formatting
function createDeviceRow(device, showRemote = false) {
    const vendor = device.vendor.toLowerCase();
    const vendorInfo = VENDOR_METRICS[vendor] || VENDOR_METRICS['other'];
    const vendorIcon = vendorInfo.icon;
    const vendorName = vendorInfo.name;
    
    const statusClass = device.is_online ? 'status-online' : 'status-offline';
    const statusText = device.is_online ? '✅ Online' : '❌ Offline';
    
    const cpuDisplay = device.cpu_percentage !== undefined ? `${device.cpu_percentage}%` : '—';
    const memoryDisplay = device.memory_usage_mb ? formatMemory(device.memory_usage_mb) : '—';
    
    let remoteAccess = '—';
    if (showRemote) {
        if (device.management_type === 'winbox' && device.management_url) {
            remoteAccess = `<a href="${device.management_url}" target="_blank" class="remote-link">WinBox</a>`;
        } else if (device.management_url) {
            remoteAccess = `<a href="${device.management_url}" target="_blank" class="remote-link">Access</a>`;
        }
    }
    
    const actionButtons = showRemote 
        ? `
            <div class="action-buttons">
                <button class="btn-small secondary" onclick="viewDeviceDetails('${device.id}')">Details</button>
                <button class="btn-small secondary" onclick="editDevice('${device.id}')">Edit</button>
            </div>
        `
        : `
            <div class="action-buttons">
                <button class="btn-small" onclick="editDevice('${device.id}')">Edit</button>
                <button class="btn-small secondary" onclick="viewDeviceDetails('${device.id}')">Details</button>
                <button class="btn-small danger" onclick="deleteDevice('${device.id}')">Delete</button>
            </div>
        `;
    
    return `
        <div class="device-row">
            <div class="device-name">
                <span class="vendor-icon">${vendorIcon}</span>
                <span>${device.device_name}</span>
            </div>
            <div>${vendorName}</div>
            <div class="device-metrics"><span class="metric-value">${cpuDisplay}</span></div>
            <div class="device-metrics"><span class="metric-value">${memoryDisplay}</span></div>
            <div class="device-status ${statusClass}">${statusText}</div>
            ${showRemote ? `<div>${remoteAccess}</div>` : `<div>${actionButtons}</div>`}
        </div>
    `;
}

// Switch between device tabs
function switchDeviceTab(tab) {
    // Hide all tabs
    document.getElementById('added-tab').classList.remove('active');
    document.getElementById('provisioned-tab').classList.remove('active');
    
    // Remove active class from all buttons
    document.querySelectorAll('.device-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    if (tab === 'added') {
        document.getElementById('added-tab').classList.add('active');
        document.querySelectorAll('.device-tab-btn')[0].classList.add('active');
    } else {
        document.getElementById('provisioned-tab').classList.add('active');
        document.querySelectorAll('.device-tab-btn')[1].classList.add('active');
    }
}

// Edit device
function editDevice(deviceId) {
    const device = window.loadedDevices?.find(d => d.id === deviceId);
    if (!device) {
        logCommunication('Device not found', 'error');
        alert('Device not found');
        return;
    }
    
    clearCommunicationLog();
    logCommunication(`Loading device: ${device.device_name}`, 'info');
    logCommunication(`Vendor: ${device.vendor} | Status: ${device.is_online ? 'Online' : 'Offline'}`, 'vendor');
    
    document.getElementById('modalTitle').textContent = 'Edit Device';
    document.getElementById('deviceName').value = device.device_name || '';
    document.getElementById('deviceVendor').value = device.vendor || '';
    document.getElementById('deviceType').value = device.device_type || '';
    document.getElementById('deviceModel').value = device.device_model || '';
    document.getElementById('deviceIP').value = device.ip_address || '';
    document.getElementById('deviceMAC').value = device.mac_address || '';
    document.getElementById('deviceFirmware').value = device.device_firmware || '';
    document.getElementById('deviceAPIEnabled').checked = device.api_enabled || false;
    
    // Restore API configuration fields
    if (device.api_enabled) {
        document.getElementById('apiUrl').value = device.api_url || '';
        document.getElementById('integrationType').value = device.integration_type || '';
        document.getElementById('apiSecret').value = device.api_secret || '';
        updateAPIFields(); // Show API config section
        logCommunication(`API Integration enabled (${device.integration_type || 'unknown'})`, 'vendor');
    } else {
        updateAPIFields(); // Hide API config section
    }
    
    updateVendorInfo(); // Update vendor info display
    
    // Hide connect button and API key input for editing
    toggleApiKeyInput(false);
    const connectBtn = document.getElementById('connectVendorBtn');
    if (connectBtn) {
        connectBtn.style.display = 'none';
    }
    
    document.getElementById('deviceModal').style.display = 'flex';
    document.getElementById('deviceModal').dataset.editId = deviceId;
    
    logCommunication('Device configuration loaded. Ready for updates.', 'success');
}

// Delete device
function deleteDevice(deviceId) {
    const device = window.loadedDevices?.find(d => d.id === deviceId);
    if (!device) {
        alert('Device not found');
        return;
    }
    
    if (confirm(`Are you sure you want to delete ${device.device_name}?`)) {
        logCommunication(`Removing device: ${device.device_name}`, 'warning');
        logCommunication(`Disconnecting from vendor: ${device.vendor}`, 'vendor');
        
        fetchWithAuth(`${API_BASE_URL}/devices/${deviceId}`, 'DELETE')
            .then(() => {
                logCommunication(`Device ${device.device_name} removed from billing system`, 'success');
                logCommunication(`Vendor connection terminated`, 'success');
                alert('Device deleted successfully');
                loadDevicesData();
            })
            .catch(err => {
                console.error('Failed to delete device:', err);
                logCommunication(`Deletion error: ${err.message || 'Failed to delete device'}`, 'error');
                alert('Failed to delete device');
            });
    }
}

// View device details
function viewDeviceDetails(deviceId) {
    const device = window.loadedDevices?.find(d => d.id === deviceId);
    if (!device) {
        alert('Device not found');
        return;
    }
    
    const details = `
Device Details:
Name: ${device.device_name}
Type: ${device.device_type}
Vendor: ${device.vendor}
Model: ${device.device_model}
IP Address: ${device.ip_address || 'N/A'}
MAC Address: ${device.mac_address || 'N/A'}
Status: ${device.is_online ? 'Online' : 'Offline'}
Provisioning: ${device.provisioning_status || 'pending'}
Firmware: ${device.device_firmware || 'N/A'}
CPU: ${device.cpu_percentage || 'N/A'}%
Memory: ${device.memory_usage_mb ? formatMemory(device.memory_usage_mb) : 'N/A'}
Management URL: ${device.management_url || 'N/A'}
    `;
    
    alert(details);
}

// Add new device
function addNewDevice() {
    clearCommunicationLog();
    logCommunication('Opening device registration form...', 'info');
    
    document.getElementById('modalTitle').textContent = 'Add New Device';
    document.getElementById('deviceName').value = '';
    document.getElementById('deviceVendor').value = '';
    document.getElementById('deviceType').value = '';
    document.getElementById('deviceModel').value = '';
    document.getElementById('deviceIP').value = '';
    document.getElementById('deviceMAC').value = '';
    document.getElementById('deviceFirmware').value = '';
    document.getElementById('deviceAPIEnabled').checked = false;
    
    // Clear and hide API fields
    document.getElementById('apiUrl').value = '';
    document.getElementById('integrationType').value = '';
    document.getElementById('apiSecret').value = '';
    document.getElementById('vendorInfo').textContent = '';
    updateAPIFields(); // Hide API config section
    
    // Hide API key input and connect button initially
    toggleApiKeyInput(false);
    const connectBtn = document.getElementById('connectVendorBtn');
    if (connectBtn) {
        connectBtn.style.display = 'none';
    }
    
    document.getElementById('deviceModal').style.display = 'flex';
    delete document.getElementById('deviceModal').dataset.editId;
    
    logCommunication('Device form ready. Vendor connection handlers initialized.', 'success');
}

// Close device modal
function closeDeviceModal() {
    // Clear API key input and credentials
    toggleApiKeyInput(false);
    window.vendorCredentials = null;
    
    const connectBtn = document.getElementById('connectVendorBtn');
    if (connectBtn) {
        connectBtn.style.display = 'none';
    }
    
    document.getElementById('deviceModal').style.display = 'none';
}

// Save device
function saveDevice() {
    const name = document.getElementById('deviceName').value.trim();
    const vendor = document.getElementById('deviceVendor').value;
    const type = document.getElementById('deviceType').value;
    const model = document.getElementById('deviceModel').value.trim();
    const ip = document.getElementById('deviceIP').value.trim();
    const mac = document.getElementById('deviceMAC').value.trim();
    const firmware = document.getElementById('deviceFirmware').value.trim();
    const apiEnabled = document.getElementById('deviceAPIEnabled').checked;
    
    if (!name) {
        logCommunication('Device name is required', 'error');
        alert('Device name is required');
        return;
    }
    if (!vendor) {
        logCommunication('Vendor selection is required', 'error');
        alert('Vendor is required');
        return;
    }
    if (!type) {
        logCommunication('Device type is required', 'error');
        alert('Device type is required');
        return;
    }
    
    // Validate API fields if enabled
    if (apiEnabled) {
        const apiUrl = document.getElementById('apiUrl').value.trim();
        const integrationType = document.getElementById('integrationType').value;
        
        if (!apiUrl) {
            logCommunication('API URL is required when API is enabled', 'error');
            alert('API URL is required for API integration');
            return;
        }
        if (!integrationType) {
            logCommunication('Integration type is required', 'error');
            alert('Integration type is required for API integration');
            return;
        }
    }
    
    const modal = document.getElementById('deviceModal');
    const editId = modal.dataset.editId;
    
    const data = {
        device_name: name,
        vendor: vendor,
        device_type: type,
        device_model: model,
        ip_address: ip,
        mac_address: mac,
        device_firmware: firmware,
        api_enabled: apiEnabled,
        management_url: `http://${ip}` // Default management URL
    };
    
    // Add API configuration if enabled
    if (apiEnabled) {
        data.api_url = document.getElementById('apiUrl').value.trim();
        data.integration_type = document.getElementById('integrationType').value;
        data.api_secret = document.getElementById('apiSecret').value;
    }
    
    // Log communication during save
    logCommunication(`Registering device: ${name} (${vendor})`, 'info');
    logCommunication(`Vendor: ${vendor} | Type: ${type} | IP: ${ip}`, 'vendor');
    
    if (apiEnabled) {
        logCommunication(`API Integration: ${document.getElementById('integrationType').value}`, 'vendor');
        logCommunication(`API Endpoint: ${document.getElementById('apiUrl').value.trim()}`, 'vendor');
    }
    
    if (editId) {
        // Edit existing device
        logCommunication(`Updating device configuration on server...`, 'billing');
        
        fetchWithAuth(`${API_BASE_URL}/devices/${editId}`, 'PUT', data)
            .then(() => {
                logCommunication(`Device ${name} updated successfully`, 'success');
                logCommunication(`Syncing changes with billing system...`, 'billing');
                setTimeout(() => {
                    logCommunication(`Device provisioning complete ✓`, 'success');
                    logCommunication(`Ready for vendor communication...`, 'info');
                    
                    // Show connect button for manual API key entry
                    const connectBtn = document.getElementById('connectVendorBtn');
                    if (connectBtn) {
                        connectBtn.style.display = 'inline-block';
                    }
                    
                    alert('Device updated successfully');
                }, 800);
            })
            .catch(err => {
                console.error('Failed to update device:', err);
                logCommunication(`Failed to update device: ${err.message || 'Unknown error'}`, 'error');
                alert('Failed to update device');
            });
    } else {
        // Add new device
        logCommunication(`Initializing connection to vendor: ${vendor}...`, 'vendor');
        logCommunication(`Requesting device configuration from ${vendor} API...`, 'billing');
        
        fetchWithAuth(`${API_BASE_URL}/devices`, 'POST', data)
            .then(() => {
                logCommunication(`Device ${name} registered on billing system`, 'success');
                logCommunication(`Establishing vendor bridge connection...`, 'vendor');
                logCommunication(`Live communication established ✓`, 'success');
                setTimeout(() => {
                    logCommunication(`Device provisioning complete ✓`, 'success');
                    logCommunication(`Ready for vendor communication...`, 'info');
                    
                    // Show connect button for manual API key entry
                    const connectBtn = document.getElementById('connectVendorBtn');
                    if (connectBtn) {
                        connectBtn.style.display = 'inline-block';
                    }
                    
                    alert('Device added successfully');
                }, 1000);
            })
            .catch(err => {
                console.error('Failed to add device:', err);
                logCommunication(`Connection error: ${err.message || 'Failed to add device'}`, 'error');
                alert('Failed to add device');
            });
    }
}

// Refresh devices
function refreshDevices() {
    console.log('Refreshing devices...');
    loadDevicesData();
}

// Enable API Integration - Show/Hide API Config Fields
function updateAPIFields() {
    const apiEnabled = document.getElementById('deviceAPIEnabled').checked;
    const apiConfig = document.getElementById('apiConfig');
    
    if (apiConfig) {
        apiConfig.style.display = apiEnabled ? 'grid' : 'none';
    }
    
    if (apiEnabled) {
        logCommunication('API Integration enabled - Configure vendor connection', 'info');
    } else {
        logCommunication('API Integration disabled', 'info');
    }
}

// Update Vendor Info Display
function updateVendorInfo() {
    const vendorSelect = document.getElementById('deviceVendor');
    const vendor = vendorSelect.value;
    const vendorInfo = document.getElementById('vendorInfo');
    
    if (!vendor) {
        if (vendorInfo) vendorInfo.textContent = '';
        logCommunication('Vendor selection cleared', 'info');
        return;
    }
    
    logCommunication(`Vendor selected: ${vendor}`, 'vendor');
    
    // Map vendor keys to display info
    const vendorDisplay = {
        'mikrotik': '🟢 MikroTik - REST/SSH/API port 8728',
        'meraki': '🔷 Cisco Meraki - REST/Cloud API',
        'cisco': '🔴 Cisco - SSH/SNMP/NETCONF',
        'ubiquiti': '🔵 Ubiquiti - REST/SSH API',
        'huawei': '🟡 Huawei - REST API',
        'netgear': '⚫ Netgear - REST/SSH',
        'other': '🟣 Other - Custom provisioning'
    };
    
    if (vendorInfo) {
        vendorInfo.textContent = vendorDisplay[vendor] || '';
    }
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
