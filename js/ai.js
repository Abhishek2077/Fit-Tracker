/* ==========================================
   FitTracker AI - Gemini API Integration
   Uses Google Gemini API Free Tier
   ========================================== */

// API Configuration - Key stored in localStorage for security
const GEMINI_MODEL = 'gemini-1.5-flash-latest';

function getApiKey() {
  return localStorage.getItem('ft-gemini-key') || '';
}

function setApiKey(key) {
  localStorage.setItem('ft-gemini-key', key);
}

function getApiUrl() {
  const key = getApiKey();
  return `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
}

/* ---------- Core API Call ---------- */
async function callGemini(prompt, systemInstruction = '') {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API key not set. Go to Settings to add your Gemini API key.');
  }

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      maxOutputTokens: 2048
    }
  };

  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const response = await fetch(getApiUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'API request failed');
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
}

/* ---------- System Prompts ---------- */
const FITNESS_COACH_PROMPT = `You are FitTracker AI, a personal fitness coach and nutrition expert. 
You speak in a friendly, motivational tone. Keep responses concise but helpful.
You understand Indian and international foods. You can estimate calories and macros.
Always respond in a structured way with emojis for better readability.
When analyzing food, provide: Calories, Protein, Carbs, Fat, Fiber, Sodium estimates.
When giving fitness advice, consider the user's goals (fat loss, muscle gain, bulk, cut, recomposition).
Never give medical advice. Always encourage consulting a professional for health concerns.`;

/* ---------- Food Analysis ---------- */
async function analyzeFoodText(foodText, profile = null) {
  let context = '';
  if (profile) {
    context = `User Profile: ${profile.name || 'User'}, Age: ${profile.age || 'N/A'}, Weight: ${profile.weight || 'N/A'}kg, Goal: ${profile.goalType || 'general fitness'}. `;
  }

  const prompt = `${context}Analyze this meal and estimate the nutritional content. 
  
Meal: "${foodText}"

Respond ONLY in this exact JSON format (no markdown, no explanation, just pure JSON):
{
  "description": "brief meal description",
  "calories": number,
  "protein": number (in grams),
  "carbs": number (in grams),
  "fat": number (in grams),
  "fiber": number (in grams),
  "sodium": number (in mg),
  "rating": number (1-10, based on nutritional quality),
  "ratingText": "one line rating comment",
  "isCheat": boolean (true if junk food like pizza, burger, KFC, cold drinks etc),
  "cheatWarning": "warning message if cheat meal, otherwise empty string"
}`;

  const response = await callGemini(prompt, FITNESS_COACH_PROMPT);

  // Parse JSON from response (handle potential markdown wrapping)
  let cleaned = response.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('Failed to parse food analysis:', cleaned);
    throw new Error('Could not analyze food. Please try again.');
  }
}

/* ---------- Photo Analysis ---------- */
async function analyzeFoodPhoto(imageBase64) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('API key not set.');

  const body = {
    contents: [{
      parts: [
        { text: `Identify the food in this image and estimate nutritional content. Respond ONLY in this exact JSON format (no markdown):
{
  "description": "identified food items",
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "fiber": number,
  "sodium": number,
  "rating": number (1-10),
  "ratingText": "brief comment",
  "isCheat": boolean,
  "cheatWarning": "warning if cheat meal"
}` },
        { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }
      ]
    }],
    generationConfig: { temperature: 0.5, maxOutputTokens: 1024 }
  };

  const response = await fetch(getApiUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) throw new Error('Photo analysis failed');

  const data = await response.json();
  let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (text.startsWith('```')) {
    text = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
  }

  return JSON.parse(text);
}

/* ---------- Daily Summary Generation ---------- */
async function generateDailySummary(nutrition, log, profile) {
  const prompt = `Generate a daily fitness summary based on this data:

Calories consumed: ${nutrition.calories}
Protein: ${nutrition.protein}g
Carbs: ${nutrition.carbs}g
Fat: ${nutrition.fat}g
Cheat meals: ${nutrition.cheatMeals}
Water: ${log.water} glasses
Sleep: ${log.sleep || 'not logged'} hours
Mood: ${log.mood || 'not logged'}
Gym: ${log.gymDone ? 'Yes' : 'No'}
User Goal: ${profile?.goalType || 'general fitness'}
Target Weight: ${profile?.targetWeight || 'not set'}kg
Protein Goal: ${profile?.proteinGoal || 140}g

Respond ONLY in JSON:
{
  "score": number (0-100),
  "scoreText": "one line score explanation",
  "highlights": ["highlight 1", "highlight 2", "highlight 3"],
  "suggestions": ["suggestion 1", "suggestion 2"],
  "motivationalQuote": "short motivational line"
}`;

  const response = await callGemini(prompt, FITNESS_COACH_PROMPT);
  let cleaned = response.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
  }
  return JSON.parse(cleaned);
}

