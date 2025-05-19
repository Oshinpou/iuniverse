// accountone.js

// Initialize GunDB with multiple relays
const gun = Gun({
  peers: [
    'https://gun-manhattan.herokuapp.com/gun',
    'https://gun-europe.herokuapp.com/gun',
    'https://gun-us.herokuapp.com/gun'
  ],
  localStorage: true
});
const SEA = Gun.SEA;

// PouchDB setup (optional, for local sync)
const pouchDB = new PouchDB('imacx-accounts');
const remoteCouch = 'https://your-couchdb-url/imacx-accounts';

pouchDB.sync(remoteCouch, {
  live: true,
  retry: true
}).on('error', err => {
  console.error('Sync error:', err);
});

// Reference to the main accounts node
const accounts = gun.get('imacx-accounts');

const timezone = "Asia/Kolkata";

function getTimestamp() {
  return dayjs().tz(timezone).format('YYYY-MM-DD HH:mm:ss');
}

// Validate email format
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Validate phone (6-15 digits)
function isValidPhone(phone) {
  return /^[0-9]{6,15}$/.test(phone);
}

// Save session in localStorage
function saveSession(username, pub) {
  localStorage.setItem('imacx_logged_in_user', JSON.stringify({ username, pub }));
}

// Clear session
function clearSession() {
  localStorage.removeItem('imacx_logged_in_user');
}

// Get session user
function getSession() {
  try {
    return JSON.parse(localStorage.getItem('imacx_logged_in_user'));
  } catch {
    return null;
  }
}

// Show error messages
function showError(elementId, msg) {
  document.getElementById(elementId).textContent = msg;
}
// Clear all error messages and info
function clearErrors() {
  [
    'signup-user-error', 'signup-email-error', 'signup-phone-error', 'signup-pass-error', 'signup-confirm-error',
    'recover-user-error', 'recover-email-error', 'recover-phone-error',
    'username-recovery-email-error', 'username-phone-error', 'username-recovery-pass-error',
    'login-msg', 'signup-msg', 'recover-msg', 'recover-username-msg', 'status-info'
  ].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.textContent = '';
  });
}

// Hash password with SEA + PBKDF2 SHA-256
async function hashPassword(password) {
  return await SEA.work(password, null, null, { name: 'PBKDF2', iterations: 10000, hash: 'SHA-256' });
}

// SIGNUP
async function signup() {
  clearErrors();

  const username = document.getElementById('signup-user').value.trim().toLowerCase();
  const email = document.getElementById('signup-email').value.trim().toLowerCase();
  const countryCode = document.getElementById('signup-country-code').value;
  const phone = document.getElementById('signup-phone').value.trim();
  const password = document.getElementById('signup-pass').value;
  const confirm = document.getElementById('signup-confirm').value;

  let hasError = false;

  if (!username) {
    showError('signup-user-error', 'Username is required');
    hasError = true;
  }
  if (!email || !isValidEmail(email)) {
    showError('signup-email-error', 'Valid email is required');
    hasError = true;
  }
  if (!phone || !isValidPhone(phone)) {
    showError('signup-phone-error', 'Valid phone number is required');
    hasError = true;
  }
  if (!password) {
    showError('signup-pass-error', 'Password is required');
    hasError = true;
  }
  if (password !== confirm) {
    showError('signup-confirm-error', 'Passwords do not match');
    hasError = true;
  }
  if (hasError) return;

  // Check if username exists
  accounts.get(username).once(async data => {
    if (data && data.pub) {
      showError('signup-user-error', 'Username already taken');
      return;
    } else {
      // New user - create keypair
      const pair = await SEA.pair();

      // Hash password for storage
      const pwdHash = await hashPassword(password);

      // Create user object (DO NOT store priv in production)
      const userData = {
        username,
        email,
        phone: countryCode + phone,
        created: getTimestamp(),
        pwdHash,
        pub: pair.pub,
        priv: pair.priv // Keep private key secure in real apps, don't store openly!
      };

      accounts.get(username).put(userData, ack => {
        if (ack.err) {
          showError('signup-msg', 'Signup failed, try again.');
          return;
        }
        saveSession(username, pair.pub);
        document.getElementById('signup-msg').textContent = 'Signup successful! You are logged in.';
        updateAccountStatus();
      });
    }
  });
}

