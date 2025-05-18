// Initialize GunDB
const gun = Gun();

// Function to get current timestamp in IST
function timestampIST() {
    const date = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    return new Date(date).toISOString();
}

// --- Utility Functions ---
function isValidUsername(username) {
    return validator.isLength(username, { min: 3, max: 20 }) && /^[a-zA-Z0-9]+$/.test(username);
}

function isValidEmail(email) {
    return validator.isEmail(email);
}

function isValidPhone(phone) {
    return validator.isMobilePhone(phone);
}

function isValidPassword(password) {
    return validator.isLength(password, { min: 6 });
}

function displayError(elementId, message) {
    document.getElementById(elementId).innerText = message;
}

function clearError(elementId) {
    document.getElementById(elementId).innerText = '';
}

// --- Signup Logic ---
document.getElementById('signup-btn').addEventListener('click', async (event) => {
    event.preventDefault(); // Prevent default form submission

    const usernameInput = document.getElementById('signup-user');
    const emailInput = document.getElementById('signup-email');
    const phoneInput = document.getElementById('signup-phone');
    const passwordInput = document.getElementById('signup-pass');
    const confirmInput = document.getElementById('signup-confirm');
    const countryCodeInput = document.getElementById('signup-country-code');
    const msg = document.getElementById('signup-msg');

    const username = usernameInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();
    const phone = phoneInput.value.trim();
    const countryCode = countryCodeInput.value;
    const password = passwordInput.value;
    const confirm = confirmInput.value;

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
        return;
    }

    const userKey = username;
    gun.get('imacx-accounts').get(userKey).once(async existing => {
        if (existing) {
            msg.innerText = 'Username already exists.';
        } else {
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
                gun.get('imacx-accounts').get(userKey).put(user);
                msg.innerText = 'Account created successfully!';
                // Optionally clear the form
                document.getElementById('signup-user').value = '';
                document.getElementById('signup-email').value = '';
                document.getElementById('signup-phone').value = '';
                document.getElementById('signup-pass').value = '';
                document.getElementById('signup-confirm').value = '';
            });
        }
    });
});

// --- Login Logic ---
document.getElementById('login-btn').addEventListener('click', (event) => {
    event.preventDefault();

    const usernameInput = document.getElementById('login-user');
    const passwordInput = document.getElementById('login-pass');
    const msg = document.getElementById('login-msg');

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    msg.innerText = '';

    if (!username || !password) {
        msg.innerText = 'Enter both username and password.';
        return;
    }

    gun.get('imacx-accounts').get(username).once(data => {
        if (data) {
            bcrypt.compare(password, data.password, (err, result) => {
                if (err) {
                    console.error("Error comparing passwords:", err);
                    msg.innerText = 'Login failed.';
                    return;
                }
                if (result) {
                    msg.innerText = 'Login successful!';
                    document.getElementById('status-info').innerText = `Logged in as ${username}, created at ${data.created}`;
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
document.getElementById('recover-pass-btn').addEventListener('click', (event) => {
    event.preventDefault();

    const usernameInput = document.getElementById('recover-user');
    const emailInput = document.getElementById('recover-email');
    const phoneInput = document.querySelector('#recover-password-box input[type="tel"]');
    const countryCodeInput = document.querySelector('#recover-password-box select');
    const msg = document.getElementById('recover-msg');

    const username = usernameInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();
    const phone = phoneInput.value.trim();
    const countryCode = countryCodeInput.value;

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
document.getElementById('recover-username-btn').addEventListener('click', (event) => {
    event.preventDefault();

    const emailInput = document.getElementById('username-recovery-email');
    const phoneInput = document.querySelector('#recover-username-box input[type="tel"]');
    const countryCodeInput = document.querySelector('#recover-username-box select');
    const passwordInput = document.getElementById('username-recovery-pass');
    const msg = document.getElementById('username-msg');

    const email = emailInput.value.trim().toLowerCase();
    const phone = phoneInput.value.trim();
    const countryCode = countryCodeInput.value;
    const password = passwordInput.value;

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
        if (data && data.email === email && data.phone === `${countryCode}${phone}`) {
            bcrypt.compare(password, data.password, (err, result) => {
                if (err) {
                    console.error("Error comparing passwords:", err);
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
