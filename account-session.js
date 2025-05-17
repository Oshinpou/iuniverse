// Constants
const SESSION_KEY = 'imacx-session'; // stores currently logged-in session
const ACCOUNTS_KEY = 'imacx-accounts'; // stores all accounts (if used separately)

// Save current session
function saveAccountSession(user) {
  const sessionData = {
    id: user.id || uuidv4(),
    username: user.username,
    timestamp: Date.now()
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
  return sessionData;
}

// Get current session
function getAccountSession() {
  const data = localStorage.getItem(SESSION_KEY);
  return data ? JSON.parse(data) : null;
}

// Clear session
function clearAccountSession() {
  localStorage.removeItem(SESSION_KEY);
}

// Sync Header Login Status
function updateHeaderLoginStatus() {
  const session = getAccountSession();

  // Wait until header loads
  const checkAndInject = () => {
    const loginContainer = document.querySelector("#login-status");
    if (loginContainer) {
      if (session) {
        loginContainer.innerHTML = `
          <div class="text-white flex items-center gap-4">
            <span>Welcome, ${session.username}</span>
            <button class="bg-red-600 px-3 py-1 rounded" onclick="logout()">Logout</button>
          </div>
        `;
      } else {
        loginContainer.innerHTML = `
          <button class="text-white bg-yellow-500 px-4 py-2 rounded" onclick="window.location.href='account.html'">Login</button>
        `;
      }
    } else {
      setTimeout(checkAndInject, 100); // Retry until header is rendered
    }
  };

  checkAndInject();
}

// Global logout function
function logout() {
  clearAccountSession();
  Toastify({
    text: "Logged out!",
    duration: 2000,
    backgroundColor: "#f87171"
  }).showToast();

  updateHeaderLoginStatus();

  if (window.location.href.includes("account.html")) {
    const statusEl = document.getElementById("status-info");
    if (statusEl) statusEl.textContent = "Logged out successfully.";
  } else {
    location.reload();
  }
}
