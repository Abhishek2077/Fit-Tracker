/* ==========================================
   FitTracker AI - Data Layer (IndexedDB + LocalStorage)
   All data persists locally - no backend needed
   ========================================== */

const DB_NAME = 'FitTrackerDB';
const DB_VERSION = 1;
let db = null;

// Store names
const STORES = {
  PROFILE: 'profile',
  DAILY_LOGS: 'dailyLogs',
  MEALS: 'meals',
  WORKOUTS: 'workouts',
  EXERCISES: 'exercises',
  SUMMARIES: 'summaries',
  EXPENSES: 'expenses',
  BADGES: 'badges',
  CHAT_HISTORY: 'chatHistory'
};

/* ---------- Initialize IndexedDB ---------- */
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Profile store (single record)
      if (!database.objectStoreNames.contains(STORES.PROFILE)) {
        database.createObjectStore(STORES.PROFILE, { keyPath: 'id' });
      }

      // Daily logs (one per date)
      if (!database.objectStoreNames.contains(STORES.DAILY_LOGS)) {
        const logStore = database.createObjectStore(STORES.DAILY_LOGS, { keyPath: 'date' });
        logStore.createIndex('month', 'month', { unique: false });
      }

      // Meals
      if (!database.objectStoreNames.contains(STORES.MEALS)) {
        const mealStore = database.createObjectStore(STORES.MEALS, { keyPath: 'id', autoIncrement: true });
        mealStore.createIndex('date', 'date', { unique: false });
        mealStore.createIndex('isCheat', 'isCheat', { unique: false });
      }

      // Workouts
      if (!database.objectStoreNames.contains(STORES.WORKOUTS)) {
        const workoutStore = database.createObjectStore(STORES.WORKOUTS, { keyPath: 'id', autoIncrement: true });
        workoutStore.createIndex('date', 'date', { unique: false });
      }

      // Exercises (PRs)
      if (!database.objectStoreNames.contains(STORES.EXERCISES)) {
        database.createObjectStore(STORES.EXERCISES, { keyPath: 'name' });
      }

      // Daily AI summaries
      if (!database.objectStoreNames.contains(STORES.SUMMARIES)) {
        database.createObjectStore(STORES.SUMMARIES, { keyPath: 'date' });
      }

      // Expenses
      if (!database.objectStoreNames.contains(STORES.EXPENSES)) {
        const expenseStore = database.createObjectStore(STORES.EXPENSES, { keyPath: 'id', autoIncrement: true });
        expenseStore.createIndex('date', 'date', { unique: false });
        expenseStore.createIndex('month', 'month', { unique: false });
      }

      // Badges
      if (!database.objectStoreNames.contains(STORES.BADGES)) {
        database.createObjectStore(STORES.BADGES, { keyPath: 'id' });
      }

      // Chat history
      if (!database.objectStoreNames.contains(STORES.CHAT_HISTORY)) {
        database.createObjectStore(STORES.CHAT_HISTORY, { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };
  });
}

/* ---------- Generic CRUD Operations ---------- */

