// account.js

// Initialize Gun with a public relay
const gun = Gun(['https://gun-manhattan.herokuapp.com/gun']);
const SEA = Gun.SEA;
const accountsNode = gun.get('imacx-accounts');

// --- Utility Functions ---

function generateTimestamp() {
    return moment().tz('Asia/Kolkata').format();
}

function displayMessage(elementId, message, isError = false) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.className = isError ? 'text-red-500' : 'text-green-500';
    } else {
        console.error(`Element with ID '${elementId}' not found.`);
    }
}

function clearErrors() {
    const errorElements = document.querySelectorAll('.error-message');
    errorElements.forEach(element => element.textContent = '');
    displayMessage('login-msg', '');
    displayMessage('signup-msg', '');
    displayMessage('recover-msg', '');
    displayMessage('recover-username-msg', '');
}

async function getLoggedInAccountId() {
    const alias = localStorage.getItem('imacx_alias');
    if (alias) {
        try {
            const auth = await SEA.decrypt(localStorage.getItem('imacx_auth'), await SEA.secret(alias, localStorage.getItem('imacx_pair')));
            return auth ? auth.sea.pub : null;
        } catch (e) {
            console.error("Error decrypting auth:", e);
            return null;
        }
    }
    return null;
}

async function storeAccountData(accountId, data) {
    const userNode = gun.user(accountId);
    userNode.get('data').put(data);
    console.log(`Data stored for account: ${accountId}`, data);
}

async function getAccountData(accountId, callback) {
    const userNode = gun.user(accountId);
    userNode.get('data').on(callback);
}

async function checkUsernameExists(username) {
    return new Promise(resolve => {
        accountsNode.get('usernames').get(username).once(data => {
            resolve(!!data);
        });
    });
}

async function checkEmailExists(email) {
    return new Promise(resolve => {
        accountsNode.get('emails').get(email).once(data => {
            resolve(!!data);
        });
    });
}

async function checkPhoneExists(phoneWithCode) {
    return new Promise(resolve => {
        accountsNode.get('phones').get(phoneWithCode).once(data => {
            resolve(!!data);
        });
    });
}

async function getAccountByUsername(username) {
    return new Promise(resolve => {
        accountsNode.get('usernames').get(username).once(alias => {
            if (alias) {
                gun.user(alias).once(user => resolve(user));
            } else {
                resolve(null);
            }
        });
    });
}

async function getAccountByEmail(email) {
    return new Promise(resolve => {
        accountsNode.get('emails').get(email).once(alias => {
            if (alias) {
                gun.user(alias).once(user => resolve(user));
            } else {
                resolve(null);
            }
        });
    });
}

async function getAccountByPhone(phoneWithCode) {
    return new Promise(resolve => {
        accountsNode.get('phones').get(phoneWithCode).once(alias => {
            if (alias) {
                gun.user(alias).once(user => resolve(user));
            } else {
                resolve(null);
            }
        });
    });
}

async function setLoggedInStatus(accountId) {
    localStorage.setItem('imacx_logged_in', 'true');
    localStorage.setItem('imacx_current_account', accountId);
    updateAccountStatus();
}

function setLoggedOutStatus() {
    localStorage.removeItem('imacx_logged_in');
    localStorage.removeItem('imacx_current_account');
    localStorage.removeItem('imacx_alias');
    localStorage.removeItem('imacx_auth');
    localStorage.removeItem('imacx_pair');
    updateAccountStatus();
}

function updateAccountStatus() {
    const statusInfo = document.getElementById('status-info');
    const logoutBtn = document.getElementById('logout-btn');
    const loggedInAccountId = localStorage.getItem('imacx_current_account');

    if (loggedInAccountId) {
        statusInfo.textContent = `Logged in as: ${loggedInAccountId}`;
        logoutBtn.style.display = 'block';
    } else {
        statusInfo.textContent = 'Not logged in.';
        logoutBtn.style.display = 'none';
    }
}

async function continuousLogin() {
    const alias = localStorage.getItem('imacx_alias');
    const auth = localStorage.getItem('imacx_auth');
    const pair = localStorage.getItem('imacx_pair');

    if (alias && auth && pair) {
        try {
            const decryptedAuth = await SEA.decrypt(auth, await SEA.secret(alias, pair));
            if (decryptedAuth && decryptedAuth.sea && decryptedAuth.sea.pub) {
                setLoggedInStatus(decryptedAuth.sea.pub);
            } else {
                setLoggedOutStatus();
            }
        } catch (e) {
            console.error("Continuous login error:", e);
            setLoggedOutStatus();
        }
    } else {
        setLoggedOutStatus();
    }
}

