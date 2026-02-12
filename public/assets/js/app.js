const STORAGE_KEY = 'matrix_gpt_chats_v1';
const MAX_HISTORY = 20;

const DEFAULT_CONFIG = {
  apiUrl: '/api/chat',
  apiKey: '',
  model: 'gpt-4o-mini',
  systemPrompt: 'Du er en hjelpsom skoleassistent. Svar kort og tydelig pa norsk (bokmal).',
  maxTokens: 800,
  temperature: 0.7
};

const CONFIG = {
  ...DEFAULT_CONFIG,
  ...(window.MATRIX_GPT_CONFIG || {})
};

const chatListEl = document.getElementById('chatList');
const messagesEl = document.getElementById('messages');
const chatTitleEl = document.getElementById('chatTitle');
const newChatBtn = document.getElementById('newChatBtn');
const sendBtn = document.getElementById('sendBtn');
const inputEl = document.getElementById('messageInput');
const typingEl = document.getElementById('typing');
const toggleSidebarBtn = document.getElementById('toggleSidebar');
const sidebarEl = document.getElementById('sidebar');
const userNameEl = document.getElementById('userName');
const userEmailEl = document.getElementById('userEmail');
const userAvatarEl = document.getElementById('userAvatar');
const logoutBtn = document.getElementById('logoutBtn');
const apiStatusEl = document.getElementById('apiStatus');

let currentChatId = null;
let chats = loadChats();
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function scrollMessagesToBottom(forceInstant = false) {
  if (!messagesEl) return;
  const top = messagesEl.scrollHeight;
  if (forceInstant || prefersReducedMotion) {
    messagesEl.scrollTop = top;
    return;
  }
  messagesEl.scrollTo({ top, behavior: 'smooth' });
}

function loadChats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveChats() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatTime(ts) {
  try {
    return new Date(ts).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
}

function appendMessage(role, content, ts = Date.now()) {
  const safeRole = role === 'user' ? 'user' : 'assistant';

  const row = document.createElement('article');
  row.className = `msg-row ${safeRole}`;

  const bubble = document.createElement('div');
  bubble.className = `msg ${safeRole}`;

  const label = document.createElement('div');
  label.className = 'msg-label';
  label.textContent = safeRole === 'user' ? 'You' : 'Matrix';

  const body = document.createElement('div');
  body.className = 'msg-content';
  body.innerHTML = escapeHtml(content).replace(/\n/g, '<br>');

  const meta = document.createElement('div');
  meta.className = 'msg-meta';
  meta.textContent = formatTime(ts);

  bubble.appendChild(label);
  bubble.appendChild(body);
  bubble.appendChild(meta);
  row.appendChild(bubble);
  messagesEl.appendChild(row);
  scrollMessagesToBottom();
}

function renderMessages(items) {
  messagesEl.innerHTML = '';
  items.forEach(m => appendMessage(m.role, m.content, m.ts));
  scrollMessagesToBottom(true);
}

function formatDate(ts) {
  try {
    return new Date(ts).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
}

function renderChatList() {
  chatListEl.innerHTML = '';
  chats.forEach(c => {
    const item = document.createElement('div');
    item.className = 'chat-item' + (c.id === currentChatId ? ' active' : '');

    const meta = document.createElement('div');
    meta.className = 'chat-meta';
    meta.innerHTML = `
      <div class="chat-title-small">${escapeHtml(c.title)}</div>
      <div class="chat-date">${escapeHtml(formatDate(c.updatedAt))}</div>
    `;

    const actions = document.createElement('div');
    actions.className = 'chat-actions';

    const delBtn = document.createElement('button');
    delBtn.className = 'btn icon danger';
    delBtn.textContent = '×';
    delBtn.title = 'Slett';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!confirm('Slette chatten?')) return;
      deleteChat(c.id);
    });

    actions.appendChild(delBtn);
    item.appendChild(meta);
    item.appendChild(actions);

    item.addEventListener('click', () => {
      currentChatId = c.id;
      openChat(c.id);
      closeSidebar();
    });

    chatListEl.appendChild(item);
  });
}

