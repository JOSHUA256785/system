// API Base URL
const API_BASE_URL = 'http://localhost:5000/api';

// Navigation functions
function navigateBack() {
    window.history.back();
}

function navigateForward() {
    window.history.forward();
}

function goHome() {
    window.location.href = 'index.html';
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
    loadMobileMoneyProviders();
    setupFormListeners();
});

// Check authentication
function checkAuthentication() {
    fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            window.location.href = 'login.html';
        }
    })
    .catch(error => {
        console.error('Auth error:', error);
        window.location.href = 'login.html';
    });
}

// Load mobile money providers
async function loadMobileMoneyProviders() {
    try {
        const response = await fetch(`${API_BASE_URL}/finance/mobile-money/providers`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            displayProviders(data.providers);
        }
    } catch (error) {
        console.error('Error loading providers:', error);
        // Show default providers if API fails
        displayDefaultProviders();
    }
}

// Display providers
function displayProviders(providers) {
    const container = document.getElementById('providersContainer');
    container.innerHTML = '';

    providers.forEach(provider => {
        const div = document.createElement('div');
        div.className = 'provider-option';
        div.onclick = () => selectProvider(provider.code, div);
        div.innerHTML = `
            <strong>${provider.code}</strong><br>
            <small>${provider.name}</small><br>
            <small>${provider.currency} ${provider.min_amount} - ${provider.max_amount}</small>
        `;
        container.appendChild(div);
    });
}

// Display default providers if API fails
function displayDefaultProviders() {
    const defaultProviders = [
        { code: 'MTN', name: 'MTN Mobile Money', currency: 'USH', min_amount: 500, max_amount: 5000000 },
        { code: 'AIRTEL', name: 'Airtel Money', currency: 'USH', min_amount: 1000, max_amount: 2000000 },
        { code: 'VODAFONE', name: 'Vodafone Cash', currency: 'GHS', min_amount: 1, max_amount: 1000 },
        { code: 'EQUITY', name: 'Easyjet Equitel', currency: 'KES', min_amount: 10, max_amount: 500000 }
    ];
    displayProviders(defaultProviders);
}

// Setup form listeners
function setupFormListeners() {
    const form = document.getElementById('paymentForm');
    const amountInput = document.getElementById('amount');
    const descriptionSelect = document.getElementById('description');

    form.addEventListener('submit', handlePaymentSubmit);
    amountInput.addEventListener('change', updateSummary);
    descriptionSelect.addEventListener('change', updateSummary);

    // Update summary on initial load
    updateSummary();
}

// Select payment method
function selectPaymentMethod(method, event) {
    if (event) {
        event.preventDefault();
    }

    // Update UI
    const methods = document.querySelectorAll('.payment-method');
    methods.forEach(m => m.classList.remove('selected'));

    if (event && event.currentTarget) {
        event.currentTarget.classList.add('selected');
    }

    // Update radio button
    const radio = document.querySelector(`input[value="${method}"]`);
    if (radio) {
        radio.checked = true;
    }

    // Show/hide mobile money section
    const mobileMoneySec = document.getElementById('mobileMoneySection');
    if (method === 'mobile_money') {
        mobileMoneySec.style.display = 'block';
        document.getElementById('phone').required = true;
    } else {
        mobileMoneySec.style.display = 'none';
        document.getElementById('phone').required = false;
    }

    updateSummary();
}

// Select mobile money provider
function selectProvider(code, element) {
    const providers = document.querySelectorAll('.provider-option');
    providers.forEach(p => p.classList.remove('selected'));
    element.classList.add('selected');

    // Store selected provider
    document.getElementById('selectedProvider').value = code;
}

// Set amount from quick buttons
function setAmount(amount) {
    document.getElementById('amount').value = amount;
    updateSummary();
}

// Update payment summary
function updateSummary() {
    const amount = parseFloat(document.getElementById('amount').value) || 0;
    const method = document.querySelector('input[name="paymentMethod"]:checked');
    
    // Calculate fee based on method
    let fee = 0;
    if (method && method.value === 'mobile_money') {
        // Mobile money fee: 1% or minimum 1000
        fee = Math.max(1000, Math.round(amount * 0.01));
    }

    const total = amount + fee;

    // Update display
    document.getElementById('summaryAmount').textContent = amount.toLocaleString('en-US') + ' USH';
    document.getElementById('summaryFee').textContent = fee.toLocaleString('en-US') + ' USH';
    document.getElementById('summaryTotal').textContent = total.toLocaleString('en-US') + ' USH';
}

