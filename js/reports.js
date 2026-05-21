/* ==========================================
   FitTracker AI - Reports Page
   Weekly, Monthly, Daily summaries + PDF export
   ========================================== */

document.addEventListener('DOMContentLoaded', async () => {
  await initDB();
  renderBottomNav('reports');
  loadDailySummary();
  loadMonthlyReport();
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
  try {
    const today = getToday();
    const nutrition = await getDailyNutrition(today);
    const meals = await dbGetByIndex(STORES.MEALS, 'date', today);
    const cheatMeals = meals.filter(m => m.isCheat);

    document.getElementById('ds-calories').textContent = nutrition.calories;
    document.getElementById('ds-protein').textContent = nutrition.protein + 'g';
    document.getElementById('ds-carbs').textContent = nutrition.carbs + 'g';
    document.getElementById('ds-fat').textContent = nutrition.fat + 'g';
    document.getElementById('ds-cheat').textContent = cheatMeals.length;

    const summaryData = await dbGet(STORES.SUMMARIES, today);
    if (summaryData && summaryData.content) {
      document.getElementById('daily-ai-result').innerHTML = summaryData.content;
    }
  } catch (e) {
    console.error("Error loading daily summary:", e);
  }
}

async function generateDailyAISummary() {
  const container = document.getElementById('daily-ai-result');
  container.innerHTML = '<div style="display:flex;align-items:center;gap:8px;padding:16px"><div class="spinner"></div><span class="text-sm text-muted">Generating local summary...</span></div>';

  try {
    const nutrition = await getDailyNutrition();
    const profile = await getProfile();

    let score = 50;
    const highlights = [];
    const suggestions = [];

    // Evaluate Protein
    const proGoal = profile?.proteinGoal || 140;
    if (nutrition.protein >= proGoal) { score += 20; highlights.push('Hit your protein goal!'); }
    else if (nutrition.protein >= proGoal * 0.7) { score += 10; suggestions.push('Good protein, but try to hit your exact goal tomorrow.'); }
    else { score -= 10; suggestions.push('Protein intake was low today. Try adding eggs or whey.'); }

    // Evaluate Calories
    const calGoal = profile?.calorieGoal || 2000;
    if (Math.abs(nutrition.calories - calGoal) < 200) { score += 15; highlights.push('Calories were right on target.'); }
    else { score -= 5; suggestions.push('Try to stay closer to your calorie limit.'); }

    score = Math.max(0, Math.min(100, score));
    let scoreText = score >= 80 ? 'Excellent Day!' : score >= 60 ? 'Solid Day' : 'Needs Improvement';

    const summary = {
      score, scoreText, highlights, suggestions,
      motivationalQuote: "Consistency is what transforms average into excellence."
    };

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

/* ---------- Period Data Helper ---------- */
async function calculatePeriodData(days) {
  const dates = getDateRange(days);
  let totals = { calories: 0, protein: 0, carbs: 0, fat: 0, sodium: 0, cheatMeals: 0 };
  let cheatList = [];
  let allMealsList = [];

  const allMeals = await dbGetAll(STORES.MEALS);

  for (const d of dates) {
    const n = await getDailyNutrition(d);
    
    totals.calories += n.calories;
    totals.protein += n.protein;
    totals.carbs += n.carbs;
    totals.fat += n.fat;
    totals.sodium += n.sodium || 0;
    
    const dayMeals = allMeals.filter(m => m.date === d);
    allMealsList.push(...dayMeals);
    
    const dayCheats = dayMeals.filter(m => m.isCheat);
    totals.cheatMeals += dayCheats.length;
    cheatList.push(...dayCheats);
  }

  let averages = {
    calories: Math.round(totals.calories / days),
    protein: Math.round(totals.protein / days),
    carbs: Math.round(totals.carbs / days),
    fat: Math.round(totals.fat / days),
    sodium: Math.round(totals.sodium / days)
  };

  return { totals, averages, cheatList, allMealsList };
}

function renderCheatList(containerId, cheatList) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = cheatList.length === 0 ? '<p class="text-sm text-muted">No cheat meals! 🎉</p>' :
    cheatList.map(m => {
      let foodName = m.cheatItems;
      if (!foodName) {
        const parts = m.description.split('+');
        const cheatParts = parts.filter(p => p.includes('(Cheat 🔥)'));
        foodName = cheatParts.length > 0 ? cheatParts.join(', ') : m.description;
      }
      foodName = foodName.replace(/\(Cheat 🔥\)/g, '').replace(/🔥/g, '').trim();
      return `
      <div class="expense-item" style="border-left:3px solid var(--danger); background:var(--bg-card); padding:12px; border-radius:var(--radius-md); margin-bottom:8px; display:flex; align-items:center; gap:12px;">
        <span style="font-size:1.5rem;">🍔</span>
        <div style="flex:1;">
          <div style="font-weight:600;font-size:0.9rem;color:var(--text-primary);">${foodName}</div>
          <div class="text-xs text-muted">${formatDate(m.date)}</div>
        </div>
        <div class="text-sm" style="color:var(--danger); font-weight:600;">${m.calories} kcal</div>
      </div>
      `
    }).join('');
}

function renderAllMealsList(containerId, mealsList) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = mealsList.length === 0 ? '<p class="text-sm text-muted">No meals logged.</p>' :
    mealsList.map(m => {
      let foodName = m.description.replace(/\(Cheat 🔥\)/g, '').replace(/🔥/g, '').trim();
      let isCheatHTML = m.isCheat ? '<span style="font-size:0.75rem; background:rgba(239,68,68,0.2); color:var(--danger); padding:2px 6px; border-radius:4px; margin-left:6px;">Cheat</span>' : '';
      return `
      <div class="expense-item" style="border-left:3px solid ${m.isCheat ? 'var(--danger)' : 'var(--accent)'}; background:var(--bg-card); padding:12px; border-radius:var(--radius-md); margin-bottom:8px; display:flex; align-items:center; gap:12px;">
        <span style="font-size:1.5rem;">🍽️</span>
        <div style="flex:1;">
          <div style="font-weight:600;font-size:0.9rem;color:var(--text-primary);">${foodName}${isCheatHTML}</div>
          <div class="text-xs text-muted">${formatDate(m.date)}</div>
          <div class="text-xs text-muted" style="margin-top:4px;">Pro: ${m.protein}g | Carbs: ${m.carbs}g | Fat: ${m.fat}g | Sod: ${m.sodium || 0}mg</div>
        </div>
        <div class="text-sm" style="color:${m.isCheat ? 'var(--danger)' : 'var(--accent)'}; font-weight:600;">${m.calories} kcal</div>
      </div>
      `
    }).join('');
}

/* ---------- Monthly Report ---------- */
async function loadMonthlyReport() {
  const data = await calculatePeriodData(30);
  
  document.getElementById('mr-tot-cal').textContent = data.totals.calories;
  document.getElementById('mr-tot-pro').textContent = data.totals.protein + 'g';
  document.getElementById('mr-tot-carbs').textContent = data.totals.carbs + 'g';
  document.getElementById('mr-tot-fat').textContent = data.totals.fat + 'g';
  document.getElementById('mr-tot-sod').textContent = data.totals.sodium + 'mg';

  document.getElementById('mr-avg-cal').textContent = data.averages.calories;
  document.getElementById('mr-avg-pro').textContent = data.averages.protein + 'g';
  document.getElementById('mr-avg-carbs').textContent = data.averages.carbs + 'g';
  document.getElementById('mr-avg-fat').textContent = data.averages.fat + 'g';
  document.getElementById('mr-avg-sod').textContent = data.averages.sodium + 'mg';

  document.getElementById('mr-cheat-count').textContent = data.totals.cheatMeals;

  renderAllMealsList('monthly-all-meals-list', data.allMealsList);
  renderCheatList('monthly-cheat-list', data.cheatList);
}

/* ---------- PDF Export ---------- */
async function exportPDF() {
  if (!window.jspdf) {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    document.head.appendChild(script);
    await new Promise(resolve => script.onload = resolve);
  }

  if (!window.jspdf.jsPDF.API.autoTable) {
    const script2 = document.createElement('script');
    script2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js';
    document.head.appendChild(script2);
    await new Promise(resolve => script2.onload = resolve);
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  const profile = await getProfile();
  const dailyNut = await getDailyNutrition();
  const monthlyData = await calculatePeriodData(30);

  const gold = [232, 185, 35];
  const dark = [30, 30, 30];

  doc.setFontSize(26);
  doc.setTextColor(...gold);
  doc.text('FitTracker Data Report', 20, 25);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Generated: ${formatFullDate(new Date().toISOString())}`, 20, 32);

  let cursorY = 45;

  doc.autoTable({
    startY: cursorY,
    theme: 'grid',
    headStyles: { fillColor: dark, textColor: gold, fontStyle: 'bold' },
    head: [['Profile Information', 'Value']],
    body: [
      ['Name', profile?.name || 'N/A'],
      ['Weight', `${profile?.weight || '-'} kg (Target: ${profile?.targetWeight || '-'} kg)`],
      ['Goal', profile?.goalType || 'N/A'],
      ['Macros Target', `${profile?.proteinGoal || 0}g Protein / ${profile?.calorieGoal || 0} kcal`]
    ]
  });
  cursorY = doc.lastAutoTable.finalY + 15;

  doc.setFontSize(14);
  doc.setTextColor(...dark);
  doc.text('Today\'s Log', 20, cursorY);
  doc.autoTable({
    startY: cursorY + 5,
    theme: 'plain',
    styles: { cellPadding: 2, fontSize: 11, textColor: dark },
    body: [
      ['Calories Logged:', `${dailyNut.calories} kcal`, 'Sodium:', `${dailyNut.sodium || 0} mg`],
      ['Protein:', `${dailyNut.protein} g`, 'Fat:', `${dailyNut.fat} g`],
      ['Carbs:', `${dailyNut.carbs} g`]
    ]
  });
  cursorY = doc.lastAutoTable.finalY + 15;

  function printPeriodData(title, data, yPos) {
    if (yPos > 200) { doc.addPage(); yPos = 20; }
    
    doc.setFontSize(14);
    doc.setTextColor(...dark);
    doc.text(title, 20, yPos);
    
    doc.autoTable({
      startY: yPos + 5,
      theme: 'grid',
      headStyles: { fillColor: dark, textColor: [255,255,255] },
      head: [['Metric', 'Totals', 'Daily Averages']],
      body: [
        ['Calories', data.totals.calories, data.averages.calories],
        ['Protein', `${data.totals.protein} g`, `${data.averages.protein} g`],
        ['Carbs', `${data.totals.carbs} g`, `${data.averages.carbs} g`],
        ['Fat', `${data.totals.fat} g`, `${data.averages.fat} g`],
        ['Sodium', `${data.totals.sodium} mg`, `${data.averages.sodium} mg`],
        ['Cheat Meals', `${data.totals.cheatMeals}`, '']
      ]
    });
    
    let curY = doc.lastAutoTable.finalY + 10;
    
    if (data.allMealsList.length > 0) {
      if (curY > 230) { doc.addPage(); curY = 20; }
      doc.setFontSize(12);
      doc.setTextColor(...dark);
      doc.text('Complete Meal Log:', 20, curY);
      
      const allMealsBody = data.allMealsList.map(m => {
        let foodName = m.description.replace(/\(Cheat 🔥\)/g, '').replace(/🔥/g, '').trim();
        return [
          formatDate(m.date), 
          foodName, 
          `${m.calories} kcal`,
          `${m.protein}g`,
          `${m.carbs}g`,
          `${m.fat}g`,
          `${m.sodium || 0}mg`
        ];
      });
      
      doc.autoTable({
        startY: curY + 5,
        theme: 'striped',
        headStyles: { fillColor: [50, 100, 200], textColor: [255,255,255] },
        head: [['Date', 'Food Items', 'Calories', 'Protein', 'Carbs', 'Fat', 'Sodium']],
        body: allMealsBody
      });
      curY = doc.lastAutoTable.finalY + 15;
    }
    
    // Cheat Meals Log
    if (data.cheatList.length > 0) {
      if (curY > 230) { doc.addPage(); curY = 20; }
      doc.setFontSize(12);
      doc.setTextColor(...dark);
      doc.text('Specific Cheat Foods Log:', 20, curY);
      
      const cheatBody = data.cheatList.map(m => {
        let foodName = m.cheatItems;
        if (!foodName) {
          const parts = m.description.split('+');
          const cheatParts = parts.filter(p => p.includes('(Cheat 🔥)'));
          foodName = cheatParts.length > 0 ? cheatParts.join(', ') : m.description;
        }
        foodName = foodName.replace(/\(Cheat 🔥\)/g, '').replace(/🔥/g, '').trim();
        return [formatDate(m.date), foodName, `${m.calories} kcal`, `${m.sodium || 0} mg`];
      });
      
      doc.autoTable({
        startY: curY + 5,
        theme: 'striped',
        headStyles: { fillColor: [200, 50, 50], textColor: [255,255,255] },
        head: [['Date', 'Cheat Food Items', 'Meal Calories', 'Meal Sodium']],
        body: cheatBody
      });
      curY = doc.lastAutoTable.finalY + 15;
    } else {
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text('No cheat meals logged during this period.', 20, curY);
      curY += 15;
    }
    
    return curY;
  }

  // Draw Monthly
  cursorY = printPeriodData('30-Day Overview', monthlyData, cursorY);

  // Footer
  if (cursorY > 270) { doc.addPage(); cursorY = 20; }
  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text('Generated by FitTracker - Your Offline Fitness Companion', 20, 285);

  doc.save(`fittracker-report-${getToday()}.pdf`);
  showToast('PDF exported successfully! 📄', 'success');
}
