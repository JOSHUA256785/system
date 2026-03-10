// API Base URL
const API_BASE_URL = 'http://localhost:5000/api';

// Navigation functions
function navigateBack() {
    disableNavButtons();
    window.history.back();
    // Re-enable buttons after delay if navigation doesn't occur
    setTimeout(enableNavButtons, 500);
}

function navigateForward() {
    disableNavButtons();
    window.history.forward();
    // Re-enable buttons after delay if navigation doesn't occur
    setTimeout(enableNavButtons, 500);
}

function disableNavButtons() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => btn.disabled = true);
}

function enableNavButtons() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => btn.disabled = false);
}

// Chart Instances
let paymentsChart, paymentsChartInterval, activeUsersChart, smsChart, networkChart, forecastChart, dataUsageChart;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    updateTime();
    loadDashboard();
    setInterval(updateTime, 1000);
    
    // Initialize table row click handlers
    initTableRowSelection();
    
    // Watch for dynamically added tables
    const observer = new MutationObserver(() => {
        initTableRowSelection();
    });
    observer.observe(document.body, { childList: true, subtree: true });
});

// Update current time
function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    });
    document.getElementById('currentTime').textContent = timeString;
}

// Load Dashboard
function loadDashboard() {
    markActive('dashboard');
    console.log('Loading dashboard...');
    
    // Show dashboard content, hide client activity
    document.querySelectorAll('.page-header').forEach((header, index) => {
        header.style.display = index === 0 ? 'flex' : 'none';
    });
    document.querySelectorAll('.metrics-grid').forEach((grid, index) => {
        grid.style.display = index === 0 ? 'grid' : 'none';
    });
    document.querySelectorAll('.charts-row').forEach(row => {
        row.style.display = 'grid';
    });
    const clientActivityContent = document.getElementById('clientActivityContent');
    if (clientActivityContent) {
        clientActivityContent.style.display = 'none';
    }
    
    // Check if in offline mode and show warning
    if (localStorage.getItem('offlineMode') === 'true') {
        const navbar = document.querySelector('.navbar-top') || document.querySelector('nav');
        if (navbar) {
            const warning = document.createElement('div');
            warning.style.cssText = 'background: #ff9800; color: white; padding: 10px; text-align: center; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px;';
            warning.innerHTML = '⚠️ <span>OFFLINE MODE - Data not synced with server</span>';
            if (navbar.parentNode) {
                navbar.parentNode.insertBefore(warning, navbar);
            } else {
                document.body.insertBefore(warning, document.body.firstChild);
            }
        }
    }
    
    updateGreeting();
    updateExpirationDate();
    
    // Fetch user data
    fetchWithAuth(`${API_BASE_URL}/auth/profile`, 'GET')
        .then(data => {
            document.getElementById('userName').textContent = data.first_name || data.username;
        })
        .catch(err => console.error('Failed to load user profile:', err));
    
    // Fetch dashboard overview
    fetchWithAuth(`${API_BASE_URL}/dashboard/user/overview`, 'GET')
        .then(data => {
            updateMetrics(data);
            initializeCharts(data);
        })
        .catch(err => console.error('Failed to load dashboard:', err));
}

// Update greeting message based on time of day
function updateGreeting() {
    const now = new Date();
    const hour = now.getHours();
    let greeting = '';
    let emoji = '';
    
    if (hour >= 5 && hour < 12) {
        greeting = 'Good morning';
        emoji = '🌅';
    } else if (hour >= 12 && hour < 18) {
        greeting = 'Good afternoon';
        emoji = '☀️';
    } else if (hour >= 18 && hour < 21) {
        greeting = 'Good evening';
        emoji = '🌆';
    } else {
        greeting = 'Good night';
        emoji = '🌙';
    }
    
    const greetingElement = document.getElementById('greetingMessage');
    if (greetingElement) {
        greetingElement.textContent = `${greeting}, Admin! ${emoji}`;
    }
}

// Update Expiration Date from Billing & Subscription
function updateExpirationDate() {
    fetchWithAuth(`${API_BASE_URL}/dashboard/user/billing-renewal`, 'GET')
        .then(data => {
            const lastUpdateElement = document.getElementById('lastUpdate');
            if (lastUpdateElement) {
                let expirationDate;
                
                // Determine which date to use based on trial status
                if (data.is_in_trial) {
                    expirationDate = new Date(data.trial_end_date);
                } else {
                    expirationDate = new Date(data.next_renewal_date);
                }
                
                // Format date as "Expires: DD Mon YYYY"
                const options = { day: '2-digit', month: 'short', year: 'numeric' };
                const formattedDate = expirationDate.toLocaleDateString('en-GB', options);
                
                // Update the element
                lastUpdateElement.textContent = `Expires: ${formattedDate}`;
                lastUpdateElement.title = data.is_in_trial ? 'Trial Period Expires' : 'Subscription Renews';
            }
        })
        .catch(err => {
            console.error('Failed to load expiration date:', err);
            // Keep the static date as fallback
        });
}

// Update Metrics
function updateMetrics(data) {
    if (data.this_month) {
        // Format currency
        const monthlyAmount = data.this_month.amount_spent || 822700;
        document.getElementById('monthlyRevenue').textContent = 
            `USH ${monthlyAmount.toLocaleString('en-US')}.00`;
    }
    
    // Update subscriber count from API (online + offline)
    // Only fetch if user is admin
    if (localStorage.getItem('token')) {
        fetchWithAuth(`${API_BASE_URL}/dashboard/admin/subscribed-clients`, 'GET')
            .then(clientData => {
                if (clientData.total_subscribed !== undefined) {
                    document.getElementById('subscribedClients').textContent = clientData.total_subscribed;
                    
                    // Store client data for detailed view
                    window.clientStatus = clientData;
                    console.log('✓ Subscribed Clients:', {
                        'Total': clientData.total_subscribed,
                        'Online (24hrs)': clientData.online.count,
                        'Offline': clientData.offline.count,
                        'Active Today': clientData.daily.active_today,
                        'New Today': clientData.daily.new_subscriptions
                    });
                }
            })
            .catch(err => {
                // Silently fail for non-admin users
                console.debug('Client tracking not available:', err.message);
                const el = document.getElementById('subscribedClients');
                if (el && el.textContent === '0') {
                    el.textContent = '--';
                }
            });
        
        // Update total clients count from API (all users)
        fetchWithAuth(`${API_BASE_URL}/dashboard/admin/all-clients-status`, 'GET')
            .then(allClientData => {
                if (allClientData.total_clients !== undefined) {
                    document.getElementById('totalClients').textContent = allClientData.total_clients;
                    
                    // Store all client data for detailed view
                    window.allClientStatus = allClientData;
                    console.log('✓ All Clients:', {
                        'Total': allClientData.total_clients,
                        'Online (24hrs)': allClientData.online.count,
                        'Active Today': allClientData.active.count,
                        'Offline': allClientData.offline.count,
                        'New Today': allClientData.daily.new_users,
                        'Total Active': allClientData.daily.total_active
                    });
                }
            })
            .catch(err => {
                // Silently fail for non-admin users
                console.debug('All clients tracking not available:', err.message);
                const el = document.getElementById('totalClients');
                if (el && el.textContent === '--') {
                    el.textContent = '--';
                }
            });
    }
}

// Initialize Charts
function initializeCharts(data) {
    initPaymentsChart();
    initActiveUsersChart();
    initSmsChart();
    initNetworkChart();
    initForecastChart();
    initDataUsageChart();
}

// Payments Chart (Bar Chart)
function initPaymentsChart() {
    const ctx = document.getElementById('paymentsChart');
    if (!ctx) return;

    // Fetch last N days of payments and aggregate by channel
    const days = 30; // show last 30 days

    async function buildChart() {
        try {
            const resp = await fetchWithAuth(`${API_BASE_URL}/finance/payments?days=${days}&per_page=1000`, 'GET');
            const payments = resp.payments || [];

            // Prepare date labels (last `days` days)
            const labels = [];
            const sumsByDate = {}; // { '2026-02-25': { voucher: 0, mobile_money: 0 } }
            for (let i = days - 1; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const key = d.toISOString().slice(0,10);
                labels.push(key);
                sumsByDate[key] = { voucher: 0, mobile_money: 0 };
            }

            // Aggregate payments into sumsByDate
            payments.forEach(p => {
                const dt = p.created_at ? p.created_at.slice(0,10) : null;
                if (!dt || !sumsByDate[dt]) return;
                const method = (p.payment_method || 'unknown').toLowerCase();
                if (method.includes('voucher')) {
                    sumsByDate[dt].voucher += Number(p.amount || 0);
                } else if (method.includes('mobile')) {
                    sumsByDate[dt].mobile_money += Number(p.amount || 0);
                } else {
                    // ignore other channels for this chart
                }
            });

            const voucherData = labels.map(l => sumsByDate[l].voucher);
            const mobileData = labels.map(l => sumsByDate[l].mobile_money);

            if (paymentsChart) paymentsChart.destroy();

            paymentsChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels.map(l => l.replace(/^(\d{4}-)/, '')),
                    datasets: [
                        {
                            label: 'Voucher',
                            data: voucherData,
                            backgroundColor: '#4CAF50',
                            borderRadius: 6,
                        },
                        {
                            label: 'Mobile Money',
                            data: mobileData,
                            backgroundColor: '#2196F3',
                            borderRadius: 6,
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom' }
                    },
                    scales: {
                        x: {
                            stacked: false,
                            grid: { display: false }
                        },
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    if (value >= 1000000) return 'USH ' + (value / 1000000).toFixed(1) + 'M';
                                    if (value >= 1000) return 'USH ' + (value / 1000).toFixed(1) + 'K';
                                    return 'USH ' + value;
                                }
                            }
                        }
                    },
                    interaction: { mode: 'index', intersect: false }
                }
            });

        } catch (err) {
            console.error('Failed to build payments chart:', err);
        }
    }

    // Clear any previous interval to avoid duplicates
    try {
        if (paymentsChartInterval) {
            clearInterval(paymentsChartInterval);
            paymentsChartInterval = null;
        }
    } catch (e) { /* ignore */ }

    // Initial build and then poll every 60 seconds for live updates
    buildChart();
    paymentsChartInterval = setInterval(buildChart, 60000);
}

// Active Users Chart (Line Chart)
function initActiveUsersChart() {
    const ctx = document.getElementById('activeUsersChart');
    if (!ctx) return;
    
    if (activeUsersChart) activeUsersChart.destroy();
    
    activeUsersChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [
                {
                    label: 'Current users online',
                    data: [120, 140, 110, 100, 90, 80, 75],
                    borderColor: '#00D084',
                    backgroundColor: 'rgba(0, 208, 132, 0.1)',
                    tension: 0.3,
                    fill: true,
                    pointRadius: 5,
                    pointBackgroundColor: '#00D084'
                },
                {
                    label: 'Avg. users online',
                    data: [90, 95, 88, 85, 80, 75, 70],
                    borderColor: '#90a4ae',
                    backgroundColor: 'transparent',
                    tension: 0.3,
                    fill: false,
                    borderDash: [5, 5],
                    pointRadius: 4,
                    pointBackgroundColor: '#90a4ae'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { font: { size: 11 } }
                }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// SMS Chart (Bar Chart)
function initSmsChart() {
    const ctx = document.getElementById('smsChart');
    if (!ctx) return;
    
    if (smsChart) smsChart.destroy();
    
    smsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue'],
            datasets: [{
                label: 'SMS Count',
                data: [50, 30, 40, 35, 30, 35, 20],
                backgroundColor: '#00D084',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// Network Data Usage Chart (Area Chart)
function initNetworkChart() {
    const ctx = document.getElementById('networkChart');
    if (!ctx) return;
    
    if (networkChart) networkChart.destroy();
    
    networkChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [
                {
                    label: 'Download (GB)',
                    data: [30, 35, 28, 32, 25, 20, 15],
                    backgroundColor: '#00D084',
                    borderRadius: 6
                },
                {
                    label: 'Upload (GB)',
                    data: [5, 6, 4, 5, 3, 2, 1.5],
                    backgroundColor: '#ffe0b2',
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { font: { size: 11 } }
            }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// Revenue Forecast Chart (Line Chart with Area)
function initForecastChart() {
    const ctx = document.getElementById('forecastChart');
    if (!ctx) return;
    
    if (forecastChart) forecastChart.destroy();
    
    forecastChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'],
            datasets: [
                {
                    label: 'Historical Revenue',
                    data: [500000, 600000, 700000, 750000, 800000, 850000, 900000, null, null, null, null],
                    borderColor: '#1e88e5',
                    backgroundColor: 'rgba(30, 136, 229, 0.1)',
                    tension: 0.3,
                    fill: true,
                    pointRadius: 6,
                    pointBackgroundColor: '#1e88e5'
                },
                {
                    label: 'Forecast Revenue',
                    data: [null, null, null, null, null, null, 900000, 950000, 1000000, 1100000, 1150000],
                    borderColor: '#00D084',
                    backgroundColor: 'rgba(0, 208, 132, 0.1)',
                    tension: 0.3,
                    fill: true,
                    pointRadius: 6,
                    pointBackgroundColor: '#00D084'
                },
                {
                    label: 'Lower Confidence',
                    data: [null, null, null, null, null, null, 850000, 880000, 900000, 950000, 1000000],
                    borderColor: '#90a4ae',
                    backgroundColor: 'transparent',
                    tension: 0.3,
                    fill: false,
                    borderDash: [5, 5],
                    pointRadius: 4,
                    pointBackgroundColor: '#90a4ae'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { font: { size: 11 } }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'USH ' + (value / 1000000).toFixed(1) + 'M';
                        }
                    }
                }
            }
        }
    });
}

// Data Usage Chart
function initDataUsageChart() {
    const ctx = document.getElementById('dataUsageChart');
    if (!ctx) return;
    
    if (dataUsageChart) dataUsageChart.destroy();
    
    dataUsageChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['1 Feb', '8 Feb', '15 Feb', '22 Feb', '1 Mar', '8 Mar', '15 Mar'],
            datasets: [
                {
                    label: 'Hotspot',
                    data: [150, 160, 180, 170, 190, 200, 210],
                    borderColor: '#00D084',
                    backgroundColor: 'transparent',
                    tension: 0.3,
                    pointRadius: 5,
                    pointBackgroundColor: '#00D084'
                },
                {
                    label: 'PPPoE',
                    data: [200, 210, 190, 200, 180, 170, 160],
                    borderColor: '#ffb74d',
                    backgroundColor: 'transparent',
                    tension: 0.3,
                    pointRadius: 5,
                    pointBackgroundColor: '#ffb74d'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { font: { size: 11 } }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value + ' GB';
                        }
                    }
                }
            }
        }
    });
}

// Fetch with Authentication
async function fetchWithAuth(url, method = 'GET', body = null) {
    // Check if in offline mode
    const offlineMode = localStorage.getItem('offlineMode') === 'true';
    
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include'
    };
    
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    try {
        const response = await fetch(url, options);
        if (response.status === 401) {
            redirectToLogin();
            return;
        }
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Fetch error:', error);
        
        // Fallback to mock data in offline mode
        if (offlineMode) {
            console.log('Offline mode: Using mock data for', url);
            
            // Return mock data based on URL
            if (url.includes('/auth/profile')) {
                return {
                    username: 'admin',
                    email: 'admin@centi.local',
                    first_name: 'System',
                    last_name: 'Administrator',
                    domain_name: 'admin.centi.local',
                    is_admin: true
                };
            } else if (url.includes('/dashboard/user/overview')) {
                return {
                    active_subscriptions: 0,
                    total_data_used_gb: 0.00,
                    account_balance: 10000.0,
                    total_spent: 0.0,
                    expiration_date: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
                    payment_status: 'active'
                };
            } else if (url.includes('/devices')) {
                return { devices: [] };
            } else if (url.includes('/packages')) {
                return { packages: [] };
            }
            
            // Return empty array for list endpoints
            if (method === 'GET' && !url.includes('profile')) {
                return { data: [] };
            }
            
            // For POST requests in offline mode, simulate success
            if (method === 'POST') {
                return { message: 'Data saved locally (offline mode)', success: true };
            }
        }
        
        throw error;
    }
}

// Mark menu item as active
function markActive(page) {
    document.querySelectorAll('.sidebar-menu a').forEach(a => {
        a.classList.remove('active');
    });
    document.querySelector(`a[href="#${page}"]`).classList.add('active');
}

// Initialize table row selection (click to highlight in green)
function initTableRowSelection() {
    const tableRows = document.querySelectorAll('.data-table tbody tr');
    
    tableRows.forEach(row => {
        // Skip if already has listener
        if (row.hasAttribute('data-row-listener')) return;
        
        row.setAttribute('data-row-listener', 'true');
        row.style.cursor = 'pointer';
        
        row.addEventListener('click', function(e) {
            // Don't trigger if clicking on a button or interactive element
            if (e.target.closest('button') || e.target.closest('a')) return;
            
            // Get all rows in this table
            const table = this.closest('table');
            const allRows = table.querySelectorAll('tbody tr');
            
            // Remove selection from all rows
            allRows.forEach(r => r.classList.remove('selected'));
            
            // Add selection to clicked row
            this.classList.add('selected');
        });
    });
}

// Page loader functions
function loadUsers() {
    markActive('users');
    console.log('Loading users page...');
    // Fetch active users and open modal
    fetchWithAuth(`${API_BASE_URL}/users`, 'GET')
        .then(data => {
            const users = data.users || data.data || [];
            // fallback sample
            if (!users || users.length === 0) {
                const sample = [
                    { id: 'u1', name: 'Alice A.', email: 'alice@example.com', status: 'active' },
                    { id: 'u2', name: 'Bob B.', email: 'bob@example.com', status: 'active' },
                    { id: 'u3', name: 'Charlie C.', email: 'charlie@example.com', status: 'active' }
                ];
                window.loadedActiveUsers = sample;
                showActiveUsersModal(sample);
            } else {
                window.loadedActiveUsers = users;
                showActiveUsersModal(users);
            }
        })
        .catch(err => {
            console.error('Failed to load users, showing sample users:', err);
            const sample = [
                { id: 'u1', name: 'Alice A.', email: 'alice@example.com', status: 'active' },
                { id: 'u2', name: 'Bob B.', email: 'bob@example.com', status: 'active' },
                { id: 'u3', name: 'Charlie C.', email: 'charlie@example.com', status: 'active' }
            ];
            window.loadedActiveUsers = sample;
            showActiveUsersModal(sample);
        });
}

function loadClientTracking() {
    markActive('clients');
    console.log('Loading client activity tracking...');
    // Fetch subscribed clients with online/offline status
    fetchWithAuth(`${API_BASE_URL}/dashboard/admin/subscribed-clients`, 'GET')
        .then(data => {
            console.log('Client status data:', data);
            showClientActivityModal(data);
        })
        .catch(err => {
            console.error('Failed to load client data:', err);
            alert('Failed to load client activity data');
        });
}

// ---------------------------------------------------------------------------
// Admin helper exposed for quick review/demo purposes
// ---------------------------------------------------------------------------
function activateAllForReview() {
    if (!confirm('This will activate every user, package and subscription in the system. Continue?')) {
        return;
    }
    fetchWithAuth(`${API_BASE_URL}/admin/activate-all`, 'POST')
        .then(response => {
            alert(response.message || 'All entities activated');
            console.log('activate-all response', response);
        })
        .catch(err => {
            console.error('Error activating all entities:', err);
            alert('Failed to activate all entities');
        });
}

// Open client activity modal and expand only the Online users section
function loadOnlineUsersOnly() {
    markActive('clients');
    fetchWithAuth(`${API_BASE_URL}/dashboard/admin/subscribed-clients`, 'GET')
        .then(data => {
            showClientActivityModal(data);
            // Expand online dropdown after modal is inserted
            setTimeout(() => {
                const onlineDropdown = document.getElementById('onlineDropdown');
                const arrow = onlineDropdown && onlineDropdown.parentElement.querySelector('.dropdown-arrow');
                if (onlineDropdown) onlineDropdown.style.display = 'block';
                if (arrow) arrow.style.transform = 'rotate(180deg)';
            }, 100);
        })
        .catch(err => {
            console.error('Failed to load online users:', err);
            alert('Failed to load online users');
        });
}

// Open client activity modal and expand only the Offline users section
function loadOfflineUsersOnly() {
    markActive('clients');
    fetchWithAuth(`${API_BASE_URL}/dashboard/admin/subscribed-clients`, 'GET')
        .then(data => {
            showClientActivityModal(data);
            // Expand offline dropdown after modal is inserted
            setTimeout(() => {
                const offlineDropdown = document.getElementById('offlineDropdown');
                const arrow = offlineDropdown && offlineDropdown.parentElement.querySelector('.dropdown-arrow');
                if (offlineDropdown) offlineDropdown.style.display = 'block';
                if (arrow) arrow.style.transform = 'rotate(180deg)';
            }, 100);
        })
        .catch(err => {
            console.error('Failed to load offline users:', err);
            alert('Failed to load offline users');
        });
}

