/* ==========================================
   FitTracker - Login Logic
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, redirect to index
  if (localStorage.getItem('ft_current_user')) {
    window.location.href = 'index.html';
  }
});

function switchLoginTab(tab) {
  document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.login-form').forEach(f => f.classList.remove('active'));
  
  if (tab === 'login') {
    document.querySelectorAll('.login-tab')[0].classList.add('active');
    document.getElementById('form-login').classList.add('active');
  } else {
    document.querySelectorAll('.login-tab')[1].classList.add('active');
    document.getElementById('form-register').classList.add('active');
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  // Trigger reflow
  toast.offsetHeight;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function login() {
  const username = document.getElementById('login-username').value.trim().toLowerCase();
  const pin = document.getElementById('login-pin').value.trim();

  if (!username) {
    showToast('Username is required', 'warning');
    return;
  }

  // Read users list from localStorage
  const usersStr = localStorage.getItem('ft_users');
  const users = usersStr ? JSON.parse(usersStr) : {};

  if (!users[username]) {
    showToast('User not found. Please create a profile.', 'danger');
    return;
  }

  if (users[username].pin !== pin) {
    showToast('Incorrect PIN', 'danger');
    return;
  }

  // Success
  localStorage.setItem('ft_current_user', username);
  window.location.href = 'index.html';
}

function register() {
  const username = document.getElementById('reg-username').value.trim().toLowerCase();
  const pin = document.getElementById('reg-pin').value.trim();

  if (!username) {
    showToast('Username is required', 'warning');
    return;
  }

  if (username.length < 3) {
    showToast('Username must be at least 3 characters', 'warning');
    return;
  }

  const usersStr = localStorage.getItem('ft_users');
  const users = usersStr ? JSON.parse(usersStr) : {};

  if (users[username]) {
    showToast('Username already exists. Please login.', 'danger');
    return;
  }

  // Save new user
  users[username] = {
    username,
    pin: pin || '', // PIN is optional
    createdAt: new Date().toISOString()
  };

  localStorage.setItem('ft_users', JSON.stringify(users));
  localStorage.setItem('ft_current_user', username);
  
  window.location.href = 'index.html';
}
