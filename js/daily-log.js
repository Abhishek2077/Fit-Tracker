/* ==========================================
   FitTracker AI - Daily Log Page Logic
   Food logging, tracking, cheat meal marking
   ========================================== */

document.addEventListener('DOMContentLoaded', async () => {
  await initDB();
  renderBottomNav('log');
  loadDailyTracking();
  loadTodaysMeals();
  initAnimations();

  // Paste image support
  const foodInput = document.getElementById('food-input');
  if (foodInput) {
    foodInput.addEventListener('paste', (e) => {
      const items = (e.clipboardData || e.originalEvent.clipboardData).items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file' && items[i].type.startsWith('image/')) {
          e.preventDefault();
          processImageFile(items[i].getAsFile());
          return;
        }
      }
    });
  }
});

/* ---------- Pending Image State ---------- */
let pendingFoodImage = null;

/* ---------- Tab Switching ---------- */
function switchTab(tab) {
  document.querySelectorAll('.log-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.log-panel').forEach(p => p.classList.remove('active'));
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
  document.getElementById(`panel-${tab}`).classList.add('active');
}

/* ---------- Food Analysis (Text + Image unified) ---------- */
async function analyzeFood() {
  const input = document.getElementById('food-input').value.trim();
  const hasImage = !!pendingFoodImage;

  if (!input && !hasImage) {
    showToast('Type what you ate or attach a photo', 'warning');
    return;
  }

  const resultContainer = document.getElementById('analysis-result');
  resultContainer.innerHTML = `
    <div class="analyzing-spinner">
      <div class="spinner"></div>
      <div class="text-sm text-muted">${hasImage ? 'AI is analyzing your photo...' : 'AI is analyzing your meal...'}</div>
    </div>
  `;

  try {
    const profile = await getProfile();
    let analysis;

    if (hasImage) {
      analysis = await analyzeFoodPhoto(pendingFoodImage, input || null);
      clearPendingImage();
    } else {
      analysis = await analyzeFoodText(input, profile);
    }

    showAnalysisResult(analysis, input || 'Photo meal');
  } catch (error) {
    resultContainer.innerHTML = `
      <div class="analysis-card" style="border-color: var(--danger)">
        <p style="color:var(--danger)">❌ ${error.message}</p>
        <p class="text-sm text-muted" style="margin-top:8px">Make sure your Gemini API key is set in Settings.</p>
      </div>
    `;
  }
}

function showAnalysisResult(analysis, originalText) {
  const container = document.getElementById('analysis-result');
  const isCheat = analysis.isCheat;

  container.innerHTML = `
    <div class="analysis-card ${isCheat ? 'cheat-alert' : ''}" id="current-analysis">
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:4px">
        <div>
          <div class="heading-md">${analysis.description || originalText}</div>
          ${isCheat ? '<div class="cheat-meal-tag" style="margin-top:6px">🔥 CHEAT MEAL DETECTED</div>' : ''}
        </div>
        <div style="font-family:Outfit;font-size:1.8rem;font-weight:800;color:var(--accent)">${analysis.calories}</div>
      </div>
      <div class="text-xs text-muted" style="margin-bottom:4px">kcal estimated</div>

      ${isCheat && analysis.cheatWarning ? `<div style="background:var(--danger-light);color:var(--danger);padding:10px 14px;border-radius:var(--radius-sm);font-size:0.8rem;margin:12px 0">⚠️ ${analysis.cheatWarning}</div>` : ''}

      <div class="analysis-macros">
        <div class="macro-item"><div class="macro-value" style="color:var(--accent)">${analysis.protein}g</div><div class="macro-label">Protein</div></div>
        <div class="macro-item"><div class="macro-value" style="color:#38bdf8">${analysis.carbs}g</div><div class="macro-label">Carbs</div></div>
        <div class="macro-item"><div class="macro-value" style="color:#ef4444">${analysis.fat}g</div><div class="macro-label">Fat</div></div>
        <div class="macro-item"><div class="macro-value">${analysis.fiber}g</div><div class="macro-label">Fiber</div></div>
        <div class="macro-item"><div class="macro-value">${analysis.sodium}mg</div><div class="macro-label">Sodium</div></div>
        <div class="macro-item"><div class="macro-value">${analysis.calories}</div><div class="macro-label">Calories</div></div>
      </div>

      <div class="meal-rating">
        <div class="rating-score" style="color:${getScoreColor(analysis.rating * 10)}">${analysis.rating}/10</div>
        <div style="flex:1">
          <div class="text-sm" style="font-weight:600">Meal Rating</div>
          <div class="text-xs text-muted">${analysis.ratingText || ''}</div>
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-top:16px">
        <button class="btn btn-primary" onclick="saveMealFromAnalysis()" style="flex:1" id="btn-save-meal">✅ Save Meal</button>
        <button class="btn btn-secondary" onclick="clearAnalysis()" id="btn-clear-analysis">✕</button>
      </div>
    </div>
  `;

  window._currentAnalysis = { ...analysis, originalText };
}