function showAllClientsModal() {
    // Fetch all clients with status
    if (!window.allClientStatus) {
        fetchWithAuth(`${API_BASE_URL}/dashboard/admin/all-clients-status`, 'GET')
            .then(data => {
                console.log('All clients status data:', data);
                showAllClientsStatusModal(data);
            })
            .catch(err => {
                console.error('Failed to load all clients data:', err);
                alert('Failed to load client data');
            });
    } else {
        showAllClientsStatusModal(window.allClientStatus);
    }
}

function toggleDropdown(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    const arrow = dropdown.parentElement.querySelector('.dropdown-arrow');
    const isHidden = dropdown.style.display === 'none';
    
    if (isHidden) {
        dropdown.style.display = 'block';
        arrow.style.transform = 'rotate(180deg)';
    } else {
        dropdown.style.display = 'none';
        arrow.style.transform = 'rotate(0deg)';
    }
}

function showClientActivityModal(data) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;';
    
    const content = document.createElement('div');
    content.style.cssText = 'background:white;border-radius:12px;padding:30px;max-width:1200px;max-height:90vh;overflow-y:auto;width:95%;box-shadow:0 10px 40px rgba(0,0,0,0.3);';
    
    const activePercent = data.total_subscribed > 0 ? (data.daily.active_today / data.total_subscribed * 100).toFixed(1) : 0;
    const onlinePercent = data.total_subscribed > 0 ? (data.online.count / data.total_subscribed * 100).toFixed(1) : 0;
    const offlinePercent = data.total_subscribed > 0 ? (data.offline.count / data.total_subscribed * 100).toFixed(1) : 0;
    
    content.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <h2 style="margin:0;">🎯 Client Activity Tracking</h2>
            <button onclick="this.closest('div').parentElement.parentElement.remove()" style="background:#00D084;border:none;color:white;padding:10px 15px;border-radius:6px;cursor:pointer;font-weight:600;">✕ Close</button>
        </div>
        
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:15px;margin-bottom:25px;">
            <div style="background:#f0f4f8;padding:15px;border-radius:8px;border-left:4px solid #4CAF50;">
                <div style="font-size:24px;font-weight:bold;color:#333;">${data.total_subscribed}</div>
                <div style="font-size:12px;color:#666;margin-top:5px;">Total Subscribed</div>
            </div>
            <div style="background:#f0f4f8;padding:15px;border-radius:8px;border-left:4px solid #9C27B0;">
                <div style="font-size:24px;font-weight:bold;color:#333;">${data.daily.active_today} <span style="font-size:12px;color:#9C27B0;">(${activePercent}%)</span></div>
                <div style="font-size:12px;color:#666;margin-top:5px;">⭐ Active Users</div>
            </div>
            <div style="background:#f0f4f8;padding:15px;border-radius:8px;border-left:4px solid #2196F3;">
                <div style="font-size:24px;font-weight:bold;color:#333;">${data.online.count} <span style="font-size:12px;color:#2196F3;">(${onlinePercent}%)</span></div>
                <div style="font-size:12px;color:#666;margin-top:5px;">🟢 Online Users</div>
            </div>
            <div style="background:#f0f4f8;padding:15px;border-radius:8px;border-left:4px solid #FF9800;">
                <div style="font-size:24px;font-weight:bold;color:#333;">${data.offline.count} <span style="font-size:12px;color:#FF9800;">(${offlinePercent}%)</span></div>
                <div style="font-size:12px;color:#666;margin-top:5px;">⚫ Offline Users</div>
            </div>
        </div>
        
        <div style="display:flex;flex-direction:column;gap:15px;">
            <!-- Active Users Dropdown -->
            <div style="border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
                <div onclick="toggleDropdown('activeDropdown')" style="display:flex;justify-content:space-between;align-items:center;background:#9C27B0;color:white;padding:15px;cursor:pointer;user-select:none;">
                    <div style="display:flex;align-items:center;gap:10px;font-weight:600;">
                        <span>⭐ Active Users (${data.daily.active_today})</span>
                    </div>
                    <span class="dropdown-arrow" style="font-size:20px;transition:transform 0.3s;transform:rotate(0deg);">▼</span>
                </div>
                <div id="activeDropdown" style="display:none;padding:15px;">
                    <div style="overflow-x:auto;">
                        <table style="width:100%;border-collapse:collapse;font-size:13px;">
                            <thead>
                                <tr style="background:#f5f5f5;border-bottom:2px solid #ddd;">
                                    <th style="padding:12px;text-align:left;font-weight:600;">Username</th>
                                    <th style="padding:12px;text-align:left;font-weight:600;">Email</th>
                                    <th style="padding:12px;text-align:left;font-weight:600;">Phone</th>
                                    <th style="padding:12px;text-align:left;font-weight:600;">Last Login</th>
                                    <th style="padding:12px;text-align:left;font-weight:600;">Package</th>
                                    <th style="padding:12px;text-align:left;font-weight:600;">Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.active && data.active.clients ? data.active.clients.map(client => `
                                    <tr style="border-bottom:1px solid #eee;">
                                        <td style="padding:12px;"><strong>${escapeHtml(client.username)}</strong></td>
                                        <td style="padding:12px;">${escapeHtml(client.email || '-')}</td>
                                        <td style="padding:12px;">${escapeHtml(client.phone || '-')}</td>
                                        <td style="padding:12px;font-size:11px;">${client.last_login ? new Date(client.last_login).toLocaleString() : '-'}</td>
                                        <td style="padding:12px;font-size:11px;color:#9C27B0;font-weight:600;">${client.subscription ? client.subscription.package : '-'}</td>
                                        <td style="padding:12px;font-weight:600;color:#9C27B0;">USH ${client.account_balance.toLocaleString()}</td>
                                    </tr>
                                `).join('') : '<tr><td colspan="6" style="padding:20px;text-align:center;color:#999;">No active users</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            <!-- Online Users Dropdown -->
            <div style="border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
                <div onclick="toggleDropdown('onlineDropdown')" style="display:flex;justify-content:space-between;align-items:center;background:#2196F3;color:white;padding:15px;cursor:pointer;user-select:none;">
                    <div style="display:flex;align-items:center;gap:10px;font-weight:600;">
                        <span>🟢 Online Users (${data.online.count})</span>
                    </div>
                    <span class="dropdown-arrow" style="font-size:20px;transition:transform 0.3s;transform:rotate(0deg);">▼</span>
                </div>
                <div id="onlineDropdown" style="display:none;padding:15px;">
                    <div style="overflow-x:auto;">
                        <table style="width:100%;border-collapse:collapse;font-size:13px;">
                            <thead>
                                <tr style="background:#f5f5f5;border-bottom:2px solid #ddd;">
                                    <th style="padding:12px;text-align:left;font-weight:600;">Username</th>
                                    <th style="padding:12px;text-align:left;font-weight:600;">Email</th>
                                    <th style="padding:12px;text-align:left;font-weight:600;">Phone</th>
                                    <th style="padding:12px;text-align:left;font-weight:600;">Last Login</th>
                                    <th style="padding:12px;text-align:left;font-weight:600;">Package</th>
                                    <th style="padding:12px;text-align:left;font-weight:600;">Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.online.clients.map(client => `
                                    <tr style="border-bottom:1px solid #eee;">
                                        <td style="padding:12px;"><strong>${escapeHtml(client.username)}</strong></td>
                                        <td style="padding:12px;">${escapeHtml(client.email || '-')}</td>
                                        <td style="padding:12px;">${escapeHtml(client.phone || '-')}</td>
                                        <td style="padding:12px;font-size:11px;">${client.last_login ? new Date(client.last_login).toLocaleString() : '-'}</td>
                                        <td style="padding:12px;font-size:11px;color:#2196F3;font-weight:600;">${client.subscription ? client.subscription.package : '-'}</td>
                                        <td style="padding:12px;font-weight:600;color:#2196F3;">USH ${client.account_balance.toLocaleString()}</td>
                                    </tr>
                                `).join('') || '<tr><td colspan="6" style="padding:20px;text-align:center;color:#999;">No online users</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            <!-- Offline Users Dropdown -->
            <div style="border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
                <div onclick="toggleDropdown('offlineDropdown')" style="display:flex;justify-content:space-between;align-items:center;background:#FF9800;color:white;padding:15px;cursor:pointer;user-select:none;">
                    <div style="display:flex;align-items:center;gap:10px;font-weight:600;">
                        <span>⚫ Offline Users (${data.offline.count})</span>
                    </div>
                    <span class="dropdown-arrow" style="font-size:20px;transition:transform 0.3s;transform:rotate(0deg);">▼</span>
                </div>
                <div id="offlineDropdown" style="display:none;padding:15px;">
                    <div style="overflow-x:auto;">
                        <table style="width:100%;border-collapse:collapse;font-size:13px;">
                            <thead>
                                <tr style="background:#f5f5f5;border-bottom:2px solid #ddd;">
                                    <th style="padding:12px;text-align:left;font-weight:600;">Username</th>
                                    <th style="padding:12px;text-align:left;font-weight:600;">Email</th>
                                    <th style="padding:12px;text-align:left;font-weight:600;">Phone</th>
                                    <th style="padding:12px;text-align:left;font-weight:600;">Last Login</th>
                                    <th style="padding:12px;text-align:left;font-weight:600;">Package</th>
                                    <th style="padding:12px;text-align:left;font-weight:600;">Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.offline.clients.map(client => `
                                    <tr style="border-bottom:1px solid #eee;opacity:0.7;">
                                        <td style="padding:12px;"><strong>${escapeHtml(client.username)}</strong></td>
                                        <td style="padding:12px;">${escapeHtml(client.email || '-')}</td>
                                        <td style="padding:12px;">${escapeHtml(client.phone || '-')}</td>
                                        <td style="padding:12px;font-size:11px;">${client.last_login ? new Date(client.last_login).toLocaleString() : 'Never'}</td>
                                        <td style="padding:12px;font-size:11px;color:#FF9800;font-weight:600;">${client.subscription ? client.subscription.package : '-'}</td>
                                        <td style="padding:12px;font-weight:600;color:#FF9800;">USH ${client.account_balance.toLocaleString()}</td>
                                    </tr>
                                `).join('') || '<tr><td colspan="6" style="padding:20px;text-align:center;color:#999;">No offline users</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    content.appendChild(document.createElement('br'));
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
}

function showAllClientsStatusModal(data) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;';
    
    const content = document.createElement('div');
    content.style.cssText = 'background:white;border-radius:12px;padding:30px;max-width:1200px;max-height:90vh;overflow-y:auto;width:95%;box-shadow:0 10px 40px rgba(0,0,0,0.3);';
    
    const onlinePercent = data.total_clients > 0 ? (data.online.count / data.total_clients * 100).toFixed(1) : 0;
    const activePercent = data.total_clients > 0 ? (data.active.count / data.total_clients * 100).toFixed(1) : 0;
    const offlinePercent = data.total_clients > 0 ? (data.offline.count / data.total_clients * 100).toFixed(1) : 0;
    
    content.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <h2 style="margin:0;">👥 All Clients Status</h2>
            <button onclick="this.closest('div').parentElement.parentElement.remove()" style="background:#00D084;border:none;color:white;padding:10px 15px;border-radius:6px;cursor:pointer;font-weight:600;">✕ Close</button>
        </div>
        
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:15px;margin-bottom:25px;">
            <div style="background:#f0f4f8;padding:15px;border-radius:8px;border-left:4px solid #4CAF50;">
                <div style="font-size:24px;font-weight:bold;color:#333;">${data.total_clients}</div>
                <div style="font-size:12px;color:#666;margin-top:5px;">Total Clients</div>
            </div>
            <div style="background:#f0f4f8;padding:15px;border-radius:8px;border-left:4px solid #2196F3;">
                <div style="font-size:24px;font-weight:bold;color:#333;">${data.online.count} <span style="font-size:12px;color:#2196F3;">(${onlinePercent}%)</span></div>
                <div style="font-size:12px;color:#666;margin-top:5px;">🟢 Online (24hrs)</div>
            </div>
            <div style="background:#f0f4f8;padding:15px;border-radius:8px;border-left:4px solid #FF9800;">
                <div style="font-size:24px;font-weight:bold;color:#333;">${data.active.count} <span style="font-size:12px;color:#FF9800;">(${activePercent}%)</span></div>
                <div style="font-size:12px;color:#666;margin-top:5px;">⭐ Active Today</div>
            </div>
            <div style="background:#f0f4f8;padding:15px;border-radius:8px;border-left:4px solid #9C27B0;">
                <div style="font-size:24px;font-weight:bold;color:#333;">${data.offline.count} <span style="font-size:12px;color:#9C27B0;">(${offlinePercent}%)</span></div>
                <div style="font-size:12px;color:#666;margin-top:5px;">⚫ Offline</div>
            </div>
        </div>
        
        <div style="margin-bottom:20px;">
            <h3 style="margin:15px 0;">🟢 Online Clients (${data.online.count})</h3>
            <div style="overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;font-size:13px;">
                    <thead>
                        <tr style="background:#f5f5f5;border-bottom:2px solid #ddd;">
                            <th style="padding:12px;text-align:left;font-weight:600;">Username</th>
                            <th style="padding:12px;text-align:left;font-weight:600;">Email</th>
                            <th style="padding:12px;text-align:left;font-weight:600;">Phone</th>
                            <th style="padding:12px;text-align:left;font-weight:600;">Last Login</th>
                            <th style="padding:12px;text-align:left;font-weight:600;">Subscription</th>
                            <th style="padding:12px;text-align:left;font-weight:600;">Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.online.clients.map(client => `
                            <tr style="border-bottom:1px solid #eee;">
                                <td style="padding:12px;"><strong>${escapeHtml(client.username)}</strong></td>
                                <td style="padding:12px;">${escapeHtml(client.email || '-')}</td>
                                <td style="padding:12px;">${escapeHtml(client.phone || '-')}</td>
                                <td style="padding:12px;font-size:11px;">${client.last_login ? new Date(client.last_login).toLocaleString() : '-'}</td>
                                <td style="padding:12px;font-size:11px;color:#2196F3;font-weight:600;">${client.subscription ? client.subscription.package : 'None'}</td>
                                <td style="padding:12px;font-weight:600;color:#4CAF50;">USH ${client.account_balance.toLocaleString()}</td>
                            </tr>
                        `).join('') || '<tr><td colspan="6" style="padding:20px;text-align:center;color:#999;">No online clients</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
        
        <div style="margin-bottom:20px;">
            <h3 style="margin:15px 0;">⭐ Active Today (${data.active.count})</h3>
            <p style="font-size:12px;color:#666;margin:5px 0;">${data.active.description}</p>
            <div style="overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;font-size:13px;">
                    <thead>
                        <tr style="background:#f5f5f5;border-bottom:2px solid #ddd;">
                            <th style="padding:12px;text-align:left;font-weight:600;">Username</th>
                            <th style="padding:12px;text-align:left;font-weight:600;">Email</th>
                            <th style="padding:12px;text-align:left;font-weight:600;">Phone</th>
                            <th style="padding:12px;text-align:left;font-weight:600;">Last Login</th>
                            <th style="padding:12px;text-align:left;font-weight:600;">Subscription</th>
                            <th style="padding:12px;text-align:left;font-weight:600;">Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.active.clients.map(client => `
                            <tr style="border-bottom:1px solid #eee;">
                                <td style="padding:12px;"><strong>${escapeHtml(client.username)}</strong></td>
                                <td style="padding:12px;">${escapeHtml(client.email || '-')}</td>
                                <td style="padding:12px;">${escapeHtml(client.phone || '-')}</td>
                                <td style="padding:12px;font-size:11px;">${client.last_login ? new Date(client.last_login).toLocaleString() : '-'}</td>
                                <td style="padding:12px;font-size:11px;color:#FF9800;font-weight:600;">${client.subscription ? client.subscription.package : 'None'}</td>
                                <td style="padding:12px;font-weight:600;color:#FF9800;">USH ${client.account_balance.toLocaleString()}</td>
                            </tr>
                        `).join('') || '<tr><td colspan="6" style="padding:20px;text-align:center;color:#999;">No active clients today</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
        
        <div>
            <h3 style="margin:15px 0;">⚫ Offline Clients (${data.offline.count})</h3>
            <div style="overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;font-size:13px;">
                    <thead>
                        <tr style="background:#f5f5f5;border-bottom:2px solid #ddd;">
                            <th style="padding:12px;text-align:left;font-weight:600;">Username</th>
                            <th style="padding:12px;text-align:left;font-weight:600;">Email</th>
                            <th style="padding:12px;text-align:left;font-weight:600;">Phone</th>
                            <th style="padding:12px;text-align:left;font-weight:600;">Last Login</th>
                            <th style="padding:12px;text-align:left;font-weight:600;">Subscription</th>
                            <th style="padding:12px;text-align:left;font-weight:600;">Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.offline.clients.map(client => `
                            <tr style="border-bottom:1px solid #eee;opacity:0.6;">
                                <td style="padding:12px;"><strong>${escapeHtml(client.username)}</strong></td>
                                <td style="padding:12px;">${escapeHtml(client.email || '-')}</td>
                                <td style="padding:12px;">${escapeHtml(client.phone || '-')}</td>
                                <td style="padding:12px;font-size:11px;">${client.last_login ? new Date(client.last_login).toLocaleString() : 'Never'}</td>
                                <td style="padding:12px;font-size:11px;color:#999;">${client.subscription ? client.subscription.package : 'None'}</td>
                                <td style="padding:12px;font-weight:600;color:#999;">USH ${client.account_balance.toLocaleString()}</td>
                            </tr>
                        `).join('') || '<tr><td colspan="6" style="padding:20px;text-align:center;color:#999;">No offline clients</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    content.appendChild(document.createElement('br'));
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
}

// helper: show/hide client activity container and hide other dashboard elements
function showClientActivityContent(markPage) {
    // mark menu item(s) as active if requested
    if (markPage) {
        markActive(markPage);
    }

    // hide the rest of the dashboard
    document.querySelectorAll('.charts-row').forEach(row => {
        row.style.display = 'none';
    });
    const metricsGrid = document.querySelector('.metrics-grid');
    if (metricsGrid && !metricsGrid.id.includes('clientActivity')) {
        metricsGrid.style.display = 'none';
    }
    const pageHeader = document.querySelector('.page-header');
    if (pageHeader) {
        pageHeader.style.display = 'none';
    }

    const clientActivityContent = document.getElementById('clientActivityContent');
    if (clientActivityContent) {
        clientActivityContent.style.display = 'block';
    }
}

