// imacx account.js

// Check for required libraries
if (typeof Gun === "undefined" || typeof Dexie === "undefined" || typeof bcrypt === "undefined") {
  console.error("Missing required libraries (Gun, Dexie, or bcrypt). Ensure they are included.");
}
if (typeof store === "undefined") {
  console.warn("store.js not found. Using localStorage fallback.");
  var store = {
    set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
    get: (k) => JSON.parse(localStorage.getItem(k)),
    remove: (k) => localStorage.removeItem(k),
  };
}

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
const isSessionExpired = (session) => {
  const now = new Date().getTime();
  const sessionTime = new Date(session.timestamp).getTime();
  return (now - sessionTime) > (2 * 60 * 60 * 1000); // 2 hours
};

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
  try {
    $("#login-btn").prop("disabled", true);
    const username = $("#login-user").val();
    const password = $("#login-pass").val();

    if (!validate({ username, password })) {
      notyf.error("Please fill all login fields");
      return;
    }

    const user = await db.users.get(username);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      notyf.error("Invalid login");
      return;
    }

    saveSession({ username, wallet: user.wallet, timestamp: timestamp() });
    notyf.success("Login successful");
    updateStatus();
  } catch (err) {
    console.error("Login error:", err);
    notyf.error("Login failed");
  } finally {
    $("#login-btn").prop("disabled", false);
  }
}

async function signup() {
  try {
    $("#signup-btn").prop("disabled", true);
    const username = $("#signup-user").val();
    const email = $("#signup-email").val();
    const code = $("#signup-country-code").val();
    const phone = $("#signup-phone").val();
    const pass = $("#signup-pass").val();
    const confirm = $("#signup-confirm").val();

    if (!validate({ username, email, code, phone, pass, confirm })) {
      notyf.error("Please fill all fields");
      return;
    }

    if (pass.length < 6) {
      notyf.error("Password too short (min 6 characters)");
      return;
    }

    if (pass !== confirm) {
      notyf.error("Passwords do not match");
      return;
    }

    const exists = await db.users.get(username);
    if (exists) {
      notyf.error("Username already taken");
      return;
    }

    const wallet = await connectWallet();
    if (!wallet) {
      notyf.error("Wallet connection is required");
      return;
    }

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
    login(); // Auto login after signup
  } catch (err) {
    console.error("Signup error:", err);
    notyf.error("Signup failed");
  } finally {
    $("#signup-btn").prop("disabled", false);
  }
}

async function recoverPassword() {
  try {
    $("#recover-pass-btn").prop("disabled", true);
    const username = $("#recover-user").val();
    const email = $("#recover-email").val();
    const phone = $("#recover-country-code").val() + $("#recover-phone").val();

    const user = await db.users.get(username);
    if (!user || user.email !== email || user.phone !== phone) {
      notyf.error("No account found");
      return;
    }

    notyf.success("Account verified. Change password manually in DB.");
  } catch (err) {
    console.error("Recovery error:", err);
    notyf.error("Recovery failed");
  } finally {
    $("#recover-pass-btn").prop("disabled", false);
  }
}

async function recoverUsername() {
  try {
    $("#recover-username-btn").prop("disabled", true);
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
  } catch (err) {
    console.error("Username recovery error:", err);
    notyf.error("Recovery failed");
  } finally {
    $("#recover-username-btn").prop("disabled", false);
  }
}

function logout() {
  clearSession();
  $("#status-info").text("");
  notyf.success("Logged out");
}

function updateStatus() {
  const session = getSession();
  if (session) {
    if (isSessionExpired(session)) {
      logout();
      notyf.error("Session expired. Please log in again.");
      return;
    }
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

  // Password hint display (optional)
  $("#signup-pass").on("input", function () {
    const val = $(this).val();
    const msg = val.length < 6
      ? "Weak: Add more characters"
      : /[A-Z]/.test(val) && /\d/.test(val)
      ? "Strong password"
      : "Medium strength";
    $("#password-hint").text(msg);
  });
});
