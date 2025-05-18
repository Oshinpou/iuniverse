const gun = Gun(['https://gun.peers.crunk.house/gun']);
console.log('GunDB initialized:', gun);

// Utility
function timestampIST() {
  const date = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  return new Date(date).toISOString();
}
function isValidUsername(username) {
  return username.length >= 3 && username.length <= 20 && /^[a-zA-Z0-9]+$/.test(username);
}
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function isValidPhone(phone) {
  return /^\d+$/.test(phone);
}
function isValidPassword(password) {
  return password.length >= 6;
}
function displayError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.innerText = msg;
}
function clearError(id) {
  const el = document.getElementById(id);
  if (el) el.innerText = '';
}
function clearSignupFields() {
  ['signup-user', 'signup-email', 'signup-phone', 'signup-pass', 'signup-confirm'].forEach(id => {
    document.getElementById(id).value = '';
  });
}

// Load existing session
window.addEventListener('load', () => {
  const loggedInUser = localStorage.getItem('loggedInUser');
  if (loggedInUser) {
    gun.get('imacx-accounts').get(loggedInUser).once(data => {
      if (data) {
        document.getElementById('status-info').innerText = `Logged in as ${loggedInUser}, created: ${data.created}`;
      }
    });
  }
});

// Signup
document.getElementById('signup-btn')?.addEventListener('click', async (e) => {
  e.preventDefault();
  const username = document.getElementById('signup-user').value.trim();
  const email = document.getElementById('signup-email').value.trim().toLowerCase();
  const phone = document.getElementById('signup-phone').value.trim();
  const countryCode = document.getElementById('signup-country-code').value;
  const password = document.getElementById('signup-pass').value;
  const confirm = document.getElementById('signup-confirm').value;
  const msg = document.getElementById('signup-msg');

  clearError('signup-user-error');
  clearError('signup-email-error');
  clearError('signup-phone-error');
  clearError('signup-pass-error');
  clearError('signup-confirm-error');
  msg.innerText = '';

  let valid = true;
  if (!isValidUsername(username)) {
    displayError('signup-user-error', '3–20 alphanumeric characters.');
    valid = false;
  }
  if (!isValidEmail(email)) {
    displayError('signup-email-error', 'Invalid email.');
    valid = false;
  }
  if (!isValidPhone(phone)) {
    displayError('signup-phone-error', 'Only numbers.');
    valid = false;
  }
  if (!isValidPassword(password)) {
    displayError('signup-pass-error', 'Minimum 6 characters.');
    valid = false;
  }
  if (password !== confirm) {
    displayError('signup-confirm-error', 'Passwords do not match.');
    valid = false;
  }
  if (!valid) return;

  gun.get('imacx-accounts').get(username).once(async existing => {
    if (existing) {
      msg.innerText = 'Username already exists.';
    } else {
      const pair = await Gun.SEA.pair();
      const encryptedPass = await Gun.SEA.encrypt(password, pair);

      const user = {
        username,
        email,
        phone: `${countryCode}${phone}`,
        password: encryptedPass,
        pub: pair.pub,
        created: timestampIST()
      };

      gun.get('imacx-accounts').get(username).put(user, ack => {
        if (ack.err) {
          msg.innerText = 'Signup failed.';
        } else {
          msg.innerText = 'Account created successfully!';
          clearSignupFields();
        }
      });
    }
  });
});

// Login
document.getElementById('login-btn')?.addEventListener('click', async (e) => {
  e.preventDefault();
  const username = document.getElementById('login-user').value.trim();
  const password = document.getElementById('login-pass').value;
  const msg = document.getElementById('login-msg');
  const status = document.getElementById('status-info');
  msg.innerText = '';

  if (!username || !password) {
    msg.innerText = 'Both fields required.';
    return;
  }

  gun.get('imacx-accounts').get(username).once(async data => {
    if (data && data.password && data.pub) {
      try {
        const decrypted = await Gun.SEA.decrypt(data.password, { pub: data.pub });
        if (decrypted === password) {
          msg.innerText = 'Login successful!';
          status.innerText = `Logged in as ${username}, created: ${data.created}`;
          localStorage.setItem('loggedInUser', username);
          localStorage.setItem('accountId', username);
        } else {
          msg.innerText = 'Incorrect credentials.';
        }
      } catch (err) {
        msg.innerText = 'Decryption error.';
      }
    } else {
      msg.innerText = 'User not found.';
    }
  });
});

// Logout
document.getElementById('logout-btn')?.addEventListener('click', () => {
  localStorage.removeItem('loggedInUser');
  localStorage.removeItem('accountId');
  document.getElementById('status-info').innerText = 'Logged out.';
  alert('You have been logged out.');
});

// Recovery
document.getElementById('recover-pass-btn')?.addEventListener('click', (e) => {
  e.preventDefault();
  const username = document.getElementById('recover-user').value.trim();
  const email = document.getElementById('recover-email').value.trim().toLowerCase();
  const phone = document.querySelector('#recover-password-box input[type="tel"]').value.trim();
  const countryCode = document.querySelector('#recover-password-box select').value;
  const msg = document.getElementById('recover-msg');

  clearError('recover-user-error');
  clearError('recover-email-error');
  clearError('recover-phone-error');
  msg.innerText = '';

  let valid = true;
  if (!isValidUsername(username)) {
    displayError('recover-user-error', 'Invalid username.');
    valid = false;
  }
  if (!isValidEmail(email)) {
    displayError('recover-email-error', 'Invalid email.');
    valid = false;
  }
  if (!isValidPhone(phone)) {
    displayError('recover-phone-error', 'Invalid phone.');
    valid = false;
  }
  if (!valid) return;

  gun.get('imacx-accounts').get(username).once(data => {
    if (data && data.email === email && data.phone === `${countryCode}${phone}`) {
      msg.innerText = 'Verified. Contact admin for reset.';
    } else {
      msg.innerText = 'Details do not match.';
    }
  });
});

// Cross-tab sync
window.addEventListener("storage", () => {
  const status = document.getElementById('status-info');
  const user = localStorage.getItem('loggedInUser');
  if (user) {
    gun.get('imacx-accounts').get(user).once(data => {
      if (data) {
        status.innerText = `Logged in as ${user}, created: ${data.created}`;
      }
    });
  } else {
    status.innerText = 'Logged out.';
  }
});
