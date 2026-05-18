/* ==========================================
   FitTracker AI - Dashboard Logic
   Main dashboard with charts, stats, streaks
   ========================================== */

document.addEventListener('DOMContentLoaded', async () => {
  await initDB();
  showSplash(loadDashboard);
  renderBottomNav('home');
});

async function loadDashboard() {
  const profile = await getProfile();
  if (!profile) {
    window.location.href = 'index.html';
    return;
  }

  // Greeting
  document.getElementById('greeting-text').textContent = getGreeting();
  document.getElementById('user-name').textContent = profile.name;

  // Load all dashboard data
  await Promise.all([
    loadQuickStats(profile),
    loadProgressRing(profile),
    loadProteinRemaining(profile),
    loadStreaks(),
    loadChecklist(),
    loadCharts(),
    loadRecentMeals()
  ]);

  // Initialize animations
  initAnimations();

  // Check reminders
  setTimeout(() => checkReminders(), 2000);
}

/* ---------- Quick Stats ---------- */
async function loadQuickStats(profile) {
  const nutrition = await getDailyNutrition();
  const log = await getDailyLog();

  // Calories
  const calEl = document.getElementById('stat-calories');
  if (calEl) animateNumber(calEl, nutrition.calories, 800);
  const calGoal = document.getElementById('stat-calories-goal');
  if (calGoal) calGoal.textContent = `/ ${profile.calorieGoal || 2000} kcal`;

  // Protein
  const proEl = document.getElementById('stat-protein');
  if (proEl) animateNumber(proEl, nutrition.protein, 800, 'g');
  const proGoal = document.getElementById('stat-protein-goal');
  if (proGoal) proGoal.textContent = `/ ${profile.proteinGoal || 140}g goal`;

  // Water
  const waterEl = document.getElementById('stat-water');
  if (waterEl) animateNumber(waterEl, log.water || 0, 600);
  document.getElementById('stat-water-sub').textContent = '/ 8 glasses';

  // Weight
  const weightEl = document.getElementById('stat-weight');
  if (log.weight) {
    weightEl.textContent = log.weight + ' kg';
  } else if (profile.weight) {
    weightEl.textContent = profile.weight + ' kg';
  } else {
    weightEl.textContent = '—';
  }

  const targetDiff = profile.targetWeight && (log.weight || profile.weight) ?
    ((log.weight || profile.weight) - profile.targetWeight).toFixed(1) : null;
  document.getElementById('stat-weight-sub').textContent = targetDiff ? 
    `${targetDiff > 0 ? targetDiff + 'kg to lose' : Math.abs(targetDiff) + 'kg to gain'}` : 'Log weight daily';
}

/* ---------- Progress Ring ---------- */
async function loadProgressRing(profile) {
  const nutrition = await getDailyNutrition();
  const log = await getDailyLog();

  // Calculate daily score
  const proteinGoal = profile.proteinGoal || 140;
  const calorieGoal = profile.calorieGoal || 2000;

  let score = 0;
  // Protein score (40 points)
  score += Math.min(40, (nutrition.protein / proteinGoal) * 40);
  // Calorie score (20 points)
  const calRatio = nutrition.calories / calorieGoal;
  score += calRatio >= 0.8 && calRatio <= 1.2 ? 20 : Math.max(0, 20 - Math.abs(1 - calRatio) * 30);
  // Gym (15 points)
  if (log.gymDone) score += 15;
  // Water (10 points)
  score += Math.min(10, (log.water / 8) * 10);
  // Sleep (10 points)
  if (log.sleep && log.sleep >= 7) score += 10;
  // Supplements (5 points)
  if (log.creatine) score += 3;
  if (log.supplements) score += 2;

  score = Math.round(Math.min(100, score));

  // Animate ring
  const circle = document.getElementById('progress-circle');
  const circumference = 2 * Math.PI * 42;
  circle.style.strokeDasharray = circumference;
  circle.style.strokeDashoffset = circumference;
  setTimeout(() => {
    circle.style.transition = 'stroke-dashoffset 1.5s ease';
    circle.style.strokeDashoffset = circumference * (1 - score / 100);
  }, 300);

  // Score number
  const scoreEl = document.getElementById('ring-score');
  animateNumber(scoreEl, score, 1500);

  // Score color
  circle.style.stroke = getScoreColor(score);

  // Details
  document.getElementById('ring-protein').textContent = `${nutrition.protein}g / ${proteinGoal}g`;
  document.getElementById('ring-calories').textContent = `${nutrition.calories} / ${calorieGoal}`;
  document.getElementById('ring-gym').textContent = log.gymDone ? '✅ Done' : '❌ Not yet';
  document.getElementById('ring-water').textContent = `${log.water || 0} / 8 glasses`;
}

