// Assumes Gun and SEA are loaded in HTML before this script

// Initialize GunDB
const gun = Gun(['https://gun.peers.crunk.house/gun']);
console.log('GunDB initialized:', gun);

// Constants for PBKDF2 password hashing
const PBKDF2_ALGORITHM = 'PBKDF2';
const PBKDF2_SALT_LENGTH = 16;
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_KEY_LENGTH = 256;
const HASH_ALGORITHM = 'SHA-256';

// Utility Functions
function timestampIST() {
    const date = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    return new Date(date).toISOString();
}
function isValidUsername(username) {
    return username.length >= 3 && username.length <= 20 && /^[a-zA-Z0-9]+$/.test(username);
}
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function isValidPhone(phone) {
    return /^\d+$/.test(phone);
}
function isValidPassword(password) {
    return password.length >= 6;
}
function displayError(id, msg) {
    const el = document.getElementById(id);
    if (el) el.innerText = msg;
    else console.error(`Error: ${msg}`);
}
function clearError(id) {
    const el = document.getElementById(id);
    if (el) el.innerText = '';
}
function bufferToBase64(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}
function base64ToBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
}
function generateSalt() {
    const salt = new Uint8Array(PBKDF2_SALT_LENGTH);
    crypto.getRandomValues(salt);
    return bufferToBase64(salt);
}
async function hashPassword(password, salt) {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    const saltBuffer = base64ToBuffer(salt);
    const keyMaterial = await crypto.subtle.importKey(
        'raw', passwordBuffer, { name: PBKDF2_ALGORITHM }, false, ['deriveKey']
    );
    const derivedKey = await crypto.subtle.deriveKey({
        name: PBKDF2_ALGORITHM,
        salt: saltBuffer,
        iterations: PBKDF2_ITERATIONS,
        hash: HASH_ALGORITHM
    }, keyMaterial, { name: 'AES-CBC', length: PBKDF2_KEY_LENGTH }, false, ['encrypt', 'decrypt']);
    const rawKey = await crypto.subtle.exportKey('raw', derivedKey);
    return bufferToBase64(new Uint8Array(rawKey));
}

// --- Signup Logic ---
document.getElementById('signup-btn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const username = document.getElementById('signup-user')?.value.trim();
    const email = document.getElementById('signup-email')?.value.trim().toLowerCase();
    const phone = document.getElementById('signup-phone')?.value.trim();
    const countryCode = document.getElementById('signup-country-code')?.value;
    const password = document.getElementById('signup-pass')?.value;
    const confirm = document.getElementById('signup-confirm')?.value;
    const msg = document.getElementById('signup-msg');

    clearError('signup-user-error');
    clearError('signup-email-error');
    clearError('signup-phone-error');
    clearError('signup-pass-error');
    clearError('signup-confirm-error');
    msg.innerText = '';

    let valid = true;
    if (!isValidUsername(username)) { displayError('signup-user-error', 'Username must be 3–20 alphanumeric characters.'); valid = false; }
    if (!isValidEmail(email)) { displayError('signup-email-error', 'Invalid email address.'); valid = false; }
    if (!isValidPhone(phone)) { displayError('signup-phone-error', 'Phone must be numeric.'); valid = false; }
    if (!isValidPassword(password)) { displayError('signup-pass-error', 'Minimum 6 characters.'); valid = false; }
    if (password !== confirm) { displayError('signup-confirm-error', 'Passwords do not match.'); valid = false; }
    if (!valid) return;

    gun.get('imacx-accounts').get(username).once(async existing => {
        if (existing) {
            msg.innerText = 'Username already exists.';
        } else {
            const salt = generateSalt();
            const hashedPassword = await hashPassword(password, salt);
            const user = {
                username,
                email,
                phone: `${countryCode}${phone}`,
                password: hashedPassword,
                salt,
                created: timestampIST()
            };
            gun.get('imacx-accounts').get(username).put(user, ack => {
                if (ack.err) {
                    msg.innerText = 'Signup error.';
                    console.error(ack.err);
                } else {
                    msg.innerText = 'Account created successfully!';
                    document.getElementById('signup-user').value = '';
                    document.getElementById('signup-email').value = '';
                    document.getElementById('signup-phone').value = '';
                    document.getElementById('signup-pass').value = '';
                    document.getElementById('signup-confirm').value = '';
                }
            });
        }
    });
});

// --- Login Logic ---
document.getElementById('login-btn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-user')?.value.trim();
    const password = document.getElementById('login-pass')?.value;
    const msg = document.getElementById('login-msg');
    const status = document.getElementById('status-info');
    msg.innerText = '';
    if (!username || !password) {
        msg.innerText = 'Username and password required.';
        return;
    }
    gun.get('imacx-accounts').get(username).once(async data => {
        if (data && data.password && data.salt) {
            const attemptedHash = await hashPassword(password, data.salt);
            if (attemptedHash === data.password) {
                msg.innerText = 'Login successful!';
                status.innerText = `Logged in as ${username}, created: ${data.created}`;
                localStorage.setItem('loggedInUser', username);
                localStorage.setItem('accountId', username);
            } else {
                msg.innerText = 'Incorrect credentials.';
            }
        } else {
            msg.innerText = 'User not found.';
        }
    });
});

// --- Password Recovery Logic ---
document.getElementById('recover-pass-btn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const username = document.getElementById('recover-user')?.value.trim();
    const email = document.getElementById('recover-email')?.value.trim().toLowerCase();
    const phone = document.querySelector('#recover-password-box input[type="tel"]')?.value.trim();
    const countryCode = document.querySelector('#recover-password-box select')?.value;
    const msg = document.getElementById('recover-msg');

    clearError('recover-user-error');
    clearError('recover-email-error');
    clearError('recover-phone-error');
    msg.innerText = '';

    let valid = true;
    if (!isValidUsername(username)) { displayError('recover-user-error', 'Invalid username.'); valid = false; }
    if (!isValidEmail(email)) { displayError('recover-email-error', 'Invalid email.'); valid = false; }
    if (!isValidPhone(phone)) { displayError('recover-phone-error', 'Invalid phone.'); valid = false; }
    if (!valid) return;

    gun.get('imacx-accounts').get(username).once(data => {
        if (data && data.email === email && data.phone === `${countryCode}${phone}`) {
            msg.innerText = 'Verified. Please reset via admin support.';
        } else {
            msg.innerText = 'Account info does not match.';
        }
    });
});
