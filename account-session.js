// Account Storage Helpers
const ACCOUNT_KEY = 'imacx-accounts';

function saveAccountSession(user) {
  const sessionData = {
    id: user.id || uuidv4(),
    username: user.username,
    timestamp: Date.now()
  };
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(sessionData));
  return sessionData;
}

function getAccountSession() {
  const data = localStorage.getItem(ACCOUNT_KEY);
  return data ? JSON.parse(data) : null;
}

function clearAccountSession() {
  localStorage.removeItem(ACCOUNT_KEY);
}

// Sync Header Login State
function updateHeaderLoginStatus() {
  const headerContainer = document.getElementById("header-placeholder");
  const session = getAccountSession();

  if (!headerContainer) return;

  const loginHTML = `
    <button class="text-white bg-yellow-500 px-4 py-2 rounded" onclick="window.location.href='account.html'">Login</button>
  `;

  const logoutHTML = `
    <div class="text-white flex items-center gap-4">
      <span>Welcome, ${session?.username || 'User'}</span>
      <button class="bg-red-600 px-3 py-1 rounded" onclick="logout()">Logout</button>
    </div>
  `;

  // Wait until header is loaded
  const checkAndInject = () => {
    const loginContainer = document.querySelector("#login-status");
    if (loginContainer) {
      loginContainer.innerHTML = session ? logoutHTML : loginHTML;
    } else {
      setTimeout(checkAndInject, 100); // wait for header to render
    }
  };

  checkAndInject();
}

// Global logout function
function logout() {
  clearAccountSession();
  Toastify({ text: "Logged out!", duration: 2000, backgroundColor: "#f87171" }).showToast();
  updateHeaderLoginStatus();
  if (window.location.href.includes("account.html")) {
    document.getElementById("status-info").textContent = "Logged out successfully.";
  } else {
    location.reload();
  }
}
