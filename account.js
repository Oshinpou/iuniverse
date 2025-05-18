// account.js
import Gun from 'gun';
import 'gun/sea'; // Optional: For secure data handling with SEA

// Initialize GunDB (using a public peer for global access - consider your own setup)
const gun = Gun(['https://gun.peers.crunk.house/gun']);
console.log('GunDB initialized:', gun);

// Algorithm parameters for PBKDF2
const PBKDF2_ALGORITHM = 'PBKDF2';
const PBKDF2_SALT_LENGTH = 16; // Recommended salt length
const PBKDF2_ITERATIONS = 100000; // High iteration count for security
const PBKDF2_KEY_LENGTH = 256; // Length of the derived key (in bits)
const HASH_ALGORITHM = 'SHA-256';

// Function to get current timestamp in IST
function timestampIST() {
    const date = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    return new Date(date).toISOString();
}

// --- Utility Functions ---
function isValidUsername(username) {
    return username.length >= 3 && username.length <= 20 && /^[a-zA-Z0-9]+$/.test(username);
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
    return /^\d+$/.test(phone); // Basic check for digits only
    // For more robust validation, consider using a library or more complex regex
}

function isValidPassword(password) {
    return password.length >= 6;
}

function displayError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerText = message;
        console.error(`Error in ${elementId}:`, message);
    } else {
        console.error(`Element with ID "${elementId}" not found for error display.`);
    }
}

function clearError(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerText = '';
    } else {
        console.warn(`Element with ID "${elementId}" not found for clearing error.`);
    }
}

// Function to generate a secure salt using crypto.getRandomValues
function generateSalt() {
    const salt = new Uint8Array(PBKDF2_SALT_LENGTH);
    crypto.getRandomValues(salt);
    return bufferToBase64(salt);
}

// Function to hash password using PBKDF2 with crypto.subtle
async function hashPassword(password, salt) {
    const textEncoder = new TextEncoder();
    const passwordBuffer = textEncoder.encode(password);
    const saltBuffer = base64ToBuffer(salt);

    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        { name: PBKDF2_ALGORITHM },
        false,
        ['deriveKey']
    );

    const derivedKey = await crypto.subtle.deriveKey(
        {
            name: PBKDF2_ALGORITHM,
            salt: saltBuffer,
            iterations: PBKDF2_ITERATIONS,
            hash: HASH_ALGORITHM,
        },
        keyMaterial,
        { name: 'AES-CBC', length: PBKDF2_KEY_LENGTH }, // Using AES-CBC only to specify key length
        false,
        ['encrypt', 'decrypt'] // These usages are just to satisfy the deriveKey constraints
    );

    const exportedKey = await crypto.subtle.exportKey('raw', derivedKey);
    return bufferToBase64(new Uint8Array(exportedKey));
}

// Helper function to convert buffer to base64
function bufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// Helper function to convert base64 to buffer
function base64ToBuffer(base64) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

