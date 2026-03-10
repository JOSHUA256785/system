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

// DOM Elements
const loginForm = document.getElementById('loginForm');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginButton = document.querySelector('.btn-login');
const twoFactorForm = document.getElementById('twoFactorForm');
const twoFactorCodeInput = document.getElementById('twoFactorCode');
const backBtn = document.getElementById('backBtn');

// 2FA state
let pendingUserId = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Check if already logged in
    checkAuthentication();
    
    // Form submission
    loginForm.addEventListener('submit', handleLogin);
    twoFactorForm.addEventListener('submit', handleTwoFactorSubmit);
    
    // Back button for 2FA form
    if (backBtn) {
        backBtn.addEventListener('click', function() {
            twoFactorForm.style.display = 'none';
            loginForm.style.display = 'block';
            twoFactorCodeInput.value = '';
            passwordInput.value = '';
            errorMessage.textContent = '';
            successMessage.textContent = '';
            pendingUserId = null;
        });
    }
    
    // Enter key in password field
    passwordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            loginForm.dispatchEvent(new Event('submit'));
        }
    });
    
    // Enter key in 2FA field
    twoFactorCodeInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            twoFactorForm.dispatchEvent(new Event('submit'));
        }
    });
});

// Check if user is already authenticated
function checkAuthentication() {
    // Check local offline mode first
    if (localStorage.getItem('offlineMode') === 'true' && sessionStorage.getItem('authenticated') === 'true') {
        window.location.href = 'index.html';
        return;
    }
    
    fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (response.ok) {
            // User is already logged in, redirect to dashboard
            window.location.href = 'index.html';
        }
    })
    .catch(error => {
        // Not logged in, show login form
        console.log('Not authenticated');
    });
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const remember = document.getElementById('remember').checked;
    
    // Validation
    if (!username || !password) {
        showError('Please enter username and password');
        return;
    }
    
    // Disable button
    loginButton.disabled = true;
    loginButton.textContent = 'Signing in...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                username: username,
                password: password
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Check if 2FA is required
            if (data.requires_2fa) {
                // Store user ID for 2FA verification
                pendingUserId = data.user_id;
                
                // Switch to 2FA form
                loginForm.style.display = 'none';
                twoFactorForm.style.display = 'block';
                twoFactorCodeInput.focus();
                
                showSuccess('Please enter your 2FA code');
                loginButton.disabled = false;
                loginButton.textContent = 'Sign In';
                return;
            }
            
            // Success - login complete
            showSuccess('Login successful! Redirecting...');
            
            // Store user info if remember me is checked
            if (remember) {
                localStorage.setItem('rememberedUsername', username);
            } else {
                localStorage.removeItem('rememberedUsername');
            }
            
            // Redirect after short delay
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } else {
            // Error
            showError(data.error || 'Login failed. Please try again.');
            loginButton.disabled = false;
            loginButton.textContent = 'Sign In';
        }
    } catch (error) {
        console.error('Login error:', error);
        
        // Fallback: Allow default admin login when server is offline
        if (username === 'admin' && password === 'admin') {
            showSuccess('⚠️ Offline mode: Using default credentials. Redirecting...');
            
            // Store user info if remember me is checked
            if (remember) {
                localStorage.setItem('rememberedUsername', username);
            } else {
                localStorage.removeItem('rememberedUsername');
            }
            
            // Store offline mode flag
            localStorage.setItem('offlineMode', 'true');
            localStorage.setItem('currentUser', JSON.stringify({
                username: 'admin',
                email: 'admin@centi.local',
                is_admin: true,
                domain_name: 'admin.centi.local'
            }));
            
            // Simulate session
            sessionStorage.setItem('authenticated', 'true');
            
            // Redirect after short delay
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } else {
            showError('❌ Connection error. Server offline. Only default admin login (admin/admin) works in offline mode.');
            loginButton.disabled = false;
            loginButton.textContent = 'Sign In';
        }
    }
}

// Show error message
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
    successMessage.classList.remove('show');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        errorMessage.classList.remove('show');
    }, 5000);
}

// Show success message
function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.classList.add('show');
    errorMessage.classList.remove('show');
}

// Handle 2FA verification
async function handleTwoFactorSubmit(e) {
    e.preventDefault();
    
    if (!pendingUserId) {
        showError('Session expired. Please login again.');
        return;
    }
    
    const token = twoFactorCodeInput.value.trim();
    
    if (!token) {
        showError('Please enter your 2FA code');
        return;
    }
    
    const verifyBtn = twoFactorForm.querySelector('.btn-login');
    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Verifying...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/2fa/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                user_id: pendingUserId,
                token: token
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showSuccess('2FA verified! Redirecting...');
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } else {
            showError(data.error || '2FA verification failed. Please try again.');
            verifyBtn.disabled = false;
            verifyBtn.textContent = 'Verify Code';
            twoFactorCodeInput.value = '';
        }
    } catch (error) {
        console.error('2FA verification error:', error);
        showError('❌ Connection error. Please try again.');
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Verify Code';
    }
}

// Restore remembered username
window.addEventListener('load', function() {
    const remembered = localStorage.getItem('rememberedUsername');
    if (remembered) {
        usernameInput.value = remembered;
        document.getElementById('remember').checked = true;
    }
});
