// account.js
import Gun from 'gun';
import 'gun/sea'; // Optional: For secure data handling with SEA
import validator from 'validator';
import bcrypt from 'bcryptjs';

// Initialize GunDB
const gun = Gun();
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

// --- Signup Logic ---
document.getElementById('signup-btn')?.addEventListener('click', async (event) => {
    event.preventDefault(); // Prevent default form submission
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

    if (!isValid) {
        console.log('Signup failed due to validation errors.');
        return;
    }

    const userKey = username;
    console.log('Checking if username exists:', userKey);
    gun.get('imacx-accounts').get(userKey).once(async existing => {
        if (existing) {
            console.log('Username already exists:', existing);
            msg.innerText = 'Username already exists.';
        } else {
            console.log('Username is new, proceeding to hash password.');
            bcrypt.hash(password, 10, (err, hash) => {
                if (err) {
                    console.error("Error hashing password:", err);
                    msg.innerText = 'Error creating account.';
                    return;
                }

                const user = {
                    username,
                    email,
                    phone: `${countryCode}${phone}`,
                    password: hash, // Store the hashed password
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
                        if (usernameInput) usernameInput.value = '';
                        if (emailInput) emailInput.value = '';
                        if (phoneInput) phoneInput.value = '';
                        if (passwordInput) passwordInput.value = '';
                        if (confirmInput) confirmInput.value = '';
                    }
                });
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

    if (!usernameInput || !passwordInput || !msg) {
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

    gun.get('imacx-accounts').get(username).once(data => {
        console.log('Login data retrieved:', data);
        if (data) {
            bcrypt.compare(password, data.password, (err, result) => {
                if (err) {
                    console.error("Error comparing passwords:", err);
                    msg.innerText = 'Login failed.';
                    return;
                }
                if (result) {
                    msg.innerText = 'Login successful!';
                    const statusInfo = document.getElementById('status-info');
                    if (statusInfo) {
                        statusInfo.innerText = `Logged in as ${username}, created at ${data.created}`;
                    }
                    localStorage.setItem('loggedInUser', username);
                    // Optionally redirect
                } else {
                    msg.innerText = 'Invalid login credentials.';
                }
            });
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

    if (!username) {
        displayError('recover-user-error', 'Username is required.');
        isValid = false;
    }

    if (!isValidEmail(email)) {
        displayError('recover-email-error', 'Invalid email address.');
        isValid = false;
    }

    if (!isValidPhone(phone)) {
        displayError('recover-phone-error', 'Invalid phone number.');
        isValid = false;
    }

    if (!isValid) {
        return;
    }

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
document.getElementById('recover-username-btn')?.addEventListener('click', (event) => {
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
        displayError('username-phone-error', 'Invalid phone number.');
        isValid = false;
    }

    if (!isValidPassword(password)) {
        displayError('username-recovery-pass-error', 'Password must be at least 6 characters.');
        isValid = false;
    }

    if (!isValid) {
        return;
    }

    gun.get('imacx-accounts').map().once(data => {
        console.log('Recover Username Data Iterated:', data);
        if (data && data.email === email && data.phone === `${countryCode}${phone}`) {
            bcrypt.compare(password, data.password, (err, result) => {
                if (err) {
                    console.error("Error comparing passwords for username recovery:", err);
                    msg.innerText = 'Could not verify account.';
                    return;
                }
                if (result) {
                    msg.innerText = `Your username is: ${data.username}`;
                }
            });
        }
    });

    setTimeout(() => {
        if (!msg.innerText.startsWith('Your username')) {
            msg.innerText = 'No matching account found with provided details.';
        }
    }, 2000);
});
