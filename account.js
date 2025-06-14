// Initialize Gun with a public relay (consider using multiple relays for redundancy)
const gun = Gun(['https://gun-manhattan.herokuapp.com/gun']);
const SEA = Gun.SEA;
const users = gun.get('imacx-accounts');

// Utility function to display messages
function showMessage(elementId, message, type = 'info') {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.className = type === 'error' ? 'text-red-500' :
                        type === 'success' ? 'text-green-500' :
                        type === 'warning' ? 'text-yellow-500' : 'text-blue-500';
}

// Function to check if email or phone already exists
function checkIfEmailOrPhoneExists(email, fullPhone, callback) {
    let found = false;

    users.map().once((data) => {
        if (data) {
            const storedEmail = (data.email || "").toLowerCase();
            const storedPhone = data.phone || "";

            if (storedEmail === email || storedPhone === fullPhone) {
                found = true;
            }
        }
    });

    setTimeout(() => callback(found), 1500); // wait briefly to collect map results
}

// Signup Event Listener
document.getElementById("signup-btn").addEventListener("click", async () => {
    const username = document.getElementById("signup-user").value.trim();
    const email = document.getElementById("signup-email").value.trim().toLowerCase();
    const phone = document.getElementById("signup-phone").value.trim();
    const countryCode = document.getElementById("signup-country-code").value.trim();
    const password = document.getElementById("signup-pass").value;
    const confirm = document.getElementById("signup-confirm").value;

    // Clear previous messages
    ['signup-user-error', 'signup-email-error', 'signup-phone-error', 'signup-pass-error', 'signup-confirm-error', 'signup-msg'].forEach(id => {
        document.getElementById(id).textContent = "";
    });

    // Basic validation
    if (!username) return showMessage('signup-user-error', "Username is required", 'error');
    if (!email.includes("@")) return showMessage('signup-email-error', "Invalid email", 'error');
    if (phone.length < 6) return showMessage('signup-phone-error', "Invalid phone number", 'error');
    if (password.length < 6) return showMessage('signup-pass-error', "Password too short", 'error');
    if (password !== confirm) return showMessage('signup-confirm-error', "Passwords do not match", 'error');

    const fullPhone = `${countryCode}${phone}`;
    const userId = `imacx-user-${username}`;

    // Check if email or phone exists
    checkIfEmailOrPhoneExists(email, fullPhone, (exists) => {
        if (exists) {
            showMessage('signup-msg', "Email or phone with same country code already used.", 'error');
            return;
        }

        // Check if username is already taken
        users.get(userId).once((existingUser) => {
            if (existingUser) {
                showMessage('signup-user-error', "Username already exists", 'error');
                return;
            }

            // create account securely
document.getElementById('signup-btn').addEventListener('click', function() {
    var password = document.getElementById('signup-pass').value.trim();
    var confirm = document.getElementById('signup-confirm').value.trim();

    if (!password || !confirm) {
        showMessage('signup-msg', "Password fields cannot be empty.", 'error');
        return;
    }

    if (password !== confirm) {
        showMessage('signup-msg', "Passwords do not match.", 'error');
        return;
    }

    var pair;
    var userId = generateUserId(); // Function to generate unique user ID
    var username = document.getElementById('signup-username').value.trim();
    var email = document.getElementById('signup-email').value.trim();
    var fullPhone = document.getElementById('signup-phone').value.trim();

    SEA.pair().then(function(newPair) {
        pair = newPair;
        return Promise.all([SEA.encrypt(password, pair), SEA.encrypt(confirm, pair)]);
    }).then(function([encryptedPass, encryptedConfirm]) {
        var istDate = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

        var userData = {
            username: username,
            email: email,
            phone: fullPhone,
            password: encryptedPass,
            confirm: encryptedConfirm,
            createdAt: istDate,
            pub: pair.pub,
            alias: username
        };

        gun.get('imacx-accounts').get(userId).put(userData, function(ack) {
            if (ack.err) {
                showMessage('signup-msg', "Signup failed. Try again.", 'error');
            } else {
                showMessage('signup-msg', "Signup successful!", 'success');
            }
        });
    }).catch(function(err) {
        showMessage('signup-msg', "Encryption failed: " + err.message, 'error');
    });
});

function generateUserId() {
    return 'user_' + Math.random().toString(36).substr(2, 9); // Generate a random user ID
}

function showMessage(elementId, message, type) {
    var element = document.getElementById(elementId);
    element.textContent = message;
    element.className = type;
}

    
// Login Event Listener
document.getElementById("login-btn").addEventListener("click", () => {
    const username = document.getElementById("login-user").value.trim();
    const password = document.getElementById("login-pass").value;

    if (!username || !password) {
        showMessage('login-msg', "Username and password are required", 'error');
        return;
    }

    const userId = `imacx-user-${username}`;

    users.get(userId).once(async (userData) => {
        if (!userData) {
            showMessage('login-msg', "User not found", 'error');
            return;
        }

        const pair = { pub: userData.pub };

        try {
            const decryptedPass = await SEA.decrypt(userData.password, pair);
            if (decryptedPass === password) {
                showMessage('login-msg', "Login successful!", 'success');
                // Store session or perform further actions
            } else {
                showMessage('login-msg', "Incorrect password", 'error');
            }
        } catch (err) {
            showMessage('login-msg', "Decryption error", 'error');
        }
    });
});

// Recover Password Event Listener
document.getElementById("recover-pass-btn").addEventListener("click", () => {
    const username = document.getElementById("recover-user").value.trim();
    const email = document.getElementById("recover-email").value.trim().toLowerCase();
    const phone = document.getElementById("recover-phone").value.trim();
    const countryCode = document.getElementById("recover-country-code").value.trim();

    // Clear previous messages
    ['recover-user-error', 'recover-email-error', 'recover-phone-error', 'recover-msg'].forEach(id => {
        document.getElementById(id).textContent = "";
    });

    if (!username) return showMessage('recover-user-error', "Username is required", 'error');
    if (!email.includes("@")) return showMessage('recover-email-error', "Invalid email", 'error');
    if (phone.length < 6) return showMessage('recover-phone-error', "Invalid phone number", 'error');

    const fullPhone = `${countryCode}${phone}`;
    const userId = `imacx-user-${username}`;

    users.get(userId).once(async (userData) => {
        if (!userData) {
            showMessage('recover-msg', "User not found", 'error');
            return;
        }

        if (userData.email !== email || userData.phone !== fullPhone) {
            showMessage('recover-msg', "Email or phone number does not match our records", 'error');
            return;
        }

        const pair = { pub: userData.pub };

        try {
            const decryptedPass = await SEA.decrypt(userData.password, pair);
            showMessage('recover-msg', `Your password is: ${decryptedPass}`, 'success');
        } catch (err) {
            showMessage('recover-msg', "Decryption error", 'error');
        }
    });
});

// Recover Username Event Listener
document.getElementById("recover-username-btn").addEventListener("click", () => {
    const email = document.getElementById("username-recovery-email").value.trim().toLowerCase();
    const phone = document.getElementById("username-phone").value.trim();
    const countryCode = document.getElementById("username-country-code").value.trim();
    const password = document.getElementById("username-recovery-pass").value;

    // Clear previous messages
    ['username-recovery-email-error', 'username-phone-error', 'username-recovery-pass-error', 'recover-username-msg'].forEach(id => {
        document.getElementById(id).textContent = "";
    });

    if (!email.includes("@")) return showMessage('username-recovery-email-error', "Invalid email", 'error');
    if (phone.length < 6) return showMessage('username-phone-error', "Invalid phone number", 'error');
    if (!password) return showMessage('username-recovery-pass-error', "Password is required", 'error');

    const fullPhone = `${countryCode}${phone}`;

    users.map().once(async (userData) => {
        if (userData && userData.email === email && userData.phone === fullPhone) {
            const pair = { pub: userData.pub };

            try {
                const decryptedPass = await SEA.decrypt(userData.password, pair);
                if (decryptedPass === password) {
                    showMessage('recover-username-msg', `Your username is: ${userData.username}`, 'success');
                } else {
                    showMessage('recover-username-msg', "Incorrect password", 'error');
                }
            } catch (err) {
                showMessage('recover-username-msg', "Decryption error", 'error');
            }
        }
    });
});

// Logout Event Listener
document.getElementById("logout-btn").addEventListener("click", () => {
    // Clear session or perform logout actions
    showMessage('status-info', "You have been logged out.", 'info');
});