// --- Event Listeners ---

document.addEventListener('DOMContentLoaded', () => {
    continuousLogin();
    updateAccountStatus();

    // Login
    document.getElementById('login-btn').addEventListener('click', async () => {
        clearErrors();
        const username = document.getElementById('login-user').value;
        const password = document.getElementById('login-pass').value;

        if (!username || !password) {
            displayMessage('login-msg', 'Please enter both username and password.', true);
            return;
        }

        const user = gun.user();
        user.auth(username, password, async (ack) => {
            if (ack.err) {
                displayMessage('login-msg', ack.err, true);
            } else {
                localStorage.setItem('imacx_alias', ack.sea.alias);
                localStorage.setItem('imacx_auth', await SEA.encrypt(ack, await SEA.secret(ack.sea.alias, ack.sea.pair)));
                localStorage.setItem('imacx_pair', JSON.stringify(ack.sea.pair));
                setLoggedInStatus(ack.sea.pub);
                displayMessage('login-msg', 'Login successful!');
            }
        });
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', () => {
        gun.user().logout();
        setLoggedOutStatus();
        displayMessage('status-info', 'Logged out.');
    });

    // Sign Up
    document.getElementById('signup-btn').addEventListener('click', async () => {
        clearErrors();
        const username = document.getElementById('signup-user').value;
        const email = document.getElementById('signup-email').value;
        const countryCode = document.getElementById('signup-country-code').value;
        const phone = document.getElementById('signup-phone').value;
        const password = document.getElementById('signup-pass').value;
        const confirmPassword = document.getElementById('signup-confirm').value;
        const phoneWithCode = countryCode + phone;

        let hasErrors = false;

        if (!username) {
            displayMessage('signup-user-error', 'Username is required.', true);
            hasErrors = true;
        } else if (await checkUsernameExists(username)) {
            displayMessage('signup-user-error', 'Username already exists.', true);
            hasErrors = true;
        }

        if (!email) {
            displayMessage('signup-email-error', 'Email is required.', true);
            hasErrors = true;
        } else if (await checkEmailExists(email)) {
            displayMessage('signup-email-error', 'Email already exists.', true);
            hasErrors = true;
        }

        if (!phone) {
            displayMessage('signup-phone-error', 'Phone number is required.', true);
            hasErrors = true;
        } else {
            const existingAccountByPhone = await getAccountByPhone(phoneWithCode);
            if (existingAccountByPhone) {
                displayMessage('signup-phone-error', 'Phone number already registered with this country code.', true);
                hasErrors = true;
            }
        }

        if (!password) {
            displayMessage('signup-pass-error', 'Password is required.', true);
            hasErrors = true;
        } else if (password.length < 6) {
            displayMessage('signup-pass-error', 'Password must be at least 6 characters.', true);
            hasErrors = true;
        }

        if (password !== confirmPassword) {
            displayMessage('signup-confirm-error', 'Passwords do not match.', true);
            hasErrors = true;
        }

        if (hasErrors) {
            return;
        }

        const user = gun.user();
        user.create(username, password, async (ack) => {
            if (ack.err) {
                displayMessage('signup-msg', ack.err, true);
            } else {
                const accountId = ack.pub;
                const timestamp = generateTimestamp();
                const accountInfo = {
                    id: accountId,
                    username: username,
                    email: email,
                    phone: phoneWithCode,
                    created_at: timestamp
                };

                accountsNode.get('usernames').get(username).put(accountId);
                accountsNode.get('emails').get(email).put(accountId);
                accountsNode.get('phones').get(phoneWithCode).put(accountId);

                await storeAccountData(accountId, { info: accountInfo, data: {} }); // Initial data structure

                displayMessage('signup-msg', 'Account created successfully! You can now log in.');
                // Optionally log in the user immediately after signup
                user.auth(username, password, async (authAck) => {
                    if (!authAck.err) {
                        localStorage.setItem('imacx_alias', authAck.sea.alias);
                        localStorage.setItem('imacx_auth', await SEA.encrypt(authAck, await SEA.secret(authAck.sea.alias, authAck.sea.pair)));
                        localStorage.setItem('imacx_pair', JSON.stringify(authAck.sea.pair));
                        setLoggedInStatus(authAck.sea.pub);
                        displayMessage('login-msg', 'Login successful after signup!');
                    } else {
                        console.warn("Error logging in after signup:", authAck.err);
                    }
                });
            }
        });
    });

    // Recover Password (Basic implementation - needs backend integration for actual reset)
    document.getElementById('recover-pass-btn').addEventListener('click', async () => {
        clearErrors();
        const username = document.getElementById('recover-user').value;
        const email = document.getElementById('recover-email').value;
        const countryCode = document.getElementById('recover-country-code').value;
        const phone = document.getElementById('recover-phone').value;
        const phoneWithCode = countryCode + phone;

        if (!username && !email && !phone) {
            displayMessage('recover-msg', 'Please provide at least one of username, email, or phone number.', true);
            return;
        }

        // In a real scenario, you would send a password reset link/code to the user's email or phone.
        // This is a client-side simulation.
        let foundAccount = null;
        if (username) foundAccount = await getAccountByUsername(username);
        if (!foundAccount && email) foundAccount = await getAccountByEmail(email);
        if (!foundAccount && phone) foundAccount = await getAccountByPhone(phoneWithCode);

        if (foundAccount) {
            displayMessage('recover-msg', 'Password recovery initiated. Please check your email/phone (simulation).');
            // In a real app, trigger a backend function to send a reset link/code.
        } else {
            displayMessage('recover-msg', 'No account found matching the provided information.', true);
        }
    });

    // Recover Username (Basic implementation - needs backend integration for actual retrieval)
    document.getElementById('recover-username-btn').addEventListener('click', async () => {
        clearErrors();
        const email = document.getElementById('username-recovery-email').value;
        const countryCode = document.getElementById('username-country-code').value;
        const phone = document.getElementById('username-phone').value;
        const password = document.getElementById('username-recovery-pass').value;
        const phoneWithCode = countryCode + phone;

        if (!email && !phone) {
            displayMessage('recover-username-msg', 'Please provide either email or phone number.', true);
            return;
        }
        if (!password) {
            displayMessage('username-recovery-pass-error', 'Password is required.', true);
            return;
        }

        // In a real scenario, you would verify the password and then send the username to the email/phone.
        // This is a client-side simulation.
        let foundAccount = null;
        if (email) foundAccount = await getAccountByEmail(email);
        if (!foundAccount && phone) foundAccount = await getAccountByPhone(phoneWithCode);

        if (foundAccount) {
            // Simulate password verification (in real app, compare hash)
            const userNode = gun.user(foundAccount.info.id);
            userNode.auth(foundAccount.info.username, password, ack => {
                if (!ack.err) {
                    displayMessage('recover-username-msg', `Your username is: ${foundAccount.info.username}`);
                    // In a real app, you might also send this to the user's email/phone.
                } else {
                    displayMessage('recover-username-msg', 'Incorrect password.', true);
                }
            });
        } else {
            displayMessage('recover-username-msg', 'No account found matching the provided information.', true);
        }
    });
});

