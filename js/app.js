/* ==========================================
   FitTracker AI - Shared App Utilities
   Navigation, PWA installer, themes, toasts
   ========================================== */

/* ---------- Register Service Worker ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((reg) => console.log('SW registered:', reg.scope))
      .catch((err) => console.log('SW registration failed:', err));
  });
}

/* ---------- PWA Install Prompt ---------- */
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallBanner();
});

function showInstallBanner() {
  const banner = document.getElementById('install-banner');
  if (banner) banner.classList.remove('hidden');
}

function hideInstallBanner() {
  const banner = document.getElementById('install-banner');
  if (banner) banner.classList.add('hidden');
}

async function installApp() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') {
    showToast('App installed successfully! 🎉', 'success');
  }
  deferredPrompt = null;
  hideInstallBanner();
}

/* ---------- Theme Management ---------- */
function getTheme() {
  return localStorage.getItem('ft-theme') || 'dark';
}

function setTheme(theme) {
  localStorage.setItem('ft-theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
}

function toggleTheme() {
  const current = getTheme();
  setTheme(current === 'dark' ? 'light' : 'dark');
}

// Initialize theme
document.documentElement.setAttribute('data-theme', getTheme());

/* ---------- Toast Notifications ---------- */
function showToast(message, type = 'success', duration = 3000) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: '✅',
    danger: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span style="font-size:1.1rem">${icons[type] || '📢'}</span>
    <span style="flex:1;font-size:0.85rem">${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100px)';
    toast.style.transition = '0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* ---------- Bottom Navigation HTML ---------- */
function renderBottomNav(activePage) {
  const nav = document.createElement('nav');
  nav.className = 'bottom-nav';
  nav.setAttribute('aria-label', 'Main navigation');

  const items = [
    { id: 'home', href: 'dashboard.html', icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`, label: 'Home' },
    { id: 'log', href: 'daily-log.html', icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`, label: 'Log' },
    { id: 'workout', href: 'workout.html', icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5L17.5 17.5M6.5 17.5L17.5 6.5M2 12h4M18 12h4M12 2v4M12 18v4"/></svg>`, label: 'Gym' },
    { id: 'reports', href: 'reports.html', icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`, label: 'Reports' },
    { id: 'chat', href: 'chat.html', icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`, label: 'AI Coach' }
  ];

  items.forEach(item => {
    const a = document.createElement('a');
    a.href = item.href;
    a.className = `nav-item ${activePage === item.id ? 'active' : ''}`;
    a.id = `nav-${item.id}`;
    a.innerHTML = `${item.icon}<span>${item.label}</span>`;
    nav.appendChild(a);
  });

  document.body.appendChild(nav);
}

/* ---------- Splash Screen ---------- */
function showSplash(callback) {
  const splash = document.getElementById('splash');
  if (splash) {
    setTimeout(() => {
      splash.classList.add('hide');
      setTimeout(() => {
        splash.remove();
        if (callback) callback();
      }, 500);
    }, 1200);
  } else {
    if (callback) callback();
  }
}

/* ---------- Format Helpers ---------- */
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatFullDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function getDayName(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' });
}

function timeAgo(dateStr) {
  const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

/* ---------- Score Color ---------- */
function getScoreColor(score) {
  if (score >= 80) return 'var(--success)';
  if (score >= 60) return 'var(--accent)';
  if (score >= 40) return 'var(--warning)';
  return 'var(--danger)';
}

/* ---------- Smooth Number Animation ---------- */
function animateNumber(element, target, duration = 1000, suffix = '') {
  const start = parseInt(element.textContent) || 0;
  const range = target - start;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
    const current = Math.round(start + range * eased);
    element.textContent = current + suffix;
    if (progress < 1) requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

/* ---------- Modal Helpers ---------- */
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

/* ---------- Intersection Observer for Animations ---------- */
function initAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el));
}

/* ---------- Voice Input ---------- */
function startVoiceInput(callback) {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    showToast('Voice input not supported in this browser', 'warning');
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    callback(transcript);
    showToast('Voice captured: ' + transcript.substring(0, 50), 'success');
  };

  recognition.onerror = (event) => {
    showToast('Voice error: ' + event.error, 'danger');
  };

  recognition.start();
  showToast('🎙 Listening... speak now', 'info');
}

/* ---------- Smart Reminders Check ---------- */
async function checkReminders() {
  const profile = await getProfile();
  if (!profile) return;

  const nutrition = await getDailyNutrition();
  const log = await getDailyLog();
  const hour = new Date().getHours();

  // Protein low reminder
  if (hour >= 18 && nutrition.protein < (profile.proteinGoal || 140) * 0.5) {
    showToast(`⚠️ Protein only ${nutrition.protein}g — eat more protein!`, 'warning');
  }

  // Water reminder
  if (log.water < 6 && hour >= 14) {
    showToast('💧 Drink more water! Only ' + log.water + ' glasses today', 'info');
  }

  // Creatine reminder
  if (!log.creatine && hour >= 10) {
    showToast('💊 Don\'t forget your creatine!', 'info');
  }

  // Sleep reminder
  if (hour >= 22) {
    showToast('😴 It\'s getting late — sleep early for recovery!', 'info');
  }
}

/* ---------- Debounce ---------- */
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}