// LOGIN
async function login() {
  clearErrors();
  const username = document.getElementById('login-user').value.trim().toLowerCase();
  const password = document.getElementById('login-pass').value;

  if (!username || !password) {
    showError('login-msg', 'Username and password required');
    return;
  }

  accounts.get(username).once(async data => {
    if (!data || !data.pwdHash) {
      showError('login-msg', 'Invalid username or password');
      return;
    }
    const pwdHash = await hashPassword(password);
    if (pwdHash !== data.pwdHash) {
      showError('login-msg', 'Invalid username or password');
      return;
    }
    saveSession(username, data.pub);
    document.getElementById('login-msg').textContent = 'Login successful!';
    updateAccountStatus();
  });
}

// LOGOUT
function logout() {
  clearSession();
  updateAccountStatus();
  Toastify({ text: "Logged out successfully", duration: 3000, backgroundColor: "#d9534f" }).showToast();
}

// RECOVER PASSWORD
async function recoverPassword() {
  clearErrors();
  const username = document.getElementById('recover-user').value.trim().toLowerCase();
  const email = document.getElementById('recover-email').value.trim().toLowerCase();
  const countryCode = document.getElementById('recover-country-code').value;
  const phone = document.getElementById('recover-phone').value.trim();

  let hasError = false;
  if (!username) {
    showError('recover-user-error', 'Username is required');
    hasError = true;
  }
  if (!email || !isValidEmail(email)) {
    showError('recover-email-error', 'Valid email is required');
    hasError = true;
  }
  if (!phone || !isValidPhone(phone)) {
    showError('recover-phone-error', 'Valid phone number is required');
    hasError = true;
  }
  if (hasError) return;

  accounts.get(username).once(data => {
    if (!data) {
      showError('recover-msg', 'Account not found');
      return;
    }
    if (data.email !== email || data.phone !== countryCode + phone) {
      showError('recover-msg', 'Email or phone does not match our records');
      return;
    }
    // Simulate sending password reset
    document.getElementById('recover-msg').textContent = `Password reset link sent to ${email}. (Simulated)`;
  });
}

// RECOVER USERNAME (limited support)
async function recoverUsername() {
  clearErrors();
  const email = document.getElementById('username-recovery-email').value.trim().toLowerCase();
  const countryCode = document.getElementById('username-country-code').value;
  const phone = document.getElementById('username-phone').value.trim();
  const password = document.getElementById('username-recovery-pass').value;

  let hasError = false;
  if (!email || !isValidEmail(email)) {
    showError('username-recovery-email-error', 'Valid email is required');
    hasError = true;
  }
  if (!phone || !isValidPhone(phone)) {
    showError('username-phone-error', 'Valid phone number is required');
    hasError = true;
  }
  if (!password) {
    showError('username-recovery-pass-error', 'Password is required');
    hasError = true;
  }
  if (hasError) return;

  // Due to GunDB limitations, username recovery by email+phone+password is not feasible here.
  document.getElementById('recover-username-msg').textContent = "Username recovery requires backend support not available here.";
}

// ACCOUNT STATUS DISPLAY
function updateAccountStatus() {
  const session = getSession();
  const statusInfo = document.getElementById('status-info');

  if (session && session.username) {
    statusInfo.textContent = `Logged in as ${session.username} (Pub: ${session.pub}) - ${getTimestamp()}`;
  } else {
    statusInfo.textContent = 'Not logged in.';
  }
}

// On page load, update status
window.addEventListener('load', () => {
  updateAccountStatus();
});

// BUTTON EVENT LISTENERS
document.getElementById('signup-btn').addEventListener('click', signup);
document.getElementById('login-btn').addEventListener('click', login);
document.getElementById('logout-btn').addEventListener('click', logout);
document.getElementById('recover-btn').addEventListener('click', recoverPassword);
document.getElementById('recover-username-btn').addEventListener('click', recoverUsername);
