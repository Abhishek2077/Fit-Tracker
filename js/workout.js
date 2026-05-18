/* ==========================================
   FitTracker AI - Workout Tracker
   ========================================== */

let currentExercises = [];

document.addEventListener('DOMContentLoaded', async () => {
  await initDB();
  renderBottomNav('workout');
  loadPRs();
  loadWorkoutHistory();
  initAnimations();
});

/* ---------- Add Exercise ---------- */
function addExercise(name = '') {
  const eName = name || document.getElementById('exercise-name-input').value.trim();
  if (!eName) {
    showToast('Enter exercise name', 'warning');
    return;
  }

  const exercise = { name: eName, sets: [{ reps: '', weight: '' }] };
  currentExercises.push(exercise);
  renderExercises();
  document.getElementById('exercise-name-input').value = '';
}

function addSet(exerciseIndex) {
  currentExercises[exerciseIndex].sets.push({ reps: '', weight: '' });
  renderExercises();
}

function removeExercise(index) {
  currentExercises.splice(index, 1);
  renderExercises();
}

function renderExercises() {
  const container = document.getElementById('exercises-list');
  if (currentExercises.length === 0) {
    container.innerHTML = '<p class="text-sm text-muted" style="text-align:center;padding:20px">Add exercises above to start</p>';
    return;
  }

  container.innerHTML = currentExercises.map((ex, i) => `
    <div class="exercise-entry">
      <div class="exercise-name">
        <span>🏋️ ${ex.name}</span>
        <button class="btn btn-ghost btn-sm" onclick="removeExercise(${i})" style="color:var(--danger);font-size:0.75rem">Remove</button>
      </div>
      <table class="sets-table">
        <thead><tr><th>Set</th><th>Reps</th><th>Weight (kg)</th></tr></thead>
        <tbody>
          ${ex.sets.map((set, si) => `
            <tr>
              <td><div class="set-number">${si + 1}</div></td>
              <td><input type="number" value="${set.reps}" onchange="updateSet(${i},${si},'reps',this.value)" placeholder="12"></td>
              <td><input type="number" value="${set.weight}" onchange="updateSet(${i},${si},'weight',this.value)" placeholder="40" step="0.5"></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <button class="btn btn-ghost btn-sm" onclick="addSet(${i})" style="margin-top:8px;width:100%">+ Add Set</button>
    </div>
  `).join('');
}

function updateSet(exIndex, setIndex, field, value) {
  currentExercises[exIndex].sets[setIndex][field] = parseFloat(value) || '';
}

/* ---------- Save Workout ---------- */
async function saveWorkout() {
  if (currentExercises.length === 0) {
    showToast('Add exercises first', 'warning');
    return;
  }

  // Validate at least one set has data
  const hasData = currentExercises.some(ex => ex.sets.some(s => s.reps || s.weight));
  if (!hasData) {
    showToast('Fill in at least one set', 'warning');
    return;
  }

  await addWorkout({
    exercises: currentExercises.map(ex => ({
      name: ex.name,
      sets: ex.sets.filter(s => s.reps || s.weight).map(s => ({
        reps: parseInt(s.reps) || 0,
        weight: parseFloat(s.weight) || 0
      }))
    }))
  });

  // Update PRs
  for (const ex of currentExercises) {
    const maxWeight = Math.max(...ex.sets.map(s => parseFloat(s.weight) || 0));
    if (maxWeight > 0) {
      const existing = await dbGet(STORES.EXERCISES, ex.name.toLowerCase());
      if (!existing || maxWeight > (existing.pr || 0)) {
        await dbPut(STORES.EXERCISES, {
          name: ex.name.toLowerCase(),
          displayName: ex.name,
          pr: maxWeight,
          prDate: getToday(),
          lastSets: ex.sets
        });
      }
    }
  }

  // Mark gym done
  const log = await getDailyLog();
  log.gymDone = true;
  await saveDailyLog(log);

  showToast('Workout saved! 💪', 'success');
  currentExercises = [];
  renderExercises();
  loadPRs();
  loadWorkoutHistory();
}

/* ---------- Load PRs ---------- */
async function loadPRs() {
  const exercises = await dbGetAll(STORES.EXERCISES);
  const container = document.getElementById('pr-list');
  if (!container) return;

  if (exercises.length === 0) {
    container.innerHTML = '<p class="text-sm text-muted">Complete workouts to track PRs</p>';
    return;
  }

  exercises.sort((a, b) => b.pr - a.pr);
  container.innerHTML = exercises.slice(0, 6).map(ex => `
    <div class="pr-card">
      <span style="font-size:1.3rem">🏆</span>
      <div style="flex:1">
        <div class="pr-exercise">${ex.displayName || ex.name}</div>
        <div class="pr-label">PR on ${formatDate(ex.prDate)}</div>
      </div>
      <div class="pr-value">${ex.pr}kg</div>
    </div>
  `).join('');
}

/* ---------- Workout History ---------- */
async function loadWorkoutHistory() {
  const workouts = await dbGetAll(STORES.WORKOUTS);
  const container = document.getElementById('workout-history');
  if (!container) return;

  if (workouts.length === 0) {
    container.innerHTML = '<p class="text-sm text-muted" style="text-align:center;padding:20px">No workout history yet</p>';
    return;
  }

  workouts.sort((a, b) => b.date.localeCompare(a.date));
  container.innerHTML = workouts.slice(0, 10).map(w => `
    <div class="workout-history-card">
      <div class="workout-date">${formatFullDate(w.date)}</div>
      ${w.exercises.map(ex => `
        <div class="wh-exercise">
          <span>${ex.name}</span>
          <span class="text-muted">${ex.sets.length} sets • Max ${Math.max(...ex.sets.map(s=>s.weight))}kg</span>
        </div>
      `).join('')}
    </div>
  `).join('');
}