/* ---------- Weekly Report Generation ---------- */
async function generateWeeklyReport(weeklyData) {
  const logs = weeklyData.logs;
  const avgProtein = Math.round(logs.reduce((s, l) => s + (l.nutrition?.protein || 0), 0) / 7);
  const avgCalories = Math.round(logs.reduce((s, l) => s + (l.nutrition?.calories || 0), 0) / 7);
  const gymDays = logs.filter(l => l.gymDone).length;
  const cheatMeals = logs.reduce((s, l) => s + (l.nutrition?.cheatMeals || 0), 0);
  const avgSleep = Math.round(logs.reduce((s, l) => s + (parseFloat(l.sleep) || 0), 0) / 7 * 10) / 10;

  const prompt = `Generate a weekly fitness report:

Average Protein: ${avgProtein}g/day
Average Calories: ${avgCalories}/day
Gym Days: ${gymDays}/7
Cheat Meals: ${cheatMeals}
Average Sleep: ${avgSleep} hours

Respond ONLY in JSON:
{
  "dietRating": number (1-10),
  "trainingRating": number (1-10),
  "overallScore": number (0-100),
  "summary": "2-3 line summary",
  "improvements": ["improvement 1", "improvement 2"],
  "strengths": ["strength 1", "strength 2"]
}`;

  const response = await callGemini(prompt, FITNESS_COACH_PROMPT);
  let cleaned = response.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
  }
  return JSON.parse(cleaned);
}

/* ---------- Monthly Coach Report ---------- */
async function generateMonthlyReport(monthlyData, profile) {
  const logs = monthlyData.logs;
  const days = logs.length;
  const avgProtein = Math.round(logs.reduce((s, l) => s + (l.nutrition?.protein || 0), 0) / days);
  const avgCalories = Math.round(logs.reduce((s, l) => s + (l.nutrition?.calories || 0), 0) / days);
  const avgFat = Math.round(logs.reduce((s, l) => s + (l.nutrition?.fat || 0), 0) / days);
  const weights = logs.filter(l => l.weight).map(l => l.weight);
  const weightChange = weights.length >= 2 ? (weights[weights.length - 1] - weights[0]).toFixed(1) : 'N/A';
  const gymDays = logs.filter(l => l.gymDone).length;

  const prompt = `Generate a detailed monthly fitness coach report:

Period: Last 30 days
Average Protein: ${avgProtein}g/day
Average Calories: ${avgCalories}/day
Average Fat: ${avgFat}g/day
Weight Change: ${weightChange}kg
Gym Days: ${gymDays}/30
User Goal: ${profile?.goalType || 'general fitness'}

Respond ONLY in JSON:
{
  "summary": "3-4 line comprehensive summary",
  "weightAnalysis": "1 line about weight change",
  "nutritionGrade": "A/B/C/D/F",
  "consistencyGrade": "A/B/C/D/F",
  "predictions": "1-2 line prediction if user continues this way",
  "topPriority": "single most important thing to improve"
}`;

  const response = await callGemini(prompt, FITNESS_COACH_PROMPT);
  let cleaned = response.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
  }
  return JSON.parse(cleaned);
}

/* ---------- Body Prediction ---------- */
async function predictBody(profile, recentLogs) {
  const weights = recentLogs.filter(l => l.weight).map(l => ({ date: l.date, weight: l.weight }));

  const prompt = `Based on this fitness data, predict the user's body weight trajectory:

Current Weight: ${profile?.weight || 'unknown'}kg
Target Weight: ${profile?.targetWeight || 'unknown'}kg
Goal: ${profile?.goalType || 'general fitness'}
Recent weight entries: ${JSON.stringify(weights.slice(-10))}

Respond ONLY in JSON:
{
  "currentWeight": number,
  "predictedWeight1Month": number,
  "predictedWeight3Month": number,
  "predictedTargetDate": "estimated date to reach target",
  "confidence": "high/medium/low",
  "advice": "1-2 line personalized advice"
}`;

  const response = await callGemini(prompt, FITNESS_COACH_PROMPT);
  let cleaned = response.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
  }
  return JSON.parse(cleaned);
}

/* ---------- AI Chat ---------- */
async function chatWithAI(message, chatHistory = [], profile = null, imageBase64 = null) {
  let context = '';
  if (profile) {
    context = `User: ${profile.name || 'User'}, ${profile.age || ''}yo, ${profile.weight || ''}kg, Goal: ${profile.goalType || 'fitness'}. `;
  }

  // Build conversation context
  let historyContext = '';
  const recentHistory = chatHistory.slice(-6);
  recentHistory.forEach(msg => {
    historyContext += `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.text}\n`;
  });

  const promptText = `${context}
Previous conversation:
${historyContext}

User's new message: "${message || 'Please analyze this image'}"

Respond naturally as a fitness coach. Keep it concise, helpful, and motivational. Use emojis sparingly.`;

  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API key not set. Go to Settings to add your Gemini API key.');
  }

  const parts = [{ text: promptText }];
  if (imageBase64) {
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: imageBase64 } });
  }

  const body = {
    contents: [{ parts }],
    systemInstruction: { parts: [{ text: FITNESS_COACH_PROMPT }] },
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      maxOutputTokens: 2048
    }
  };

  const response = await fetch(getApiUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'API request failed');
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
}
