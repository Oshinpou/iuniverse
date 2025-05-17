 // Initialize Gun with a relay peer
  const gun = Gun(['https://your-relay-peer.com/gun']); // Replace with your relay peer URL
  const user = gun.user();

  // Utility function to get current timestamp in IST
  function getISTTimestamp() {
    const date = new Date();
    const options = { timeZone: 'Asia/Kolkata', hour12: false };
    return new Intl.DateTimeFormat('en-GB', {
      ...options,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  }

  // Utility function to combine country code and phone number
  function getFullPhoneNumber(countryCode, phone) {
    return `${countryCode}${phone}`;
  }

  // Sign Up Function
  async function signup() {
    const username = document.getElementById('signup-user').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const countryCode = document.getElementById('signup-countryCode').value;
    const phone = document.getElementById('signup-phone').value.trim();
    const password = document.getElementById('signup-pass').value;
    const confirm = document.getElementById('signup-confirm').value;
    const fullPhone = getFullPhoneNumber(countryCode, phone);
    const signupMsg = document.getElementById('signup-msg');

    // Input validation
    if (!username || !email || !phone || !password || !confirm) {
      signupMsg.innerText = 'Please fill in all fields.';
      return;
    }

    if (password !== confirm) {
      signupMsg.innerText = 'Passwords do not match.';
      return;
    }

    // Check for existing username
    const existingUser = await gun.get(`users/${username}`).then();
    if (existingUser) {
      signupMsg.innerText = 'Username already exists.';
      return;
    }

    // Check for existing email
    const existingEmail = await gun.get('emails').get(email).then();
    if (existingEmail) {
      signupMsg.innerText = 'Email already in use.';
      return;
    }

    // Check for existing phone number with the same country code
    const existingPhone = await gun.get('phones').get(fullPhone).then();
    if (existingPhone) {
      signupMsg.innerText = 'Phone number already in use with this country code.';
      return;
    }

    // Create user
    user.create(username, password, async (ack) => {
      if (ack.err) {
        signupMsg.innerText = `Error creating user: ${ack.err}`;
        return;
      }

      // Authenticate user
      user.auth(username, password, async (authAck) => {
        if (authAck.err) {
          signupMsg.innerText = `Authentication failed: ${authAck.err}`;
          return;
        }

        // Store additional user data
        const timestamp = getISTTimestamp();
        await user.get('profile').put({ email, phone: fullPhone, created: timestamp });

        // Index email and phone for uniqueness checks
        gun.get('emails').get(email).put({ username });
        gun.get('phones').get(fullPhone).put({ username });

        signupMsg.innerText = 'Account created successfully!';
        updateAccountStatus();
      });
    });
  }

  // Login Function
  function login() {
    const username = document.getElementById('login-user').value.trim();
    const password = document.getElementById('login-pass').value;
    const loginMsg = document.getElementById('login-msg');

    if (!username || !password) {
      loginMsg.innerText = 'Please enter both username and password.';
      return;
    }

    user.auth(username, password, async (ack) => {
      if (ack.err) {
        loginMsg.innerText = `Login failed: ${ack.err}`;
        return;
      }

      loginMsg.innerText = 'Login successful!';
      updateAccountStatus();
    });
  }

  // Logout Function
  function logout() {
    user.leave();
    document.getElementById('status-info').innerText = 'Logged out.';
  }

  // Update Account Status
  function updateAccountStatus() {
    user.get('profile').once((data) => {
      if (data) {
        const info = `Logged in as ${user.is.alias}, created at ${data.created}`;
        document.getElementById('status-info').innerText = info;
      }
    });
  }

  // Recover Password Function
  async function recoverPassword() {
    const username = document.getElementById('recover-user').value.trim();
    const email = document.getElementById('recover-email').value.trim();
    const countryCode = document.getElementById('recover-countryCode').value;
    const phone = document.getElementById('recover-phone').value.trim();
    const fullPhone = getFullPhoneNumber(countryCode, phone);
    const recoverMsg = document.getElementById('recover-msg');

    if (!username || !email || !phone) {
      recoverMsg.innerText = 'Please fill in all fields.';
      return;
    }

    const userRef = gun.get(`users/${username}`);
    const profile = await userRef.get('profile').then();

    if (!profile) {
      recoverMsg.innerText = 'User not found.';
      return;
    }

    if (profile.email !== email || profile.phone !== fullPhone) {
      recoverMsg.innerText = 'Email or phone number does not match our records.';
      return;
    }

    // For demonstration purposes, we'll display the password.
    // In a real application, implement a secure password reset mechanism.
    recoverMsg.innerText = 'Password recovery is not implemented for security reasons.';
  }

  // Recover Username Function
  async function recoverUsername() {
    const email = document.getElementById('username-recovery-email').value.trim();
    const countryCode = document.getElementById('username-recovery-countryCode').value;
    const phone = document.getElementById('username-recovery-phone').value.trim();
    const fullPhone = getFullPhoneNumber(countryCode, phone);
    const recoverMsg = document.getElementById('username-msg');

    if (!email || !phone) {
      recoverMsg.innerText = 'Please fill in all fields.';
      return;
    }

    const emailEntry = await gun.get('emails').get(email).then();
    const phoneEntry = await gun.get('phones').get(fullPhone).then();

    if (emailEntry && phoneEntry && emailEntry.username === phoneEntry.username) {
      recoverMsg.innerText = `Your username is: ${emailEntry.username}`;
    } else {
      recoverMsg.innerText = 'No matching account found.';
    }
  }

  // Initialize account status on page load
  window.addEventListener('load', () => {
    if (user.is) {
      updateAccountStatus();
    }
  });