// hide all subsections inside client activity panel
function hideAllClientActivitySections() {
    ['clientActivityMetrics','activeUsersSection','onlineUsersSection','offlineUsersSection'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
}

// Load Client Activity Tab (overview)
function loadClientActivityTab() {
    console.log('Loading client activity overview...');
    const submenu = document.getElementById('clientActivitySubmenu');
    if (submenu) submenu.style.display = 'block';

    showClientActivityContent('client-activity-overview');

    // show everything by default
    hideAllClientActivitySections();
    document.getElementById('clientActivityMetrics').style.display = 'grid';
    document.getElementById('activeUsersSection').style.display = 'block';
    document.getElementById('onlineUsersSection').style.display = 'block';
    document.getElementById('offlineUsersSection').style.display = 'block';

    document.getElementById('clientActivityTitle').textContent = '🎯 Client Activity Tracking';
    fetchClientActivityData();
}

// individual pages
function loadActiveUsersPage() {
    console.log('Loading active users page...');
    // open submenu
    const submenu = document.getElementById('clientActivitySubmenu');
    if (submenu) submenu.style.display = 'block';

    showClientActivityContent('client-activity-active');
    hideAllClientActivitySections();
    document.getElementById('clientActivityMetrics').style.display = 'grid'; // keep metrics
    document.getElementById('activeUsersSection').style.display = 'block';
    document.getElementById('clientActivityTitle').textContent = '⭐ Active Users';
    fetchClientActivityData();
}

function loadOnlineUsersPage() {
    console.log('Loading online users page...');
    const submenu = document.getElementById('clientActivitySubmenu');
    if (submenu) submenu.style.display = 'block';

    showClientActivityContent('client-activity-online');
    hideAllClientActivitySections();
    document.getElementById('clientActivityMetrics').style.display = 'grid';
    document.getElementById('onlineUsersSection').style.display = 'block';
    document.getElementById('clientActivityTitle').textContent = '🟢 Online Users';
    fetchClientActivityData();
}

function loadOfflineUsersPage() {
    console.log('Loading offline users page...');
    const submenu = document.getElementById('clientActivitySubmenu');
    if (submenu) submenu.style.display = 'block';

    showClientActivityContent('client-activity-offline');
    hideAllClientActivitySections();
    document.getElementById('clientActivityMetrics').style.display = 'grid';
    document.getElementById('offlineUsersSection').style.display = 'block';
    document.getElementById('clientActivityTitle').textContent = '⚫ Offline Users';
    fetchClientActivityData();
}


// Fetch and display client activity data
function fetchClientActivityData() {
    fetchWithAuth(`${API_BASE_URL}/dashboard/admin/subscribed-clients`, 'GET')
        .then(data => {
            console.log('Client activity data:', data);
            populateClientActivityUI(data);
            updateClientActivityTimestamp();
        })
        .catch(err => {
            console.error('Failed to load client activity data:', err);
            showClientActivityError('Failed to load client activity data. Please try again.');
        });
}

// Populate client activity UI with data
function populateClientActivityUI(data) {
    // Update metrics
    document.getElementById('statTotalSubscribed').textContent = data.total_subscribed || 0;
    document.getElementById('statActiveToday').textContent = (data.daily?.active_today || 0);
    document.getElementById('statOnlineUsers').textContent = (data.online?.count || 0);
    document.getElementById('statOfflineUsers').textContent = (data.offline?.count || 0);
    
    // Update descriptions
    const activeDesc = (data.daily?.active_today || 0) + ' users active today';
    document.getElementById('activeUsersDesc').textContent = activeDesc;
    
    const onlineDesc = (data.online?.count || 0) + ' currently online';
    document.getElementById('onlineUsersDesc').textContent = onlineDesc;
    
    const offlineDesc = (data.offline?.count || 0) + ' currently offline';
    document.getElementById('offlineUsersDesc').textContent = offlineDesc;
    
    // Populate active users table
    populateActiveUsersTable(data.active?.clients || []);
    
    // Populate online users table
    populateOnlineUsersTable(data.online?.clients || []);
    
    // Populate offline users table
    populateOfflineUsersTable(data.offline?.clients || []);
}

// Populate active users table
function populateActiveUsersTable(activeUsers) {
    const tbody = document.getElementById('activeUsersBody');
    
    if (!activeUsers || activeUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="padding:20px;text-align:center;color:#999;">No active users today</td></tr>';
        return;
    }
    
    tbody.innerHTML = activeUsers.map(client => `
        <tr style="border-bottom:1px solid #eee;">
            <td style="padding:12px;"><strong>${escapeHtml(client.username || '-')}</strong></td>
            <td style="padding:12px;">${escapeHtml(client.email || '-')}</td>
            <td style="padding:12px;">${escapeHtml(client.phone || '-')}</td>
            <td style="padding:12px;font-size:11px;">${client.last_login ? new Date(client.last_login).toLocaleString() : '-'}</td>
            <td style="padding:12px;font-size:11px;color:#9C27B0;font-weight:600;">${client.subscription?.package || '-'}</td>
            <td style="padding:12px;font-weight:600;color:#00D084;">USH ${(client.account_balance || 0).toLocaleString()}</td>
        </tr>
    `).join('');
}

// Populate online users table
function populateOnlineUsersTable(onlineUsers) {
    const tbody = document.getElementById('onlineUsersBody');
    
    if (!onlineUsers || onlineUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="padding:20px;text-align:center;color:#999;">No online users</td></tr>';
        return;
    }
    
    tbody.innerHTML = onlineUsers.map(client => `
        <tr style="border-bottom:1px solid #eee;">
            <td style="padding:12px;"><strong>${escapeHtml(client.username || '-')}</strong></td>
            <td style="padding:12px;">${escapeHtml(client.email || '-')}</td>
            <td style="padding:12px;">${escapeHtml(client.phone || '-')}</td>
            <td style="padding:12px;font-size:11px;font-family:monospace;">${escapeHtml(client.ip_address || '-')}</td>
            <td style="padding:12px;font-size:11px;">${client.connection_time ? new Date(client.connection_time).toLocaleString() : '-'}</td>
            <td style="padding:12px;font-size:11px;color:#2196F3;font-weight:600;">${client.subscription?.package || '-'}</td>
        </tr>
    `).join('');
}

// Populate offline users table
function populateOfflineUsersTable(offlineUsers) {
    const tbody = document.getElementById('offlineUsersBody');
    
    if (!offlineUsers || offlineUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="padding:20px;text-align:center;color:#999;">No offline users</td></tr>';
        return;
    }
    
    tbody.innerHTML = offlineUsers.map(client => {
        const lastSeen = client.last_login ? new Date(client.last_login) : null;
        const daysOffline = lastSeen ? Math.floor((new Date() - lastSeen) / (1000 * 60 * 60 * 24)) : '-';
        
        return `
            <tr style="border-bottom:1px solid #eee;">
                <td style="padding:12px;"><strong>${escapeHtml(client.username || '-')}</strong></td>
                <td style="padding:12px;">${escapeHtml(client.email || '-')}</td>
                <td style="padding:12px;">${escapeHtml(client.phone || '-')}</td>
                <td style="padding:12px;font-size:11px;">${lastSeen ? lastSeen.toLocaleString() : '-'}</td>
                <td style="padding:12px;font-weight:600;color:#FF9800;">${daysOffline !== '-' ? daysOffline + ' days' : '-'}</td>
                <td style="padding:12px;font-size:11px;color:#999;font-weight:600;">${client.subscription?.package || '-'}</td>
            </tr>
        `;
    }).join('');
}

// Refresh client activity data
function refreshClientActivity() {
    console.log('Refreshing client activity...');
    fetchClientActivityData();
}

// Update client activity timestamp
function updateClientActivityTimestamp() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
    document.getElementById('activityLastUpdate').textContent = 'Last updated: ' + timeString;
}

// Show client activity error
function showClientActivityError(message) {
    console.error(message);
    const tbody = document.getElementById('activeUsersBody');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="6" style="padding:20px;text-align:center;color:#c62828;">${escapeHtml(message)}</td></tr>`;
    }
}

function loadPackages() {
    markActive('packages');
    console.log('Loading packages page...');
    // Navigate to the standalone packages management page where voucher UI lives
    window.location.href = 'packages.html';
}

function loadTransactions() {
    markActive('transactions');
    console.log('Loading transactions page...');
    
    // Fetch all client activities and transactions
    Promise.all([
        fetchWithAuth(`${API_BASE_URL}/dashboard/admin/subscribed-clients`, 'GET'),
        fetchWithAuth(`${API_BASE_URL}/admin/transactions`, 'GET')
    ])
    .then(([clientActivityData, transactionsData]) => {
        console.log('Client Activity:', clientActivityData);
        console.log('Transactions:', transactionsData);
        showTransactionsModal(clientActivityData, transactionsData);
    })
    .catch(err => {
        console.error('Failed to load transactions data:', err);
        alert('Failed to load transactions data');
    });
}

function loadRevenue() {
    markActive('revenue');
    console.log('Loading revenue page...');
    // Open the revenue modal for quick recording
    showRevenueModal();
}

function loadTickets() {
    markActive('tickets');
    console.log('Loading tickets page...');
}

function loadLeads() {
    markActive('leads');
    console.log('Loading leads page...');
}

function loadCommunication() {
    markActive('communication');
    console.log('Loading communication page...');
}

function loadAnalytics() {
    markActive('analytics');
    console.log('Loading analytics page...');
}

function loadEmails() {
    markActive('emails');
    console.log('Loading emails page...');
}

function loadSMS() {
    markActive('sms');
    console.log('Loading SMS page...');
}

function loadDevices() {
    markActive('devices');
    console.log('Loading devices...');
    
    // Fetch user devices
    fetchWithAuth(`${API_BASE_URL}/devices`, 'GET')
        .then(data => {
            showDevicesModal(data.devices || []);
            updateDevicesBadge(data.total || 0);
        })
        .catch(err => {
            console.error('Failed to load devices:', err);
            showDevicesModal([]);
        });
}

function updateDevicesBadge(count) {
    const badge = document.getElementById('devicesBadge');
    if (badge) badge.textContent = count;
}

function showDevicesModal(devices) {
    const deviceTypes = {
        'router': '🔌 Router',
        'modem': '📡 Modem',
        'other': '🖥️ Other'
    };
    
    // Separate devices into Added (pending/in_progress) and Provisioned (configured)
    const addedDevices = devices.filter(d => d.provisioning_status === 'pending' || d.provisioning_status === 'in_progress' || !d.provisioning_status);
    const provisionedDevices = devices.filter(d => d.provisioning_status === 'configured');
    
    // compute summary for provisioned device status & per-vendor breakdown
    const provisionedOnlineCount = provisionedDevices.filter(d => d.is_online).length;
    const provisionedOfflineCount = provisionedDevices.length - provisionedOnlineCount;
    const vendorStats = {};
    provisionedDevices.forEach(d => {
        const v = d.vendor || 'other';
        if (!vendorStats[v]) vendorStats[v] = { total: 0, online: 0 };
        vendorStats[v].total += 1;
        if (d.is_online) vendorStats[v].online += 1;
    });

    const summaryHtml = `
        <div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:10px;">
            <div style="font-weight:600;">✅ Online: ${provisionedOnlineCount}</div>
            <div style="font-weight:600;">❌ Offline: ${provisionedOfflineCount}</div>
        </div>
        <div style="display:flex;gap:15px;flex-wrap:wrap;margin-bottom:15px;font-size:13px;">
            ${Object.entries(vendorStats).map(([vendor, stats]) => {
                const icon = {
                    'mikrotik': '🟢',
                    'meraki': '🔷',
                    'cisco': '🔴',
                    'ubiquiti': '🔵',
                    'huawei': '🟡',
                    'netgear': '⚫',
                    'defender': '🛡️',
                    'other': '🟣'
                }[vendor] || '🖥️';
                return `<div>${icon} ${vendor.charAt(0).toUpperCase()+vendor.slice(1)}: ${stats.online}/${stats.total}</div>`;
            }).join('')}
        </div>
    `;

    const createDeviceTable = (deviceList) => {
        return deviceList.length > 0 
            ? `<table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: #f5f5f5; border-bottom: 2px solid #ddd;">
                        <th style="padding: 12px; text-align: left; font-weight: 600; color: #333; font-size: 13px;">Device Name</th>
                        <th style="padding: 12px; text-align: left; font-weight: 600; color: #333; font-size: 13px;">Vendor</th>
                        <th style="padding: 12px; text-align: left; font-weight: 600; color: #333; font-size: 13px;">Type</th>
                        <th style="padding: 12px; text-align: left; font-weight: 600; color: #333; font-size: 13px;">IP Address</th>
                        <th style="padding: 12px; text-align: left; font-weight: 600; color: #333; font-size: 13px;">Status</th>
                        <th style="padding: 12px; text-align: left; font-weight: 600; color: #333; font-size: 13px;">Progress</th>
                        <th style="padding: 12px; text-align: left; font-weight: 600; color: #333; font-size: 13px;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${deviceList.map(device => {
                        const statusColor = device.is_online ? '#4caf50' : '#999';
                        const vendorIcon = {
                            'mikrotik': '🟢',
                            'meraki': '🔷',
                            'cisco': '🔴',
                            'ubiquiti': '🔵',
                            'huawei': '🟡',
                            'netgear': '⚫',
                            'defender': '🛡️',
                            'other': '🟣'
                        }[device.vendor] || '🖥️';
                        
                        const typeDisplay = deviceTypes[device.device_type] || ('🖥️ ' + device.device_type);
                        
                        const provisioningColor = {
                            'pending': '#ff9800',
                            'in_progress': '#2196f3',
                            'configured': '#4caf50',
                            'failed': '#f44336',
                            'deprovisioning': '#ff5722'
                        }[device.provisioning_status] || '#999';
                        
                        const progressBar = device.provisioning_status === 'configured' 
                            ? `<div style="background: #4caf50; border-radius: 10px; height: 6px; width: 100px; margin: 0;"></div>`
                            : `<div style="background: linear-gradient(90deg, #2196f3 0%, #03a9f4 100%); border-radius: 10px; height: 6px; width: 100px; animation: pulse 1.5s ease-in-out infinite;"></div>`;
                        
                        return `
                        <tr style="border-bottom: 1px solid #e0e0e0;">
                            <td style="padding: 12px; color: #333; font-weight: 600; font-size: 13px;">${device.device_name}</td>
                            <td style="padding: 12px; color: #666; font-size: 13px;">${vendorIcon} ${device.vendor.charAt(0).toUpperCase() + device.vendor.slice(1)}</td>
                            <td style="padding: 12px; color: #666; font-size: 13px;">${typeDisplay}</td>
                            <td style="padding: 12px; color: #666; font-size: 13px; font-family: monospace;">${device.ip_address || 'N/A'}</td>
                            <td style="padding: 12px;">
                                <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; background: ${statusColor}; color: white;">
                                    ${device.is_online ? '✅ Online' : '❌ Offline'}
                                </span>
                            </td>
                            <td style="padding: 12px;">
                                <div style="display: flex; align-items: center; gap: 8px; width: 120px;">
                                    ${progressBar}
                                    <span style="font-size: 11px; color: #666; white-space: nowrap;">${device.provisioning_status || 'pending'}</span>
                                </div>
                            </td>
                            <td style="padding: 12px;">
                                <div style="display: flex; gap: 6px;">
                                    <button onclick="viewDeviceDetails('${device.id}')" style="padding: 6px 12px; border-radius: 4px; background: #9c27b0; color: white; border: none; cursor: pointer; font-size: 11px; font-weight: 600;">Details</button>
                                    <button onclick="editDeviceAPI('${device.id}')" style="padding: 6px 12px; border-radius: 4px; background: #2196f3; color: white; border: none; cursor: pointer; font-size: 11px; font-weight: 600;">Config</button>
                                    <button onclick="deleteDevice('${device.id}')" style="padding: 6px 12px; border-radius: 4px; background: #f44336; color: white; border: none; cursor: pointer; font-size: 11px; font-weight: 600;">Delete</button>
                                </div>
                            </td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>`
            : '<p style="color: #999; padding: 20px; text-align: center;">No devices in this category</p>';
    };
    
    const modal = `
        <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000;" onclick="if(event.target === this) this.remove()">
            <div style="background: white; border-radius: 12px; padding: 24px; max-width: 1400px; width: 95%; box-shadow: 0 10px 40px rgba(0,0,0,0.2); max-height: 85vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <div>
                        <h2 style="color: #333; margin: 0; font-size: 22px;">📱 Devices</h2>
                        <p style="color: #999; margin: 5px 0 0 0; font-size: 13px;">Manage your network devices provisioning and settings</p>
                    </div>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #999;">×</button>
                </div>
                
                <!-- Tab Navigation -->
                <div style="display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid #e0e0e0;">
                    <button class="device-tab active" onclick="switchDeviceTab('added', event)" style="padding: 12px 24px; border: none; background: none; color: #333; font-weight: 600; cursor: pointer; border-bottom: 3px solid #00D084; position: relative; bottom: -2px;">
                        ➕ Added Devices <span style="display: inline-block; background: #00D084; color: white; border-radius: 12px; padding: 2px 8px; margin-left: 8px; font-size: 11px; font-weight: 600;">${addedDevices.length}</span>
                    </button>
                    <button class="device-tab" onclick="switchDeviceTab('provisioned', event)" style="padding: 12px 24px; border: none; background: none; color: #999; font-weight: 600; cursor: pointer; border-bottom: 3px solid transparent; position: relative; bottom: -2px; transition: all 0.3s ease;">
                        ✅ Provisioned Devices <span style="display: inline-block; background: #999; color: white; border-radius: 12px; padding: 2px 8px; margin-left: 8px; font-size: 11px; font-weight: 600;">${provisionedDevices.length}</span>
                    </button>
                </div>
                
                <!-- Added Devices Tab Content -->
                <div id="added-tab" class="device-tab-content" style="display: block;">
                    ${createDeviceTable(addedDevices)}
                </div>
                
                <!-- Provisioned Devices Tab Content -->
                <div id="provisioned-tab" class="device-tab-content" style="display: none;">
                    ${summaryHtml}
                    ${createDeviceTable(provisionedDevices)}
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 20px;">
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background: #f5f5f5; border: 1px solid #ddd; color: #333; padding: 12px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">Close</button>
                    <button onclick="showAddDeviceModal(); this.parentElement.parentElement.parentElement.remove()" style="background: #4caf50; border: none; color: white; padding: 12px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">+ Add Device</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modal);
}

// -----------------------------
// Active Users modal & helpers
// -----------------------------

function showActiveUsersModal(users) {
    const modal = document.getElementById('activeUsersModal');
    const list = document.getElementById('activeUsersList');
    if (!modal || !list) return;
    list.innerHTML = '';

    // Load saved notes from localStorage
    const stored = JSON.parse(localStorage.getItem('activationNotes') || '{}');

    users.forEach(u => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.alignItems = 'center';
        row.style.padding = '8px';
        row.style.borderBottom = '1px solid #eee';

        const left = document.createElement('div');
        left.style.display = 'flex';
        left.style.flexDirection = 'column';
        left.style.gap = '4px';
        left.innerHTML = `<strong>${u.name || u.username || u.email}</strong><span style="font-size:12px;color:#666">${u.email || ''}</span>`;

        const right = document.createElement('div');
        right.style.display = 'flex';
        right.style.alignItems = 'center';
        right.style.gap = '8px';

        const note = stored[u.id] ? stored[u.id] : null;
        const noteDisplay = document.createElement('div');
        noteDisplay.style.fontSize = '13px';
        noteDisplay.style.color = '#444';
        noteDisplay.style.maxWidth = '440px';
        noteDisplay.textContent = note ? `${note.source}: ${note.description}` : 'No activation note';

        const attachBtn = document.createElement('button');
        attachBtn.className = 'btn-small';
        attachBtn.textContent = 'Attach Activation';
        attachBtn.onclick = () => openAttachActivation(u.id, u.name || u.email);

        right.appendChild(noteDisplay);
        right.appendChild(attachBtn);

        row.appendChild(left);
        row.appendChild(right);
        list.appendChild(row);
    });

    modal.style.display = 'flex';
}

// ========================================
// TRANSACTIONS MODAL - Client Activity Integration
// ========================================
function showTransactionsModal(clientActivityData, transactionsData) {
    // Create modal HTML if needed
    let modal = document.getElementById('transactionsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'transactionsModal';
        modal.className = 'modal';
        modal.style.cssText = `
            display: flex;
            justify-content: center;
            align-items: center;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 2000;
        `;
        document.body.appendChild(modal);
    }

    // Extract data from responses
    const totalSubscribed = clientActivityData?.total_subscribed || 0;
    const activeToday = clientActivityData?.daily?.active_today || 0;
    const onlineClients = clientActivityData?.online?.clients || [];
    const offlineClients = clientActivityData?.offline?.clients || [];
    const activeClients = clientActivityData?.active?.clients || [];
    const allTransactions = transactionsData?.transactions || [];

    // Calculate transaction statistics
    const totalTransactions = allTransactions.length;
    const totalRevenue = allTransactions.reduce((sum, t) => {
        if (t.transaction_type === 'topup' || t.transaction_type === 'purchase') {
            return sum + (parseFloat(t.amount) || 0);
        }
        return sum;
    }, 0);
    const totalRefunds = allTransactions.reduce((sum, t) => {
        return t.transaction_type === 'refund' ? sum + (parseFloat(t.amount) || 0) : sum;
    }, 0);

    // Build modal content
    const content = document.createElement('div');
    content.style.cssText = `
        background: white;
        border-radius: 8px;
        width: 90%;
        max-width: 1200px;
        max-height: 85vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px;
        border-radius: 8px 8px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;
    header.innerHTML = `
        <h2 style="margin: 0; font-size: 24px;">📊 Transactions & Client Activity</h2>
        <button onclick="document.getElementById('transactionsModal').style.display='none'" 
                style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 24px; cursor: pointer; width: 40px; height: 40px; border-radius: 4px;">
            ✕
        </button>
    `;
    content.appendChild(header);

    // Statistics bar
    const statsBar = document.createElement('div');
    statsBar.style.cssText = `
        background: #f8f9fa;
        padding: 15px 20px;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 15px;
        border-bottom: 1px solid #e0e0e0;
    `;
    const stats = [
        { label: 'Subscribed Clients', value: totalSubscribed, color: '#667eea' },
        { label: 'Active Today', value: activeToday, color: '#48bb78' },
        { label: 'Online Now', value: onlineClients.length, color: '#38b2ac' },
        { label: 'Offline', value: offlineClients.length, color: '#ed8936' },
        { label: 'Total Transactions', value: totalTransactions, color: '#9f7aea' },
        { label: 'Total Revenue (USH)', value: Math.round(totalRevenue).toLocaleString(), color: '#48bb78' },
        { label: 'Total Refunds (USH)', value: Math.round(totalRefunds).toLocaleString(), color: '#f56565' }
    ];
    stats.forEach(stat => {
        const statDiv = document.createElement('div');
        statDiv.style.cssText = `
            background: white;
            padding: 12px;
            border-radius: 6px;
            border-left: 4px solid ${stat.color};
            text-align: center;
        `;
        statDiv.innerHTML = `
            <div style="font-size: 12px; color: #666; margin-bottom: 4px;">${stat.label}</div>
            <div style="font-size: 18px; font-weight: bold; color: ${stat.color};">${stat.value}</div>
        `;
        statsBar.appendChild(statDiv);
    });
    content.appendChild(statsBar);

    // Main content area with two columns
    const mainArea = document.createElement('div');
    mainArea.style.cssText = `
        display: grid;
        grid-template-columns: 1fr 2fr;
        gap: 0;
        flex: 1;
        overflow: hidden;
    `;

    // LEFT COLUMN: Client List
    const leftPanel = document.createElement('div');
    leftPanel.style.cssText = `
        border-right: 1px solid #e0e0e0;
        overflow-y: auto;
        background: #f8f9fa;
        padding: 15px;
    `;

    const clientListTitle = document.createElement('h3');
    clientListTitle.style.cssText = `
        margin: 0 0 15px 0;
        color: #333;
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    `;
    clientListTitle.textContent = '👥 Client Activity';
    leftPanel.appendChild(clientListTitle);

    // Create tabs for client status
    const tabs = document.createElement('div');
    tabs.style.cssText = `
        display: flex;
        gap: 5px;
        margin-bottom: 15px;
        border-bottom: 2px solid #ddd;
    `;
    
    const tabNames = [
        { name: 'Active', count: activeClients.length, clients: activeClients, icon: '✅' },
        { name: 'Online', count: onlineClients.length, clients: onlineClients, icon: '🌐' },
        { name: 'Offline', count: offlineClients.length, clients: offlineClients, icon: '❌' }
    ];

    let selectedTab = tabNames[0];
    const clientListContent = document.createElement('div');
    clientListContent.style.cssText = `
        max-height: 400px;
        overflow-y: auto;
    `;

    const updateClientList = () => {
        clientListContent.innerHTML = '';
        selectedTab.clients.forEach(client => {
            const clientItem = document.createElement('div');
            clientItem.style.cssText = `
                padding: 10px;
                background: white;
                border-radius: 4px;
                margin-bottom: 8px;
                cursor: pointer;
                border: 2px solid transparent;
                transition: all 0.2s;
            `;
            clientItem.onmouseover = () => clientItem.style.borderColor = '#667eea';
            clientItem.onmouseout = () => clientItem.style.borderColor = 'transparent';
            clientItem.onclick = () => {
                // Highlight selected client
                document.querySelectorAll('[data-client-item]').forEach(el => {
                    el.style.background = 'white';
                    el.style.borderColor = 'transparent';
                });
                clientItem.style.background = '#e6e9ff';
                clientItem.style.borderColor = '#667eea';
                
                // Show transactions for this client
                const clientId = client.user_id;
                showClientTransactions(clientId, allTransactions, client);
            };
            clientItem.setAttribute('data-client-item', 'true');
            clientItem.innerHTML = `
                <div style="font-weight: 600; color: #333; font-size: 13px;">${client.username || client.email || 'Unknown'}</div>
                <div style="font-size: 11px; color: #999; margin-top: 3px;">ID: ${client.user_id}</div>
            `;
            clientListContent.appendChild(clientItem);
        });
    };

    tabNames.forEach(tab => {
        const tabBtn = document.createElement('button');
        tabBtn.style.cssText = `
            padding: 8px 12px;
            border: none;
            background: transparent;
            color: #666;
            cursor: pointer;
            font-size: 13px;
            border-bottom: 3px solid transparent;
            transition: all 0.2s;
            font-weight: 500;
        `;
        if (tab === selectedTab) {
            tabBtn.style.borderBottomColor = '#667eea';
            tabBtn.style.color = '#667eea';
        }
        tabBtn.textContent = `${tab.icon} ${tab.name} (${tab.count})`;
        tabBtn.onclick = () => {
            selectedTab = tab;
            // Update tab styling
            document.querySelectorAll('[data-tab-btn]').forEach(btn => {
                btn.style.borderBottomColor = 'transparent';
                btn.style.color = '#666';
            });
            tabBtn.style.borderBottomColor = '#667eea';
            tabBtn.style.color = '#667eea';
            updateClientList();
        };
        tabBtn.setAttribute('data-tab-btn', 'true');
        tabs.appendChild(tabBtn);
    });
    leftPanel.appendChild(tabs);
    leftPanel.appendChild(clientListContent);

    // RIGHT COLUMN: Transaction Details
    const rightPanel = document.createElement('div');
    rightPanel.style.cssText = `
        overflow-y: auto;
        padding: 15px;
        background: white;
    `;

    const transactionTitle = document.createElement('h3');
    transactionTitle.style.cssText = `
        margin: 0 0 15px 0;
        color: #333;
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    `;
    transactionTitle.id = 'transactionTitle';
    transactionTitle.textContent = '💳 Select a client to view transactions';
    rightPanel.appendChild(transactionTitle);

    const transactionContent = document.createElement('div');
    transactionContent.id = 'transactionContent';
    transactionContent.style.cssText = `
        max-height: 500px;
        overflow-y: auto;
    `;
    rightPanel.appendChild(transactionContent);

    // Show client transactions
    function showClientTransactions(clientId, transactions, client) {
        const clientTransactions = transactions.filter(t => t.user_id === clientId);
        
        transactionTitle.textContent = `💳 Transactions for ${client.username || client.email}`;
        transactionContent.innerHTML = '';

        if (clientTransactions.length === 0) {
            transactionContent.innerHTML = '<div style="color: #999; text-align: center; padding: 20px;">No transactions found</div>';
            return;
        }

        const statsDiv = document.createElement('div');
        statsDiv.style.cssText = `
            background: #f0f4ff;
            padding: 12px;
            border-radius: 4px;
            margin-bottom: 15px;
            font-size: 12px;
        `;
        const clientTotal = clientTransactions.reduce((sum, t) => {
            if (t.transaction_type !== 'refund') return sum + (parseFloat(t.amount) || 0);
            return sum;
        }, 0);
        statsDiv.innerHTML = `
            <div style="margin-bottom: 5px;"><strong>Total Transactions:</strong> ${clientTransactions.length}</div>
            <div><strong>Client Revenue:</strong> <span style="color: #48bb78; font-weight: bold;">USH ${Math.round(clientTotal).toLocaleString()}</span></div>
        `;
        transactionContent.appendChild(statsDiv);

        // Sort transactions by date descending
        const sorted = [...clientTransactions].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        sorted.forEach(trans => {
            const transDiv = document.createElement('div');
            const typeColor = trans.transaction_type === 'topup' ? '#48bb78' : 
                            trans.transaction_type === 'purchase' ? '#667eea' : '#f56565';
            const typeIcon = trans.transaction_type === 'topup' ? '➕' :
                           trans.transaction_type === 'purchase' ? '🛒' : '↩️';
            const statusBg = trans.status === 'completed' ? '#c6f6d5' : '#fed7d7';
            const statusColor = trans.status === 'completed' ? '#276749' : '#7c2d12';
            
            transDiv.style.cssText = `
                background: white;
                border: 1px solid #e0e0e0;
                padding: 12px;
                border-radius: 4px;
                margin-bottom: 10px;
                border-left: 4px solid ${typeColor};
            `;
            transDiv.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                    <div>
                        <div style="font-weight: 600; color: #333; display: flex; align-items: center; gap: 6px;">
                            <span>${typeIcon}</span>
                            <span>${trans.transaction_type.toUpperCase()}</span>
                        </div>
                        <div style="font-size: 12px; color: #999; margin-top: 2px;">${trans.reference || 'N/A'}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 16px; font-weight: bold; color: ${typeColor};">
                            ${trans.transaction_type === 'refund' ? '-' : '+'}USH ${Math.round(parseFloat(trans.amount) || 0).toLocaleString()}
                        </div>
                        <div style="background: ${statusBg}; color: ${statusColor}; font-size: 11px; padding: 3px 6px; border-radius: 3px; margin-top: 4px; display: inline-block; font-weight: 500;">
                            ${trans.status?.toUpperCase() || 'PENDING'}
                        </div>
                    </div>
                </div>
                <div style="font-size: 12px; color: #666; border-top: 1px solid #f0f0f0; padding-top: 8px;">
                    <div><strong>Description:</strong> ${trans.description || 'N/A'}</div>
                    <div><strong>Method:</strong> ${trans.payment_method || 'N/A'}</div>
                    <div><strong>Date:</strong> ${new Date(trans.created_at).toLocaleString()}</div>
                </div>
            `;
            transactionContent.appendChild(transDiv);
        });
    }

    mainArea.appendChild(leftPanel);
    mainArea.appendChild(rightPanel);
    content.appendChild(mainArea);

    // Footer with action buttons
    const footer = document.createElement('div');
    footer.style.cssText = `
        background: #f8f9fa;
        padding: 15px 20px;
        border-top: 1px solid #e0e0e0;
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        border-radius: 0 0 8px 8px;
    `;
    
    const exportBtn = document.createElement('button');
    exportBtn.textContent = '📥 Export Report';
    exportBtn.style.cssText = `
        padding: 8px 16px;
        background: #48bb78;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
    `;
    exportBtn.onclick = () => {
        console.log('Export transactions report', { clientActivityData, transactionsData });
        alert('📥 Transactions report exported!');
    };
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕ Close';
    closeBtn.style.cssText = `
        padding: 8px 16px;
        background: #e0e0e0;
        color: #333;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
    `;
    closeBtn.onclick = () => {
        modal.style.display = 'none';
    };
    
    footer.appendChild(exportBtn);
    footer.appendChild(closeBtn);
    content.appendChild(footer);

    // Clear and set modal content
    modal.innerHTML = '';
    modal.appendChild(content);

    // Populate initial client list
    updateClientList();

    modal.style.display = 'flex';
}

// -----------------------------
// Revenue recording modal & helpers
// -----------------------------

function showRevenueModal() {
    const modal = document.getElementById('revenueModal');
    if (!modal) return;
    // initialize date input to today
    const dateInp = document.getElementById('revenueDate');
    if (dateInp && !dateInp.value) {
        const today = new Date().toISOString().slice(0,10);
        dateInp.value = today;
    }

    renderRevenueEntries();
    modal.style.display = 'flex';
}

function closeRevenueModal() {
    const modal = document.getElementById('revenueModal');
    if (modal) modal.style.display = 'none';
}

function loadRevenueEntries() {
    try {
        return JSON.parse(localStorage.getItem('revenueEntries') || '[]');
    } catch (e) {
        return [];
    }
}

function saveRevenueEntries(entries) {
    localStorage.setItem('revenueEntries', JSON.stringify(entries));
}

function saveRevenueEntry() {
    const source = document.getElementById('revenueSource').value;
    const amount = parseFloat(document.getElementById('revenueAmount').value) || 0;
    const ref = (document.getElementById('revenueRef').value || '').trim();
    const date = document.getElementById('revenueDate').value || new Date().toISOString().slice(0,10);
    const notes = (document.getElementById('revenueNotes').value || '').trim();

    if (amount <= 0) {
        alert('Enter a valid amount');
        return;
    }

    const entries = loadRevenueEntries();
    const entry = {
        id: 'rev-' + Date.now().toString(36),
        amount: Math.round(amount),
        source,
        ref,
        notes,
        date,
        created_at: new Date().toISOString()
    };

    entries.unshift(entry);
    saveRevenueEntries(entries);
    renderRevenueEntries();

    // Best-effort send to backend
    if (typeof fetchWithAuth === 'function' && API_BASE_URL) {
        fetchWithAuth(`${API_BASE_URL}/revenue`, 'POST', entry)
            .then(res => console.log('Revenue saved server-side', res))
            .catch(err => console.warn('Failed to persist revenue to server:', err));
    }

    // reset amount/ref/notes
    document.getElementById('revenueAmount').value = '';
    document.getElementById('revenueRef').value = '';
    document.getElementById('revenueNotes').value = '';
}

function renderRevenueEntries() {
    const list = document.getElementById('revenueList');
    const totalEl = document.getElementById('revenueTotal');
    if (!list || !totalEl) return;
    const entries = loadRevenueEntries();
    list.innerHTML = '';
    let total = 0;

    entries.forEach(en => {
        total += (en.amount || 0);
        const row = document.createElement('div');
        row.style.display = 'grid';
        row.style.gridTemplateColumns = '1fr 120px 90px 80px';
        row.style.gap = '8px';
        row.style.alignItems = 'center';
        row.style.padding = '8px';
        row.style.borderBottom = '1px solid #eee';

        const left = document.createElement('div');
        left.innerHTML = `<div style="font-weight:600">${en.source}${en.ref ? ' — ' + en.ref : ''}</div><div style="font-size:12px;color:#666">${en.notes || ''}</div>`;

        const amountDiv = document.createElement('div');
        amountDiv.style.textAlign = 'right';
        amountDiv.style.fontWeight = '700';
        amountDiv.textContent = 'USH ' + (en.amount || 0).toLocaleString();

        const dateDiv = document.createElement('div');
        dateDiv.style.fontSize = '13px';
        dateDiv.style.color = '#555';
        dateDiv.textContent = en.date || '';

        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.gap = '6px';
        const del = document.createElement('button');
        del.className = 'btn-small';
        del.style.background = '#c62828';
        del.textContent = 'Delete';
        del.onclick = () => { if (confirm('Delete this revenue entry?')) deleteRevenueEntry(en.id); };

        actions.appendChild(del);

        row.appendChild(left);
        row.appendChild(amountDiv);
        row.appendChild(dateDiv);
        row.appendChild(actions);
        list.appendChild(row);
    });

    totalEl.textContent = 'USH ' + total.toLocaleString();
}

function deleteRevenueEntry(id) {
    let entries = loadRevenueEntries();
    entries = entries.filter(e => e.id !== id);
    saveRevenueEntries(entries);
    renderRevenueEntries();
}

function exportRevenueCSV() {
    const entries = loadRevenueEntries();
    const rows = ['id,source,ref,amount,date,notes,created_at'];
    entries.forEach(e => rows.push(`${e.id},${e.source},${e.ref || ''},${e.amount || 0},${e.date || ''},"${(e.notes||'').replace(/"/g,'""')}",${e.created_at || ''}`));
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'revenue.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function copyRevenueCodes() {
    const entries = loadRevenueEntries();
    const refs = entries.map(e => e.ref || e.id).join('\n');
    navigator.clipboard.writeText(refs).then(()=> alert('Copied references to clipboard'));
}

