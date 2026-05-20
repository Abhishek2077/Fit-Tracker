/* ==========================================
   FitTracker AI - Settings Page
   Theme, API key, backup/restore, reset
   ========================================== */

document.addEventListener('DOMContentLoaded', async () => {
  await initDB();
  loadSettings();
  initAnimations();
});

function loadSettings() {
  // Theme toggle
  const isDark = getTheme() === 'dark';
  const toggle = document.getElementById('toggle-theme');
  if (isDark) toggle.classList.add('active');

  // API Key
  const key = getApiKey();
  document.getElementById('api-key-input').value = key ? '••••••••••' + key.slice(-4) : '';
  document.getElementById('api-status').textContent = key ? '✅ Key set' : '❌ Not set';

  // Reminders
  const reminders = localStorage.getItem('ft-reminders') !== 'false';
  if (reminders) document.getElementById('toggle-reminders').classList.add('active');

  // Tracking Cycle
  const cycleMode = localStorage.getItem('ft-cycle-mode') || 'calendar';
  if (cycleMode === 'manual') {
    document.getElementById('toggle-manual-cycle').classList.add('active');
    document.getElementById('manual-cycle-controls').style.display = 'flex';
    updateCycleStatus();
  }

  // Data stats
  loadDataStats();
}

function toggleThemeSetting() {
  toggleTheme();
  const toggle = document.getElementById('toggle-theme');
  toggle.classList.toggle('active');
  showToast(`Switched to ${getTheme()} mode`, 'success');
}

function toggleReminders() {
  const toggle = document.getElementById('toggle-reminders');
  toggle.classList.toggle('active');
  const enabled = toggle.classList.contains('active');
  localStorage.setItem('ft-reminders', enabled);
  showToast(enabled ? 'Reminders enabled' : 'Reminders disabled', 'success');
}

/* ---------- Tracking Cycle ---------- */
function toggleManualCycle() {
  const toggle = document.getElementById('toggle-manual-cycle');
  toggle.classList.toggle('active');
  const isManual = toggle.classList.contains('active');
  localStorage.setItem('ft-cycle-mode', isManual ? 'manual' : 'calendar');
  
  const controls = document.getElementById('manual-cycle-controls');
  if (isManual) {
    controls.style.display = 'flex';
    if (!localStorage.getItem('ft-cycle-start')) {
      localStorage.setItem('ft-cycle-start', getToday());
    }
    updateCycleStatus();
  } else {
    controls.style.display = 'none';
  }
  showToast(isManual ? 'Manual cycle mode enabled' : 'Calendar month mode enabled', 'success');
}

function startNewCycle() {
  if (!confirm('This will end your current tracking cycle and start a new one today. Continue?')) return;
  const today = getToday();
  localStorage.setItem('ft-cycle-start', today);
  updateCycleStatus();
  showToast('New cycle started from ' + today, 'success');
}

function updateCycleStatus() {
  const start = localStorage.getItem('ft-cycle-start');
  const el = document.getElementById('current-cycle-status');
  if (el && start) {
    el.textContent = 'Active cycle started on: ' + formatDate(start);
  }
}

/* ---------- API Key ---------- */
function saveApiKey() {
  const key = document.getElementById('api-key-new').value.trim();
  if (!key) {
    showToast('Enter an API key', 'warning');
    return;
  }
  setApiKey(key);
  document.getElementById('api-key-new').value = '';
  document.getElementById('api-key-input').value = '••••••••••' + key.slice(-4);
  document.getElementById('api-status').textContent = '✅ Key set';
  showToast('API key saved! 🔑', 'success');
}

/* ---------- Backup & Restore ---------- */
async function exportData() {
  try {
    const data = await exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fittracker-backup-${getToday()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported! 📦', 'success');
  } catch (error) {
    showToast('Export failed: ' + error.message, 'danger');
  }
}

function triggerImport() {
  document.getElementById('import-file').click();
}

async function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!confirm('This will replace ALL current data. Continue?')) {
    event.target.value = '';
    return;
  }

  try {
    const text = await file.text();
    await importAllData(text);
    showToast('Data imported successfully! 🎉', 'success');
    setTimeout(() => location.reload(), 1000);
  } catch (error) {
    showToast('Import failed: ' + error.message, 'danger');
  }
  event.target.value = '';
}

/* ---------- Reset ---------- */
async function resetAllData() {
  if (!confirm('⚠️ This will DELETE all your data permanently. Are you sure?')) return;
  if (!confirm('LAST WARNING: This cannot be undone. Export your data first! Continue?')) return;

  try {
    await clearAllData();
    localStorage.clear();
    showToast('All data cleared. Redirecting...', 'success');
    setTimeout(() => window.location.href = 'index.html', 1500);
  } catch (error) {
    showToast('Reset failed: ' + error.message, 'danger');
  }
}

/* ---------- Data Stats ---------- */
async function loadDataStats() {
  try {
    const meals = await dbGetAll(STORES.MEALS);
    const workouts = await dbGetAll(STORES.WORKOUTS);
    const logs = await dbGetAll(STORES.DAILY_LOGS);

    document.getElementById('data-meals').textContent = meals.length;
    document.getElementById('data-workouts').textContent = workouts.length;
    document.getElementById('data-days').textContent = logs.length;
  } catch(e) {}
}

/* ---------- Install App ---------- */
function installAppFromSettings() {
  if (deferredPrompt) {
    installApp();
  } else {
    showToast('App already installed or not available for install', 'info');
  }
}
