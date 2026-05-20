/* ==========================================
   FitTracker AI - Chat Page Logic
   AI Coach conversation with Gemini
   ========================================== */

let chatHistory = [];

document.addEventListener('DOMContentLoaded', async () => {
  await initDB();
  renderBottomNav('chat');
  loadChatHistory();

  // Enter key to send
  document.getElementById('chat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Add paste event listener
  const chatInput = document.getElementById('chat-input');
  if (chatInput) {
    chatInput.addEventListener('paste', (e) => {
      const items = (e.clipboardData || e.originalEvent.clipboardData).items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file' && items[i].type.startsWith('image/')) {
          e.preventDefault();
          processChatImageFile(items[i].getAsFile());
          return;
        }
      }
    });
  }
});

/* ---------- Chat Image Handling ---------- */
let pendingImageBase64 = null;

function triggerChatPhotoUpload() {
  document.getElementById('chat-photo-file-input').click();
}

async function handleChatPhotoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  await processChatImageFile(file);
  event.target.value = '';
}

async function processChatImageFile(file) {
  try {
    const base64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(file);
    });
    pendingImageBase64 = base64;
    document.getElementById('chat-input').placeholder = "Image attached! Write a prompt...";
    showToast('Image attached', 'info');
  } catch(e) {
    showToast('Failed to attach image', 'danger');
  }
}

/* ---------- Load Chat History ---------- */
async function loadChatHistory() {
  const history = await dbGetAll(STORES.CHAT_HISTORY);
  history.sort((a, b) => a.id - b.id);
  chatHistory = history;

  if (history.length === 0) {
    addWelcomeMessage();
    return;
  }

  const container = document.getElementById('chat-messages');
  container.innerHTML = '';
  history.forEach(msg => appendBubble(msg.role, msg.text, msg.timestamp, false));
  scrollToBottom();
}

function addWelcomeMessage() {
  const welcome = `Hey! 👋 I'm your AI Fitness Coach. Ask me anything about:\n\n🍗 Food & nutrition\n💪 Workout advice\n📊 Progress analysis\n🎯 Goal planning\n\nWhat's on your mind?`;
  appendBubble('ai', welcome, new Date().toISOString(), false);
}

/* ---------- Send Message ---------- */
async function sendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text && !pendingImageBase64) return;

  const sendingImage = pendingImageBase64;
  pendingImageBase64 = null;
  input.placeholder = "Ask or paste image (Ctrl+V)...";
  input.value = '';
  input.style.height = 'auto';

  // Add user bubble
  let userText = text || 'Sent an image';
  appendBubble('user', sendingImage ? '🎨 [Image] ' + userText : userText);

  // Save to DB
  const userMsg = { role: 'user', text: userText + (sendingImage ? ' (with image)' : ''), timestamp: new Date().toISOString() };
  await dbPut(STORES.CHAT_HISTORY, userMsg);
  chatHistory.push(userMsg);

  // Show typing indicator
  showTyping();

  try {
    const profile = await getProfile();
    const response = await chatWithAI(text, chatHistory, profile, sendingImage);

    hideTyping();
    appendBubble('ai', response);

    // Save AI response
    const aiMsg = { role: 'ai', text: response, timestamp: new Date().toISOString() };
    await dbPut(STORES.CHAT_HISTORY, aiMsg);
    chatHistory.push(aiMsg);
  } catch (error) {
    hideTyping();
    appendBubble('ai', `❌ ${error.message}\n\nMake sure your Gemini API key is set in Settings.`);
  }
}

/* ---------- Quick Prompt ---------- */
function quickPrompt(text) {
  document.getElementById('chat-input').value = text;
  sendMessage();
}

/* ---------- Voice Input ---------- */
function startChatVoice() {
  startVoiceInput((transcript) => {
    document.getElementById('chat-input').value = transcript;
    sendMessage();
  });
}

/* ---------- UI Helpers ---------- */
function appendBubble(role, text, timestamp = null, animate = true) {
  const container = document.getElementById('chat-messages');
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${role}`;

  const time = timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Format AI responses with line breaks
  const formattedText = text.replace(/\n/g, '<br>');

  bubble.innerHTML = `
    ${role === 'ai' ? '<div class="bubble-label">🤖 AI Coach</div>' : ''}
    <div>${formattedText}</div>
    <div class="bubble-time">${time}</div>
  `;

  if (!animate) bubble.style.animation = 'none';

  container.appendChild(bubble);
  scrollToBottom();
}

function showTyping() {
  const container = document.getElementById('chat-messages');
  const typing = document.createElement('div');
  typing.className = 'typing-indicator';
  typing.id = 'typing-indicator';
  typing.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
  container.appendChild(typing);
  scrollToBottom();
  document.getElementById('btn-send').disabled = true;
}

function hideTyping() {
  const el = document.getElementById('typing-indicator');
  if (el) el.remove();
  document.getElementById('btn-send').disabled = false;
}

function scrollToBottom() {
  const container = document.getElementById('chat-messages');
  container.scrollTop = container.scrollHeight;
}

/* ---------- Clear Chat ---------- */
async function clearChat() {
  if (!confirm('Clear all chat history?')) return;
  await dbClear(STORES.CHAT_HISTORY);
  chatHistory = [];
  document.getElementById('chat-messages').innerHTML = '';
  addWelcomeMessage();
  showToast('Chat cleared', 'success');
}

// Auto-resize textarea
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('chat-input');
  if (input) {
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    });
  }
});