function closeActiveUsersModal() {
    const modal = document.getElementById('activeUsersModal');
    if (modal) modal.style.display = 'none';
}

function filterActiveUsers() {
    const q = (document.getElementById('activeUsersSearch').value || '').toLowerCase();
    const users = window.loadedActiveUsers || [];
    const filtered = users.filter(u => (u.name || u.email || '').toLowerCase().includes(q));
    showActiveUsersModal(filtered);
}

function openAttachActivation(userId, displayName) {
    // Simple prompt-based UI to keep inline and quick
    const source = prompt('Enter activation source (Payment Gateway or Voucher):', 'Payment Gateway');
    if (!source) return;
    const description = prompt('Enter description for this activation (reason/transaction id/voucher info):', '');
    if (description === null) return;

    saveActivationNote(userId, source, description);
}

function saveActivationNote(userId, source, description) {
    const stored = JSON.parse(localStorage.getItem('activationNotes') || '{}');
    stored[userId] = { source, description, updated_at: new Date().toISOString() };
    localStorage.setItem('activationNotes', JSON.stringify(stored));

    // Update UI if modal is open
    const modal = document.getElementById('activeUsersModal');
    if (modal && modal.style.display === 'flex') {
        // Refresh current list
        const users = window.loadedActiveUsers || [];
        showActiveUsersModal(users);
    }

    // Optionally persist to backend if endpoint available
    if (typeof fetchWithAuth === 'function' && API_BASE_URL) {
        // Best-effort, do not block UI
        fetchWithAuth(`${API_BASE_URL}/users/${encodeURIComponent(userId)}/activation-note`, 'POST', { source, description })
            .then(res => console.log('Saved activation note server-side', res))
            .catch(err => console.warn('Could not save activation note to server:', err));
    }
}

// -----------------------------
// Payment Logs modal & helpers
// -----------------------------

function showPaymentLogsModal() {
    const modal = document.getElementById('paymentLogsModal');
    if (!modal) return;
    // init date fields to last 30 days
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 30);
    const fStr = from.toISOString().slice(0,10);
    const tStr = to.toISOString().slice(0,10);
    const elFrom = document.getElementById('plFrom');
    const elTo = document.getElementById('plTo');
    if (elFrom && !elFrom.value) elFrom.value = fStr;
    if (elTo && !elTo.value) elTo.value = tStr;

    loadPaymentLogs().then(logs => {
        window.paymentLogs = logs;
        renderPaymentLogs(logs);
        modal.style.display = 'flex';
    }).catch(err => {
        console.error('Failed to load payment logs:', err);
        window.paymentLogs = [];
        renderPaymentLogs([]);
        modal.style.display = 'flex';
    });
}

function closePaymentLogsModal() {
    const modal = document.getElementById('paymentLogsModal');
    if (modal) modal.style.display = 'none';
}

async function loadPaymentLogs() {
    // Attempt to fetch from API, fallback to localStorage or sample
    try {
        const data = await fetchWithAuth(`${API_BASE_URL}/finance/payments`, 'GET');
        if (data && (data.payments || data.data || data)) {
            const logs = data.payments || data.data || data;
            // persist locally for quick access
            localStorage.setItem('paymentLogs', JSON.stringify(logs));
            return logs;
        }
    } catch (e) {
        console.warn('API fetch failed for payment logs:', e);
    }

    try {
        const stored = JSON.parse(localStorage.getItem('paymentLogs') || '[]');
        if (stored && stored.length) return stored;
    } catch (e) {}

    // fallback sample
    return [
        {
            status: 'Successful',
            channel: 'Voucher',
            location: 'KAWAALA',
            msisdn: '256740229670',
            customer: '256740229670',
            date: '2026-02-24 16:40:54',
            amount_collected: 1000,
            charge: 0,
            amount_received: 1000,
            status_notes: 'Sell by Hajjijat kawaala-CEN',
            notes: 'Voucher CEN'
        }
    ];
}

