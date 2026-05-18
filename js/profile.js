/* ==========================================
   FitTracker AI - Profile Page Logic
   Profile, calendar, prediction, expenses
   ========================================== */

document.addEventListener('DOMContentLoaded', async () => {
  await initDB();
  loadProfile();
  loadCalendar();
  loadExpenses();
  initAnimations();
});

const GOAL_LABELS = {
  'fat-loss': '🔥 Fat Loss',
  'muscle-gain': '💪 Muscle Gain',
  'bulk': '🍖 Bulk',
  'cut': '✂️ Cut',
  'recomposition': '⚡ Recomposition'
};

/* ---------- Load Profile ---------- */
async function loadProfile() {
  const profile = await getProfile();
  if (!profile) {
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('profile-name').textContent = profile.name;
  document.getElementById('profile-goal').textContent = GOAL_LABELS[profile.goalType] || profile.goalType;
  document.getElementById('profile-avatar-letter').textContent = profile.name.charAt(0).toUpperCase();

  // Stats
  document.getElementById('ps-weight').textContent = (profile.weight || '—') + (profile.weight ? 'kg' : '');
  document.getElementById('ps-target').textContent = (profile.targetWeight || '—') + (profile.targetWeight ? 'kg' : '');
  document.getElementById('ps-height').textContent = (profile.height || '—') + (profile.height ? 'cm' : '');

  // BMI
  if (profile.weight && profile.height) {
    const bmi = (profile.weight / Math.pow(profile.height / 100, 2)).toFixed(1);
    document.getElementById('ps-bmi').textContent = bmi;
  }

  // Form
  document.getElementById('edit-name').value = profile.name || '';
  document.getElementById('edit-age').value = profile.age || '';
  document.getElementById('edit-height').value = profile.height || '';
  document.getElementById('edit-weight').value = profile.weight || '';
  document.getElementById('edit-target').value = profile.targetWeight || '';
  document.getElementById('edit-protein').value = profile.proteinGoal || 140;
  document.getElementById('edit-calories').value = profile.calorieGoal || 2000;

  // Select goal
  document.querySelectorAll('.goal-option').forEach(o => {
    o.classList.toggle('selected', o.dataset.goal === profile.goalType);
  });
}

async function updateProfile() {
  const profile = await getProfile() || {};
  const selectedGoal = document.querySelector('.goal-option.selected');

  profile.name = document.getElementById('edit-name').value.trim() || profile.name;
  profile.age = parseInt(document.getElementById('edit-age').value) || profile.age;
  profile.height = parseInt(document.getElementById('edit-height').value) || profile.height;
  profile.weight = parseFloat(document.getElementById('edit-weight').value) || profile.weight;
  profile.targetWeight = parseFloat(document.getElementById('edit-target').value) || profile.targetWeight;
  profile.proteinGoal = parseInt(document.getElementById('edit-protein').value) || 140;
  profile.calorieGoal = parseInt(document.getElementById('edit-calories').value) || 2000;
  profile.goalType = selectedGoal?.dataset.goal || profile.goalType;

  await saveProfile(profile);
  showToast('Profile updated! ✅', 'success');
  loadProfile();
}

function selectGoal(el) {
  document.querySelectorAll('.goal-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
}

/* ---------- Calendar ---------- */
async function loadCalendar() {
  const container = document.getElementById('calendar-grid');
  if (!container) return;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayDate = now.getDate();

  document.getElementById('cal-month').textContent = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  let html = '';
  ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(d => {
    html += `<div class="cal-header">${d}</div>`;
  });

  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    html += '<div class="cal-day" style="opacity:0"></div>';
  }

  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const log = await dbGet(STORES.DAILY_LOGS, dateStr);
    const meals = await getMealsByDate(dateStr);
    const hasCheat = meals.some(m => m.isCheat);
    const isToday = d === todayDate;

    let icons = '';
    if (log?.gymDone) icons += '✔';
    if (hasCheat) icons += '⚠';

    html += `
      <div class="cal-day ${isToday ? 'today' : ''} ${log?.gymDone ? 'gym' : ''} ${hasCheat ? 'cheat' : ''}" 
           onclick="showDayDetail('${dateStr}')">
        <span>${d}</span>
        <span class="cal-icons">${icons}</span>
      </div>
    `;
  }

  container.innerHTML = html;
}

