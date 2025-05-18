// account.js
import Gun from 'gun';
import 'gun/sea'; // For secure data handling with SEA
import validator from 'validator';
import { sha256 } from 'js-sha256'; // Lightweight SHA-256

// Initialize GunDB (using a public peer for global access - consider your own setup)
const gun = Gun(['https://gun.peers.crunk.house/gun']);
console.log('GunDB initialized:', gun);

// Function to get current timestamp in IST
function timestampIST() {
    const date = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    return new Date(date).toISOString();
}

// --- Utility Functions ---
function isValidUsername(username) {
    const valid = validator.isLength(username, { min: 3, max: 20 }) && /^[a-zA-Z0-9]+$/.test(username);
    console.log('isValidUsername:', username, valid);
    return valid;
}

function isValidEmail(email) {
    const valid = validator.isEmail(email);
    console.log('isValidEmail:', email, valid);
    return valid;
}

function isValidPhone(phone) {
    const valid = validator.isMobilePhone(phone);
    console.log('isValidPhone:', phone, valid);
    return valid;
}

function isValidPassword(password) {
    const valid = validator.isLength(password, { min: 6 });
    console.log('isValidPassword:', password, valid);
    return valid;
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

// Function to generate a simple salt
function generateSalt() {
    return Math.random().toString(36).substring(2, 15);
}

// Function to hash password with salt using SHA-256
function hashPassword(password, salt) {
    return sha256(salt + password);
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

    // ... (Input element checks as before) ...

    const username = usernameInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();
    const phone = phoneInput.value.trim();
    const countryCode = countryCodeInput.value;
    const password = passwordInput.value;
    const confirm = confirmInput.value;

    // ... (Validation as before) ...

    if (!isValid) return;

    const userKey = username;
    console.log('Checking if username exists:', userKey);
    gun.get('imacx-accounts').get(userKey).once(async existing => {
        if (existing) {
            console.log('Username already exists:', existing);
            msg.innerText = 'Username already exists.';
        } else {
            const salt = generateSalt();
            const hashedPassword = hashPassword(password, salt);

            const user = {
                username,
                email,
                phone: `${countryCode}${phone}`,
                password: hashedPassword, // Store the hashed password
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
                    // Optionally clear the form
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
document.getElementById('login-btn')?.addEventListener('click', (event) => {
    event.preventDefault();
    console.log('Login button clicked!');

    const usernameInput = document.getElementById('login-user');
    const passwordInput = document.getElementById('login-pass');
    const msg = document.getElementById('login-msg');
    const statusInfo = document.getElementById('status-info');

    // ... (Input element checks) ...

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    console.log('Login Attempt:', { username, password });
    msg.innerText = '';

    if (!username || !password) {
        msg.innerText = 'Enter both username and password.';
        return;
    }

    gun.get('imacx-accounts').get(username).once(data => {
        console.log('Login data retrieved:', data);
        if (data && data.password && data.salt) {
            const hashedPasswordAttempt = hashPassword(password, data.salt);
            if (hashedPasswordAttempt === data.password) {
                msg.innerText = 'Login successful!';
                if (statusInfo) {
                    statusInfo.innerText = `Logged in as ${username}, created at ${data.created}`;
                }
                localStorage.setItem('loggedInUser', username);
                localStorage.setItem('accountId', username); // Store account ID for cross-page access
                // Optionally redirect to a logged-in page
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
document.getElementById('recover-pass-btn')?.addEventListener('click', (event) => {
    event.preventDefault();
    console.log('Recover Password button clicked!');

    const usernameInput = document.getElementById('recover-user');
    const emailInput = document.getElementById('recover-email');
    const phoneInput = document.querySelector('#recover-password-box input[type="tel"]');
    const countryCodeInput = document.querySelector('#recover-password-box select');
    const msg = document.getElementById('recover-msg');

    // ... (Input element checks and validation as before) ...

    if (!isValid) return;

    gun.get('imacx-accounts').get(username).once(data => {
        console.log('Recover Password Data Retrieved:', data);
        if (!data) {
            msg.innerText = 'No account found with that username.';
            return;
        }

        if (data.email === email && data.phone === `${countryCode}${phone}`) {
            msg.innerText = `Contact support to recover your password.`; // Implement a real password reset flow (e.g., send email)
        } else {
            msg.innerText = 'Information does not match. Cannot recover password.';
        }
    });
});

// --- Recover Username Logic ---
document.getElementById('recover-username-btn')?.addEventListener('click', (event) => {
    event.preventDefault();
    console.log('Recover Username button clicked!');

    const emailInput = document.getElementById('username-recovery-email');
    const phoneInput = document.querySelector('#recover-username-box input[type="tel"]');
    const countryCodeInput = document.querySelector('#recover-username-box select');
    const passwordInput = document.getElementById('username-recovery-pass');
    const msg = document.getElementById('username-msg');

    // ... (Input element checks and validation as before) ...

    if (!isValid) return;

    gun.get('imacx-accounts').map().once(data => {
        console.log('Recover Username Data Iterated:', data);
        if (data && data.email === email && data.phone === `${countryCode}${phone}`) {
            const hashedPasswordAttempt = hashPassword(password, data.salt); // Assuming salt is stored
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

// --- Account Data Handling (Example) ---
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
            // Update UI with loaded data
        });
    } else {
        console.warn('Account ID not available to load data.');
    }
}

// --- Cross-Page Login Persistence ---
function checkLoggedInStatus() {
    const loggedInUser = localStorage.getItem('loggedInUser');
    const accountId = localStorage.getItem('accountId');
    const statusInfo = document.getElementById('status-info');
    if (loggedInUser && accountId && statusInfo) {
        statusInfo.innerText = `Logged in as ${loggedInUser} (Persistent)`;
        // Optionally load account data here if needed on page load
        // loadAccountData(accountId);
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
    // Optionally redirect to a login page
}

// Attach logout functionality to a button (you'll need to add this button in your HTML)
document.getElementById('logout-btn')?.addEventListener('click', logout);

// Check login status on page load
checkLoggedInStatus();

// --- Disconnect/Connect Handling (GunDB handles this automatically) ---
// GunDB automatically tries to reconnect to peers if the connection is lost.
// You can monitor connection status if needed using Gun's events.
gun.on('opt', function(opt){
    console.log("Gun is configured:", opt);
});

gun.on('hi', function(peer){
    console.log("Connected to peer:", peer);
});

gun.on('bye', function(peer){
    console.log("Disconnected from peer:", peer);
});

// --- "Logged in forever unless logged out" ---
// This is achieved through localStorage persistence of 'loggedInUser' and 'accountId'.
// As long as the user doesn't clear their browser data or explicitly logs out,
// the 'checkLoggedInStatus' function on page load will recognize their session.

console.log('Account script loaded.');