function renderPaymentLogs(logs) {
    const tbody = document.querySelector('#paymentLogsTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    logs.forEach(l => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding:8px;">${escapeHtml(l.status || '')}</td>
            <td style="padding:8px;">${escapeHtml(l.channel || '')}</td>
            <td style="padding:8px;">${escapeHtml(l.location || '')}</td>
            <td style="padding:8px;">${escapeHtml(l.msisdn || '')}</td>
            <td style="padding:8px;">${escapeHtml(l.customer || '')}</td>
            <td style="padding:8px;">${escapeHtml(l.date || '')}</td>
            <td style="padding:8px; text-align:right;">${formatCurrency(l.amount_collected)}</td>
            <td style="padding:8px; text-align:right;">${formatCurrency(l.charge)}</td>
            <td style="padding:8px; text-align:right;">${formatCurrency(l.amount_received)}</td>
            <td style="padding:8px;">${escapeHtml(l.status_notes || '')}</td>
            <td style="padding:8px;">${escapeHtml(l.notes || '')}</td>
        `;
        tbody.appendChild(tr);
    });
}

function filterPaymentLogs() {
    const from = document.getElementById('plFrom').value;
    const to = document.getElementById('plTo').value;
    const channel = document.getElementById('plChannel').value;
    const q = (document.getElementById('plSearch').value || '').toLowerCase();
    let logs = window.paymentLogs || [];

    if (from) {
        const f = new Date(from);
        logs = logs.filter(l => {
            try { return new Date((l.date || '').split(' ')[0]) >= f; } catch(e) { return true; }
        });
    }
    if (to) {
        const t = new Date(to);
        t.setHours(23,59,59,999);
        logs = logs.filter(l => {
            try { return new Date((l.date || '').replace(' ', 'T')) <= t; } catch(e) { return true; }
        });
    }
    if (channel) logs = logs.filter(l => (l.channel || '').toLowerCase().includes(channel.toLowerCase()));
    if (q) {
        logs = logs.filter(l => ((l.msisdn||'')+ ' ' + (l.customer||'') + ' ' + (l.notes||'') + ' ' + (l.status_notes||'')).toLowerCase().includes(q));
    }

    renderPaymentLogs(logs);
}

function exportPaymentLogsCSV() {
    const logs = window.paymentLogs || [];
    const rows = ['Status,Channel,Location,Msisdn,Customer,Date,AmountCollected,Charge,AmountReceived,StatusNotes,Notes'];
    logs.forEach(l => {
        const vals = [l.status, l.channel, l.location, l.msisdn, l.customer, l.date, l.amount_collected, l.charge, l.amount_received, (l.status_notes||'').replace(/"/g,'""'), (l.notes||'').replace(/"/g,'""')];
        rows.push(vals.map(v => '"'+String(v || '')+'"').join(','));
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'payment_logs.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function generateSamplePaymentLogs() {
    const sample = [];
    for (let i=0;i<12;i++) {
        sample.push({
            status: i%3===0 ? 'Successful' : 'Pending',
            channel: i%2===0 ? 'Voucher' : 'Mobile Money',
            location: i%4===0 ? 'KAWAALA' : 'KALANGALA',
            msisdn: '2567' + (40000000 + i).toString(),
            customer: 'Customer ' + (i+1),
            date: new Date(Date.now() - i*3600*1000*24).toISOString().replace('T',' ').split('.')[0],
            amount_collected: 1000 + i*100,
            charge: 0,
            amount_received: 1000 + i*100,
            status_notes: i%2===0 ? 'Sell by operator' : '',
            notes: i%2===0 ? 'Voucher CEN' : ''
        });
    }
    window.paymentLogs = sample;
    localStorage.setItem('paymentLogs', JSON.stringify(sample));
    renderPaymentLogs(sample);
}

function formatCurrency(v) { if (!v && v !== 0) return ''; return 'USH ' + Number(v).toLocaleString(); }
function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function togglePaymentAddForm() {
    const form = document.getElementById('plAddForm');
    if (!form) return;
    form.style.display = (form.style.display === 'none' || form.style.display === '') ? 'block' : 'none';
}

function savePaymentLog() {
    const status = document.getElementById('plStatus').value;
    const channel = document.getElementById('plChannelInput').value;
    const location = document.getElementById('plLocation').value.trim();
    const msisdn = document.getElementById('plMsisdn').value.trim();
    const customer = document.getElementById('plCustomer').value.trim();
    const dateVal = document.getElementById('plDate').value;
    const amount_collected = parseFloat(document.getElementById('plAmountCollected').value) || 0;
    const charge = parseFloat(document.getElementById('plCharge').value) || 0;
    const amount_received = Math.max(0, amount_collected - charge);
    const status_notes = document.getElementById('plStatusNotes').value.trim();
    const notes = document.getElementById('plNotes').value.trim();

    if (!msisdn) { alert('Msisdn is required'); return; }
    if (amount_collected <= 0) { alert('Amount collected must be greater than 0'); return; }

    const date = dateVal ? new Date(dateVal).toISOString().replace('T',' ').split('.')[0] : (new Date().toISOString().replace('T',' ').split('.')[0]);

    const entry = {
        id: 'pl-' + Date.now().toString(36),
        status,
        channel,
        location,
        msisdn,
        customer: customer || msisdn,
        date,
        amount_collected: Math.round(amount_collected),
        charge: Math.round(charge),
        amount_received: Math.round(amount_received),
        status_notes,
        notes
    };

    // prepend
    window.paymentLogs = window.paymentLogs || [];
    window.paymentLogs.unshift(entry);
    localStorage.setItem('paymentLogs', JSON.stringify(window.paymentLogs));
    renderPaymentLogs(window.paymentLogs);
    togglePaymentAddForm();

    // Optionally save to backend
    if (typeof fetchWithAuth === 'function' && API_BASE_URL) {
        fetchWithAuth(`${API_BASE_URL}/finance/payments`, 'POST', entry)
            .then(res => console.log('Payment log saved server-side', res))
            .catch(err => console.warn('Failed to persist payment log to server:', err));
    }
}

function switchDeviceTab(tabName, event) {
    // Hide all tabs
    document.querySelectorAll('.device-tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    
    // Remove active state from all buttons
    document.querySelectorAll('.device-tab').forEach(btn => {
        btn.style.borderBottomColor = 'transparent';
        btn.style.color = '#999';
    });
    
    // Show selected tab
    document.getElementById(tabName + '-tab').style.display = 'block';
    
    // Set active state on clicked button
    event.target.closest('button').style.borderBottomColor = '#00D084';
    event.target.closest('button').style.color = '#333';
}

async function showAddDeviceModal() {
    // Fetch vendor list
    let vendors = [];
    try {
        const vendorResponse = await fetch('/api/devices/vendors');
        const vendorData = await vendorResponse.json();
        vendors = vendorData || [];
    } catch (error) {
        console.warn('Failed to load vendors:', error);
        vendors = [];
    }
    
    const vendorOptions = vendors.length > 0 
        ? vendors.map(v => `<option value="${v.vendor_key}">${v.icon} ${v.name}</option>`).join('')
        : '<option value="">No vendors available</option>';
    
    const deviceTypes = [
        { value: 'router', label: '🔌 Router' },
        { value: 'modem', label: '📡 Modem' },
        { value: 'other', label: '🖥️ Other' }
    ];
    
    const modal = `
        <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2001;" onclick="if(event.target === this) this.remove()">
            <div style="background: white; border-radius: 12px; padding: 24px; max-width: 600px; width: 95%; box-shadow: 0 10px 40px rgba(0,0,0,0.2); max-height: 90vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="color: #333; margin: 0; font-size: 22px;">📱 Add Device</h2>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #999;">×</button>
                </div>
                
                <div style="background: #f0fff9; border-left: 4px solid #2196f3; padding: 12px; border-radius: 6px; margin-bottom: 20px;">
                    <p style="color: #1565c0; font-size: 13px; margin: 0;"><strong>💡 Tip:</strong> Register your MikroTik, Meraki, Cisco, or Defender device for provisioning and management with automatic quota monitoring.</p>
                </div>
                
                <form id="addDeviceForm" style="display: grid; gap: 16px;">
                    <!-- Communication Log Terminal -->
                    <div>
                        <label style="font-size:12px;color:#666;">📟 Communication Log</label>
                        <pre id="deviceLogTerminal" style="height:120px;overflow:auto;background:#1e1e1e;color:#0f0;padding:8px;border-radius:6px;font-family:monospace;font-size:12px;">(logs will appear here)</pre>
                    </div>
                    <!-- Device Information Section -->
                    <div style="background: #f5f5f5; padding: 16px; border-radius: 8px;">
                        <h3 style="color: #333; margin: 0 0 16px 0; font-size: 14px; font-weight: 600;">📋 Device Information</h3>
                        
                        <div>
                            <label style="display: block; color: #666; font-size: 12px; font-weight: 600; margin-bottom: 6px;">Device Name *</label>
                            <input type="text" id="deviceName" placeholder="e.g., KAWAALA ROUTER, Branch Office Device" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;" required>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px;">
                            <div>
                                <label style="display: block; color: #666; font-size: 12px; font-weight: 600; margin-bottom: 6px;">Device Type *</label>
                                <select id="deviceType" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;" required>
                                    <option value="">Select Type</option>
                                    ${deviceTypes.map(t => `<option value="${t.value}">${t.label}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label style="display: block; color: #666; font-size: 12px; font-weight: 600; margin-bottom: 6px;">Vendor *</label>
                                <select id="deviceVendor" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;" required onchange="updateVendorInfo()">
                                    <option value="">Select Vendor</option>
                                    <option value="mikrotik">🟢 MikroTik</option>
                                    <option value="meraki">🔷 Meraki</option>
                                    <option value="cisco">🔴 Cisco</option>
                                    <option value="defender">🛡️ Defender</option>
                                    <option value="other">🟣 Other</option>
                                </select>
                            </div>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px;">
                            <div>
                                <label style="display: block; color: #666; font-size: 12px; font-weight: 600; margin-bottom: 6px;">Device Model</label>
                                <input type="text" id="deviceModel" placeholder="e.g., hAP ac2, MR52" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
                            </div>
                            <div>
                                <label style="display: block; color: #666; font-size: 12px; font-weight: 600; margin-bottom: 6px;">IP Address</label>
                                <input type="text" id="ipAddress" placeholder="e.g., 10.16.13.226" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; box-sizing: border-box; font-family: monospace;">
                            </div>
                        </div>
                    </div>
                    
                    <!-- API Integration Section -->
                    <div style="background: #f5f5f5; padding: 16px; border-radius: 8px;">
                        <!-- Communication log terminal -->
                        <div style="margin-bottom:12px;">
                            <label style="font-size:12px;color:#666;">📟 Communication Log</label>
                            <pre id="deviceLogTerminal" style="height:120px;overflow:auto;background:#1e1e1e;color:#0f0; padding:8px;border-radius:6px;font-family:monospace;font-size:12px;">(logs will appear here)</pre>
                        </div>
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; margin: 0;">
                                <input type="checkbox" id="apiEnabled" style="width: 18px; height: 18px; cursor: pointer;" onchange="updateAPIFields()">
                                <span style="color: #333; font-size: 14px; font-weight: 600;">🔗 Enable API Integration</span>
                            </label>
                            <span id="vendorInfo" style="color: #00D084; font-size: 11px; font-weight: 600;"></span>
                        </div>
                        
                        <div id="apiConfig" style="display: none; display: grid; gap: 12px;">
                            <div>
                                <label style="display: block; color: #666; font-size: 12px; font-weight: 600; margin-bottom: 6px;">Device Firmware</label>
                                <input type="text" id="deviceFirmware" placeholder="e.g., 6.48" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
                            </div>
                            
                            <div>
                                <label style="display: block; color: #666; font-size: 12px; font-weight: 600; margin-bottom: 6px;">API URL / Device Address *</label>
                                <input type="text" id="apiUrl" placeholder="e.g., https://192.168.1.1:8728 or 192.168.1.1" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
                                <p id="apiUrlHint" style="color: #999; font-size: 11px; margin: 4px 0 0 0;">Default port will be used if not specified</p>
                            </div>
                            
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                <div>
                                    <label style="display: block; color: #666; font-size: 12px; font-weight: 600; margin-bottom: 6px;">Integration Type *</label>
                                    <select id="integrationType" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;" required>
                                        <option value="">Select Type</option>
                                        <option value="rest">REST API</option>
                                        <option value="ssh">SSH</option>
                                        <option value="snmp">SNMP</option>
                                        <option value="netconf">NETCONF</option>
                                        <option value="modbus">Modbus</option>
                                    </select>
                                </div>
                                <div>
                                    <label style="display: block; color: #666; font-size: 12px; font-weight: 600; margin-bottom: 6px;">API Secret Key</label>
                                    <input type="password" id="apiSecret" placeholder="Device API key or password" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Billing Access Section -->
                    <div style="background: #f5f5f5; padding: 16px; border-radius: 8px;">
                        <h3 style="color: #333; margin: 0 0 16px 0; font-size: 14px; font-weight: 600;">💰 Billing Access & Quota Management</h3>
                        
                        <div style="display: grid; gap: 12px;">
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                <input type="checkbox" id="billingAccess" style="width: 18px; height: 18px; cursor: pointer;">
                                <span style="color: #333; font-size: 13px;">Allow billing system access</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                <input type="checkbox" id="dataMonitoring" style="width: 18px; height: 18px; cursor: pointer;">
                                <span style="color: #333; font-size: 13px;">Enable data monitoring</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                <input type="checkbox" id="autoDisconnect" style="width: 18px; height: 18px; cursor: pointer;">
                                <span style="color: #333; font-size: 13px;">Auto-disconnect when quota exceeded</span>
                            </label>
                        </div>
                        
                        <div style="border-top: 1px solid #ddd; padding-top: 12px; margin-top: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                            <div>
                                <label style="display: block; color: #666; font-size: 12px; font-weight: 600; margin-bottom: 6px;">Bandwidth Limit (Mbps)</label>
                                <input type="number" id="bandwidthLimit" placeholder="e.g., 10" min="0" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
                            </div>
                            <div>
                                <label style="display: block; color: #666; font-size: 12px; font-weight: 600; margin-bottom: 6px;">Data Limit (GB)</label>
                                <input type="number" id="dataLimitGb" placeholder="e.g., 100" min="0" step="0.1" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
                            </div>
                        </div>
                    </div>
                    
                    <!-- Remote Management Section -->
                    <div style="background: #f5f5f5; padding: 16px; border-radius: 8px;">
                        <h3 style="color: #333; margin: 0 0 16px 0; font-size: 14px; font-weight: 600;">🌐 Remote Management Access</h3>
                        
                        <div style="display: grid; gap: 12px;">
                            <div>
                                <label style="display: block; color: #666; font-size: 12px; font-weight: 600; margin-bottom: 6px;">Management Interface</label>
                                <select id="managementType" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;" onchange="updateManagementInterface()">
                                    <option value="">Select Management Interface</option>
                                    <option value="winbox">🟢 MikroTik Winbox</option>
                                    <option value="web">🌐 Web Interface (HTTP)</option>
                                    <option value="secure">🔒 Secure Web (HTTPS)</option>
                                    <option value="ssh">🖥️ SSH Terminal</option>
                                    <option value="cloud_dashboard">☁️ Cloud Dashboard</option>
                                    <option value="admin_center">🔐 Admin Center</option>
                                    <option value="telnet">📡 Telnet</option>
                                    <option value="powershell">⚡ PowerShell (WinRM)</option>
                                </select>
                            </div>
                            
                            <div id="managementUrlContainer" style="display: none;">
                                <label style="display: block; color: #666; font-size: 12px; font-weight: 600; margin-bottom: 6px;">Management URL / Address</label>
                                <input type="text" id="managementUrl" placeholder="e.g., https://192.168.1.1 or dashboard.meraki.com" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
                                <p id="managementUrlHint" style="color: #999; font-size: 11px; margin: 4px 0 0 0;">Hint will appear here</p>
                            </div>
                            
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                <input type="checkbox" id="managementAccessible" style="width: 18px; height: 18px; cursor: pointer;">
                                <span style="color: #333; font-size: 13px;">Mark as accessible for remote management</span>
                            </label>
                        </div>
                        
                        <div style="background: #e8f5e9; border-left: 4px solid #4caf50; padding: 12px; border-radius: 6px; margin-top: 12px;">
                            <p style="margin: 0; color: #2e7d32; font-size: 12px;"><strong>💡 Info:</strong> Save your management credentials securely. You can access your device through the selected management interface.</p>
                        </div>
                    </div>
                    
                    <!-- Buttons -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <button type="button" onclick="this.parentElement.parentElement.parentElement.parentElement.remove()" style="background: #f5f5f5; border: 1px solid #ddd; color: #333; padding: 12px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">Cancel</button>
                        <button type="submit" style="background: #4caf50; border: none; color: white; padding: 12px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">Register Device</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modal);
    
    // Attach form submit handler
    const form = document.getElementById('addDeviceForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await registerNewDevice(vendors);
    });
    
    // Attach event listeners for management interface
    const vendorSelect = document.getElementById('deviceVendor');
    const interfaceSelect = document.getElementById('managementInterface');
    const ipInput = document.getElementById('ipAddress');
    
    if (vendorSelect) vendorSelect.addEventListener('change', updateManagementUrlHint);
    if (interfaceSelect) interfaceSelect.addEventListener('change', updateManagementUrlHint);
    if (ipInput) ipInput.addEventListener('input', updateManagementUrlHint);
    
    // Initial state
    updateAPIFields();
    updateManagementUrlHint();
}

async function registerNewDevice(vendors = []) {
    const deviceName = document.getElementById('deviceName').value;
    const deviceType = document.getElementById('deviceType').value;
    const deviceVendor = document.getElementById('deviceVendor').value;
    const deviceModel = document.getElementById('deviceModel').value;
    const macAddress = document.getElementById('macAddress').value;
    const apiEnabled = document.getElementById('apiEnabled').checked;
    const deviceFirmware = document.getElementById('deviceFirmware').value;
    const apiUrl = document.getElementById('apiUrl').value;
    const integrationType = document.getElementById('integrationType').value;
    const apiSecret = document.getElementById('apiSecret').value;
    const billingAccess = document.getElementById('billingAccess').checked;
    const dataMonitoring = document.getElementById('dataMonitoring').checked;
    const autoDisconnect = document.getElementById('autoDisconnect').checked;
    const bandwidthLimit = document.getElementById('bandwidthLimit').value;
    const dataLimitGb = document.getElementById('dataLimitGb').value;
    const managementInterface = document.getElementById('managementInterface').value;
    const managementUrl = document.getElementById('managementUrl').value;
    const remoteUsername = document.getElementById('remoteUsername').value;
    const remotePassword = document.getElementById('remotePassword').value;
    const managementPort = document.getElementById('managementPort').value;
    
    clearDeviceLog();
    appendDeviceLog('Starting device registration');

    if (!deviceName || !deviceType || !deviceVendor) {
        appendDeviceLog('Validation error: missing required fields');
        alert('Please fill in all required fields (*)');
        return;
    }
    
    if (apiEnabled && (!apiUrl || !integrationType)) {
        appendDeviceLog('Validation error: API enabled but missing url/type');
        alert('Please fill in API URL and Integration Type when API integration is enabled');
        return;
    }
    
    const payload = {
        device_name: deviceName,
        device_type: deviceType,
        vendor: deviceVendor,
        device_model: deviceModel || null,
        device_firmware: deviceFirmware || null,
        mac_address: macAddress || null,
        api_enabled: apiEnabled,
        api_url: apiUrl || null,
        integration_type: integrationType || null,
        api_secret: apiSecret || null,
        billing_access: billingAccess,
        data_monitoring: dataMonitoring,
        auto_disconnect: autoDisconnect,
        bandwidth_limit: bandwidthLimit ? parseInt(bandwidthLimit) : null,
        data_limit_gb: dataLimitGb ? parseFloat(dataLimitGb) : null,
        management_interface: managementInterface || null,
        management_url: managementUrl || null,
        remote_username: remoteUsername || null,
        remote_password: remotePassword || null,
        management_port: managementPort ? parseInt(managementPort) : null
    };
    
    try {
        appendDeviceLog('Sending request to server...');
        const data = await fetchWithAuth(`${API_BASE_URL}/devices`, 'POST', payload);
        appendDeviceLog('Server responded successfully');
        let msg = '✅ Device registered successfully!';
        if (data.api_key) {
            msg += `\n\nYour API Key: ${data.api_key}\nPlease save this key, it won't be shown again!`;
        }
        alert(msg);
        document.querySelectorAll('[style*="position: fixed"]').forEach(el => el.remove());
        loadDevices();
    } catch (err) {
        appendDeviceLog('Error during registration: ' + (err.message || 'Unknown error'));
        alert('❌ Error registering device: ' + (err.message || 'Unknown error'));
        console.error(err);
    }
}

function updateAPIFields() {
    const apiEnabled = document.getElementById('apiEnabled').checked;
    const apiConfig = document.getElementById('apiConfig');
    if (apiConfig) {
        apiConfig.style.display = apiEnabled ? 'grid' : 'none';
    }
}

// Logging helpers for add device terminal
function appendDeviceLog(msg) {
    const term = document.getElementById('deviceLogTerminal');
    if (!term) return;
    const timestamp = new Date().toLocaleTimeString();
    term.textContent += `[${timestamp}] ${msg}\n`;
    term.scrollTop = term.scrollHeight;
}

function clearDeviceLog() {
    const term = document.getElementById('deviceLogTerminal');
    if (term) term.textContent = '';
}

function updateVendorInfo() {
    const vendorSelect = document.getElementById('deviceVendor');
    const vendor = vendorSelect.value;
    const vendorInfo = document.getElementById('vendorInfo');
    const intTypeSelect = document.getElementById('integrationType');
    
    if (!vendor) {
        if (vendorInfo) vendorInfo.textContent = '';
        appendDeviceLog('Vendor selection cleared');
        return;
    }
    
    appendDeviceLog(`Vendor selected: ${vendor}`);
    
    // Map vendor keys to display info
    const vendorDisplay = {
        'mikrotik': '🟢 MikroTik - REST/SSH/API port 8728',
        'meraki': '🔷 Cisco Meraki - REST/Cloud API',
        'cisco': '🔴 Cisco - SSH/SNMP/NETCONF',
        'defender': '🛡️ Microsoft Defender - REST/Azure',
        'other': '🟣 Other - Custom provisioning'
    };
    
    if (vendorInfo) {
        vendorInfo.textContent = vendorDisplay[vendor] || '';
    }
}

function updateManagementUrlHint() {
    const vendorSelect = document.getElementById('deviceVendor');
    const interfaceSelect = document.getElementById('managementInterface');
    const urlInput = document.getElementById('managementUrl');
    const ipInput = document.getElementById('ipAddress');
    const hintElement = document.getElementById('urlHint');
    
    const vendor = vendorSelect ? vendorSelect.value : '';
    const interfaceType = interfaceSelect ? interfaceSelect.value : '';
    const ip = ipInput ? ipInput.value || '{device-ip}' : '{device-ip}';
    
    const hints = {
        'mikrotik': {
            'winbox': `🟢 Winbox (MikroTik native): winbox://${ip}:8291 or just ${ip} in Winbox app`,
            'web_ui': `🌐 Web UI: https://${ip}:443 or http://${ip}:80`,
            'ssh': `🔒 SSH: ssh://admin@${ip}:22`,
            '': `Select Interface`
        },
        'meraki': {
            'cloud_portal': `☁️ Meraki Dashboard: https://dashboard.meraki.com (Cloud-based)`,
            'web_ui': `🌐 Local Web UI: https://${ip}:443`,
            '': `Select Interface`
        },
        'cisco': {
            'web_ui': `🌐 Cisco Web UI: https://${ip}:443`,
            'ssh': `🔒 SSH Console: ssh://admin@${ip}:22`,
            '': `Select Interface`
        },
        'defender': {
            'cloud_portal': `🛡️ Microsoft Defender Portal: https://security.microsoft.com`,
            '': `Select Interface`
        },
        'other': {
            'web_ui': `🌐 Web Interface: https://${ip}:443 or http://${ip}:80`,
            'ssh': `🔒 SSH Access: ssh://admin@${ip}:22`,
            '': `Select Interface`
        }
    };
    
    if (hintElement) {
        let hint = 'Select vendor and interface type for management URL hint';
        if (vendor && hints[vendor]) {
            hint = hints[vendor][interfaceType] || `Configure ${interfaceType} for ${vendor}`;
        }
        hintElement.textContent = hint;
        hintElement.style.color = vendor && interfaceType ? '#4caf50' : '#999';
    }
}

async function editDeviceAPI(deviceId) {
    try {
        // Fetch device details
        const deviceResponse = await fetchWithAuth(`${API_BASE_URL}/devices`);
        const devices = deviceResponse || [];
        const device = devices.find(d => d.id === deviceId);
        
        if (!device) {
            alert('Device not found');
            return;
        }
        
        // Fetch vendor list
        const vendorResponse = await fetch('/api/devices/vendors');
        const vendors = await vendorResponse.json() || [];
        const vendorOptions = vendors.map(v => `<option value="${v.vendor_key}" ${device.vendor === v.vendor_key ? 'selected' : ''}>${v.icon} ${v.name}</option>`).join('');
        
        const modal = `
            <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2001;" onclick="if(event.target === this) this.remove()">
                <div style="background: white; border-radius: 12px; padding: 24px; max-width: 600px; width: 95%; box-shadow: 0 10px 40px rgba(0,0,0,0.2); max-height: 90vh; overflow-y: auto;">
                    <h2 style="color: #333; margin: 0 0 20px 0; font-size: 22px;">⚙️ Configure Device API Integration</h2>
                    <p style="color: #666; font-size: 13px; margin: 0 0 20px 0;"><strong>Device:</strong> ${device.device_name} (${device.vendor})</p>
                    
                    <form id="editDeviceForm" style="display: grid; gap: 16px;">
                        <input type="hidden" id="editDeviceId" value="${deviceId}">
                        
                        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px;">
                            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; margin: 0;">
                                    <input type="checkbox" id="editApiEnabled" style="width: 18px; height: 18px; cursor: pointer;" ${device.api_enabled ? 'checked' : ''} onchange="updateEditAPIFields()">
                                    <span style="color: #333; font-size: 14px; font-weight: 600;">🔗 Enable API Integration</span>
                                </label>
                            </div>
                            
                            <div id="editApiConfig" style="display: ${device.api_enabled ? 'grid' : 'none'}; gap: 12px;">
                                <div>
                                    <label style="display: block; color: #666; font-size: 12px; font-weight: 600; margin-bottom: 6px;">API URL / Device Address</label>
                                    <input type="text" id="editApiUrl" value="${device.api_url || ''}" placeholder="e.g., https://192.168.1.1:8728" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; box-sizing: border-box;">
                                </div>
                                
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                    <div>
                                        <label style="display: block; color: #666; font-size: 12px; font-weight: 600; margin-bottom: 6px;">Integration Type</label>
                                        <select id="editIntegrationType" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; box-sizing: border-box;">
                                            <option value="rest" ${device.integration_type === 'rest' ? 'selected' : ''}>REST API</option>
                                            <option value="ssh" ${device.integration_type === 'ssh' ? 'selected' : ''}>SSH</option>
                                            <option value="snmp" ${device.integration_type === 'snmp' ? 'selected' : ''}>SNMP</option>
                                            <option value="netconf" ${device.integration_type === 'netconf' ? 'selected' : ''}>NETCONF</option>
                                            <option value="modbus" ${device.integration_type === 'modbus' ? 'selected' : ''}>Modbus</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style="display: block; color: #666; font-size: 12px; font-weight: 600; margin-bottom: 6px;">API Secret Key</label>
                                        <input type="password" id="editApiSecret" placeholder="Device API key or password" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; box-sizing: border-box;">
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px;">
                            <h3 style="color: #333; margin: 0 0 16px 0; font-size: 14px; font-weight: 600;">💰 Billing Access & Quota Management</h3>
                            
                            <div style="display: grid; gap: 12px; margin-bottom: 12px;">
                                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                    <input type="checkbox" id="editBillingAccess" style="width: 18px; height: 18px; cursor: pointer;" ${device.billing_access ? 'checked' : ''}>
                                    <span style="color: #333; font-size: 13px;">Allow billing system access</span>
                                </label>
                                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                    <input type="checkbox" id="editDataMonitoring" style="width: 18px; height: 18px; cursor: pointer;" ${device.data_monitoring ? 'checked' : ''}>
                                    <span style="color: #333; font-size: 13px;">Enable data monitoring</span>
                                </label>
                                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                    <input type="checkbox" id="editAutoDisconnect" style="width: 18px; height: 18px; cursor: pointer;" ${device.auto_disconnect ? 'checked' : ''}>
                                    <span style="color: #333; font-size: 13px;">Auto-disconnect when quota exceeded</span>
                                </label>
                            </div>
                            
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                <div>
                                    <label style="display: block; color: #666; font-size: 12px; font-weight: 600; margin-bottom: 6px;">Bandwidth Limit (Mbps)</label>
                                    <input type="number" id="editBandwidthLimit" value="${device.bandwidth_limit || ''}" placeholder="e.g., 10" min="0" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; box-sizing: border-box;">
                                </div>
                                <div>
                                    <label style="display: block; color: #666; font-size: 12px; font-weight: 600; margin-bottom: 6px;">Data Limit (GB)</label>
                                    <input type="number" id="editDataLimitGb" value="${device.data_limit_gb || ''}" placeholder="e.g., 100" min="0" step="0.1" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; box-sizing: border-box;">
                                </div>
                            </div>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <button type="button" onclick="this.parentElement.parentElement.parentElement.parentElement.remove()" style="background: #f5f5f5; border: 1px solid #ddd; color: #333; padding: 12px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">Cancel</button>
                            <button type="submit" style="background: #00D084; border: none; color: white; padding: 12px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">Save Configuration</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modal);
        
        const form = document.getElementById('editDeviceForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveDeviceConfiguration(deviceId);
        });
        
        updateEditAPIFields();
    } catch (error) {
        alert('Error loading device configuration: ' + error.message);
        console.error(error);
    }
}

function updateEditAPIFields() {
    const apiEnabled = document.getElementById('editApiEnabled').checked;
    const apiConfig = document.getElementById('editApiConfig');
    if (apiConfig) {
        apiConfig.style.display = apiEnabled ? 'grid' : 'none';
    }
}

async function saveDeviceConfiguration(deviceId) {
    const apiEnabled = document.getElementById('editApiEnabled').checked;
    const apiUrl = document.getElementById('editApiUrl').value;
    const integrationType = document.getElementById('editIntegrationType').value;
    const apiSecret = document.getElementById('editApiSecret').value;
    const billingAccess = document.getElementById('editBillingAccess').checked;
    const dataMonitoring = document.getElementById('editDataMonitoring').checked;
    const autoDisconnect = document.getElementById('editAutoDisconnect').checked;
    const bandwidthLimit = document.getElementById('editBandwidthLimit').value;
    const dataLimitGb = document.getElementById('editDataLimitGb').value;
    
    const payload = {
        api_enabled: apiEnabled,
        api_url: apiUrl || null,
        integration_type: integrationType || null,
        api_secret: apiSecret || null,
        billing_access: billingAccess,
        data_monitoring: dataMonitoring,
        auto_disconnect: autoDisconnect,
        bandwidth_limit: bandwidthLimit ? parseInt(bandwidthLimit) : null,
        data_limit_gb: dataLimitGb ? parseFloat(dataLimitGb) : null
    };
    
    try {
        const data = await fetchWithAuth(`${API_BASE_URL}/devices/${deviceId}/api-integration`, 'PUT', payload);
        alert('✅ Configuration saved successfully!');
        document.querySelectorAll('[style*="position: fixed"]').forEach(el => el.remove());
        loadDevices();
    } catch (err) {
        alert('❌ Error saving configuration: ' + (err.message || 'Unknown error'));
        console.error(err);
    }
}

async function deleteDevice(deviceId) {
    if (!confirm('⚠️ Are you sure you want to delete this device? This action cannot be undone.')) {
        return;
    }
    
    try {
        await fetchWithAuth(`${API_BASE_URL}/devices/${deviceId}`, 'DELETE');
        alert('✅ Device deleted successfully!');
        loadDevices();
    } catch (err) {
        alert('❌ Error deleting device: ' + (err.message || 'Unknown error'));
        console.error(err);
    }
}

async function viewDeviceDetails(deviceId) {
    try {
        const device = await fetchWithAuth(`${API_BASE_URL}/devices/${deviceId}`, 'GET');
        
        const provisioningStatusColor = {
            'pending': '#ff9800',
            'in_progress': '#2196f3',
            'configured': '#4caf50',
            'failed': '#f44336',
            'deprovisioning': '#ff5722'
        }[device.provisioning_status] || '#999';
        
        const usageBar = device.data_limit_gb 
            ? `<div style="background: #e0e0e0; border-radius: 10px; height: 8px; overflow: hidden;">
                 <div style="background: linear-gradient(90deg, #4caf50, #ff9800, #f44336); height: 100%; width: ${Math.min(device.data_usage_percent, 100)}%;"></div>
               </div>
               <p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">${device.used_data_gb.toFixed(2)} GB / ${device.data_limit_gb} GB (${device.data_usage_percent.toFixed(1)}%)</p>`
            : '<p style="color: #999; font-size: 12px;">Unlimited</p>';
        
        const apiKeysHtml = device.api_keys && device.api_keys.length > 0
            ? device.api_keys.map(key => `
                <div style="background: #f5f5f5; padding: 12px; border-radius: 6px; margin: 8px 0; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <p style="margin: 0; font-weight: 600; font-size: 13px; color: #333;">${key.key_name}</p>
                        <p style="margin: 4px 0 0 0; font-size: 11px; color: #999;">Type: ${key.key_type} | Scope: ${key.scope} | ${key.is_active ? '✅ Active' : '❌ Inactive'}</p>
                        ${key.last_used_at ? `<p style="margin: 4px 0 0 0; font-size: 11px; color: #999;">Last used: ${new Date(key.last_used_at).toLocaleDateString()}</p>` : '<p style="margin: 4px 0 0 0; font-size: 11px; color: #999;">Never used</p>'}
                    </div>
                    <button onclick="deleteAPIKey('${deviceId}', '${key.id}')" style="padding: 6px 12px; border-radius: 4px; background: #f44336; color: white; border: none; cursor: pointer; font-size: 11px;">Delete</button>
                </div>
            `).join('')
            : '<p style="color: #999; font-size: 12px;">No API keys created yet</p>';
        
        const modal = `
            <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2001;" onclick="if(event.target === this) this.remove()">
                <div style="background: white; border-radius: 12px; padding: 24px; max-width: 700px; width: 95%; box-shadow: 0 10px 40px rgba(0,0,0,0.2); max-height: 90vh; overflow-y: auto;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h2 style="color: #333; margin: 0; font-size: 22px;">📊 Device Details</h2>
                        <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #999;">×</button>
                    </div>
                    
                    <!-- Device Information Section -->
                    <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                        <h3 style="color: #333; margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">🖥️ Device Information</h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px;">
                            <div><strong>Name:</strong> ${device.device_name}</div>
                            <div><strong>Vendor:</strong> ${device.vendor}</div>
                            <div><strong>Type:</strong> ${device.device_type}</div>
                            <div><strong>Model:</strong> ${device.device_model || 'N/A'}</div>
                            <div><strong>Firmware:</strong> ${device.device_firmware || 'N/A'}</div>
                            <div><strong>IP Address:</strong> <span style="font-family: monospace; background: #e0e0e0; padding: 2px 6px; border-radius: 3px;">${device.ip_address || 'N/A'}</span></div>
                            <div><strong>Status:</strong> ${device.is_online ? '✅ Online' : '❌ Offline'}</div>
                            <div><strong>Last Seen:</strong> ${device.last_seen ? new Date(device.last_seen).toLocaleDateString() : 'N/A'}</div>
                        </div>
                    </div>
                    
                    <!-- Data Usage Section -->
                    <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                        <h3 style="color: #333; margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">📊 Data Usage & Quota</h3>
                        <div>
                            <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #333;">Current Usage:</p>
                            ${usageBar}
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; font-size: 13px;">
                            <div><strong>Used (Current):</strong> ${device.used_data_gb.toFixed(2)} GB</div>
                            <div><strong>Total Used:</strong> ${device.total_used_data_gb.toFixed(2)} GB</div>
                            <div><strong>Data Limit:</strong> ${device.data_limit_gb ? device.data_limit_gb + ' GB' : 'Unlimited'}</div>
                            <div><strong>Last Sync:</strong> ${device.last_data_sync ? new Date(device.last_data_sync).toLocaleDateString() + ' ' + new Date(device.last_data_sync).toLocaleTimeString() : 'Never'}</div>
                        </div>
                    </div>
                    
                    <!-- Provisioning Status Section -->
                    <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                        <h3 style="color: #333; margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">⚙️ Provisioning Status</h3>
                        <div>
                            <p style="margin: 0; font-size: 13px;">
                                <strong>Status:</strong> 
                                <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; background: ${provisioningStatusColor}; color: white;">
                                    ${device.provisioning_status.toUpperCase()}
                                </span>
                            </p>
                        </div>
                        ${device.provisioning_started_at ? `<p style="margin: 8px 0 0 0; font-size: 12px; color: #666;">Started: ${new Date(device.provisioning_started_at).toLocaleString()}</p>` : ''}
                        ${device.provisioning_completed_at ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">Completed: ${new Date(device.provisioning_completed_at).toLocaleString()}</p>` : ''}
                        ${device.provisioning_error ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #f44336;"><strong>Error:</strong> ${device.provisioning_error}</p>` : ''}
                    </div>
                    
                    <!-- API Keys Section -->
                    <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                            <h3 style="color: #333; margin: 0; font-size: 14px; font-weight: 600;">🔑 API Keys</h3>
                            <button onclick="showCreateAPIKeyModal('${deviceId}')" style="padding: 6px 12px; border-radius: 4px; background: #4caf50; color: white; border: none; cursor: pointer; font-size: 11px; font-weight: 600;">+ New Key</button>
                        </div>
                        ${apiKeysHtml}
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background: #f5f5f5; border: 1px solid #ddd; color: #333; padding: 12px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">Close</button>
                        <button onclick="editDeviceAPI('${deviceId}'); this.parentElement.parentElement.parentElement.remove();" style="background: #2196f3; border: none; color: white; padding: 12px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">Config API</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modal);
    } catch (err) {
        alert('❌ Error loading device details: ' + (err.message || 'Unknown error'));
        console.error(err);
    }
}

