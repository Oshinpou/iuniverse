// account.js

// Setup GUN and databases const gun = Gun(); const db = new Dexie("imacxAccounts"); db.version(1).stores({ users: "&username, email, phone, passwordHash, wallet, timestamp" });

// Helper Functions const notyf = new Notyf(); const timestamp = () => new Date().toISOString(); const hashPassword = async (password) => await bcrypt.hash(password, 10); const validateInputs = (fields) => Object.values(fields).every(x => x.trim() !== "");

// Persist login state const saveSession = (data) => { store.set("imacx-user", data); }; const clearSession = () => { store.remove("imacx-user"); }; const getSession = () => store.get("imacx-user");

// Connect Wallet async function connectWallet() { if (typeof window.ethereum !== 'undefined') { const accounts = await ethereum.request({ method: 'eth_requestAccounts' }); const address = accounts[0]; store.set("wallet", address); document.querySelector("#status-info").innerText = Wallet Connected: ${address}; return address; } else { notyf.error("Wallet not found"); } }

// Login async function login() { const username = $("#login-user").val(); const password = $("#login-pass").val();

if (!validateInputs({ username, password })) return notyf.error("Fill all login fields"); const user = await db.users.get(username); if (!user || !(await bcrypt.compare(password, user.passwordHash))) { return notyf.error("Invalid credentials"); } saveSession({ username, wallet: user.wallet, timestamp: timestamp() }); notyf.success("Logged in"); updateStatus(); }

// Signup async function signup() { const username = $("#signup-user").val(); const email = $("#signup-email").val(); const countryCode = $("#signup-country-code").val(); const phone = $("#signup-phone").val(); const password = $("#signup-pass").val(); const confirm = $("#signup-confirm").val();

if (!validateInputs({ username, email, phone, password, confirm })) return notyf.error("Fill all fields"); if (password !== confirm) return notyf.error("Passwords do not match");

const exists = await db.users.get(username); if (exists) return notyf.error("Username taken");

const passwordHash = await hashPassword(password); const wallet = await connectWallet();

await db.users.put({ username, email, phone: ${countryCode}${phone}, passwordHash, wallet, timestamp: timestamp(), });

notyf.success("Signup successful"); login(); }

// Recover Password async function recoverPassword() { const username = $("#recover-user").val(); const email = $("#recover-email").val(); const phone = $("#recover-country-code").val() + $("#recover-phone").val();

const user = await db.users.get(username); if (!user || user.email !== email || user.phone !== phone) { return notyf.error("Recovery failed"); } notyf.success("Account found. Please reset manually in DB"); }

// Recover Username async function recoverUsername() { const email = $("#username-recovery-email").val(); const phone = $("#username-country-code").val() + $("#username-phone").val(); const password = $("#username-recovery-pass").val();

const all = await db.users.toArray(); const match = all.find(u => u.email === email && u.phone === phone && bcrypt.compareSync(password, u.passwordHash));

if (!match) return notyf.error("No match found"); notyf.success(Username: ${match.username}); }

// Update Account Status function updateStatus() { const user = getSession(); if (!user) return; document.querySelector("#status-info").innerText = Logged in as ${user.username} | Wallet: ${user.wallet}; }

// Logout function logout() { clearSession(); notyf.success("Logged out"); document.querySelector("#status-info").innerText = ""; }

// Auto load header and bind connect/logout fetch("header.html") .then(res => res.text()) .then(html => { $("#header-placeholder").html(html); $("#wallet-connect").on("click", connectWallet); $("#logout-btn").on("click", logout); });

// Auto login session window.addEventListener("load", updateStatus);

// Export if needed window.imacx = { login, signup, logout, connectWallet, recoverPassword, recoverUsername, updateStatus };