// --- Signup Logic ---
document.getElementById('signup-btn')?.addEventListener('click', async (event) => {
    event.preventDefault();
    console.log('Signup button clicked!');

    const usernameInput = document.getElementById('signup-user');
    const emailInput = document.getElementById('signup-email');
    const phoneInput = document.getElementById('signup-phone');
    const passwordInput = document.getElementById('signup-pass');
    const confirmInput = document.getElementById('signup-confirm');
    const countryCodeInput = document.getElementById('signup-country-code');
    const msg = document.getElementById('signup-msg');

    if (!usernameInput || !emailInput || !phoneInput || !passwordInput || !confirmInput || !countryCodeInput || !msg) {
        console.error('One or more signup form elements not found!');
        return;
    }

    const username = usernameInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();
    const phone = phoneInput.value.trim();
    const countryCode = countryCodeInput.value;
    const password = passwordInput.value;
    const confirm = confirmInput.value;

    console.log('Signup Data:', { username, email, phone, countryCode, password, confirm });

    clearError('signup-user-error');
    clearError('signup-email-error');
    clearError('signup-phone-error');
    clearError('signup-pass-error');
    clearError('signup-confirm-error');
    msg.innerText = '';

    let isValid = true;

    if (!isValidUsername(username)) {
        displayError('signup-user-error', 'Username must be 3-20 alphanumeric characters.');
        isValid = false;
    }

    if (!isValidEmail(email)) {
        displayError('signup-email-error', 'Invalid email address.');
        isValid = false;
    }

    if (!isValidPhone(phone)) {
        displayError('signup-phone-error', 'Invalid phone number.');
        isValid = false;
    }

    if (!isValidPassword(password)) {
        displayError('signup-pass-error', 'Password must be at least 6 characters.');
        isValid = false;
    }

    if (password !== confirm) {
        displayError('signup-confirm-error', 'Passwords do not match.');
        isValid = false;
    }

    if (!isValid) return;

    const userKey = username;
    console.log('Checking if username exists:', userKey);
    gun.get('imacx-accounts').get(userKey).once(async existing => {
        if (existing) {
            console.log('Username already exists:', existing);
            msg.innerText = 'Username already exists.';
        } else {
            const salt = generateSalt();
            const hashedPassword = await hashPassword(password, salt);

            const user = {
                username,
                email,
                phone: `${countryCode}${phone}`,
                password: hashedPassword, // Store the derived key
                salt: salt, // Store the salt
                created: timestampIST()
            };
            console.log('Storing new user:', user);
            gun.get('imacx-accounts').get(userKey).put(user, ack => {
                console.log('Signup ACK:', ack);
                if (ack.err) {
                    msg.innerText = 'Error creating account on GunDB.';
                    console.error('GunDB error:', ack.err);
                } else {
                    msg.innerText = 'Account created successfully!';
                    usernameInput.value = '';
                    emailInput.value = '';
                    phoneInput.value = '';
                    passwordInput.value = '';
                    confirmInput.value = '';
                }
            });
        }
    });
});

// --- Login Logic ---
document.getElementById('login-btn')?.addEventListener('click', async (event) => {
    event.preventDefault();
    console.log('Login button clicked!');

    const usernameInput = document.getElementById('login-user');
    const passwordInput = document.getElementById('login-pass');
    const msg = document.getElementById('login-msg');
    const statusInfo = document.getElementById('status-info');

    if (!usernameInput || !passwordInput || !msg || !statusInfo) {
        console.error('One or more login form elements not found!');
        return;
    }

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    console.log('Login Attempt:', { username, password });
    msg.innerText = '';

    if (!username || !password) {
        msg.innerText = 'Enter both username and password.';
        return;
    }

    gun.get('imacx-accounts').get(username).once(async data => {
        console.log('Login data retrieved:', data);
        if (data && data.password && data.salt) {
            const hashedPasswordAttempt = await hashPassword(password, data.salt);
            if (hashedPasswordAttempt === data.password) {
                msg.innerText = 'Login successful!';
                statusInfo.innerText = `Logged in as ${username}, created at ${data.created}`;
                localStorage.setItem('loggedInUser', username);
                localStorage.setItem('accountId', username); // Store account ID for cross-page access
                // loadAccountData(username); // Load user-specific data
            } else {
                msg.innerText = 'Invalid login credentials.';
            }
        } else {
            msg.innerText = 'Invalid login credentials.';
        }
    });
});

// --- Recover Password Logic ---
document.getElementById('recover-pass-btn')?.addEventListener('click', async (event) => {
    event.preventDefault();
    console.log('Recover Password button clicked!');

    const usernameInput = document.getElementById('recover-user');
    const emailInput = document.getElementById('recover-email');
    const phoneInput = document.querySelector('#recover-password-box input[type="tel"]');
    const countryCodeInput = document.querySelector('#recover-password-box select');
    const msg = document.getElementById('recover-msg');

    if (!usernameInput || !emailInput || !phoneInput || !countryCodeInput || !msg) {
        console.error('One or more recover password elements not found!');
        return;
    }

    const username = usernameInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();
    const phone = phoneInput.value.trim();
    const countryCode = countryCodeInput.value;

    console.log('Recover Password Attempt:', { username, email, phone, countryCode });

    clearError('recover-user-error');
    clearError('recover-email-error');
    clearError('recover-phone-error');
    msg.innerText = '';

    let isValid = true;

    if (!isValidUsername(username)) {
        displayError('recover-user-error', 'Invalid username format.');
        isValid = false;
    }

    if (!isValidEmail(email)) {
        displayError('recover-email-error', 'Invalid email address.');
        isValid = false;
    }

    if (!isValidPhone(phone)) {
        displayError('recover-phone-error', 'Invalid phone number format.');
        isValid = false;
    }

    if (!isValid) return;

    gun.get('imacx-accounts').get(username).once(data => {
        console.log('Recover Password Data Retrieved:', data);
        if (!data) {
            msg.innerText = 'No account found with that username.';
            return;
        }

        if (data.email === email && data.phone === `${countryCode}${phone}`) {
            msg.innerText = `Contact support to recover your password.`; // Implement a real password reset flow
        } else {
            msg.innerText = 'Information does not match. Cannot recover password.';
        }
    });
});

