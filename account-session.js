const SESSION_KEY = 'imacx-session';

// UUID generator fallback (if uuidv4 is not defined globally)
function uuidv4() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

// Save user session
function saveAccountSession(user) {
  const sessionData = {
    id: user.id || uuidv4(),
    username: user.username,
    timestamp: Date.now()
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
  return sessionData;
}

// Get session
function getAccountSession() {
  const data = localStorage.getItem(SESSION_KEY);
  return data ? JSON.parse(data) : null;
}

// Clear session
function clearAccountSession() {
  localStorage.removeItem(SESSION_KEY);
}

// Render button in any page
function renderAccountConnectButton() {
  const container = document.getElementById("account-connect-button");
  const session = getAccountSession();
  if (!container) return;

  if (session) {
    const date = new Date(session.timestamp).toLocaleString();
    container.innerHTML = `
      <div class="text-white text-sm bg-green-700 p-3 rounded flex flex-col gap-1">
        <span>Connected ID: <b>${session.id}</b></span>
        <span>Timestamp: ${date}</span>
        ${window.location.pathname.includes("account.html") ? `
          <button class="mt-2 bg-red-600 px-3 py-1 rounded" onclick="disconnect()">Disconnect</button>
        ` : ``}
      </div>
    `;
  } else {
    container.innerHTML = `
      <button class="text-white bg-blue-600 px-4 py-2 rounded" onclick="connectAccount()">Connect Account</button>
    `;
  }
}

// Simulate connect
function connectAccount() {
  if (getAccountSession()) {
    showToast("Already connected.", "#facc15"); // Yellow
    return;
  }

  const randomUsername = "user" + Math.floor(Math.random() * 10000);
  const user = { id: uuidv4(), username: randomUsername };
  saveAccountSession(user);
  showToast("Account Connected!", "#22c55e"); // Green
  renderAccountConnectButton();
}

// Disconnect on account.html
function disconnect() {
  clearAccountSession();
  showToast("Disconnected!", "#f87171"); // Red
  renderAccountConnectButton();

  if (window.location.pathname.includes("account.html")) {
    const status = document.getElementById("status-info");
    if (status) status.textContent = "Disconnected successfully.";
  }
}

// Show toast
function showToast(message, background) {
  if (typeof Toastify !== "undefined") {
    Toastify({
      text: message,
      duration: 2000,
      gravity: "top",
      position: "right",
      backgroundColor: background
    }).showToast();
  } else {
    alert(message); // fallback
  }
}

// On load: render if element exists
window.addEventListener("DOMContentLoaded", () => {
  renderAccountConnectButton();
});