// Handle payment submission
async function handlePaymentSubmit(e) {
    e.preventDefault();

    const amount = parseFloat(document.getElementById('amount').value);
    const method = document.querySelector('input[name="paymentMethod"]:checked').value;
    const description = document.getElementById('description').value;
    const submitBtn = document.getElementById('submitBtn');

    // Validation
    if (amount <= 0) {
        showStatus('Please enter a valid amount', 'error');
        return;
    }

    if (!description) {
        showStatus('Please select what this payment is for', 'error');
        return;
    }

    // Handle mobile money
    if (method === 'mobile_money') {
        return handleMobileMoneyPayment(amount, description, submitBtn);
    }

    // Handle other methods
    handleOtherPayment(method, amount, description, submitBtn);
}

// Handle mobile money payment
async function handleMobileMoneyPayment(amount, description, submitBtn) {
    const phone = document.getElementById('phone').value.trim();
    const selectedProvider = document.querySelector('.provider-option.selected');

    if (!phone) {
        showStatus('Please enter your mobile money phone number', 'error');
        return;
    }

    if (!selectedProvider) {
        showStatus('Please select a mobile money provider', 'error');
        return;
    }

    const providerCode = selectedProvider.textContent.split('\n')[0];

    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';

    try {
        const response = await fetch(`${API_BASE_URL}/finance/mobile-money/initiate`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: amount,
                phone_number: phone,
                provider_code: providerCode,
                description: description
            })
        });

        const data = await response.json();

        if (response.ok) {
            showStatus(
                `✅ Payment initiated successfully!\n\nTransaction: ${data.reference}\nAmount: ${data.currency} ${data.amount}\nProvider: ${data.provider}\n\n${data.next_steps}\n\nPlease complete the payment on your phone within ${data.expiry_minutes} minutes.`,
                'success'
            );
            
            // Show transaction ID in case they need to verify
            const txnInfo = document.createElement('div');
            txnInfo.style.marginTop = '15px';
            txnInfo.style.padding = '10px';
            txnInfo.style.background = '#f5f5f5';
            txnInfo.style.borderRadius = '6px';
            txnInfo.style.fontSize = '12px';
            txnInfo.innerHTML = `
                <strong>Keep this reference number:</strong><br>
                <code style="word-break: break-all;">${data.reference}</code><br><br>
                <strong>Transaction ID:</strong><br>
                <code style="word-break: break-all;">${data.transaction_id}</code>
            `;
            document.getElementById('statusMessage').appendChild(txnInfo);

            // Reset form after 5 seconds
            setTimeout(() => {
                document.getElementById('paymentForm').reset();
            }, 5000);
        } else {
            showStatus('Error: ' + (data.error || 'Failed to initiate payment'), 'error');
        }
    } catch (error) {
        console.error('Payment error:', error);
        showStatus('Error: Could not connect to payment service. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Complete Payment';
    }
}

// Handle other payment methods
function handleOtherPayment(method, amount, description, submitBtn) {
    let instructions = '';

    if (method === 'cash') {
        instructions = `💵 Cash Payment\n\nAmount: ${amount.toLocaleString('en-US')} USH\n\nPlease visit our office to complete this payment.\n\nReference will be provided upon payment.`;
    } else if (method === 'bank') {
        instructions = `🏦 Bank Transfer\n\nAmount: ${amount.toLocaleString('en-US')} USH\n\nBank Details:\nBank Name: [Your Bank]\nAccount Name: [Your Account Name]\nAccount Number: [Your Account Number]\nReference: ${description}\n\nPlease keep your transfer receipt for verification.`;
    }

    showStatus(instructions, 'info');
}

// Show status message
function showStatus(message, type) {
    const statusDiv = document.getElementById('statusMessage');
    statusDiv.textContent = message;
    statusDiv.className = `status-message ${type}`;
    statusDiv.style.whiteSpace = 'pre-wrap';

    // Auto-hide after 8 seconds if success
    if (type === 'success') {
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 8000);
    }
}

// Create hidden input for selected provider (if it doesn't exist)
document.addEventListener('DOMContentLoaded', function() {
    if (!document.getElementById('selectedProvider')) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.id = 'selectedProvider';
        input.value = '';
        document.getElementById('paymentForm').appendChild(input);
    }
});