function createChat() {
  const id = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `chat_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  const chat = {
    id,
    title: 'Ny chat',
    updatedAt: Date.now(),
    messages: []
  };

  chats.unshift(chat);
  currentChatId = id;
  saveChats();
  openChat(id);
  renderChatList();
}

function deleteChat(id) {
  chats = chats.filter(c => c.id !== id);
  if (currentChatId === id) {
    currentChatId = chats[0]?.id || null;
  }
  saveChats();
  renderChatList();
  if (currentChatId) {
    openChat(currentChatId);
  } else {
    messagesEl.innerHTML = '';
    chatTitleEl.textContent = '—';
  }
}

function getCurrentChat() {
  return chats.find(c => c.id === currentChatId) || null;
}

function openChat(id) {
  const chat = chats.find(c => c.id === id);
  if (!chat) return;
  currentChatId = id;
  chatTitleEl.textContent = chat.title;
  renderMessages(chat.messages);
  renderChatList();
}

function ensureInitialChat() {
  if (chats.length === 0) {
    createChat();
    return;
  }
  currentChatId = currentChatId || chats[0].id;
  openChat(currentChatId);
}

function closeSidebar() {
  if (sidebarEl) sidebarEl.classList.remove('open');
}

function buildMessagesForApi(chat) {
  const history = chat.messages
    .slice(-MAX_HISTORY)
    .map(m => ({ role: m.role, content: m.content }));

  if (CONFIG.systemPrompt && CONFIG.systemPrompt.trim() !== '') {
    return [{ role: 'system', content: CONFIG.systemPrompt.trim() }, ...history];
  }
  return history;
}

function updateUserInfo() {
  let user = null;
  try {
    const raw = localStorage.getItem('matrix_user');
    user = raw ? JSON.parse(raw) : null;
  } catch {
    user = null;
  }

  const name = user?.name || (user?.email ? user.email.split('@')[0] : 'Gjest');
  const email = user?.email || '';

  if (userNameEl) userNameEl.textContent = name;
  if (userEmailEl) {
    if (email) {
      userEmailEl.textContent = email;
      userEmailEl.style.display = 'block';
    } else {
      userEmailEl.textContent = '';
      userEmailEl.style.display = 'none';
    }
  }
  if (userAvatarEl) {
    const initials = name
      .split(' ')
      .filter(Boolean)
      .map(part => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    userAvatarEl.textContent = initials || 'MG';
  }
}

function updateApiStatus() {
  if (!apiStatusEl) return;
  try {
    const url = new URL(CONFIG.apiUrl, window.location.origin);
    const host = url.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      apiStatusEl.textContent = 'lokalt';
    } else {
      apiStatusEl.textContent = host;
    }
  } catch {
    apiStatusEl.textContent = 'ikke angitt';
  }
}

async function callModel(messages) {
  if (!CONFIG.apiUrl) {
    throw new Error('API-URL er ikke angitt');
  }
  const headers = {
    'Content-Type': 'application/json'
  };
  if (CONFIG.apiKey && CONFIG.apiKey.trim() !== '') {
    headers.Authorization = `Bearer ${CONFIG.apiKey.trim()}`;
  }

  const payload = {
    model: CONFIG.model,
    messages,
    max_tokens: CONFIG.maxTokens,
    temperature: CONFIG.temperature
  };

  const res = await fetch(CONFIG.apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = data && data.error && data.error.message
      ? data.error.message
      : `API-feil (HTTP ${res.status})`;
    throw new Error(err);
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Tomt svar fra API');
  }

  return content;
}

async function sendMessage() {
  const text = inputEl.value.trim();
  if (!text) return;

  const chat = getCurrentChat();
  if (!chat) return;

  inputEl.value = '';
  const userMessage = { role: 'user', content: text, ts: Date.now() };
  chat.messages.push(userMessage);
  chat.updatedAt = Date.now();

  if (chat.title === 'Ny chat') {
    chat.title = text.length > 42 ? `${text.slice(0, 42)}…` : text;
  }

  saveChats();
  chatTitleEl.textContent = chat.title;
  appendMessage('user', text, userMessage.ts);
  renderChatList();

  typingEl.hidden = false;

  try {
    const apiMessages = buildMessagesForApi(chat);
    const reply = await callModel(apiMessages);
    const assistantMessage = { role: 'assistant', content: reply, ts: Date.now() };
    chat.messages.push(assistantMessage);
    chat.updatedAt = Date.now();
    saveChats();
    appendMessage('assistant', reply, assistantMessage.ts);
    renderChatList();
  } catch (err) {
    const msg = err && err.message ? err.message : 'Feil ved forespørsel.';
    appendMessage('assistant', `Feil: ${msg}`, Date.now());
  } finally {
    typingEl.hidden = true;
  }
}

newChatBtn?.addEventListener('click', createChat);

sendBtn?.addEventListener('click', sendMessage);
inputEl?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

if (toggleSidebarBtn) {
  toggleSidebarBtn.addEventListener('click', () => {
    sidebarEl.classList.toggle('open');
  });
}

logoutBtn?.addEventListener('click', () => {
  localStorage.removeItem('matrix_user');
  window.location.href = '/login';
});

updateUserInfo();
updateApiStatus();
ensureInitialChat();
