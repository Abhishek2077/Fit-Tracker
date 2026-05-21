/* ==========================================
   FitTracker AI - Daily Log Page Logic
   Food logging, tracking, cheat meal marking
   ========================================== */

document.addEventListener('DOMContentLoaded', async () => {
  await initDB();
  renderBottomNav('log');
  loadTodaysMeals();
  initAnimations();

});

/* ---------- Tab Switching ---------- */
function switchTab(tab) {
  document.querySelectorAll('.log-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.log-panel').forEach(p => p.classList.remove('active'));
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
  document.getElementById(`panel-${tab}`).classList.add('active');
}

/* ---------- Food Manual Entry ---------- */
function addFoodItemRow() {
  const container = document.getElementById('food-items-container');
  const row = document.createElement('div');
  row.className = 'food-item-row';
  row.style.display = 'flex';
  row.style.alignItems = 'center';
  row.style.gap = '8px';
  row.style.marginBottom = '8px';
  row.innerHTML = `
    <input type="text" class="neu-input manual-food-item" placeholder="Another item..." style="flex:1;">
    <label style="display:flex; align-items:center; gap:4px; font-size:0.8rem; color:var(--text-muted); cursor:pointer;">
      <input type="checkbox" class="manual-food-cheat" style="width:16px;height:16px;accent-color:var(--danger);">
      Cheat 🔥
    </label>
    <button class="btn btn-secondary btn-icon" onclick="this.parentElement.remove()" style="padding:0 12px;font-size:1.2rem;">✕</button>
  `;
  container.appendChild(row);
}

async function saveManualMeal() {
  const itemRows = document.querySelectorAll('.food-item-row');
  let descriptions = [];
  let cheatFoodNames = [];
  let anyCheat = false;
  
  itemRows.forEach(row => {
    const textInput = row.querySelector('.manual-food-item');
    const cheatInput = row.querySelector('.manual-food-cheat');
    if (textInput && textInput.value.trim()) {
      let desc = textInput.value.trim();
      if (cheatInput && cheatInput.checked) {
        anyCheat = true;
        cheatFoodNames.push(desc);
      }
      descriptions.push(desc);
    }
  });
  
  const desc = descriptions.join(' + ');
  const cals = parseInt(document.getElementById('manual-meal-cals').value) || 0;
  const protein = parseInt(document.getElementById('manual-meal-protein').value) || 0;
  const carbs = parseInt(document.getElementById('manual-meal-carbs').value) || 0;
  const fat = parseInt(document.getElementById('manual-meal-fat').value) || 0;
  const sodium = parseInt(document.getElementById('manual-meal-sodium').value) || 0;
  const isCheat = anyCheat;

  if (!desc) {
    showToast('Please enter at least one food item', 'warning');
    return;
  }
  if (cals <= 0) {
    showToast('Please enter calories', 'warning');
    return;
  }

  // Determine a dummy rating based on protein content
  let rating = 5;
  if (protein > 20) rating += 3;
  if (fat > 30) rating -= 2;
  rating = Math.max(1, Math.min(10, rating));

  await addMeal({
    description: desc,
    cheatItems: cheatFoodNames.join(', '),
    calories: cals,
    protein: protein,
    carbs: carbs,
    fat: fat,
    fiber: 0,
    sodium: sodium,
    rating: rating,
    isCheat: isCheat ? 1 : 0
  });

  showToast('Meal saved! 🍽️', 'success');
  
  // Clear form
  document.getElementById('food-items-container').innerHTML = `
    <div class="food-item-row" style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
      <input type="text" class="neu-input manual-food-item" placeholder="e.g. 2 Roti" style="flex:1;">
      <label style="display:flex; align-items:center; gap:4px; font-size:0.8rem; color:var(--text-muted); cursor:pointer;">
        <input type="checkbox" class="manual-food-cheat" style="width:16px;height:16px;accent-color:var(--danger);">
        Cheat 🔥
      </label>
    </div>
  `;
  document.getElementById('manual-meal-cals').value = '';
  document.getElementById('manual-meal-protein').value = '';
  document.getElementById('manual-meal-carbs').value = '';
  document.getElementById('manual-meal-fat').value = '';
  document.getElementById('manual-meal-sodium').value = '';

  loadTodaysMeals();
}

/* ---------- Voice Input ---------- */
function startFoodVoice() {
  startVoiceInput((transcript) => {
    document.getElementById('food-input').value = transcript;
  });
}

/* ---------- Cheat Meal Quick Log ---------- */
async function logCheatMeal(name, calories, protein, fat, sodium) {
  await addMeal({
    description: name,
    calories, protein, carbs: 0, fat, fiber: 0, sodium,
    rating: 3,
    isCheat: 1
  });
  showToast(`🍔 ${name} logged as cheat meal`, 'warning');
  loadTodaysMeals();
}

/* ---------- Today's Meals List ---------- */
async function loadTodaysMeals() {
  const meals = await getMealsByDate();
  const container = document.getElementById('meals-list');
  if (!container) return;

  if (meals.length === 0) {
    container.innerHTML = '<p class="text-sm text-muted" style="text-align:center;padding:20px">No meals logged yet today</p>';
    return;
  }

  const nutrition = await getDailyNutrition();
  document.getElementById('today-total-cal').textContent = nutrition.calories;
  document.getElementById('today-total-protein').textContent = nutrition.protein + 'g';

  container.innerHTML = meals.map(meal => `
    <div class="meal-history-item ${meal.isCheat ? 'cheat' : ''}">
      <span style="font-size:1.3rem">${meal.isCheat ? '🍔' : '🥗'}</span>
      <div class="mhi-info">
        <div class="mhi-name">${meal.description} ${meal.isCheat ? '<span class="cheat-meal-tag">CHEAT</span>' : ''}</div>
        <div class="mhi-macros">P:${meal.protein}g • C:${meal.carbs}g • F:${meal.fat}g</div>
      </div>
      <div class="mhi-cal">${meal.calories}</div>
    </div>
  `).join('');
}
