// accountone.js

const gun = Gun(); const user = gun.user();

// UTILITIES function showMsg(el, msg, type = 'info') { el.textContent = msg; el.style.color = type === 'error' ? 'red' : type === 'success' ? 'green' : 'blue'; }

function uniqueKey(phone, email) { return sha256(phone + '|' + email); }

// SIGNUP $('#signup-btn').on('click', () => { const username = $('#signup-user').val().trim(); const email = $('#signup-email').val().trim().toLowerCase(); const phone = $('#signup-country-code').val() + $('#signup-phone').val().trim(); const pass = $('#signup-pass').val(); const confirm = $('#signup-confirm').val();

if (!username || !email || !phone || !pass || pass !== confirm) { showMsg($('#signup-msg')[0], 'All fields required & passwords must match', 'error'); return; }

user.create(username, pass, ack => { if (ack.err) return showMsg($('#signup-msg')[0], ack.err, 'error');

user.auth(username, pass, auth => {
  if (auth.err) return showMsg($('#signup-msg')[0], auth.err, 'error');

  const profile = user.get('profile');
  profile.put({ username, email, phone, uid: uniqueKey(phone, email) });
  showMsg($('#signup-msg')[0], 'Signup successful! You are logged in.', 'success');
});

}); });

// LOGIN $('#login-btn').on('click', () => { const username = $('#login-user').val().trim(); const pass = $('#login-pass').val(); user.auth(username, pass, ack => { if (ack.err) return showMsg($('#login-msg')[0], ack.err, 'error'); showMsg($('#login-msg')[0], 'Logged in as ' + username, 'success'); updateStatus(); }); });

// LOGOUT $('#logout-btn').on('click', () => { user.leave(); showMsg($('#status-info')[0], 'Logged out successfully.', 'info'); });

// RECOVER PASSWORD $('#recover-pass-btn').on('click', () => { const username = $('#recover-user').val().trim(); const email = $('#recover-email').val().trim().toLowerCase(); const phone = $('#recover-country-code').val() + $('#recover-phone').val().trim();

gun.get('~@' + username).once(data => { if (!data) return showMsg($('#recover-msg')[0], 'User not found', 'error'); const pub = Object.values(data)[0]; gun.user(pub).get('profile').once(profile => { if (profile && profile.email === email && profile.phone === phone) { showMsg($('#recover-msg')[0], '✅ Verified. Password reset not supported directly in GUN. Use a custom reset flow.', 'info'); } else { showMsg($('#recover-msg')[0], 'No matching profile found.', 'error'); } }); }); });

// RECOVER USERNAME $('#recover-username-btn').on('click', () => { const email = $('#username-recovery-email').val().trim().toLowerCase(); const phone = $('#username-country-code').val() + $('#username-phone').val().trim(); const pass = $('#username-recovery-pass').val();

gun.get('~').map().once((data, key) => { gun.user(key).get('profile').once(profile => { if (profile && profile.email === email && profile.phone === phone) { gun.user().auth(profile.username, pass, ack => { if (!ack.err) { showMsg($('#recover-username-msg')[0], Username is: ${profile.username}, 'success'); } }); } }); }); });

// STATUS function updateStatus() { if (!user.is) { $('#status-info').text('Not logged in.'); } else { const username = user.is.alias; $('#status-info').text('Logged in as: ' + username); } }

// On load updateStatus();