function showCreateAPIKeyModal(deviceId) {
    const modal = `
        <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2002;" onclick="if(event.target === this) this.remove()">
            <div style="background: white; border-radius: 12px; padding: 24px; max-width: 500px; width: 95%; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="color: #333; margin: 0; font-size: 22px;">🔑 Create API Key</h2>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #999;">×</button>
                </div>
                
                <form id="createAPIKeyForm" style="display: grid; gap: 16px;">
                    <div>
                        <label style="display: block; color: #666; font-size: 12px; font-weight: 600; margin-bottom: 6px;">Key Name *</label>
                        <input type="text" id="keyName" placeholder="e.g., Production Key, Backup API" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;" required>
                    </div>
                    
                    <div>
                        <label style="display: block; color: #666; font-size: 12px; font-weight: 600; margin-bottom: 6px;">Key Type</label>
                        <select id="keyType" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
                            <option value="primary">Primary</option>
                            <option value="secondary">Secondary</option>
                            <option value="backup">Backup</option>
                            <option value="webhook">Webhook</option>
                        </select>
                    </div>
                    
                    <div>
                        <label style="display: block; color: #666; font-size: 12px; font-weight: 600; margin-bottom: 6px;">Permissions</label>
                        <select id="keyScope" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
                            <option value="all">Full Access</option>
                            <option value="read-only">Read Only</option>
                            <option value="billing-only">Billing Only</option>
                        </select>
                    </div>
                    
                    <div>
                        <label style="display: block; color: #666; font-size: 12px; font-weight: 600; margin-bottom: 6px;">Description (Optional)</label>
                        <textarea id="keyDescription" placeholder="Notes about this API key..." style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; resize: vertical; min-height: 60px;"></textarea>
                    </div>
                    
                    <div style="background: #fff3cd; padding: 12px; border-radius: 6px; border-left: 4px solid #ffc107;">
                        <p style="margin: 0; color: #856404; font-size: 12px;"><strong>⚠️ Important:</strong> Save your API key immediately. You won't be able to see it again!</p>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <button type="button" onclick="this.parentElement.parentElement.parentElement.remove()" style="background: #f5f5f5; border: 1px solid #ddd; color: #333; padding: 12px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">Cancel</button>
                        <button type="submit" style="background: #4caf50; border: none; color: white; padding: 12px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">Create Key</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modal);
    
    document.getElementById('createAPIKeyForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await createNewAPIKey(deviceId);
    });
}

async function createNewAPIKey(deviceId) {
    const keyName = document.getElementById('keyName').value;
    const keyType = document.getElementById('keyType').value;
    const keyScope = document.getElementById('keyScope').value;
    const keyDescription = document.getElementById('keyDescription').value;
    
    if (!keyName) {
        alert('Please enter a key name');
        return;
    }
    
    try {
        const data = await fetchWithAuth(`${API_BASE_URL}/devices/${deviceId}/api-keys`, 'POST', {
            key_name: keyName,
            key_type: keyType,
            scope: keyScope,
            description: keyDescription || null
        });
        
        // Show the API key only once
        const keyDisplayModal = `
            <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2003;">
                <div style="background: white; border-radius: 12px; padding: 24px; max-width: 500px; width: 95%; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
                    <h2 style="color: #333; margin: 0 0 20px 0; font-size: 22px;">✅ API Key Created</h2>
                    
                    <div style="background: #e8f5e9; border-left: 4px solid #4caf50; padding: 12px; border-radius: 6px; margin-bottom: 20px;">
                        <p style="margin: 0; color: #2e7d32; font-size: 14px; font-weight: 600;">⚠️ This is your only chance to save this key!</p>
                    </div>
                    
                    <div style="background: #f5f5f5; padding: 16px; border-radius: 6px; margin-bottom: 20px; border: 1px solid #ddd;">
                        <p style="margin: 0 0 8px 0; font-size: 12px; color: #999; font-weight: 600;">API KEY:</p>
                        <div style="background: white; padding: 12px; border-radius: 4px; font-family: monospace; font-size: 12px; word-break: break-all; border: 1px solid #ddd; color: #333;">
                            ${data.api_key}
                        </div>
                        <button onclick="navigator.clipboard.writeText('${data.api_key}'); alert('Copied to clipboard!');" style="margin-top: 8px; padding: 8px 16px; background: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; width: 100%;">📋 Copy to Clipboard</button>
                    </div>
                    
                    <button onclick="document.querySelectorAll('[style*=\"position: fixed\"]').forEach(el => el.remove()); viewDeviceDetails('${deviceId}');" style="width: 100%; padding: 12px 20px; background: #4caf50; border: none; color: white; border-radius: 6px; cursor: pointer; font-weight: 600;">Done - Back to Device</button>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', keyDisplayModal);
    } catch (err) {
        alert('❌ Error creating API key: ' + (err.message || 'Unknown error'));
        console.error(err);
    }
}

async function deleteAPIKey(deviceId, keyId) {
    if (!confirm('⚠️ Are you sure you want to delete this API key? Any applications using it will stop working.')) {
        return;
    }
    
    try {
        await fetchWithAuth(`${API_BASE_URL}/devices/${deviceId}/api-keys/${keyId}`, 'DELETE');
        alert('✅ API key deleted successfully!');
        viewDeviceDetails(deviceId);
        document.querySelectorAll('[style*="position: fixed"]').forEach(el => el.remove());
    } catch (err) {
        alert('❌ Error deleting API key: ' + (err.message || 'Unknown error'));
        console.error(err);
    }
}

function loadEquipment() {
    markActive('equipment');
    console.log('Loading equipment page...');
}

function loadReports() {
    markActive('reports');
    console.log('Loading reports page...');
}

function loadFinance() {
    markActive('finance');
    console.log('Loading finance page...');
    showModal('Finance', 'Finance overview and controls', ['View financial statements', 'Export transactions (CSV)', 'Manage budgets and forecasts']);
}

// Toggle Finance submenu in the sidebar
function toggleFinanceMenu(event) {
    event.preventDefault();
    const submenu = document.getElementById('financeSubmenu');
    if (!submenu) return;
    submenu.style.display = (submenu.style.display === 'none' || submenu.style.display === '') ? 'block' : 'none';
}

// Toggle Client Activity submenu in the sidebar
function toggleClientActivityMenu(event) {
    event.preventDefault();
    const submenu = document.getElementById('clientActivitySubmenu');
    if (!submenu) return;
    submenu.style.display = (submenu.style.display === 'none' || submenu.style.display === '') ? 'block' : 'none';
}

function loadFinanceInvoices() {
    markActive('finance-invoices');
    console.log('Loading Finance -> Invoices');
    showModal('Invoices', 'List and manage invoices', ['Create invoice', 'View unpaid', 'Send reminder']);
}

function loadFinancePayments() {
    markActive('finance-payments');
    console.log('Loading Finance -> Payment Logs');
    showPaymentLogsModal();
}

function loadFinanceWithdraws() {
    markActive('finance-withdraws');
    console.log('Loading Finance -> Withdraws');
    showModal('Withdraws', 'Manage withdrawals and payouts', ['Approve withdrawals', 'View pending', 'Export report']);
}

function loadFinanceChartOfAccounts() {
    markActive('finance-chart');
    console.log('Loading Finance -> Account Index');
    showAccountIndexModal();
}

