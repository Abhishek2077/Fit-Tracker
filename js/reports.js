/* ==========================================
   FitTracker AI - Reports Page
   Weekly, Monthly, Daily summaries + PDF export
   ========================================== */

document.addEventListener('DOMContentLoaded', async () => {
  await initDB();
  renderBottomNav('reports');
  loadDailySummary();
  loadWeeklyReport();
  initAnimations();
});

function switchReportTab(tab) {
  document.querySelectorAll('.report-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.report-panel').forEach(p => p.classList.remove('active'));
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
  document.getElementById(`panel-${tab}`).classList.add('active');
}

/* ---------- Daily Summary ---------- */
async function loadDailySummary() {
  const nutrition = await getDailyNutrition();
  const log = await getDailyLog();

  document.getElementById('ds-calories').textContent = nutrition.calories;
  document.getElementById('ds-protein').textContent = nutrition.protein + 'g';
  document.getElementById('ds-carbs').textContent = nutrition.carbs + 'g';
  document.getElementById('ds-fat').textContent = nutrition.fat + 'g';
  document.getElementById('ds-water').textContent = (log.water || 0) + ' glasses';
  document.getElementById('ds-gym').textContent = log.gymDone ? '✅ Done' : '❌ No';
  document.getElementById('ds-sleep').textContent = (log.sleep || '—') + (log.sleep ? 'h' : '');
  document.getElementById('ds-mood').textContent = log.mood || '—';
  document.getElementById('ds-cheat').textContent = nutrition.cheatMeals || 0;
}

async function generateDailyAISummary() {
  const container = document.getElementById('daily-ai-result');
  container.innerHTML = '<div style="display:flex;align-items:center;gap:8px;padding:16px"><div class="spinner"></div><span class="text-sm text-muted">Generating AI summary...</span></div>';

  try {
    const nutrition = await getDailyNutrition();
    const log = await getDailyLog();
    const profile = await getProfile();
    const summary = await generateDailySummary(nutrition, log, profile);

    // Save summary
    await dbPut(STORES.SUMMARIES, { date: getToday(), ...summary, nutrition, timestamp: new Date().toISOString() });

    container.innerHTML = `
      <div style="text-align:center;margin-bottom:16px">
        <div style="font-family:Outfit;font-size:3rem;font-weight:800;color:${getScoreColor(summary.score)}">${summary.score}</div>
        <div class="text-sm text-muted">${summary.scoreText}</div>
      </div>
      <div style="margin-bottom:12px">
        <div class="text-sm" style="font-weight:600;margin-bottom:8px">✨ Highlights</div>
        <ul style="list-style:disc;padding-left:20px">
          ${summary.highlights.map(h => `<li class="text-sm text-muted" style="margin-bottom:4px">${h}</li>`).join('')}
        </ul>
      </div>
      <div style="margin-bottom:12px">
        <div class="text-sm" style="font-weight:600;margin-bottom:8px">💡 Suggestions</div>
        <ul style="list-style:disc;padding-left:20px">
          ${summary.suggestions.map(s => `<li class="text-sm text-muted" style="margin-bottom:4px">${s}</li>`).join('')}
        </ul>
      </div>
      <div style="padding:12px;background:var(--accent-glow);border-radius:var(--radius-sm);text-align:center;font-style:italic;font-size:0.85rem;color:var(--accent)">
        "${summary.motivationalQuote}"
      </div>
    `;
  } catch (error) {
    container.innerHTML = `<p class="text-sm" style="color:var(--danger)">❌ ${error.message}</p>`;
  }
}

