/* ==========================================
   FitTracker AI - Goals, Badges & Streaks
   ========================================== */

// Badge definitions
const BADGE_DEFS = [
  { id: 'protein100', icon: '🥩', name: 'Protein King', desc: 'Hit 100g protein in a day', check: async () => { const n = await getDailyNutrition(); return n.protein >= 100; }},
  { id: 'protein140', icon: '💪', name: 'Protein Beast', desc: 'Hit 140g protein in a day', check: async () => { const n = await getDailyNutrition(); return n.protein >= 140; }},
  { id: 'gym7', icon: '🏋️', name: '7-Day Warrior', desc: '7 day gym streak', check: async () => { return (await calculateStreak('gymDone')) >= 7; }},
  { id: 'gym30', icon: '🔥', name: '30-Day Legend', desc: '30 gym days total', check: async () => { const logs = await dbGetAll(STORES.DAILY_LOGS); return logs.filter(l => l.gymDone).length >= 30; }},
  { id: 'water7', icon: '💧', name: 'Hydration Pro', desc: '7 day water streak', check: async () => {
    const allLogs = await dbGetAll(STORES.DAILY_LOGS);
    let streak = 0; const today = new Date();
    for (let i = 0; i < allLogs.length; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const l = allLogs.find(x => x.date === d.toISOString().split('T')[0]);
      if (l && l.water >= 6) streak++; else break;
    }
    return streak >= 7;
  }},
  { id: 'streak3', icon: '⚡', name: 'Getting Started', desc: '3 day gym streak', check: async () => { return (await calculateStreak('gymDone')) >= 3; }},
  { id: 'firstlog', icon: '📝', name: 'First Log', desc: 'Log your first meal', check: async () => { const meals = await dbGetAll(STORES.MEALS); return meals.length > 0; }},
  { id: 'firstworkout', icon: '🎯', name: 'Iron Beginner', desc: 'Complete first workout', check: async () => { const w = await dbGetAll(STORES.WORKOUTS); return w.length > 0; }},
  { id: 'noCheat7', icon: '🛡️', name: 'Clean Week', desc: '7 days without cheat meal', check: async () => {
    const dates = getDateRange(7);
    for (const d of dates) {
      const meals = await getMealsByDate(d);
      if (meals.some(m => m.isCheat)) return false;
    }
    return true;
  }},
  { id: 'cal2000', icon: '🎯', name: 'Target Hitter', desc: 'Hit calorie goal exactly (±100)', check: async () => {
    const profile = await getProfile();
    const n = await getDailyNutrition();
    const goal = profile?.calorieGoal || 2000;
    return Math.abs(n.calories - goal) <= 100;
  }},
  { id: 'pr', icon: '🏆', name: 'PR Breaker', desc: 'Set a personal record', check: async () => { const ex = await dbGetAll(STORES.EXERCISES); return ex.length > 0; }},
  { id: 'consistent14', icon: '🌟', name: '2-Week Champ', desc: '14 day gym streak', check: async () => { return (await calculateStreak('gymDone')) >= 14; }},
];

document.addEventListener('DOMContentLoaded', async () => {
  await initDB();
  loadGoalProgress();
  loadStreakDetails();
  checkAndUpdateBadges();
  initAnimations();
});

/* ---------- Check Badges ---------- */
async function checkAndUpdateBadges() {
  const container = document.getElementById('badges-grid');
  let html = '';
  let unlockedCount = 0;

  for (const badge of BADGE_DEFS) {
    let unlocked = false;
    try {
      unlocked = await badge.check();
    } catch(e) {}

    if (unlocked) {
      unlockedCount++;
      const existing = await dbGet(STORES.BADGES, badge.id);
      if (!existing) {
        await dbPut(STORES.BADGES, { id: badge.id, unlockedAt: new Date().toISOString() });
        showToast(`🏆 Badge unlocked: ${badge.name}!`, 'success');
      }
    }

    html += `
      <div class="badge-card ${unlocked ? 'unlocked' : 'locked'}">
        ${unlocked ? '<div class="bc-check">✓</div>' : ''}
        <div class="bc-icon">${badge.icon}</div>
        <div class="bc-name">${badge.name}</div>
        <div class="bc-desc">${badge.desc}</div>
      </div>
    `;
  }

  container.innerHTML = html;
  document.getElementById('badges-count').textContent = `${unlockedCount}/${BADGE_DEFS.length}`;
}

/* ---------- Goal Progress ---------- */
async function loadGoalProgress() {
  const profile = await getProfile();
  if (!profile) return;

  const nutrition = await getDailyNutrition();
  const proteinGoal = profile.proteinGoal || 140;
  const calorieGoal = profile.calorieGoal || 2000;

  // Protein progress
  const proteinPct = Math.min(100, Math.round((nutrition.protein / proteinGoal) * 100));
  document.getElementById('gp-protein-value').textContent = `${nutrition.protein}g / ${proteinGoal}g`;
  document.getElementById('gp-protein-fill').style.width = proteinPct + '%';

  // Calorie progress
  const calPct = Math.min(100, Math.round((nutrition.calories / calorieGoal) * 100));
  document.getElementById('gp-cal-value').textContent = `${nutrition.calories} / ${calorieGoal}`;
  document.getElementById('gp-cal-fill').style.width = calPct + '%';

  // Weight progress
  if (profile.weight && profile.targetWeight) {
    const log = await getDailyLog();
    const current = log.weight || profile.weight;
    const start = profile.weight;
    const target = profile.targetWeight;
    const totalChange = Math.abs(start - target);
    const currentChange = Math.abs(start - current);
    const pct = totalChange > 0 ? Math.min(100, Math.round((currentChange / totalChange) * 100)) : 0;
    document.getElementById('gp-weight-value').textContent = `${current}kg → ${target}kg`;
    document.getElementById('gp-weight-fill').style.width = pct + '%';
  }
}

/* ---------- Streak Details ---------- */
async function loadStreakDetails() {
  const gymStreak = await calculateStreak('gymDone');
  const creatineStreak = await calculateStreak('creatine');

  // Water streak calculation
  const allLogs = await dbGetAll(STORES.DAILY_LOGS);
  let waterStreak = 0;
  const today = new Date();
  for (let i = 0; i < 60; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const l = allLogs.find(x => x.date === dateStr);
    if (l && l.water >= 6) waterStreak++; else break;
  }

  // Protein streak
  const profile = await getProfile();
  const proteinGoal = profile?.proteinGoal || 140;
  let proteinStreak = 0;
  for (let i = 0; i < 60; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const n = await getDailyNutrition(dateStr);
    if (n.protein >= proteinGoal * 0.9) proteinStreak++; else break;
  }

  document.getElementById('sd-gym').textContent = gymStreak;
  document.getElementById('sd-protein').textContent = proteinStreak;
  document.getElementById('sd-water').textContent = waterStreak;
  document.getElementById('sd-creatine').textContent = creatineStreak;

  if (gymStreak >= 3) document.getElementById('streak-gym-detail').classList.add('active-streak');
  if (waterStreak >= 3) document.getElementById('streak-water-detail').classList.add('active-streak');
}
