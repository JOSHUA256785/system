// Minimal settings persistence using localStorage
document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('settingsForm');
    const API_BASE_URL = 'http://localhost:5000/api';

    // Collect all inputs/selects that have a data-key attribute and persist them
    const persistElements = Array.from(document.querySelectorAll('[data-key]'));

    // load saved values
    persistElements.forEach(el => {
        const key = el.getAttribute('data-key');
        if (!key) return;
        const v = localStorage.getItem('settings.' + key);
        if (v !== null) el.value = v;
    });

    function save() {
        persistElements.forEach(el => {
            const key = el.getAttribute('data-key');
            if (!key) return;
            localStorage.setItem('settings.' + key, el.value);
        });
        alert('Settings saved locally');
    }

    const saveBtn = document.getElementById('saveBtn'); if (saveBtn) saveBtn.addEventListener('click', save);
    const top = document.getElementById('saveTop'); if (top) top.addEventListener('click', save);

    // Tab switching logic
    const tabs = Array.from(document.querySelectorAll('.tab'));
    const tabContents = Array.from(document.querySelectorAll('.tab-content'));
    function activateTab(targetId) {
        tabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-target') === targetId));
        tabContents.forEach(c => c.style.display = (c.id === targetId ? 'block' : 'none'));
        
        // Load 2FA status when Security tab is clicked
        if (targetId === 'tab-2fa') {
            load2FAStatus();
        }
    }
    tabs.forEach(t => t.addEventListener('click', () => activateTab(t.getAttribute('data-target'))));
    // Activate first tab by default
    if (tabs.length) activateTab(tabs[0].getAttribute('data-target'));

    // Optional: preview uploaded logo in localStorage as data URL
    const logo = document.getElementById('systemLogo');
    if (logo) {
        logo.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function (ev) {
                try { localStorage.setItem('settings.systemLogo', ev.target.result); } catch (err) { console.warn('Logo too large for localStorage'); }
            };
            reader.readAsDataURL(file);
        });
    }

    // ============ 2FA Functions ============
    
    async function load2FAStatus() {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/2fa/status`, {
                method: 'GET',
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                const statusEl = document.getElementById('twoFactorStatus');
                const enableSection = document.getElementById('enable2FASection');
                const enabledSection = document.getElementById('twoFAEnabledSection');
                const backupCodesCountEl = document.getElementById('backupCodesCount');
                
                if (data.two_factor_enabled) {
                    statusEl.textContent = '✓ Enabled';
                    statusEl.style.background = '#4caf50';
                    enableSection.style.display = 'none';
                    enabledSection.style.display = 'block';
                    document.getElementById('backupCodeCount').textContent = data.backup_codes_remaining;
                    backupCodesCountEl.textContent = `${data.backup_codes_remaining} backup codes remaining`;
                } else {
                    statusEl.textContent = 'Disabled';
                    statusEl.style.background = '#f44336';
                    enableSection.style.display = 'block';
                    enabledSection.style.display = 'none';
                    backupCodesCountEl.textContent = '';
                }
            }
        } catch (err) {
            console.error('Failed to load 2FA status:', err);
        }
    }

    // Generate QR Code
    const generateQRBtn = document.getElementById('generateQRBtn');
    if (generateQRBtn) {
        generateQRBtn.addEventListener('click', async function() {
            const password = prompt('Enter your password to generate 2FA setup code:');
            if (!password) return;
            
            // Get username for setup
            try {
                const profileResponse = await fetch(`${API_BASE_URL}/auth/profile`, {
                    method: 'GET',
                    credentials: 'include'
                });
                
                if (!profileResponse.ok) {
                    alert('Please login first');
                    return;
                }
                
                const profileData = await profileResponse.json();
                const username = profileData.username;
                
                const response = await fetch(`${API_BASE_URL}/auth/2fa/setup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ username: username, password: password })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    
                    // Display QR code container
                    document.getElementById('qrCodeContainer').style.display = 'block';
                    generateQRBtn.textContent = 'Generate New QR Code';
                    
                    // Display secret code
                    document.getElementById('secretCode').textContent = data.secret;
                    
                    // Display backup codes
                    const backupCodesDisplay = document.getElementById('backupCodesDisplay');
                    backupCodesDisplay.innerHTML = data.backup_codes.map(code => `<div>${code}</div>`).join('');
                    backupCodesDisplay.style.display = 'block';
                    
                    // Generate QR code image
                    const qrContainer = document.getElementById('qrCode');
                    qrContainer.innerHTML = ''; // Clear previous
                    
                    // Use a QR code API since we can't install qrcode library
                    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data.qr_code)}`;
                    const img = document.createElement('img');
                    img.src = qrCodeUrl;
                    img.alt = 'QR Code for 2FA setup';
                    img.style.maxWidth = '100%';
                    qrContainer.appendChild(img);
                } else {
                    const error = await response.json();
                    alert('Error: ' + error.error);
                }
            } catch (err) {
                console.error('Error generating QR code:', err);
                alert('Failed to generate QR code');
            }
        });
    }

    // Enable 2FA
    const enableBtn = document.getElementById('enableBtn');
    if (enableBtn) {
        enableBtn.addEventListener('click', async function() {
            const verifyCode = document.getElementById('verifyCode').value.trim();
            
            if (!verifyCode) {
                alert('Please enter the verification code from your authenticator app');
                return;
            }
            
            if (verifyCode.length < 6) {
                alert('Code must be at least 6 digits');
                return;
            }
            
            enableBtn.disabled = true;
            enableBtn.textContent = 'Enabling...';
            
            try {
                const response = await fetch(`${API_BASE_URL}/auth/2fa/enable`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ token: verifyCode })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    alert('✓ 2FA enabled successfully!\n\nSave your backup codes safely. You can use them if you lose access to your authenticator app.');
                    document.getElementById('verifyCode').value = '';
                    document.getElementById('qrCodeContainer').style.display = 'none';
                    load2FAStatus();
                } else {
                    const error = await response.json();
                    alert('Error: ' + error.error);
                    enableBtn.disabled = false;
                    enableBtn.textContent = 'Enable 2FA';
                }
            } catch (err) {
                console.error('Error enabling 2FA:', err);
                alert('Failed to enable 2FA');
                enableBtn.disabled = false;
                enableBtn.textContent = 'Enable 2FA';
            }
        });
    }

    // Disable 2FA
    const disableBtn = document.getElementById('disableBtn');
    if (disableBtn) {
        disableBtn.addEventListener('click', async function() {
            if (!confirm('Are you sure you want to disable 2FA? This will reduce the security of your account.')) {
                return;
            }
            
            const password = prompt('Enter your password to disable 2FA:');
            if (!password) return;
            
            disableBtn.disabled = true;
            disableBtn.textContent = 'Disabling...';
            
            try {
                const response = await fetch(`${API_BASE_URL}/auth/2fa/disable`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ password: password })
                });
                
                if (response.ok) {
                    alert('✓ 2FA has been disabled');
                    load2FAStatus();
                } else {
                    const error = await response.json();
                    alert('Error: ' + error.error);
                    disableBtn.disabled = false;
                    disableBtn.textContent = 'Disable 2FA';
                }
            } catch (err) {
                console.error('Error disabling 2FA:', err);
                alert('Failed to disable 2FA');
                disableBtn.disabled = false;
                disableBtn.textContent = 'Disable 2FA';
            }
        });
    }

    // Generate Backup Codes
    const generateBackupCodesBtn = document.getElementById('generateBackupCodesBtn');
    if (generateBackupCodesBtn) {
        generateBackupCodesBtn.addEventListener('click', async function() {
            if (!confirm('Generating new backup codes will invalidate your old codes. Continue?')) {
                return;
            }
            
            const password = prompt('Enter your password to generate backup codes:');
            if (!password) return;
            
            generateBackupCodesBtn.disabled = true;
            generateBackupCodesBtn.textContent = 'Generating...';
            
            try {
                const response = await fetch(`${API_BASE_URL}/auth/2fa/backup-codes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ password: password })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    const codes = data.backup_codes.join('\n');
                    alert('✓ New backup codes generated:\n\n' + codes + '\n\nSave these codes safely!');
                    load2FAStatus();
                } else {
                    const error = await response.json();
                    alert('Error: ' + error.error);
                    generateBackupCodesBtn.disabled = false;
                    generateBackupCodesBtn.textContent = 'Generate New Backup Codes';
                }
            } catch (err) {
                console.error('Error generating backup codes:', err);
                alert('Failed to generate backup codes');
                generateBackupCodesBtn.disabled = false;
                generateBackupCodesBtn.textContent = 'Generate New Backup Codes';
            }
        });
    }
});