/* ---------- Weekly Report ---------- */
async function loadWeeklyReport() {
  const dates = getDateRange(7);
  let totalProtein = 0, totalCalories = 0, gymDays = 0, totalSleep = 0, cheatCount = 0, sleepDays = 0;

  for (const d of dates) {
    const n = await getDailyNutrition(d);
    const l = await getDailyLog(d);
    totalProtein += n.protein;
    totalCalories += n.calories;
    if (l.gymDone) gymDays++;
    if (l.sleep) { totalSleep += parseFloat(l.sleep); sleepDays++; }
    cheatCount += n.cheatMeals;
  }

  document.getElementById('wr-protein').textContent = Math.round(totalProtein / 7) + 'g';
  document.getElementById('wr-calories').textContent = Math.round(totalCalories / 7);
  document.getElementById('wr-gym').textContent = gymDays + '/7';
  document.getElementById('wr-sleep').textContent = sleepDays > 0 ? (totalSleep / sleepDays).toFixed(1) + 'h' : '—';
  document.getElementById('wr-cheat').textContent = cheatCount;
}

async function generateWeeklyAIReport() {
  const container = document.getElementById('weekly-ai-result');
  container.innerHTML = '<div style="display:flex;align-items:center;gap:8px;padding:16px"><div class="spinner"></div><span class="text-sm text-muted">Generating weekly report...</span></div>';

  try {
    const weeklyData = await getWeeklyData();
    const report = await generateWeeklyReport(weeklyData);

    container.innerHTML = `
      <div class="rating-grid">
        <div class="rating-card"><div class="rc-score" style="color:${getScoreColor(report.dietRating * 10)}">${report.dietRating}</div><div class="rc-out">/10</div><div class="rc-label">Diet</div></div>
        <div class="rating-card"><div class="rc-score" style="color:${getScoreColor(report.trainingRating * 10)}">${report.trainingRating}</div><div class="rc-out">/10</div><div class="rc-label">Training</div></div>
      </div>
      <p class="text-sm" style="margin-bottom:12px">${report.summary}</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div>
          <div class="text-sm" style="font-weight:600;margin-bottom:6px;color:var(--success)">💪 Strengths</div>
          ${report.strengths.map(s => `<div class="text-xs text-muted" style="margin-bottom:4px">• ${s}</div>`).join('')}
        </div>
        <div>
          <div class="text-sm" style="font-weight:600;margin-bottom:6px;color:var(--warning)">📈 Improve</div>
          ${report.improvements.map(i => `<div class="text-xs text-muted" style="margin-bottom:4px">• ${i}</div>`).join('')}
        </div>
      </div>
    `;
  } catch (error) {
    container.innerHTML = `<p class="text-sm" style="color:var(--danger)">❌ ${error.message}</p>`;
  }
}

