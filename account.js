// account.js

// Initialize GUN with a peer relay
const gun = Gun({
  peers: ['https://gun-manhattan.herokuapp.com/gun']
});
const user = gun.user();

// Utility function to display messages
function showMessage(message, type = 'info') {
  Toastify({
    text: message,
    duration: 3000,
    gravity: 'top',
    position: 'right',
    backgroundColor: type === 'error' ? '#ff4d4d' : '#4CAF50',
  }).showToast();
}

// Utility function to validate email
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Utility function to validate phone number
function isValidPhone(phone) {
  const re = /^[0-9]{7,15}$/;
  return re.test(phone);
}

// Utility function to validate password
function isValidPassword(password) {
  return password.length >= 6;
}

// Sign Up Functionality
$('#signup-btn').click(async () => {
  const username = $('#signup-user').val().trim();
  const email = $('#signup-email').val().trim();
  const countryCode = $('#signup-country-code').val();
  const phone = $('#signup-phone').val().trim();
  const password = $('#signup-pass').val();
  const confirmPassword = $('#signup-confirm').val();

  // Clear previous error messages
  $('.error-message').text('');

  // Input validations
  if (!username) {
    $('#signup-user-error').text('Username is required.');
    return;
  }
  if (!isValidEmail(email)) {
    $('#signup-email-error').text('Invalid email format.');
    return;
  }
  if (!isValidPhone(phone)) {
    $('#signup-phone-error').text('Invalid phone number.');
    return;
  }
  if (!isValidPassword(password)) {
    $('#signup-pass-error').text('Password must be at least 6 characters.');
    return;
  }
  if (password !== confirmPassword) {
    $('#signup-confirm-error').text('Passwords do not match.');
    return;
  }

  try {
    // Check if username already exists
    const existingUser = await gun.get('users').get(username).once();
    if (existingUser) {
      $('#signup-user-error').text('Username already taken.');
      return;
    }

    // Create user
    await user.create(username, password);

    // Authenticate user
    await user.auth(username, password);

    // Store additional user details
    const fullPhone = `${countryCode}${phone}`;
    const timestamp = new Date().toISOString();
    user.get('profile').put({ email, phone: fullPhone, createdAt: timestamp });

    // Store username reference
    gun.get('users').get(username).put(user.is.pub);

    showMessage('Sign-up successful!', 'success');
    $('#signup-msg').text('Sign-up successful!');
    updateStatus();
  } catch (error) {
    console.error('Sign-up error:', error);
    showMessage('Sign-up failed. Please try again.', 'error');
  }
});

// Login Functionality
$('#login-btn').click(async () => {
  const username = $('#login-user').val().trim();
  const password = $('#login-pass').val();

  if (!username || !password) {
    $('#login-msg').text('Please enter both username and password.');
    return;
  }

  try {
    await user.auth(username, password);
    showMessage('Login successful!', 'success');
    $('#login-msg').text('');
    updateStatus();
  } catch (error) {
    console.error('Login error:', error);
    $('#login-msg').text('Invalid credentials.');
    showMessage('Login failed. Invalid credentials.', 'error');
  }
});

// Logout Functionality
$('#logout-btn').click(() => {
  user.leave();
  showMessage('Logged out successfully.', 'success');
  updateStatus();
});

// Password Recovery Functionality
$('#recover-pass-btn').click(async () => {
  const username = $('#recover-user').val().trim();
  const email = $('#recover-email').val().trim();
  const countryCode = $('#recover-country-code').val();
  const phone = $('#recover-phone').val().trim();

  // Clear previous error messages
  $('.error-message').text('');

  if (!username) {
    $('#recover-user-error').text('Username is required.');
    return;
  }
  if (!isValidEmail(email)) {
    $('#recover-email-error').text('Invalid email format.');
    return;
  }
  if (!isValidPhone(phone)) {
    $('#recover-phone-error').text('Invalid phone number.');
    return;
  }

  try {
    const userPub = await gun.get('users').get(username).once();
    if (!userPub) {
      $('#recover-msg').text('User not found.');
      return;
    }

    const tempUser = gun.user();
    tempUser.auth(username, null, async (ack) => {
      if (ack.err) {
        $('#recover-msg').text('Authentication failed.');
        return;
      }

      const profile = await tempUser.get('profile').once();
      const storedEmail = profile.email;
      const storedPhone = profile.phone;

      const inputPhone = `${countryCode}${phone}`;

      if (storedEmail === email && storedPhone === inputPhone) {
        $('#recover-msg').text('Verification successful. Please reset your password.');
        // Implement password reset logic here
      } else {
        $('#recover-msg').text('Verification failed. Details do not match.');
      }
    });
  } catch (error) {
    console.error('Password recovery error:', error);
    $('#recover-msg').text('An error occurred during recovery.');
  }
});

// Username Recovery Functionality
$('#recover-username-btn').click(async () => {
  const email = $('#username-recovery-email').val().trim();
  const countryCode = $('#username-country-code').val();
  const phone = $('#username-phone').val().trim();
  const password = $('#username-recovery-pass').val();

  // Clear previous error messages
  $('.error-message').text('');

  if (!isValidEmail(email)) {
    $('#username-recovery-email-error').text('Invalid email format.');
    return;
  }
  if (!isValidPhone(phone)) {
    $('#username-phone-error').text('Invalid phone number.');
    return;
  }
  if (!isValidPassword(password)) {
    $('#username-recovery-pass-error').text('Password must be at least 6 characters.');
    return;
  }

  try {
    gun.get('users').map().once(async (pub, username) => {
      const tempUser = gun.user();
      tempUser.auth(username, password, async (ack) => {
        if (ack.err) return;

        const profile = await tempUser.get('profile').once();
        const storedEmail = profile.email;
        const storedPhone = profile.phone;

        const inputPhone = `${countryCode}${phone}`;

        if (storedEmail === email && storedPhone === inputPhone) {
          $('#username-msg').text(`Your username is: ${username}`);
        }
      });
    });
  } catch (error) {
    console.error('Username recovery error:', error);
    $('#username-msg').text('An error occurred during recovery.');
  }
});

// Update Account Status
function updateStatus() {
  if (user.is) {
    const username = user.is.alias;
    const pub = user.is.pub;
    const timestamp = new Date().toISOString();
    const address = pub;

    $('#status-info').html(`
      <p><strong>Logged in as:</strong> ${username}</p>
      <p><strong>Public Key:</strong> ${address}</p>
      <p><strong>Login Time:</strong> ${timestamp}</p>
    `);
  } else {
    $('#status-info').html('<p>You are not logged in.</p>');
  }
}

// Maintain Session Across Pages
user.recall({ sessionStorage: true }, () => {
  updateStatus();
});

// Initialize Status on Page Load
$(document).ready(() => {
  updateStatus();
});
