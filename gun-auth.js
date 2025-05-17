// IMACX FULL ACCOUNT SYSTEM SCRIPT with Gun.js and P2P GLOBAL STORAGE const gun = Gun({ peers: [ 'https://gun-manhattan.herokuapp.com/gun', // Backup relay peer ] });

const userDB = gun.get('imacx-accounts'); let currentUser = null;

function timestampIST() { const date = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }); return new Date(date).toISOString(); }

function getCountryCode(selectId) { return document.querySelector(#${selectId}).value; }

function getPhoneWithCode(selectId, inputId) { return getCountryCode(selectId) + document.getElementById(inputId).value.trim(); }

function validateUniqueFields(username, email, phone, callback) { let conflict = false; userDB.map().once(data => { if (!data) return; if (data.username === username || data.email === email || data.phone === phone) { conflict = true; callback(true); } }); setTimeout(() => { if (!conflict) callback(false); }, 1000); }

function signup() { const username = document.getElementById('signup-user').value.trim(); const email = document.getElementById('signup-email').value.trim(); const phone = getPhoneWithCode('countryCode', 'signup-phone'); const password = document.getElementById('signup-pass').value; const confirm = document.getElementById('signup-confirm').value; const msg = document.getElementById('signup-msg');

if (!username || !email || !phone || !password || !confirm) { msg.innerText = 'All fields are required.'; return; } if (password !== confirm) { msg.innerText = 'Passwords do not match.'; return; }

validateUniqueFields(username, email, phone, exists => { if (exists) { msg.innerText = 'Username, email, or phone already in use.'; } else { userDB.get(username).put({ username, email, phone, password, created: timestampIST() }); msg.innerText = 'Account created successfully!'; } }); }

function login() { const username = document.getElementById('login-user').value.trim(); const password = document.getElementById('login-pass').value; const msg = document.getElementById('login-msg');

userDB.get(username).once(data => { if (data && data.password === password) { currentUser = username; localStorage.setItem('imacx_user', username); document.getElementById('status-info').innerText = Logged in as ${username}, created at ${data.created}; msg.innerText = 'Login successful!'; addLogoutButton(); } else { msg.innerText = 'Invalid credentials'; } }); }

function recoverPassword() { const username = document.getElementById('recover-user').value.trim(); const email = document.getElementById('recover-email').value.trim(); const phone = getPhoneWithCode('countryCode', 'signup-phone'); const msg = document.getElementById('recover-msg');

userDB.get(username).once(data => { if (data && data.email === email && data.phone === phone) { msg.innerText = Password: ${data.password}; } else { msg.innerText = 'User not found or details do not match.'; } }); }

function recoverUsername() { const email = document.getElementById('username-recovery-email').value.trim(); const phone = getPhoneWithCode('countryCode', 'signup-phone'); const password = document.getElementById('username-recovery-pass').value; const msg = document.getElementById('username-msg');

let found = false; userDB.map().once(data => { if (data && data.email === email && data.phone === phone && data.password === password) { msg.innerText = Username: ${data.username}; found = true; } });

setTimeout(() => { if (!found) msg.innerText = 'No matching account found.'; }, 1000); }

function addLogoutButton() { let btn = document.getElementById('logout-btn'); if (!btn) { btn = document.createElement('button'); btn.id = 'logout-btn'; btn.className = 'bg-red-500 text-white px-4 py-2 rounded mt-4'; btn.innerText = 'Logout'; btn.onclick = logout; document.querySelector('.glass-box:last-of-type').appendChild(btn); } }

function logout() { localStorage.removeItem('imacx_user'); currentUser = null; document.getElementById('status-info').innerText = 'Logged out'; const btn = document.getElementById('logout-btn'); if (btn) btn.remove(); }

function checkLoggedIn() { const stored = localStorage.getItem('imacx_user'); if (stored) { userDB.get(stored).once(data => { if (data) { document.getElementById('status-info').innerText = Logged in as ${stored}, created at ${data.created}; addLogoutButton(); } }); } }

checkLoggedIn();