// show account index modal and fetch unbanked/banked summary
function showAccountIndexModal() {
    const modal = document.getElementById('accountIndexModal');
    if (!modal) return;
    modal.style.display = 'flex';
    showAccountTab('overview'); // default to overview and load its data
}

function loadAccountData(tabName) {
    const contentDiv = document.getElementById(`tab-content-${tabName}`);
    if (contentDiv.dataset.loaded === 'true') return; // Already loaded

    if (tabName === 'overview') {
        // Populate overview table
        let overviewHtml = `
            <table style="width:100%; border-collapse:collapse;">
                <thead style="background:#f5f5f5; position:sticky; top:0;">
                    <tr>
                        <th style="padding:10px; text-align:left; border-bottom:1px solid #ddd;">Name</th>
                        <th style="padding:10px; text-align:left; border-bottom:1px solid #ddd;">Source</th>
                        <th style="padding:10px; text-align:left; border-bottom:1px solid #ddd;">Type</th>
                        <th style="padding:10px; text-align:right; border-bottom:1px solid #ddd;">Balance</th>
                        <th style="padding:10px; text-align:center; border-bottom:1px solid #ddd;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="border-bottom:1px solid #eee;">
                        <td style="padding:10px;"><strong>Banked Funds</strong></td>
                        <td style="padding:10px;">Mobile Money</td>
                        <td style="padding:10px;"><span style="background:#f0fff9; color:#00D084; padding:4px 8px; border-radius:4px; font-size:12px;">Cash</span></td>
                        <td style="padding:10px; text-align:right;" id="overviewBankedAmount">UGX 0.00</td>
                        <td style="padding:10px; text-align:center;"><span style="background:#e8f5e9; color:#4caf50; padding:4px 8px; border-radius:4px; font-size:12px;">✓ Active</span></td>
                    </tr>
                    <tr style="border-bottom:1px solid #eee;">
                        <td style="padding:10px;"><strong>Unbanked Funds</strong></td>
                        <td style="padding:10px;">Vouchers</td>
                        <td style="padding:10px;"><span style="background:#fff3e0; color:#00D084; padding:4px 8px; border-radius:4px; font-size:12px;">Cash</span></td>
                        <td style="padding:10px; text-align:right;" id="overviewUnbankedAmount">UGX 0.00</td>
                        <td style="padding:10px; text-align:center;"><span style="background:#e8f5e9; color:#4caf50; padding:4px 8px; border-radius:4px; font-size:12px;">✓ Active</span></td>
                    </tr>
                </tbody>
            </table>
        `;
        contentDiv.innerHTML = overviewHtml;
        contentDiv.dataset.loaded = 'true';

        // Fetch actual data and update
        fetch(`${API_BASE_URL}/finance/payments/summary?days=30`)
            .then(r => r.json())
            .then(data => {
                // Update summary cards
                document.getElementById('bankedTotal').textContent = formatCurrency(data.banked?.total || 0);
                document.getElementById('unbankedTotal').textContent = formatCurrency(data.unbanked?.total || 0);
                
                // Update overview table
                document.getElementById('overviewBankedAmount').textContent = formatCurrency(data.banked?.total || 0);
                document.getElementById('overviewUnbankedAmount').textContent = formatCurrency(data.unbanked?.total || 0);
            })
            .catch(err => console.error('Account data fetch error', err));
    } else if (tabName === 'banked') {
        // Populate banked funds table
        let bankedHtml = `
            <table style="width:100%; border-collapse:collapse;">
                <thead style="background:#f5f5f5; position:sticky; top:0;">
                    <tr>
                        <th style="padding:10px; text-align:left; border-bottom:1px solid #ddd;">Payment Source</th>
                        <th style="padding:10px; text-align:left; border-bottom:1px solid #ddd;">Channel</th>
                        <th style="padding:10px; text-align:left; border-bottom:1px solid #ddd;">Type</th>
                        <th style="padding:10px; text-align:right; border-bottom:1px solid #ddd;">Total Amount</th>
                    </tr>
                </thead>
                <tbody id="bankedTableBody">
                    <tr style="border-bottom:1px solid #eee;">
                        <td colspan="4" style="padding:10px; text-align:center; color:#999;">Loading...</td>
                    </tr>
                </tbody>
            </table>
        `;
        contentDiv.innerHTML = bankedHtml;
        contentDiv.dataset.loaded = 'true';

        // Fetch banked data
        fetch(`${API_BASE_URL}/finance/payments/summary?days=30`)
            .then(r => r.json())
            .then(data => {
                let tableRows = '';
                const bankedMethods = ['MobileMoneyPayments', 'MobileMoneyGateway', 'Bank Transfer'];
                
                for (const method of bankedMethods) {
                    const stats = data.by_method?.[method] || { total: 0, count: 0 };
                    if (stats.count > 0) {
                        tableRows += `
                            <tr style="border-bottom:1px solid #eee;">
                                <td style="padding:10px;"><strong>${method}</strong></td>
                                <td style="padding:10px;"><span style="background:#f0fff9; padding:4px 8px; border-radius:4px; font-size:12px;">Mobile Money</span></td>
                                <td style="padding:10px;">Cash</td>
                                <td style="padding:10px; text-align:right; font-weight:bold;">${formatCurrency(stats.total)}</td>
                            </tr>
                        `;
                    }
                }
                
                if (!tableRows) {
                    tableRows = '<tr><td colspan="4" style="padding:10px; text-align:center; color:#999;">No banked funds recorded</td></tr>';
                }
                
                document.getElementById('bankedTableBody').innerHTML = tableRows;
            })
            .catch(err => {
                console.error('Banked data fetch error', err);
                document.getElementById('bankedTableBody').innerHTML = '<tr><td colspan="4" style="padding:10px; color:red;">Failed to load data</td></tr>';
            });
    } else if (tabName === 'unbanked') {
        // Populate unbanked funds table
        let unbankedHtml = `
            <table style="width:100%; border-collapse:collapse;">
                <thead style="background:#f5f5f5; position:sticky; top:0;">
                    <tr>
                        <th style="padding:10px; text-align:left; border-bottom:1px solid #ddd;">Voucher Source</th>
                        <th style="padding:10px; text-align:left; border-bottom:1px solid #ddd;">Channel</th>
                        <th style="padding:10px; text-align:left; border-bottom:1px solid #ddd;">Type</th>
                        <th style="padding:10px; text-align:right; border-bottom:1px solid #ddd;">Total Amount</th>
                    </tr>
                </thead>
                <tbody id="unbankedTableBody">
                    <tr style="border-bottom:1px solid #eee;">
                        <td colspan="4" style="padding:10px; text-align:center; color:#999;">Loading...</td>
                    </tr>
                </tbody>
            </table>
        `;
        contentDiv.innerHTML = unbankedHtml;
        contentDiv.dataset.loaded = 'true';

        // Fetch unbanked data
        fetch(`${API_BASE_URL}/finance/payments/summary?days=30`)
            .then(r => r.json())
            .then(data => {
                let tableRows = '';
                const unbankedMethods = ['Voucher', 'Cash', 'Manual'];
                
                for (const method of unbankedMethods) {
                    const stats = data.by_method?.[method] || { total: 0, count: 0 };
                    if (stats.count > 0) {
                        tableRows += `
                            <tr style="border-bottom:1px solid #eee;">
                                <td style="padding:10px;"><strong>${method}</strong></td>
                                <td style="padding:10px;"><span style="background:#fff3e0; padding:4px 8px; border-radius:4px; font-size:12px;">Voucher</span></td>
                                <td style="padding:10px;">Cash</td>
                                <td style="padding:10px; text-align:right; font-weight:bold;">${formatCurrency(stats.total)}</td>
                            </tr>
                        `;
                    }
                }
                
                if (!tableRows) {
                    tableRows = '<tr><td colspan="4" style="padding:10px; text-align:center; color:#999;">No unbanked funds recorded</td></tr>';
                }
                
                document.getElementById('unbankedTableBody').innerHTML = tableRows;
            })
            .catch(err => {
                console.error('Unbanked data fetch error', err);
                document.getElementById('unbankedTableBody').innerHTML = '<tr><td colspan="4" style="padding:10px; color:red;">Failed to load data</td></tr>';
            });
    }
}

function showAccountTab(tabName) {
    // Hide all tab contents
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(c => c.style.display = 'none');

    // Reset all tab styles
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(t => t.style.borderBottom = 'none');

    // Show selected tab content and mark tab as active
    const tabContent = document.getElementById(`tab-content-${tabName}`);
    if (tabContent) tabContent.style.display = 'block';
    
    const tabBtn = document.getElementById(`tab-${tabName}`);
    if (tabBtn) tabBtn.style.borderBottom = '3px solid #00D084';

    // Load data for the tab if not already loaded
    loadAccountData(tabName);
}

function closeAccountIndexModal() {
    const modal = document.getElementById('accountIndexModal');
    if (modal) modal.style.display = 'none';
}

// Export Account Index data to CSV
function exportAccountIndexCSV() {
    const bankedTotal = document.getElementById('bankedTotal')?.textContent || 'UGX 0.00';
    const unbankedTotal = document.getElementById('unbankedTotal')?.textContent || 'UGX 0.00';
    
    let csv = 'Account Index Report\n';
    csv += 'Generated on: ' + new Date().toLocaleString() + '\n\n';
    csv += 'Fund Classification,Source,Type,Balance\n';
    csv += `Banked Funds,Mobile Money,Cash,${bankedTotal}\n`;
    csv += `Unbanked Funds,Vouchers,Cash,${unbankedTotal}\n`;
    
    // Trigger download
    const link = document.createElement('a');
    link.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    link.download = 'account-index-' + new Date().getTime() + '.csv';
    link.click();
}

// Access Control submenu toggle and handlers
function toggleAccessMenu(event) {
    event.preventDefault();
    const submenu = document.getElementById('accessSubmenu');
    if (!submenu) return;
    submenu.style.display = (submenu.style.display === 'none' || submenu.style.display === '') ? 'block' : 'none';
}

// Equipment submenu toggle
function toggleEquipmentMenu(event) {
    event.preventDefault();
    const submenu = document.getElementById('equipmentSubmenu');
    if (!submenu) return;
    submenu.style.display = (submenu.style.display === 'none' || submenu.style.display === '') ? 'block' : 'none';
}

function loadAccessRoles() {
    markActive('access-roles');
    console.log('Loading Access Control -> Roles');
    showModal('Roles', 'Manage user roles and their capabilities', ['Create role', 'Edit role', 'Assign role to users']);
}

function loadAccessPermissions() {
    markActive('access-permissions');
    console.log('Loading Access Control -> Permissions');
    showModal('Permissions', 'Define granular permissions for features', ['Create permission', 'Assign to role', 'Audit usage']);
}

function loadAccessUsers() {
    markActive('access-users');
    console.log('Loading Access Control -> System Users');
    showModal('System Users', 'Manage system users and access', ['Add user', 'Set roles & permissions', 'Deactivate user']);
}

// IP Binding tool: add/list/delete saved IP bindings (stored in localStorage)
function loadAccessIPBinding() {
    markActive('access-ipbinding');
    console.log('Loading Access Control -> IP Binding');
    showIPBindingModal();
}

function showIPBindingModal() {
    const modalId = 'ipBindingModal';
    // remove existing modal if present
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const html = `
        <div id="${modalId}" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:2000;">
            <div style="background:#fff; border-radius:8px; width:900px; max-width:95%; padding:18px; box-shadow:0 10px 30px rgba(0,0,0,0.2);">
                <h2 style="margin:0 0 8px 0;">IP & MAC Address Binding</h2>
                <p style="color:#666; margin:0 0 12px 0;">Bind IP addresses, CIDR ranges, and MAC addresses to users/roles for access control.</p>

                <div style="display:flex; gap:10px; margin-bottom:12px; flex-wrap:wrap;">
                    <input id="ipBindLabel" placeholder="Label (e.g., Office-WiFi)" style="flex:1; min-width:150px; padding:8px; border:1px solid #e6e6e6; border-radius:6px;">
                    <input id="ipBindValue" placeholder="IP or CIDR (e.g., 192.168.1.0/24)" style="flex:1; min-width:200px; padding:8px; border:1px solid #e6e6e6; border-radius:6px;">
                    <input id="ipBindMAC" placeholder="MAC (e.g., 00:1A:2B:3C:4D:5E)" style="flex:1; min-width:180px; padding:8px; border:1px solid #e6e6e6; border-radius:6px;">
                    <input id="ipBindSubject" placeholder="User or Role" style="flex:1; min-width:150px; padding:8px; border:1px solid #e6e6e6; border-radius:6px;">
                    <button id="addIpBindBtn" style="background:#00D084; color:#fff; border:none; padding:8px 12px; border-radius:6px; cursor:pointer; white-space:nowrap;">Add</button>
                </div>

                <div style="max-height:380px; overflow:auto; border:1px solid #f0f0f0; padding:10px; border-radius:6px; background:#fafafa;" id="ipBindingsList"></div>

                <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:12px;">
                    <button id="closeIpBindModal" style="background:#e0e0e0; border:none; padding:8px 12px; border-radius:6px; cursor:pointer;">Close</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);

    // Wire events
    document.getElementById('closeIpBindModal').addEventListener('click', function () {
        const m = document.getElementById(modalId); if (m) m.remove();
    });

    document.getElementById('addIpBindBtn').addEventListener('click', function () {
        const label = document.getElementById('ipBindLabel').value.trim();
        const ipValue = document.getElementById('ipBindValue').value.trim();
        const macValue = document.getElementById('ipBindMAC').value.trim();
        const subject = document.getElementById('ipBindSubject').value.trim();
        if (!ipValue && !macValue) { alert('Please enter at least an IP address or MAC address.'); return; }
        const bindings = getIpBindings();
        bindings.push({ label: label || (ipValue || macValue), ipValue: ipValue || '', macValue: macValue || '', subject: subject || '', created: Date.now() });
        saveIpBindings(bindings);
        renderIpBindings();
        document.getElementById('ipBindValue').value = '';
        document.getElementById('ipBindMAC').value = '';
        document.getElementById('ipBindLabel').value = '';
        document.getElementById('ipBindSubject').value = '';
    });

    // initial render
    renderIpBindings();
}

function getIpBindings() {
    try {
        const raw = localStorage.getItem('access.ipBindings');
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.warn('Failed to parse ip bindings', e);
        return [];
    }
}

function saveIpBindings(arr) {
    try { localStorage.setItem('access.ipBindings', JSON.stringify(arr)); } catch (e) { console.warn('Failed to save ip bindings', e); }
}

function renderIpBindings() {
    const container = document.getElementById('ipBindingsList');
    if (!container) return;
    const bindings = getIpBindings();
    if (!bindings.length) { container.innerHTML = '<div style="color:#666;">No IP/MAC bindings configured.</div>'; return; }

    container.innerHTML = bindings.map((b, idx) => {
        const label = b.label || (b.ipValue || b.macValue || 'Unknown');
        const ipLine = b.ipValue ? `<div style="color:#333; margin:2px 0;"><strong>IP:</strong> ${escapeHtml(b.ipValue)}</div>` : '';
        const macLine = b.macValue ? `<div style="color:#333; margin:2px 0;"><strong>MAC:</strong> ${escapeHtml(b.macValue)}</div>` : '';
        const sub = b.subject ? `<div style="color:#777; font-size:12px; margin-top:4px;"><strong>Subject:</strong> ${escapeHtml(b.subject)}</div>` : '';
        return `
            <div style="display:flex; align-items:center; justify-content:space-between; padding:10px; border-bottom:1px solid #eee; background:#fff;">
                <div style="flex:1;">
                    <div style="font-weight:600; margin-bottom:4px;">${escapeHtml(label)}</div>
                    ${ipLine}
                    ${macLine}
                    ${sub}
                </div>
                <div style="margin-left:12px;">
                    <button data-idx="${idx}" class="deleteIpBind" style="background:#ff6b6b; color:#fff; border:none; padding:6px 10px; border-radius:6px; cursor:pointer; white-space:nowrap;">Delete</button>
                </div>
            </div>
        `;
    }).join('');

    // attach delete handlers
    Array.from(container.querySelectorAll('.deleteIpBind')).forEach(btn => {
        btn.addEventListener('click', function () {
            const idx = parseInt(this.getAttribute('data-idx'));
            const bindings = getIpBindings();
            if (isNaN(idx) || idx < 0 || idx >= bindings.length) return;
            if (!confirm('Delete this binding?')) return;
            bindings.splice(idx, 1);
            saveIpBindings(bindings);
            renderIpBindings();
        });
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function (s) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]); });
}

// Settings Dropdown Toggle
function toggleSettings() {
    const settingsMenu = document.getElementById('settingsMenu');
    if (settingsMenu) {
        settingsMenu.classList.toggle('show');
    }
}

// Close settings menu when clicking outside
document.addEventListener('click', function(event) {
    const settingsDropdown = document.querySelector('.settings-dropdown');
    const settingsMenu = document.getElementById('settingsMenu');
    
    if (settingsDropdown && !settingsDropdown.contains(event.target) && settingsMenu) {
        settingsMenu.classList.remove('show');
    }
});

// Settings Page Functions
function open2FA() {
    closeSettingsMenu();
    console.log('Opening 2FA Settings...');
    show2FAModal();
}

function show2FAModal() {
    const modalId = '2faModal';
    // remove existing modal if present
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    // Load stored 2FA settings
    const twoFASettings = get2FASettings();
    const smsEnabled = twoFASettings.smsEnabled;
    const phoneNumber = twoFASettings.phoneNumber || '';
    const googleAuthSecret = twoFASettings.googleAuthSecret || generateSecret();

    const html = `
        <div id="${modalId}" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:2000;">
            <div style="background:#fff; border-radius:8px; width:700px; max-width:95%; padding:20px; box-shadow:0 10px 30px rgba(0,0,0,0.2);">
                <h2 style="margin:0 0 8px 0;">Two-Factor Authentication (2FA)</h2>
                <p style="color:#666; margin:0 0 20px 0;">Enable extra security with Google Authenticator or SMS verification.</p>

                <!-- Google Authenticator Section -->
                <div style="border:1px solid #f0f0f0; border-radius:8px; padding:12px; margin-bottom:16px; background:#fafafa;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                        <h3 style="margin:0;">Google Authenticator</h3>
                        <input type="checkbox" id="googleAuthToggle" ${twoFASettings.googleAuthEnabled ? 'checked' : ''} style="cursor:pointer; width:18px; height:18px;">
                    </div>
                    <div id="googleAuthContent" style="display:${twoFASettings.googleAuthEnabled ? 'block' : 'none'}; background:#fff; padding:12px; border-radius:6px;">
                        <p style="color:#666; font-size:13px; margin:0 0 10px 0;">Add this secret to your authenticator app:</p>
                        <div style="background:#f5f5f5; padding:10px; border-radius:4px; font-family:monospace; word-break:break-all; margin-bottom:10px; font-size:12px;">
                            ${escapeHtml(googleAuthSecret)}
                        </div>
                        <p style="color:#666; font-size:12px; margin:0 0 6px 0;"><strong>QR Code:</strong> Scan in your authenticator app (e.g., Google Authenticator, Microsoft Authenticator, Authy)</p>
                        <p style="color:#999; font-size:11px; margin:0;">Note: Save your secret in a secure location.</p>
                    </div>
                </div>

                <!-- SMS Section -->
                <div style="border:1px solid #f0f0f0; border-radius:8px; padding:12px; margin-bottom:16px; background:#fafafa;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                        <h3 style="margin:0;">SMS Verification</h3>
                        <input type="checkbox" id="smsToggle" ${smsEnabled ? 'checked' : ''} style="cursor:pointer; width:18px; height:18px;">
                    </div>
                    <div id="smsContent" style="display:${smsEnabled ? 'block' : 'none'}; background:#fff; padding:12px; border-radius:6px;">
                        <label style="display:block; font-weight:600; margin-bottom:6px;">Phone Number for SMS Verification</label>
                        <input type="tel" id="phoneNumberInput" value="${escapeHtml(phoneNumber)}" placeholder="+256123456789" style="width:100%; padding:10px; border:1px solid #e6e6e6; border-radius:6px; box-sizing:border-box;">
                        <p style="color:#666; font-size:12px; margin:8px 0 0 0;">Include country code (e.g., +256 for Uganda)</p>
                    </div>
                </div>

                <!-- Status -->
                <div style="background:#f0f7ff; border-left:4px solid #1e88e5; padding:10px; border-radius:4px; margin-bottom:16px;">
                    <p style="margin:0; color:#333; font-size:13px;">
                        <strong>Active:</strong>
                        <span id="twoFAStatus">${(twoFASettings.googleAuthEnabled || smsEnabled) ? '✓ 2FA Enabled' : '✗ 2FA Disabled'}</span>
                    </p>
                </div>

                <div style="display:flex; gap:10px; justify-content:flex-end;">
                    <button id="save2faBtn" style="background:#00D084; color:#fff; border:none; padding:10px 16px; border-radius:6px; cursor:pointer; font-weight:600;">Save Settings</button>
                    <button id="close2faModal" style="background:#e0e0e0; border:none; padding:10px 16px; border-radius:6px; cursor:pointer;">Close</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);

    // Wire toggle handlers to show/hide sections
    const googleAuthToggle = document.getElementById('googleAuthToggle');
    const smsToggle = document.getElementById('smsToggle');
    const googleAuthContent = document.getElementById('googleAuthContent');
    const smsContent = document.getElementById('smsContent');
    const twoFAStatus = document.getElementById('twoFAStatus');

    googleAuthToggle.addEventListener('change', function () {
        googleAuthContent.style.display = this.checked ? 'block' : 'none';
        updateStatus();
    });

    smsToggle.addEventListener('change', function () {
        smsContent.style.display = this.checked ? 'block' : 'none';
        updateStatus();
    });

    function updateStatus() {
        const googleEnabled = googleAuthToggle.checked;
        const smsEnabled = smsToggle.checked;
        twoFAStatus.textContent = (googleEnabled || smsEnabled) ? '✓ 2FA Enabled' : '✗ 2FA Disabled';
    }

    document.getElementById('save2faBtn').addEventListener('click', function () {
        const googleEnabled = googleAuthToggle.checked;
        const smsEnabled = smsToggle.checked;
        const phone = document.getElementById('phoneNumberInput').value.trim();

        if (smsEnabled && !phone) {
            alert('Please enter a phone number for SMS verification.');
            return;
        }

        const settings = {
            googleAuthEnabled: googleEnabled,
            googleAuthSecret: twoFASettings.googleAuthEnabled ? googleAuthSecret : '',
            smsEnabled: smsEnabled,
            phoneNumber: smsEnabled ? phone : '',
            lastUpdated: Date.now()
        };

        save2FASettings(settings);
        alert('2FA settings saved successfully!');
        document.getElementById(modalId).remove();
    });

    document.getElementById('close2faModal').addEventListener('click', function () {
        document.getElementById(modalId).remove();
    });
}

