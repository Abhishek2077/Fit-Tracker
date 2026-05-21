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
}

/* ---------- Progress Ring ---------- */
async function loadProgressRing(profile) {
  const nutrition = await getDailyNutrition();

  // Calculate daily score
  const proteinGoal = profile.proteinGoal || 140;
  const calorieGoal = profile.calorieGoal || 2000;

  let score = 0;
  // Protein score (50 points)
  score += Math.min(50, (nutrition.protein / proteinGoal) * 50);
  // Calorie score (50 points)
  const calRatio = nutrition.calories / calorieGoal;
  score += calRatio >= 0.8 && calRatio <= 1.2 ? 50 : Math.max(0, 50 - Math.abs(1 - calRatio) * 60);

  score = Math.round(Math.min(100, score));

  // Animate ring
  const circle = document.getElementById('progress-circle');
  if (circle) {
    const circumference = 2 * Math.PI * 42;
    circle.style.strokeDasharray = circumference;
    circle.style.strokeDashoffset = circumference;
    setTimeout(() => {
      circle.style.transition = 'stroke-dashoffset 1.5s ease';
      circle.style.strokeDashoffset = circumference * (1 - score / 100);
    }, 300);
    circle.style.stroke = getScoreColor(score);
  }

  // Score number
  const scoreEl = document.getElementById('ring-score');
  if (scoreEl) animateNumber(scoreEl, score, 1500);

  // Details
  const rp = document.getElementById('ring-protein');
  if (rp) rp.textContent = `${nutrition.protein}g / ${proteinGoal}g`;
  const rc = document.getElementById('ring-calories');
  if (rc) rc.textContent = `${nutrition.calories} / ${calorieGoal}`;
}

/* ---------- Protein Remaining ---------- */
async function loadProteinRemaining(profile) {
  const nutrition = await getDailyNutrition();
  const goal = profile.proteinGoal || 140;
  const remaining = Math.max(0, goal - nutrition.protein);
  const percentage = Math.min(100, (nutrition.protein / goal) * 100);

  const pc = document.getElementById('protein-consumed');
  if (pc) pc.textContent = nutrition.protein;
  const pg = document.getElementById('protein-goal');
  if (pg) pg.textContent = goal;
  
  const pr = document.getElementById('protein-remaining');
  if (pr) animateNumber(pr, remaining, 800, 'g');

  const fill = document.getElementById('protein-progress-fill');
  if (fill) setTimeout(() => { fill.style.width = percentage + '%'; }, 200);
}

/* ---------- Streaks ---------- */
async function loadStreaks() {
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
  const pBadge = document.getElementById('streak-protein-badge');
  if (pBadge) pBadge.style.display = proteinStreak > 0 ? 'flex' : 'none';
  const pCount = document.getElementById('streak-protein');
  if (pCount) pCount.textContent = proteinStreak;
}

/* ---------- Charts ---------- */
async function loadCharts() {
  const dates = getDateRange(7);
  const labels = dates.map(d => getDayName(d));
  const proteinData = [];
  const calData = [];

  for (const d of dates) {
    const n = await getDailyNutrition(d);
    proteinData.push(n.protein);
    calData.push(n.calories);
  }

  createProteinChart('chart-protein', labels, proteinData, (await getProfile())?.proteinGoal || 140);
  createCaloriesChart('chart-calories', labels, calData);
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