// --- Cross-page Connect/Disconnect and Login Status ---

// Listen for custom events to handle cross-page communication
window.addEventListener('imacx_login', (event) => {
    if (event.detail && event.detail.accountId) {
        setLoggedInStatus(event.detail.accountId);
    }
});

window.addEventListener('imacx_logout', () => {
    setLoggedOutStatus();
});

// Periodically check login status (can be optimized with BroadcastChannel API if wider browser support is needed)
setInterval(updateAccountStatus, 1000);

// --- Global Distributed Storage and Account Data ---

// Example of storing and retrieving user-specific data
async function saveUserData(key, value) {
    const loggedInAccountId = await getLoggedInAccountId();
    if (loggedInAccountId) {
        const dataToStore = {};
        dataToStore[key] = value;
        await storeAccountData(loggedInAccountId, dataToStore);
    } else {
        console.warn("Not logged in, cannot save data.");
    }
}

async function loadUserData(key, callback) {
    const loggedInAccountId = await getLoggedInAccountId();
    if (loggedInAccountId) {
        getAccountData(loggedInAccountId, (accountData) => {
            if (accountData && accountData.data && accountData.data[key]) {
                callback(accountData.data[key]);
            } else {
                callback(null); // Or handle no data case
            }
        });
    } else {
        console.warn("Not logged in, cannot load data.");
    }
}

// Example usage:
// document.getElementById('save-button').addEventListener('click', () => saveUserData('mySetting', 'someValue'));
// loadUserData('mySetting', (value) => console.log('My setting:', value));