async function saveMealFromAnalysis() {
  const analysis = window._currentAnalysis;
  if (!analysis) return;

  await addMeal({
    description: analysis.description || analysis.originalText,
    calories: analysis.calories,
    protein: analysis.protein,
    carbs: analysis.carbs,
    fat: analysis.fat,
    fiber: analysis.fiber,
    sodium: analysis.sodium,
    rating: analysis.rating,
    isCheat: analysis.isCheat ? 1 : 0
  });

  showToast('Meal saved! 🍽️', 'success');
  clearAnalysis();
  document.getElementById('food-input').value = '';
  loadTodaysMeals();
}

function clearAnalysis() {
  document.getElementById('analysis-result').innerHTML = '';
  window._currentAnalysis = null;
  pendingFoodImage = null;
  document.getElementById('food-input').placeholder = 'Type or paste (Ctrl+V) an image here...';
}

/* ---------- Photo Upload ---------- */
function triggerPhotoUpload() {
  document.getElementById('photo-file-input').click();
}

async function handlePhotoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  await processImageFile(file);
  event.target.value = '';
}

async function processImageFile(file) {
  try {
    const base64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(file);
    });

    pendingFoodImage = base64;

    // Show attached indicator
    const previewArea = document.getElementById('analysis-result');
    previewArea.innerHTML = `
      <div class="analysis-card" style="border-color:var(--accent);">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:50px;height:50px;border-radius:12px;background:var(--bg-input);display:flex;align-items:center;justify-content:center;font-size:1.5rem;">📷</div>
          <div style="flex:1">
            <div class="text-sm" style="font-weight:600;color:var(--accent);">Image attached</div>
            <div class="text-xs text-muted">Type what this is (optional), then tap Analyze</div>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="clearAnalysis()" style="font-size:1.2rem;">✕</button>
        </div>
      </div>
    `;

    document.getElementById('food-input').placeholder = 'Describe this food (optional)...';
    showToast('📷 Image attached! Tap Analyze', 'success');
  } catch (e) {
    showToast('Failed to read image: ' + e.message, 'danger');
  }
}

function clearPendingImage() {
  pendingFoodImage = null;
  document.getElementById('food-input').placeholder = 'Type or paste (Ctrl+V) an image here...';
}

/* ---------- Voice Input ---------- */
function startFoodVoice() {
  startVoiceInput((transcript) => {
    document.getElementById('food-input').value = transcript;
  });
}

/* ---------- Daily Tracking ---------- */
async function loadDailyTracking() {
  const log = await getDailyLog();

  // Weight
  document.getElementById('track-weight').value = log.weight || '';

  // Water
  document.getElementById('water-count').textContent = log.water || 0;

  // Sleep
  document.getElementById('track-sleep').value = log.sleep || '';

  // Mood
  if (log.mood) {
    document.querySelectorAll('.mood-option').forEach(m => {
      m.classList.toggle('selected', m.dataset.mood === log.mood);
    });
  }
}

async function updateWeight() {
  const weight = parseFloat(document.getElementById('track-weight').value);
  if (!weight) return;
  const log = await getDailyLog();
  log.weight = weight;
  await saveDailyLog(log);
  showToast('Weight updated! ⚖️', 'success');
}

async function adjustWater(delta) {
  const log = await getDailyLog();
  log.water = Math.max(0, (log.water || 0) + delta);
  await saveDailyLog(log);
  document.getElementById('water-count').textContent = log.water;
}

async function updateSleep() {
  const sleep = parseFloat(document.getElementById('track-sleep').value);
  if (!sleep) return;
  const log = await getDailyLog();
  log.sleep = sleep;
  await saveDailyLog(log);
  showToast('Sleep logged! 😴', 'success');
}

async function selectMood(el) {
  document.querySelectorAll('.mood-option').forEach(m => m.classList.remove('selected'));
  el.classList.add('selected');
  const log = await getDailyLog();
  log.mood = el.dataset.mood;
  await saveDailyLog(log);
  showToast('Mood updated!', 'success');
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