// Add or update a record
function dbPut(storeName, data) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(data);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Get a record by key
function dbGet(storeName, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Get all records from a store
function dbGetAll(storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Get records by index
function dbGetByIndex(storeName, indexName, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Delete a record
function dbDelete(storeName, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Clear entire store
function dbClear(storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/* ---------- Profile Helpers ---------- */
async function getProfile() {
  return await dbGet(STORES.PROFILE, 'user');
}

async function saveProfile(profileData) {
  return await dbPut(STORES.PROFILE, { id: 'user', ...profileData, updatedAt: new Date().toISOString() });
}

/* ---------- Daily Log Helpers ---------- */
function getToday() {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

function getCurrentMonth() {
  const mode = localStorage.getItem('ft-cycle-mode') || 'calendar';
  if (mode === 'manual') {
    let start = localStorage.getItem('ft-cycle-start');
    if (!start) {
      start = getToday();
      localStorage.setItem('ft-cycle-start', start);
    }
    return 'Cycle: ' + start;
  }
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

async function getDailyLog(date) {
  date = date || getToday();
  let log = await dbGet(STORES.DAILY_LOGS, date);
  if (!log) {
    log = {
      date: date,
      month: date.substring(0, 7),
      weight: null,
      water: 0,
      sleep: null,
      mood: null,
      gymDone: false,
      creatine: false,
      supplements: false,
      createdAt: new Date().toISOString()
    };
  }
  return log;
}

async function saveDailyLog(log) {
  log.month = log.date.substring(0, 7);
  return await dbPut(STORES.DAILY_LOGS, log);
}

/* ---------- Meal Helpers ---------- */
async function addMeal(mealData) {
  const meal = {
    ...mealData,
    date: mealData.date || getToday(),
    timestamp: new Date().toISOString()
  };
  return await dbPut(STORES.MEALS, meal);
}

async function getMealsByDate(date) {
  return await dbGetByIndex(STORES.MEALS, 'date', date || getToday());
}

async function getCheatMeals() {
  return await dbGetByIndex(STORES.MEALS, 'isCheat', 1);
}

/* ---------- Workout Helpers ---------- */
async function addWorkout(workoutData) {
  const workout = {
    ...workoutData,
    date: workoutData.date || getToday(),
    timestamp: new Date().toISOString()
  };
  return await dbPut(STORES.WORKOUTS, workout);
}

async function getWorkoutsByDate(date) {
  return await dbGetByIndex(STORES.WORKOUTS, 'date', date || getToday());
}

/* ---------- Streak Calculator ---------- */
async function calculateStreak(field) {
  const allLogs = await dbGetAll(STORES.DAILY_LOGS);
  allLogs.sort((a, b) => b.date.localeCompare(a.date));

  let streak = 0;
  const today = new Date();

  for (let i = 0; i < allLogs.length; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = checkDate.toISOString().split('T')[0];
    const log = allLogs.find(l => l.date === dateStr);

    if (log && log[field]) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/* ---------- Nutrition Totals ---------- */
async function getDailyNutrition(date) {
  const meals = await getMealsByDate(date || getToday());
  return meals.reduce((totals, meal) => ({
    calories: totals.calories + (meal.calories || 0),
    protein: totals.protein + (meal.protein || 0),
    carbs: totals.carbs + (meal.carbs || 0),
    fat: totals.fat + (meal.fat || 0),
    fiber: totals.fiber + (meal.fiber || 0),
    sodium: totals.sodium + (meal.sodium || 0),
    mealCount: totals.mealCount + 1,
    cheatMeals: totals.cheatMeals + (meal.isCheat ? 1 : 0)
  }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0, mealCount: 0, cheatMeals: 0 });
}

/* ---------- Export / Import (Backup & Restore) ---------- */
async function exportAllData() {
  const data = {};
  for (const storeName of Object.values(STORES)) {
    data[storeName] = await dbGetAll(storeName);
  }
  data.exportDate = new Date().toISOString();
  data.version = DB_VERSION;
  return data;
}

async function importAllData(jsonData) {
  const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
  for (const storeName of Object.values(STORES)) {
    if (data[storeName]) {
      await dbClear(storeName);
      for (const record of data[storeName]) {
        await dbPut(storeName, record);
      }
    }
  }
}

/* ---------- Clear All Data ---------- */
async function clearAllData() {
  for (const storeName of Object.values(STORES)) {
    await dbClear(storeName);
  }
}

/* ---------- Date Range Helper ---------- */
function getDateRange(days) {
  const dates = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

/* ---------- Get Weekly Data ---------- */
async function getWeeklyData() {
  const dates = getDateRange(7);
  const data = { logs: [], meals: [], workouts: [] };
  for (const date of dates) {
    const log = await getDailyLog(date);
    const nutrition = await getDailyNutrition(date);
    data.logs.push({ ...log, nutrition });
    data.workouts.push(...(await getWorkoutsByDate(date)));
  }
  return data;
}

/* ---------- Get Monthly Data ---------- */
async function getMonthlyData() {
  const dates = getDateRange(30);
  const data = { logs: [], meals: [], workouts: [] };
  for (const date of dates) {
    const log = await getDailyLog(date);
    const nutrition = await getDailyNutrition(date);
    data.logs.push({ ...log, nutrition });
  }
  return data;
}