function showDayDetail(dateStr) {
  showToast(`Viewing ${formatDate(dateStr)} — Go to Reports for details`, 'info');
}

/* ---------- Body Prediction ---------- */
async function loadPrediction() {
  const profile = await getProfile();
  if (!profile) return;

  const container = document.getElementById('prediction-result');
  container.innerHTML = '<div class="analyzing-spinner"><div class="spinner"></div><div class="text-sm text-muted">AI predicting...</div></div>';

  try {
    const allLogs = await dbGetAll(STORES.DAILY_LOGS);
    const prediction = await predictBody(profile, allLogs);

    container.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;position:relative">
        <div class="stat-card"><div class="stat-value">${prediction.currentWeight}kg</div><div class="stat-label">Current</div></div>
        <div class="stat-card"><div class="stat-value" style="color:var(--accent)">${prediction.predictedWeight1Month}kg</div><div class="stat-label">In 1 Month</div></div>
        <div class="stat-card"><div class="stat-value" style="color:var(--success)">${prediction.predictedWeight3Month}kg</div><div class="stat-label">In 3 Months</div></div>
        <div class="stat-card"><div class="stat-value text-sm">${prediction.predictedTargetDate}</div><div class="stat-label">Target Date</div></div>
      </div>
      <div class="badge badge-${prediction.confidence === 'high' ? 'success' : 'warning'}" style="margin-bottom:8px">
        Confidence: ${prediction.confidence}
      </div>
      <p class="text-sm text-muted">${prediction.advice}</p>
    `;
  } catch (error) {
    container.innerHTML = `<p class="text-sm" style="color:var(--danger)">❌ ${error.message}</p>`;
  }
}

/* ---------- Expense Tracker ---------- */
async function loadExpenses() {
  const expenses = await dbGetAll(STORES.EXPENSES);
  const container = document.getElementById('expense-list');
  if (!container) return;

  const currentMonth = getCurrentMonth();
  const thisMonth = expenses.filter(e => e.month === currentMonth);

  const total = thisMonth.reduce((s, e) => s + (e.amount || 0), 0);
  document.getElementById('expense-total').textContent = '₹' + total;

  if (thisMonth.length === 0) {
    container.innerHTML = '<p class="text-sm text-muted" style="text-align:center;padding:16px">No expenses this month</p>';
    return;
  }

  thisMonth.sort((a, b) => b.date.localeCompare(a.date));
  container.innerHTML = thisMonth.map(e => `
    <div class="expense-item">
      <span style="font-size:1.2rem">${getCategoryIcon(e.category)}</span>
      <div style="flex:1">
        <div style="font-weight:600;font-size:0.85rem">${e.description}</div>
        <div class="text-xs text-muted">${formatDate(e.date)}</div>
      </div>
      <div class="expense-amount">₹${e.amount}</div>
    </div>
  `).join('');
}

function getCategoryIcon(cat) {
  const icons = { gym: '🏋️', chicken: '🍗', whey: '🥛', supplements: '💊', other: '📦' };
  return icons[cat] || '📦';
}

async function addExpense() {
  const desc = document.getElementById('expense-desc').value.trim();
  const amount = parseFloat(document.getElementById('expense-amount').value);
  const cat = document.getElementById('expense-category').value;

  if (!desc || !amount) {
    showToast('Fill in description and amount', 'warning');
    return;
  }

  await dbPut(STORES.EXPENSES, {
    description: desc,
    amount,
    category: cat,
    date: getToday(),
    month: getCurrentMonth()
  });

  document.getElementById('expense-desc').value = '';
  document.getElementById('expense-amount').value = '';
  showToast('Expense added! 💰', 'success');
  loadExpenses();
}
