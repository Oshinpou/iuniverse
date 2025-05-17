const SESSION_KEY = 'imacx-session';

function saveAccountSession(user) {
  const sessionData = {
    id: user.id || uuidv4(),
    username: user.username,
    timestamp: Date.now()
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
  return sessionData;
}

function getAccountSession() {
  const data = localStorage.getItem(SESSION_KEY);
  return data ? JSON.parse(data) : null;
}

function clearAccountSession() {
  localStorage.removeItem(SESSION_KEY);
}

// Show Connect Button (Reusable on every page)
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

// Simulated Account Connect
function connectAccount() {
  const randomUsername = "user" + Math.floor(Math.random() * 10000);
  const user = { id: uuidv4(), username: randomUsername };
  saveAccountSession(user);
  Toastify({ text: "Account Connected!", duration: 2000, backgroundColor: "#22c55e" }).showToast();
  renderAccountConnectButton();
}

// Disconnect only on account.html
function disconnect() {
  clearAccountSession();
  Toastify({ text: "Disconnected!", duration: 2000, backgroundColor: "#f87171" }).showToast();
  renderAccountConnectButton();
  if (window.location.pathname.includes("account.html")) {
    const status = document.getElementById("status-info");
    if (status) status.textContent = "Disconnected successfully.";
  }
}
