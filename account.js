// imacx account.js

// Setup databases
const gun = Gun();
const db = new Dexie("imacx-accounts");
db.version(1).stores({
  users: "&username, email, phone, passwordHash, wallet, timestamp"
});

// Utilities
const notyf = new Notyf();
const timestamp = () => new Date().toISOString();
const hashPassword = async (p) => await bcrypt.hash(p, 10);
const validate = (obj) => Object.values(obj).every(v => v.trim() !== "");
const saveSession = (data) => store.set("imacx-user", data);
const clearSession = () => store.remove("imacx-user");
const getSession = () => store.get("imacx-user");

async function connectWallet() {
  try {
    if (typeof window.ethereum !== "undefined") {
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      const address = accounts[0];
      store.set("wallet", address);
      $("#status-info").text(`Wallet Connected: ${address}`);
      return address;
    } else {
      notyf.error("No wallet found.");
    }
  } catch (e) {
    console.error("Wallet connect error:", e);
    notyf.error("Wallet connect failed.");
  }
}

async function login() {
  const username = $("#login-user").val();
  const password = $("#login-pass").val();

  if (!validate({ username, password })) return notyf.error("Please fill all login fields");

  const user = await db.users.get(username);
  if (!user || !(await bcrypt.compare(password, user.passwordHash)))
    return notyf.error("Invalid login");

  saveSession({ username, wallet: user.wallet, timestamp: timestamp() });
  notyf.success("Login successful");
  updateStatus();
}

async function signup() {
  const username = $("#signup-user").val();
  const email = $("#signup-email").val();
  const code = $("#signup-country-code").val();
  const phone = $("#signup-phone").val();
  const pass = $("#signup-pass").val();
  const confirm = $("#signup-confirm").val();

  if (!validate({ username, email, code, phone, pass, confirm }))
    return notyf.error("Please fill all fields");

  if (pass !== confirm) return notyf.error("Passwords do not match");

  const exists = await db.users.get(username);
  if (exists) return notyf.error("Username already taken");

  const wallet = await connectWallet();
  if (!wallet) return notyf.error("Wallet connection is required");

  const passwordHash = await hashPassword(pass);
  const fullPhone = `${code}${phone}`;

  await db.users.put({
    username,
    email,
    phone: fullPhone,
    passwordHash,
    wallet,
    timestamp: timestamp(),
  });

  notyf.success("Signup successful");
  login();
}

async function recoverPassword() {
  const username = $("#recover-user").val();
  const email = $("#recover-email").val();
  const phone = $("#recover-country-code").val() + $("#recover-phone").val();

  const user = await db.users.get(username);
  if (!user || user.email !== email || user.phone !== phone)
    return notyf.error("No account found");

  notyf.success("Account verified. Change password manually in DB.");
}

async function recoverUsername() {
  const email = $("#username-recovery-email").val();
  const phone = $("#username-country-code").val() + $("#username-phone").val();
  const pass = $("#username-recovery-pass").val();

  const all = await db.users.toArray();
  for (let user of all) {
    const match = user.email === email && user.phone === phone && await bcrypt.compare(pass, user.passwordHash);
    if (match) {
      notyf.success(`Your username: ${user.username}`);
      return;
    }
  }
  notyf.error("Account not found");
}

function logout() {
  clearSession();
  $("#status-info").text("");
  notyf.success("Logged out");
}

function updateStatus() {
  const session = getSession();
  if (session) {
    $("#status-info").text(`Logged in as ${session.username} | Wallet: ${session.wallet}`);
  }
}

// On DOM Ready: Bind All Buttons
$(document).ready(function () {
  // Auto load header and attach events after header loads
  fetch("header.html")
    .then(res => res.text())
    .then(html => {
      $("#header-placeholder").html(html);
      $("#wallet-connect").on("click", connectWallet);
      $("#logout-btn").on("click", logout);
    });

  $("#login-btn").on("click", login);
  $("#signup-btn").on("click", signup);
  $("#recover-pass-btn").on("click", recoverPassword);
  $("#recover-username-btn").on("click", recoverUsername);

  updateStatus();
});
