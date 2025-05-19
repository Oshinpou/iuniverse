// account.js

// Initialize Gun with a public relay
const gun = Gun(['https://gun-manhattan.herokuapp.com/gun']);
const SEA = Gun.SEA;
const accountsNode = gun.get('imacx-accounts');

// --- Constants ---
const ELEMENT_IDS = {
    loginMsg: 'login-msg',
    signupMsg: 'signup-msg',
    recoverMsg: 'recover-msg',
    recoverUsernameMsg: 'recover-username-msg',
    statusInfo: 'status-info',
    logoutBtn: 'logout-btn',
    loginUser: 'login-user',
    loginPass: 'login-pass',
    signupUser: 'signup-user',
    signupEmail: 'signup-email',
    signupCountryCode: 'signup-country-code',
    signupPhone: 'signup-phone',
    signupPass: 'signup-pass',
    signupConfirm: 'signup-confirm',
    recoverUser: 'recover-user',
    recoverEmail: 'recover-email',
    recoverCountryCode: 'recover-country-code',
    recoverPhone: 'recover-phone',
    usernameRecoveryEmail: 'username-recovery-email',
    usernameCountryCode: 'username-country-code',
    usernamePhone: 'username-phone',
    usernameRecoveryPass: 'username-recovery-pass'
};

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
    Object.values(ELEMENT_IDS).forEach(id => displayMessage(id, ''));
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

// Unified function to check existence of usernames, emails, or phones
async function checkExists(type, value) {
    return new Promise(resolve => {
        accountsNode.get(type).get(value).once(data => {
            resolve(!!data);
        });
    });
}

// Unified function to get account by field
async function getAccountByField(field, value) {
    return new Promise(resolve => {
        accountsNode.get(field).get(value).once(alias => {
            if (alias) {
                gun.user(alias).once(user => resolve(user));
            } else {
                resolve(null);
            }
        });
    });
}

async function getAccountInfo(accountId) {
    return new Promise(resolve => {
        gun.user(accountId).get('info').once(resolve);
    });
}

async function setLoggedInStatus(accountId) {
    localStorage.setItem('imacx_logged_in', 'true');
    localStorage.setItem('imacx_current_account', accountId);
    localStorage.setItem('imacx_last_active', generateTimestamp());
    updateAccountStatus();
    window.dispatchEvent(new CustomEvent('imacx_login', { detail: { accountId: accountId } }));
}

function setLoggedOutStatus() {
    localStorage.removeItem('imacx_logged_in');
    localStorage.removeItem('imacx_current_account');
    localStorage.removeItem('imacx_alias');
    localStorage.removeItem('imacx_auth');
    localStorage.removeItem('imacx_pair');
    localStorage.removeItem('imacx_last_active');
    updateAccountStatus();
    window.dispatchEvent(new CustomEvent('imacx_logout'));
}