function get2FASettings() {
    try {
        const raw = localStorage.getItem('auth.2fa');
        return raw ? JSON.parse(raw) : { googleAuthEnabled: false, smsEnabled: false, phoneNumber: '', googleAuthSecret: '' };
    } catch (e) {
        console.warn('Failed to parse 2FA settings', e);
        return { googleAuthEnabled: false, smsEnabled: false, phoneNumber: '', googleAuthSecret: '' };
    }
}

function save2FASettings(settings) {
    try { localStorage.setItem('auth.2fa', JSON.stringify(settings)); } catch (e) { console.warn('Failed to save 2FA settings', e); }
}

function generateSecret() {
    // Generate a simple random secret for Google Authenticator (base32-like string, 32 chars)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
        secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
}

function openSettings() {
    closeSettingsMenu();
    console.log('Opening Settings...');
    showModal('Settings', 'User settings and preferences', ['Profile settings', 'Notification preferences', 'Privacy settings', 'Language & region']);
}

function openBilling() {
    closeSettingsMenu();
    console.log('Opening Billing & Subscription...');
    
    // Fetch billing renewal information
    fetchWithAuth(`${API_BASE_URL}/dashboard/user/billing-renewal`, 'GET')
        .then(data => {
            showBillingModal(data);
        })
        .catch(err => {
            console.error('Failed to load billing data:', err);
            showBillingModal({
                is_in_trial: true,
                trial_status: 'Trial Period',
                billing_amount_usd: 0,
                revenue_ugx: 0,
                account_balance: 0,
                error: 'Failed to load billing data'
            });
        });
}

function showBillingModal(billingData) {
    const trialBadge = billingData.is_in_trial 
        ? '<span style="background: #4caf50; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; margin-left: 10px;">FREE TRIAL</span>'
        : '';
    
    const renewalStatus = billingData.is_in_trial 
        ? `<div style="background: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
            <p style="color: #2e7d32; font-weight: 600; margin: 0 0 8px 0;">🎉 You're in Free Trial Period</p>
            <p style="color: #558b2f; margin: 5px 0; font-size: 13px;">${billingData.trial_status}</p>
            <p style="color: #558b2f; margin: 5px 0; font-size: 13px;">Trial ends on: <strong>${new Date(billingData.trial_end_date).toLocaleDateString()}</strong></p>
        </div>`
        : `<div style="background: #fff3e0; border-left: 4px solid #00D084; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
            <p style="color: #00B370; font-weight: 600; margin: 0 0 8px 0;">💳 Active Billing</p>
            <p style="color: #bf360c; margin: 5px 0; font-size: 13px;">Trial period ended on: <strong>${new Date(billingData.trial_end_date).toLocaleDateString()}</strong></p>
        </div>`;
    
    const billingAmount = billingData.is_in_trial 
        ? `<div style="text-align: center; padding: 20px; background: #f5f5f5; border-radius: 8px; margin-bottom: 15px;">
            <p style="color: #999; font-size: 12px; margin: 0 0 5px 0; text-transform: uppercase;">Next Billing Amount</p>
            <p style="color: #00D084; font-size: 32px; font-weight: 700; margin: 5px 0;">$0.00</p>
            <p style="color: #999; font-size: 12px; margin: 5px 0;"><strong>Free</strong> until trial ends</p>
        </div>`
        : `<div style="text-align: center; padding: 20px; background: #f5f5f5; border-radius: 8px; margin-bottom: 15px;">
            <p style="color: #999; font-size: 12px; margin: 0 0 5px 0; text-transform: uppercase;">Next Billing Amount</p>
            <p style="color: #00D084; font-size: 32px; font-weight: 700; margin: 5px 0;">$${billingData.billing_amount_usd.toFixed(2)}</p>
            <p style="color: #666; font-size: 12px; margin: 5px 0;">${billingData.billing_reason}</p>
        </div>`;
    
    const renewalDatesInfo = `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
        <div style="padding: 12px; background: white; border: 1px solid #ddd; border-radius: 6px;">
            <p style="color: #999; font-size: 11px; text-transform: uppercase; margin: 0 0 5px 0;">Next Renewal</p>
            <p style="color: #333; font-weight: 600; margin: 0;">${new Date(billingData.next_renewal_date).toLocaleDateString()}</p>
            <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">${billingData.days_to_renewal} days away</p>
        </div>
        <div style="padding: 12px; background: white; border: 1px solid #ddd; border-radius: 6px;">
            <p style="color: #999; font-size: 11px; text-transform: uppercase; margin: 0 0 5px 0;">Signup Date</p>
            <p style="color: #333; font-weight: 600; margin: 0;">${new Date(billingData.signup_date).toLocaleDateString()}</p>
            <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">${billingData.days_since_signup} days ago</p>
        </div>
    </div>`;
    
    const accountInfo = `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
        <div style="padding: 12px; background: #f9f9f9; border-radius: 6px;">
            <p style="color: #999; font-size: 11px; text-transform: uppercase; margin: 0 0 5px 0;">💰 Account Balance</p>
            <p style="color: #4caf50; font-weight: 600; font-size: 16px; margin: 0;">${billingData.account_balance.toLocaleString('en-US')} USH</p>
        </div>
        <div style="padding: 12px; background: #f9f9f9; border-radius: 6px;">
            <p style="color: #999; font-size: 11px; text-transform: uppercase; margin: 0 0 5px 0;">📊 Lifetime Revenue</p>
            <p style="color: #1976d2; font-weight: 600; font-size: 16px; margin: 0;">${billingData.revenue_ugx.toLocaleString('en-US')} USH</p>
        </div>
    </div>`;
    
    const billingTable = `<div style="background: white; border: 1px solid #e0e0e0; border-radius: 6px; overflow: hidden; margin-bottom: 15px;">
        <table style="width: 100%; border-collapse: collapse;">
            <tr style="background: #f5f5f5; border-bottom: 1px solid #e0e0e0;">
                <td style="padding: 12px; color: #666; font-size: 12px; font-weight: 600; text-transform: uppercase;">Parameter</td>
                <td style="padding: 12px; color: #666; font-size: 12px; font-weight: 600; text-transform: uppercase;">Value</td>
            </tr>
            <tr style="border-bottom: 1px solid #e0e0e0;">
                <td style="padding: 12px; color: #333;">Trial Status</td>
                <td style="padding: 12px; color: #00D084; font-weight: 600;">${billingData.trial_status}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e0e0e0;">
                <td style="padding: 12px; color: #333;">Revenue (This Month)</td>
                <td style="padding: 12px; color: #666;">${billingData.revenue_ugx.toLocaleString('en-US')} UGX</td>
            </tr>
            <tr>
                <td style="padding: 12px; color: #333;">Billing Tier</td>
                <td style="padding: 12px; color: #666;">${billingData.is_in_trial ? 'Free Trial' : (billingData.revenue_ugx < 200000 ? 'Standard ($25)' : 'Revenue-based (2%)')}</td>
            </tr>
        </table>
    </div>`;
    
    const modal = `
        <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000;" onclick="if(event.target === this) this.remove()">
            <div style="background: white; border-radius: 12px; padding: 24px; max-width: 600px; width: 90%; box-shadow: 0 10px 40px rgba(0,0,0,0.2); max-height: 80vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="color: #333; margin: 0; font-size: 22px;">💳 Billing & Subscription ${trialBadge}</h2>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #999;">×</button>
                </div>
                
                ${renewalStatus}
                ${billingAmount}
                ${renewalDatesInfo}
                ${accountInfo}
                ${billingTable}
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background: #f5f5f5; border: 1px solid #ddd; color: #333; padding: 12px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">Close</button>
                    <button onclick="alert('Payment processing coming soon!'); this.parentElement.parentElement.parentElement.remove()" style="background: #00D084; border: none; color: white; padding: 12px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">Proceed to Payment</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modal);
}

function openSystemUsers() {
    closeSettingsMenu();
    console.log('Opening System Users...');
    
    // Fetch system agents
    fetchWithAuth(`${API_BASE_URL}/admin/agents`, 'GET')
        .then(data => {
            showSystemUsersModal(data.agents);
        })
        .catch(err => {
            console.error('Failed to load system agents:', err);
            showSystemUsersModal([]);
        });
}

function showSystemUsersModal(agents) {
    const agentsHtml = agents.length > 0 
        ? agents.map(agent => `
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr 140px; gap: 12px; padding: 15px; border-bottom: 1px solid #e0e0e0; align-items: center;">
                <div>
                    <p style="color: #333; font-weight: 600; margin: 0 0 3px 0; font-size: 13px;">${agent.agent_name}</p>
                    <p style="color: #999; font-size: 12px; margin: 0;">📍 ${agent.site_location}</p>
                </div>
                <div>
                    <p style="color: #666; font-size: 12px; margin: 0 0 3px 0;"><strong>Role:</strong> ${agent.role || 'Not assigned'}</p>
                    <p style="color: #666; font-size: 12px; margin: 0;"><strong>Type:</strong> ${agent.agent_type}</p>
                </div>
                <div>
                    <p style="color: #666; font-size: 12px; margin: 0 0 3px 0;"><strong>Contact:</strong></p>
                    <p style="color: #00D084; font-size: 12px; margin: 0; font-weight: 600;">${agent.contact_number || 'N/A'}</p>
                </div>
                <div>
                    <div style="display: flex; gap: 10px; font-size: 12px;">
                        <div style="flex: 1;">
                            <p style="color: #999; margin: 0 0 2px 0; font-size: 11px;">CPU</p>
                            <p style="color: ${agent.cpu_usage > 80 ? '#d32f2f' : '#666'}; margin: 0; font-weight: 600;">${agent.cpu_usage.toFixed(1)}%</p>
                        </div>
                        <div style="flex: 1;">
                            <p style="color: #999; margin: 0 0 2px 0; font-size: 11px;">Memory</p>
                            <p style="color: ${agent.memory_usage > 75 ? '#d32f2f' : '#666'}; margin: 0; font-weight: 600;">${agent.memory_usage.toFixed(1)}%</p>
                        </div>
                    </div>
                </div>
                <div>
                    <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 10px; font-weight: 600; background: ${
                        agent.health_status === 'Healthy' ? '#e8f5e9; color: #2e7d32;' :
                        agent.health_status === 'Degraded' ? '#fff3e0; color: #00B370;' :
                        '#ffebee; color: #c62828;'
                    }">
                        ${agent.health_status}
                    </span>
                </div>
            </div>
        `).join('')
        : '<p style="color: #999; padding: 20px; text-align: center;">No agents configured yet</p>';
    
    const modal = `
        <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000;" onclick="if(event.target === this) this.remove()">
            <div style="background: white; border-radius: 12px; padding: 24px; max-width: 1200px; width: 95%; box-shadow: 0 10px 40px rgba(0,0,0,0.2); max-height: 80vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="color: #333; margin: 0; font-size: 22px;">👥 System Users & Monitoring Agents</h2>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #999;">×</button>
                </div>
                
                <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <p style="color: #666; font-size: 13px; margin: 0;">Manage monitoring agents deployed at different site locations with assigned roles, contact information, and specific permissions. Agents monitor system health, network connectivity, and performance metrics in real-time.</p>
                </div>
                
                <div style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr 140px; gap: 12px; padding: 15px; background: #fafafa; border-bottom: 2px solid #e0e0e0; font-weight: 600; color: #666; font-size: 12px; text-transform: uppercase;">
                        <div>Agent Name</div>
                        <div>Role & Type</div>
                        <div>Contact Info</div>
                        <div>Performance</div>
                        <div>Status</div>
                    </div>
                    ${agentsHtml}
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background: #f5f5f5; border: 1px solid #ddd; color: #333; padding: 12px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">Close</button>
                    <button onclick="showAddAgentModal(); this.parentElement.parentElement.parentElement.remove()" style="background: #4caf50; border: none; color: white; padding: 12px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">+ Add New Agent</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modal);
}

function showAddAgentModal() {
    const modal = `
        <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2001;" onclick="if(event.target === this) this.remove()">
            <div style="background: white; border-radius: 12px; padding: 24px; max-width: 650px; width: 95%; box-shadow: 0 10px 40px rgba(0,0,0,0.2); max-height: 85vh; overflow-y: auto;">
                <h2 style="color: #333; margin: 0 0 20px 0; font-size: 22px;">➕ Add Monitoring Agent</h2>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; color: #333; font-weight: 600; font-size: 12px; margin-bottom: 5px;">Agent Name*</label>
                    <input type="text" id="agentName" placeholder="e.g., Kampala Office Monitor" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; box-sizing: border-box;">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; color: #333; font-weight: 600; font-size: 12px; margin-bottom: 5px;">Site Location*</label>
                    <input type="text" id="siteLocation" placeholder="e.g., Plot 123, Kampala" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; box-sizing: border-box;">
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                    <div>
                        <label style="display: block; color: #333; font-weight: 600; font-size: 12px; margin-bottom: 5px;">Agent Type*</label>
                        <select id="agentType" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; box-sizing: border-box;">
                            <option value="monitoring">Monitoring</option>
                            <option value="backup">Backup</option>
                            <option value="maintenance">Maintenance</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; color: #333; font-weight: 600; font-size: 12px; margin-bottom: 5px;">Region</label>
                        <input type="text" id="agentRegion" placeholder="e.g., Central" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; box-sizing: border-box;">
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                    <div>
                        <label style="display: block; color: #333; font-weight: 600; font-size: 12px; margin-bottom: 5px;">Contact Number</label>
                        <input type="tel" id="agentContact" placeholder="+256 701 234567" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; box-sizing: border-box;">
                    </div>
                    <div>
                        <label style="display: block; color: #333; font-weight: 600; font-size: 12px; margin-bottom: 5px;">Role/Title</label>
                        <input type="text" id="agentRole" placeholder="e.g., Site Manager" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; box-sizing: border-box;">
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                    <div>
                        <label style="display: block; color: #333; font-weight: 600; font-size: 12px; margin-bottom: 5px;">Latitude</label>
                        <input type="number" id="agentLat" placeholder="0.000000" step="0.000001" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; box-sizing: border-box;">
                    </div>
                    <div>
                        <label style="display: block; color: #333; font-weight: 600; font-size: 12px; margin-bottom: 5px;">Longitude</label>
                        <input type="number" id="agentLon" placeholder="0.000000" step="0.000001" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; box-sizing: border-box;">
                    </div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; color: #333; font-weight: 600; font-size: 12px; margin-bottom: 5px;">Description</label>
                    <textarea id="agentDesc" placeholder="Agent description..." style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; min-height: 60px; box-sizing: border-box;"></textarea>
                </div>
                
                <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <p style="color: #333; font-weight: 600; font-size: 12px; margin: 0 0 12px 0;">🔐 Permissions</p>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="checkbox" id="permView" checked style="cursor: pointer;">
                            <span style="font-size: 12px; color: #666;">View Metrics</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="checkbox" id="permEdit" style="cursor: pointer;">
                            <span style="font-size: 12px; color: #666;">Edit Config</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="checkbox" id="permDelete" style="cursor: pointer;">
                            <span style="font-size: 12px; color: #666;">Delete Agent</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="checkbox" id="permMonitor" checked style="cursor: pointer;">
                            <span style="font-size: 12px; color: #666;">Monitor Status</span>
                        </label>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background: #f5f5f5; border: 1px solid #ddd; color: #333; padding: 12px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">Cancel</button>
                    <button onclick="createNewAgent()" style="background: #00D084; border: none; color: white; padding: 12px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">Create Agent</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modal);
}

function createNewAgent() {
    const agentName = document.getElementById('agentName').value;
    const siteLocation = document.getElementById('siteLocation').value;
    const agentType = document.getElementById('agentType').value;
    const agentRegion = document.getElementById('agentRegion').value;
    const agentContact = document.getElementById('agentContact').value;
    const agentRole = document.getElementById('agentRole').value;
    const agentLat = document.getElementById('agentLat').value;
    const agentLon = document.getElementById('agentLon').value;
    const agentDesc = document.getElementById('agentDesc').value;
    
    if (!agentName || !siteLocation || !agentType) {
        alert('Please fill in all required fields (*)');
        return;
    }
    
    // Collect permissions
    const permissions = {
        view: document.getElementById('permView').checked,
        edit: document.getElementById('permEdit').checked,
        delete: document.getElementById('permDelete').checked,
        monitor: document.getElementById('permMonitor').checked
    };
    
    const payload = {
        agent_name: agentName,
        site_location: siteLocation,
        agent_type: agentType,
        region: agentRegion || '',
        contact_number: agentContact || '',
        role: agentRole || '',
        description: agentDesc || '',
        permissions: permissions
    };
    
    if (agentLat) payload.latitude = parseFloat(agentLat);
    if (agentLon) payload.longitude = parseFloat(agentLon);
    
    fetchWithAuth(`${API_BASE_URL}/admin/agents`, 'POST', payload)
        .then(data => {
            alert('✅ Agent created successfully!\n\nAPI Key: ' + (data.agent?.api_key?.substring(0, 20) + '...' || 'Check dashboard'));
            // Close modal and reload
            document.querySelectorAll('[style*="position: fixed"]').forEach(el => el.remove());
            openSystemUsers();
        })
        .catch(err => {
            alert('❌ Error creating agent: ' + (err.message || 'Unknown error'));
            console.error(err);
        });
}

function openSystemLogs() {
    closeSettingsMenu();
    console.log('Opening System Logs...');
    showModal('System Logs', 'View system activity and audit logs', ['Activity logs', 'Access logs', 'Error logs', 'Export logs']);
}

function openReferFriend() {
    closeSettingsMenu();
    console.log('Opening Refer a Friend...');
    showModal('Refer a Friend', 'Share and earn rewards', ['Your referral link', 'Referral history', 'Earned rewards', 'Terms & conditions']);
}

function openDocumentation() {
    closeSettingsMenu();
    console.log('Opening Documentation...');
    alert('Documentation: Opening help articles and guides...');
}

function openContactSupport() {
    closeSettingsMenu();
    console.log('Opening Contact Support...');
    showModal('Contact Support', 'Get help from our support team', ['Live chat', 'Send email', 'Phone support', 'FAQ']);
}

// Helper function to close settings menu
function closeSettingsMenu() {
    const settingsMenu = document.getElementById('settingsMenu');
    if (settingsMenu) {
        settingsMenu.classList.remove('show');
    }
}

// Helper function to show settings modal
function showModal(title, description, options) {
    let optionsHtml = options.map(opt => `<li>▸ ${opt}</li>`).join('');
    const modal = `
        <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000;" onclick="this.remove()">
            <div style="background: white; border-radius: 12px; padding: 24px; max-width: 500px; width: 90%; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
                <h2 style="color: #333; margin: 0 0 10px 0; font-size: 22px;">${title}</h2>
                <p style="color: #666; margin: 0 0 20px 0; font-size: 14px;">${description}</p>
                <ul style="color: #555; list-style: none; padding: 0; margin: 0 0 20px 0; border-left: 3px solid #00D084; padding-left: 16px;">
                    ${optionsHtml}
                </ul>
                <button onclick="this.parentElement.parentElement.remove()" style="background: #00D084; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600; width: 100%;">Close</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modal);
}

// Logout function
function logout() {
    closeSettingsMenu();
    fetchWithAuth(`${API_BASE_URL}/auth/logout`, 'POST')
        .then(() => {
            redirectToLogin();
        })
        .catch(err => {
            console.error('Logout error:', err);
            redirectToLogin();
        });
}

// Redirect to login
function redirectToLogin() {
    window.location.href = 'login.html';
}
