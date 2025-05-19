// account.js

// Initialize Gun with a public relay (consider using multiple relays for redundancy)
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
    // Send a custom event for cross-page login
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
    // Send a custom event for cross-page logout
    window.dispatchEvent(new CustomEvent('imacx_logout'));
}

async function updateAccountStatus() {
    const statusInfo = document.getElementById('status-info');
    const logoutBtn = document.getElementById('logout-btn');
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

   
    const gun = Gun();
    const users = gun.get('imacx-users');

    document.getElementById("signup-btn").addEventListener("click", async () => {
        const username = document.getElementById("signup-user").value.trim();
        const email = document.getElementById("signup-email").value.trim();
        const phone = document.getElementById("signup-phone").value.trim();
        const countryCode = document.getElementById("signup-country-code").value;
        const password = document.getElementById("signup-pass").value;
        const confirm = document.getElementById("signup-confirm").value;

        // Clear error messages
        document.getElementById("signup-user-error").textContent = "";
        document.getElementById("signup-email-error").textContent = "";
        document.getElementById("signup-phone-error").textContent = "";
        document.getElementById("signup-pass-error").textContent = "";
        document.getElementById("signup-confirm-error").textContent = "";

        // Validation
        if (!username) return document.getElementById("signup-user-error").textContent = "Username is required";
        if (!email.includes("@")) return document.getElementById("signup-email-error").textContent = "Invalid email";
        if (phone.length < 6) return document.getElementById("signup-phone-error").textContent = "Invalid phone number";
        if (password.length < 6) return document.getElementById("signup-pass-error").textContent = "Password must be at least 6 characters";
        if (password !== confirm) return document.getElementById("signup-confirm-error").textContent = "Passwords do not match";

        const fullPhone = `${countryCode}${phone}`;
        const fullID = `imacx-user-${username}`;

        // Check if user exists
        users.get(fullID).once((data) => {
            if (data) {
                document.getElementById("signup-user-error").textContent = "Username already exists";
            } else {
                // Securely create user using GUN SEA
                Gun.SEA.pair().then(async pair => {
                    const encryptedPass = await Gun.SEA.encrypt(password, pair);
                    const userData = {
                        username,
                        email,
                        phone: fullPhone,
                        pub: pair.pub,
                        alias: username,
                        password: encryptedPass
                    };
                    users.get(fullID).put(userData, (ack) => {
                        if (ack.err) {
                            document.getElementById("signup-msg").textContent = "Error signing up. Try again.";
                        } else {
                            document.getElementById("signup-msg").textContent = "Signup successful!";
                        }
                    });
                });
            }
        });
    });

    
document.getElementById("signup-button").addEventListener("click", function () {
  var email = document.getElementById("signup-email").value.trim().toLowerCase();
  var countryCode = document.getElementById("signup-country-code").value;
  var phone = document.getElementById("signup-phone").value.trim();
  var fullPhone = countryCode + phone;

  // Clear previous error messages
  document.getElementById("signup-email-error").textContent = "";

  // Prepare request data
  var requestData = JSON.stringify({ email: email, phone: fullPhone });

  var xhr = new XMLHttpRequest();
  xhr.open("POST", "/api/check-email-or-phone-exists", true); // Updated endpoint
  xhr.setRequestHeader("Content-Type", "application/json");

  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        var result = JSON.parse(xhr.responseText);
        
        if (result.exists) {
          document.getElementById("signup-email-error").textContent = "Same email or phone number with this country code already used.";
          return;
        }

        // Continue signup
        continueSignup(email, fullPhone);

      } else {
        document.getElementById("signup-email-error").textContent = "Error checking credentials.";
      }
    }
  };

  xhr.send(requestData);
});

        

    // Recover Password
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

        let foundAccount = null;
        if (username) foundAccount = await getAccountByUsername(username);
        if (!foundAccount && email) foundAccount = await getAccountByEmail(email);
        if (!foundAccount && phone) foundAccount = await getAccountByPhone(phoneWithCode);

        if (foundAccount) {
            displayMessage('recover-msg', 'Password recovery initiated. Please check your email/phone (simulation).');
            // In a real app, you would now trigger a backend function to send a reset link/code
            // based on the user's verified email or phone number.
            // For a fully functional example with Gun, you might store a reset token
            // associated with the user and provide a mechanism to verify it and set a new password.
        } else {
            displayMessage('recover-msg', 'No account found matching the provided information.', true);
        }
    });

    // Recover Username
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

        let foundAccountInfo = null;
        let foundAccountId = null;
        if (email) {
            const account = await getAccountByEmail(email);
            if (account && account.sea && account.sea.pub) {
                foundAccountId = account.sea.pub;
                foundAccountInfo = await getAccountInfo(foundAccountId);
            }
        }
        if (!foundAccountInfo && phone) {
            const account = await getAccountByPhone(phoneWithCode);
            if (account && account.sea && account.sea.pub) {
                foundAccountId = account.sea.pub;
                foundAccountInfo = await getAccountInfo(foundAccountId);
            }
        }

        if (foundAccountInfo) {
            const user = gun.user(foundAccountId);
            user.auth(foundAccountInfo.username, password, ack => {
                if (!ack.err) {
                    displayMessage('recover-username-msg', `Your username is: ${foundAccountInfo.username}`);
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
// document.getElementById('save-button').addEventListener('click', ()