async function updateAccountStatus() {
    const statusInfo = document.getElementById(ELEMENT_IDS.statusInfo);
    const logoutBtn = document.getElementById(ELEMENT_IDS.logoutBtn);
    const loggedInAccountId = localStorage.getItem('imacx_current_account');
    const lastActive = localStorage.getItem('imacx_last_active');

    if (loggedInAccountId) {
        const accountInfo = await getAccountInfo(loggedInAccountId);
        const username = accountInfo ? accountInfo.username : 'Unknown';
        statusInfo.textContent = `Logged in as: ${username} (${loggedInAccountId}) - Last active: ${lastActive || 'N/A'}`;
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

// --- Cross-page Event Handling ---

window.addEventListener('storage', (event) => {
    if (event.key === 'imacx_logged_in') {
        continuousLogin(); // Re-evaluate login status on storage change
    }
});

window.addEventListener('imacx_login', () => {
    updateAccountStatus();
});

window.addEventListener('imacx_logout', () => {
    updateAccountStatus();
});

// --- Event Listeners ---

document.addEventListener('DOMContentLoaded', () => {
    continuousLogin();
    updateAccountStatus();

    // Login Button Event
    document.getElementById('login-btn').addEventListener('click', async () => {
        clearErrors();
        const username = document.getElementById(ELEMENT_IDS.loginUser).value;
        const password = document.getElementById(ELEMENT_IDS.loginPass).value;

        if (!username || !password) {
            displayMessage(ELEMENT_IDS.loginMsg, 'Please enter both username and password.', true);
            return;
        }

        const user = gun.user();
        user.auth(username, password, async (ack) => {
            if (ack.err) {
                displayMessage(ELEMENT_IDS.loginMsg, ack.err, true);
            } else {
                localStorage.setItem('imacx_alias', ack.sea.alias);
                localStorage.setItem('imacx_auth', await SEA.encrypt(ack, await SEA.secret(ack.sea.alias, ack.sea.pair)));
                localStorage.setItem('imacx_pair', JSON.stringify(ack.sea.pair));
                setLoggedInStatus(ack.sea.pub);
                displayMessage(ELEMENT_IDS.loginMsg, 'Login successful!');
            }
        });
    });

    // Logout Button Event
    document.getElementById(ELEMENT_IDS.logoutBtn).addEventListener('click', () => {
        gun.user().logout();
        setLoggedOutStatus();
        displayMessage(ELEMENT_IDS.statusInfo, 'Logged out.');
    });

    // Sign Up Button Event
    document.getElementById('signup-btn').addEventListener('click', async () => {
        clearErrors();
        const username = document.getElementById(ELEMENT_IDS.signupUser).value;
        const email = document.getElementById(ELEMENT_IDS.signupEmail).value;
        const countryCode = document.getElementById(ELEMENT_IDS.signupCountryCode).value;
        const phone = document.getElementById(ELEMENT_IDS.signupPhone).value;
        const password = document.getElementById(ELEMENT_IDS.signupPass).value;
        const confirmPassword = document.getElementById(ELEMENT_IDS.signupConfirm).value;
        const phoneWithCode = countryCode + phone;

        let hasErrors = false;

        if (!username) {
            displayMessage('signup-user-error', 'Username is required.', true);
            hasErrors = true;
        } else if (await checkExists('usernames', username)) {
            displayMessage('signup-user-error', 'Username already exists.', true);
            hasErrors = true;
        }

        if (!email) {
            displayMessage('signup-email-error', 'Email is required.', true);
            hasErrors = true;
        } else if (await checkExists('emails', email)) {
            displayMessage('signup-email-error', 'Email already exists.', true);
            hasErrors = true;
        }

        if (!phone) {
            displayMessage('signup-phone-error', 'Phone number is required.', true);
            hasErrors = true;
        } else {
            const existingAccountByPhone = await checkExists('phones', phoneWithCode);
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
                displayMessage(ELEMENT_IDS.signupMsg, ack.err, true);
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
                gun.user(accountId).get('info').put(accountInfo); // Store account info

                displayMessage(ELEMENT_IDS.signupMsg, 'Account created successfully!');

                // Optionally log in the user immediately after signup
                user.auth(username, password, async (authAck) => {
                    if (!authAck.err) {
                        localStorage.setItem('imacx_alias', authAck.sea.alias);
                        localStorage.setItem('imacx_auth', await SEA.encrypt(authAck, await SEA.secret(authAck.sea.alias, authAck.sea.pair)));
                        localStorage.setItem('imacx_pair', JSON.stringify(authAck.sea.pair));
                        setLoggedInStatus(authAck.sea.pub);
                        displayMessage(ELEMENT_IDS.loginMsg, 'Login successful after signup!');
                    } else {
                        console.warn("Error logging in after signup:", authAck.err);
                    }
                });
            }
        });
    });

    // Recover Password Button Event
    document.getElementById('recover-pass-btn').addEventListener('click', async () => {
        clearErrors();
        const username = document.getElementById(ELEMENT_IDS.recoverUser).value;
        const email = document.getElementById(ELEMENT_IDS.recoverEmail).value;
        const countryCode = document.getElementById(ELEMENT_IDS.recoverCountryCode).value;
        const phone = document.getElementById(ELEMENT_IDS.recoverPhone).value;
        const phoneWithCode = countryCode + phone;

        if (!username && !email && !phone) {
            displayMessage(ELEMENT_IDS.recoverMsg, 'Please provide at least one of username, email, or phone number.', true);
            return;
        }

        let foundAccount = null;
        if (username) foundAccount = await getAccountByField('usernames', username);
        if (!foundAccount && email) foundAccount = await getAccountByField('emails', email);
        if (!foundAccount && phone) foundAccount = await getAccountByField('phones', phoneWithCode);

        if (foundAccount) {
            displayMessage(ELEMENT_IDS.recoverMsg, 'Password recovery initiated. Please check your email/phone (simulation).');
            // Trigger a backend function to send a reset link/code based on the user's verified email or phone number.
        } else {
            displayMessage(ELEMENT_IDS.recoverMsg, 'No account found matching the provided information.', true);
        }
    });

    // Recover Username Button Event
    document.getElementById('recover-username-btn').addEventListener('click', async () => {
        clearErrors();
        const email = document.getElementById(ELEMENT_IDS.usernameRecoveryEmail).value;
        const countryCode = document.getElementById(ELEMENT_IDS.usernameCountryCode).value;
        const phone = document.getElementById(ELEMENT_IDS.usernamePhone).value;
        const password = document.getElementById(ELEMENT_IDS.usernameRecoveryPass).value;
        const phoneWithCode = countryCode + phone;

        if (!email && !phone) {
            displayMessage(ELEMENT_IDS.recoverUsernameMsg, 'Please provide either email or phone number.', true);
            return;
        }
        if (!password) {
            displayMessage('username-recovery-pass-error', 'Password is required.', true);
            return;
        }

        let foundAccountInfo = null;
        if (email) {
            const account = await getAccountByField('emails', email);
            if (account) foundAccountInfo = await getAccountInfo(account.sea.pub); // Get info using pub key
        }
        if (!foundAccountInfo && phone) {
            const account = await getAccountByField('phones', phoneWithCode);
            if (account) foundAccountInfo = await getAccountInfo(account.sea.pub); // Get info using pub key
        }

        if (foundAccountInfo) {
            const user = gun.user(foundAccountInfo.id);
            user.auth(foundAccountInfo.username, password, ack => {
                if (!ack.err) {
                    displayMessage(ELEMENT_IDS.recoverUsernameMsg, `Your username is: ${foundAccountInfo.username}`);
                    // In a real app, you might also send this to the user's email/phone.
                } else {
                    displayMessage(ELEMENT_IDS.recoverUsernameMsg, 'Incorrect password.', true);
                }
            });
        } else {
            displayMessage(ELEMENT_IDS.recoverUsernameMsg, 'No account found matching the provided information.', true);
        }
    });
});

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
                callback(null); // Handle no data case
            }
        });
    } else {
        console.warn("Not logged in, cannot load data.");
    }
}

// Example usage:
// document.getElementById('save-button').addEventListener('click', () => saveUserData('mySetting', 'someValue'));
// loadUserData('mySetting', (value) => console.log('My setting:', value));

                        