// --- Recover Username Logic ---
document.getElementById('recover-username-btn')?.addEventListener('click', async (event) => {
    event.preventDefault();
    console.log('Recover Username button clicked!');

    const emailInput = document.getElementById('username-recovery-email');
    const phoneInput = document.querySelector('#recover-username-box input[type="tel"]');
    const countryCodeInput = document.querySelector('#recover-username-box select');
    const passwordInput = document.getElementById('username-recovery-pass');
    const msg = document.getElementById('username-msg');

    if (!emailInput || !phoneInput || !countryCodeInput || !passwordInput || !msg) {
        console.error('One or more recover username elements not found!');
        return;
    }

    const email = emailInput.value.trim().toLowerCase();
    const phone = phoneInput.value.trim();
    const countryCode = countryCodeInput.value;
    const password = passwordInput.value;

    console.log('Recover Username Attempt:', { email, phone, countryCode, password });

    clearError('username-recovery-email-error');
    clearError('username-phone-error');
    clearError('username-recovery-pass-error');
    msg.innerText = '';

    let isValid = true;

    if (!isValidEmail(email)) {
        displayError('username-recovery-email-error', 'Invalid email address.');
        isValid = false;
    }

    if (!isValidPhone(phone)) {
        displayError('username-phone-error', 'Invalid phone number format.');
        isValid = false;
    }

    if (!isValidPassword(password)) {
        displayError('username-recovery-pass-error', 'Password must be at least 6 characters.');
        isValid = false;
    }

    if (!isValid) return;

    gun.get('imacx-accounts').map().once(async data => {
        console.log('Recover Username Data Iterated:', data);
        if (data && data.email === email && data.phone === `${countryCode}${phone}`) {
            const hashedPasswordAttempt = await hashPassword(password, data.salt);
            if (hashedPasswordAttempt === data.password) {
                msg.innerText = `Your username is: ${data.username}`;
            } else {
                msg.innerText = 'Could not verify account.';
            }
        }
    });

    setTimeout(() => {
        if (!msg.innerText.startsWith('Your username')) {
            msg.innerText = 'No matching account found with provided details.';
        }
    }, 2000);
});

// --- Account Data Handling and Cross-Page Persistence ---
function saveAccountData(accountId, key, value) {
    if (accountId) {
        gun.get('imacx-account-data').get(accountId).put({ [key]: value });
        console.log(`Data saved for account ${accountId}: ${key} - ${value}`);
    } else {
        console.warn('Account ID not available to save data.');
    }
}

function loadAccountData(accountId) {
    if (accountId) {
        gun.get('imacx-account-data').get(accountId).once(data => {
            console.log(`Account data loaded for ${accountId}:`, data);
            // Update UI with loaded data (you'll need to implement this)
        });
    } else {
        console.warn('Account ID not available to load data.');
    }
}

function checkLoggedInStatus() {
    const loggedInUser = localStorage.getItem('loggedInUser');
    const accountId = localStorage.getItem('accountId');
    const statusInfo = document.getElementById('status-info');
    if (loggedInUser && accountId && statusInfo) {
        statusInfo.innerText = `Logged in as ${loggedInUser} (Persistent)`;
        // loadAccountData(accountId); // Load account data on page load if logged in
    }
}

function logout() {
    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('accountId');
    const statusInfo = document.getElementById('status-info');
    if (statusInfo) {
        statusInfo.innerText = 'Logged out';
    }
    console.log('Logged out.');
    // Optionally redirect to login page
}

document.getElementById('logout-btn')?.addEventListener('click', logout);
checkLoggedInStatus();

// --- Disconnect/Connect Handling (GunDB handles this automatically) ---
gun.on('opt', function(opt){
    console.log("Gun is configured:", opt);
});

gun.on('hi', function(peer){
    console.log("Connected to peer:", peer);
});

gun.on('bye', function(peer){
    console.log("Disconnected from peer:", peer);
});

console.log('Account script loaded with crypto.subtle and vanilla validation.');