/* ---------- Protein Remaining ---------- */
async function loadProteinRemaining(profile) {
  const nutrition = await getDailyNutrition();
  const goal = profile.proteinGoal || 140;
  const remaining = Math.max(0, goal - nutrition.protein);
  const percentage = Math.min(100, (nutrition.protein / goal) * 100);

  document.getElementById('protein-consumed').textContent = nutrition.protein;
  document.getElementById('protein-goal').textContent = goal;
  animateNumber(document.getElementById('protein-remaining'), remaining, 800, 'g');

  const fill = document.getElementById('protein-progress-fill');
  setTimeout(() => { fill.style.width = percentage + '%'; }, 200);
}

/* ---------- Streaks ---------- */
async function loadStreaks() {
  const gymStreak = await calculateStreak('gymDone');
  const creatineStreak = await calculateStreak('creatine');

  // Calculate water streak (water >= 6)
  const allLogs = await dbGetAll(STORES.DAILY_LOGS);
  allLogs.sort((a, b) => b.date.localeCompare(a.date));
  let waterStreak = 0;
  const today = new Date();
  for (let i = 0; i < allLogs.length; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const l = allLogs.find(x => x.date === dateStr);
    if (l && l.water >= 6) waterStreak++;
    else break;
  }

  // Calculate protein streak
  let proteinStreak = 0;
  const profile = await getProfile();
  const proteinGoal = profile?.proteinGoal || 140;
  for (let i = 0; i < 60; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const nutrition = await getDailyNutrition(dateStr);
    if (nutrition.protein >= proteinGoal * 0.9) proteinStreak++;
    else break;
  }

  document.getElementById('streak-gym').textContent = gymStreak;
  document.getElementById('streak-protein').textContent = proteinStreak;
  document.getElementById('streak-water').textContent = waterStreak;
  document.getElementById('streak-creatine').textContent = creatineStreak;

  // Highlight active streaks
  if (gymStreak >= 3) document.getElementById('streak-gym-badge').classList.add('active');
  if (proteinStreak >= 3) document.getElementById('streak-protein-badge').classList.add('active');
  if (waterStreak >= 3) document.getElementById('streak-water-badge').classList.add('active');
}

/* ---------- Daily Checklist ---------- */
async function loadChecklist() {
  const log = await getDailyLog();
  updateChecklistUI('check-gym', log.gymDone);
  updateChecklistUI('check-creatine', log.creatine);
  updateChecklistUI('check-supplements', log.supplements);
}

function updateChecklistUI(id, checked) {
  const item = document.getElementById(id);
  if (!item) return;
  if (checked) {
    item.classList.add('checked');
    item.querySelector('.checklist-check').textContent = '✓';
  } else {
    item.classList.remove('checked');
    item.querySelector('.checklist-check').textContent = '';
  }
}

async function toggleChecklist(field) {
  const log = await getDailyLog();
  log[field] = !log[field];
  await saveDailyLog(log);
  updateChecklistUI(
    field === 'gymDone' ? 'check-gym' : field === 'creatine' ? 'check-creatine' : 'check-supplements',
    log[field]
  );
  showToast(log[field] ? '✅ Marked done!' : 'Unchecked', 'success');

  // Reload streaks
  loadStreaks();
}

/* ---------- Charts ---------- */
async function loadCharts() {
  const dates = getDateRange(7);
  const labels = dates.map(d => getDayName(d));
  const proteinData = [];
  const calData = [];
  const weightData = [];

  for (const d of dates) {
    const n = await getDailyNutrition(d);
    const l = await getDailyLog(d);
    proteinData.push(n.protein);
    calData.push(n.calories);
    weightData.push(l.weight || null);
  }

  // Filter null weights
  const filteredWeights = weightData.filter(w => w !== null);
  const weightLabels = labels.filter((_, i) => weightData[i] !== null);

  createProteinChart('chart-protein', labels, proteinData, (await getProfile())?.proteinGoal || 140);
  createCaloriesChart('chart-calories', labels, calData);
  if (filteredWeights.length >= 2) {
    createWeightChart('chart-weight', weightLabels, filteredWeights);
  }
}

/* ---------- Recent Meals ---------- */
async function loadRecentMeals() {
  const meals = await getMealsByDate();
  const container = document.getElementById('recent-meals-list');
  if (!container) return;

  if (meals.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding:24px">
        <div class="empty-icon">🍽️</div>
        <p class="text-sm text-muted">No meals logged today</p>
        <a href="daily-log.html" class="btn btn-sm btn-primary" style="margin-top:12px">Log Food</a>
      </div>
    `;
    return;
  }

  container.innerHTML = meals.slice(-5).reverse().map(meal => `
    <div class="meal-card ${meal.isCheat ? 'cheat' : ''}">
      <div style="font-size:1.5rem">${meal.isCheat ? '🍔' : '🥗'}</div>
      <div class="meal-info">
        <div class="meal-name">${meal.description || 'Meal'} ${meal.isCheat ? '<span class="cheat-meal-tag">🔥 CHEAT</span>' : ''}</div>
        <div class="meal-macros">P: ${meal.protein || 0}g • C: ${meal.carbs || 0}g • F: ${meal.fat || 0}g</div>
      </div>
      <div>
        <div class="meal-cal">${meal.calories || 0}</div>
        <div class="meal-time">kcal</div>
      </div>
    </div>
  `).join('');
}
