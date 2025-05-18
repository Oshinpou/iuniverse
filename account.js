// account.js
import Gun from 'gun';
import 'gun/sea'; // Optional: For secure data handling with SEA
import validator from 'validator';

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

// --- Utility Functions (same as before) ---
function isValidUsername(username) { /* ... */ }
function isValidEmail(email) { /* ... */ }
function isValidPhone(phone) { /* ... */ }
function isValidPassword(password) { /* ... */ }
function displayError(elementId, message) { /* ... */ }
function clearError(elementId) { /* ... */ }

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

    // ... (Input element checks and validation as before) ...

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
                // ... (Signup ACK handling as before) ...
            });
        }
    });
});

// --- Login Logic ---
document.getElementById('login-btn')?.addEventListener('click', async (event) => {
    event.preventDefault();
    console.log('Login button clicked!');

    // ... (Input element checks) ...

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
                // ... (Successful login actions as before) ...
            } else {
                msg.innerText = 'Invalid login credentials.';
            }
        } else {
            msg.innerText = 'Invalid login credentials.';
        }
    });
});

// --- Recover Password Logic (remains largely the same for now) ---
document.getElementById('recover-pass-btn')?.addEventListener('click', async (event) => { /* ... */ });

// --- Recover Username Logic (password verification needs to use PBKDF2) ---
document.getElementById('recover-username-btn')?.addEventListener('click', async (event) => {
    event.preventDefault();
    console.log('Recover Username button clicked!');

    // ... (Input element checks and validation) ...

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

// --- Account Data Handling and Cross-Page Persistence (remain the same) ---
function saveAccountData(accountId, key, value) { /* ... */ }
function loadAccountData(accountId) { /* ... */ }
function checkLoggedInStatus() { /* ... */ }
function logout() { /* ... */ }
document.getElementById('logout-btn')?.addEventListener('click', logout);
checkLoggedInStatus();

// --- Disconnect/Connect Handling (GunDB handles this automatically) ---
gun.on('opt', function(opt){ /* ... */ });
gun.on('hi', function(peer){ /* ... */ });
gun.on('bye', function(peer){ /* ... */ });

console.log('Account script loaded with crypto.subtle.');