/* ---------- Monthly Report ---------- */
async function generateMonthlyAIReport() {
  const container = document.getElementById('monthly-ai-result');
  container.innerHTML = '<div style="display:flex;align-items:center;gap:8px;padding:16px"><div class="spinner"></div><span class="text-sm text-muted">Generating monthly coach report...</span></div>';

  try {
    const monthlyData = await getMonthlyData();
    const profile = await getProfile();
    const report = await generateMonthlyReport(monthlyData, profile);

    container.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div class="grade-display" style="background:var(--bg-card);border-radius:var(--radius-lg)">
          <div class="grade-letter" style="color:${report.nutritionGrade === 'A' ? 'var(--success)' : report.nutritionGrade === 'B' ? 'var(--accent)' : 'var(--warning)'}">${report.nutritionGrade}</div>
          <div class="grade-label">Nutrition</div>
        </div>
        <div class="grade-display" style="background:var(--bg-card);border-radius:var(--radius-lg)">
          <div class="grade-letter" style="color:${report.consistencyGrade === 'A' ? 'var(--success)' : report.consistencyGrade === 'B' ? 'var(--accent)' : 'var(--warning)'}">${report.consistencyGrade}</div>
          <div class="grade-label">Consistency</div>
        </div>
      </div>
      <p class="text-sm" style="margin-bottom:12px">${report.summary}</p>
      <div class="report-summary">
        <div class="rs-item"><span>⚖️ Weight</span><span class="rs-value">${report.weightAnalysis}</span></div>
        <div class="rs-item"><span>🔮 Prediction</span><span class="text-sm">${report.predictions}</span></div>
        <div class="rs-item"><span>🎯 Top Priority</span><span class="text-sm" style="color:var(--accent)">${report.topPriority}</span></div>
      </div>
    `;
  } catch (error) {
    container.innerHTML = `<p class="text-sm" style="color:var(--danger)">❌ ${error.message}</p>`;
  }
}

/* ---------- Cheat Meal Report ---------- */
async function loadCheatReport() {
  const allMeals = await dbGetAll(STORES.MEALS);
  const currentMonth = getCurrentMonth();
  const monthlyMeals = allMeals.filter(m => m.date?.startsWith(currentMonth));
  const cheatMeals = monthlyMeals.filter(m => m.isCheat);

  document.getElementById('cheat-count').textContent = cheatMeals.length;
  const totalSodium = cheatMeals.reduce((s, m) => s + (m.sodium || 0), 0);
  const totalFat = cheatMeals.reduce((s, m) => s + (m.fat || 0), 0);
  document.getElementById('cheat-sodium').textContent = totalSodium + 'mg';
  document.getElementById('cheat-fat').textContent = totalFat + 'g';

  const container = document.getElementById('cheat-list');
  container.innerHTML = cheatMeals.length === 0 ? '<p class="text-sm text-muted">No cheat meals this month 🎉</p>' :
    cheatMeals.map(m => `
      <div class="expense-item" style="border-left:3px solid var(--danger)">
        <span>🍔</span>
        <div style="flex:1"><div style="font-weight:600;font-size:0.85rem">${m.description}</div><div class="text-xs text-muted">${formatDate(m.date)}</div></div>
        <div class="text-sm" style="color:var(--danger)">${m.calories} kcal</div>
      </div>
    `).join('');
}

/* ---------- PDF Export ---------- */
async function exportPDF() {
  // Load jsPDF dynamically
  if (!window.jspdf) {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    document.head.appendChild(script);
    await new Promise(resolve => script.onload = resolve);
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const profile = await getProfile();
  const nutrition = await getDailyNutrition();
  const log = await getDailyLog();

  // Title
  doc.setFontSize(24);
  doc.setTextColor(232, 185, 35);
  doc.text('FitTracker AI Report', 20, 25);

  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(`Generated: ${formatFullDate(new Date().toISOString())}`, 20, 35);

  // Profile
  doc.setFontSize(16);
  doc.setTextColor(40);
  doc.text('Profile', 20, 50);
  doc.setFontSize(11);
  doc.setTextColor(80);
  doc.text(`Name: ${profile?.name || 'N/A'}`, 20, 60);
  doc.text(`Weight: ${profile?.weight || 'N/A'}kg | Target: ${profile?.targetWeight || 'N/A'}kg`, 20, 68);
  doc.text(`Goal: ${profile?.goalType || 'N/A'}`, 20, 76);

  // Today's Nutrition
  doc.setFontSize(16);
  doc.setTextColor(40);
  doc.text("Today's Nutrition", 20, 92);
  doc.setFontSize(11);
  doc.setTextColor(80);
  doc.text(`Calories: ${nutrition.calories} kcal`, 20, 102);
  doc.text(`Protein: ${nutrition.protein}g | Carbs: ${nutrition.carbs}g | Fat: ${nutrition.fat}g`, 20, 110);
  doc.text(`Cheat Meals: ${nutrition.cheatMeals}`, 20, 118);

  // Today's Tracking
  doc.setFontSize(16);
  doc.setTextColor(40);
  doc.text("Today's Tracking", 20, 134);
  doc.setFontSize(11);
  doc.setTextColor(80);
  doc.text(`Weight: ${log.weight || 'N/A'}kg`, 20, 144);
  doc.text(`Water: ${log.water || 0} glasses | Sleep: ${log.sleep || 'N/A'}h`, 20, 152);
  doc.text(`Gym: ${log.gymDone ? 'Yes' : 'No'} | Creatine: ${log.creatine ? 'Yes' : 'No'}`, 20, 160);

  // Footer
  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text('Generated by FitTracker AI - Your Personal Fitness Coach', 20, 280);

  doc.save(`fittracker-report-${getToday()}.pdf`);
  showToast('PDF exported! 📄', 'success');
}
