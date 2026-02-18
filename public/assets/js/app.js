const STORAGE_KEY = 'matrix_gpt_chats_v1';
const MAX_HISTORY = 20;

const DEFAULT_CONFIG = {
  apiUrl: '/api/chat',
  apiKey: '',
  model: 'gpt-4o-mini',
  systemPrompt: 'You are a helpful assistant. Reply in the same language as the user. Keep default replies short (1-3 concise paragraphs) unless the user asks for details.',
  maxTokens: 450,
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
const chatLoaderEl = document.getElementById('chatLoader');
const matrixCheatOverlayEl = document.getElementById('matrixCheatOverlay');
const matrixCheatRainEl = document.getElementById('matrixCheatRain');

let currentChatId = null;
let chats = loadChats();
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
const MATRIX_CHEAT_REGEX = /(^|[^a-z0-9])matrix([^a-z0-9]|$)/i;
const MATRIX_REDIRECT_PATH = '/exit-matrix';
const MATRIX_CHEAT_DURATION_MS = prefersReducedMotion ? 700 : 4200;
const MATRIX_COLUMN_CHARS = '0123456789';
let chatLoaderHidden = false;
let isSending = false;
let isMatrixSequenceRunning = false;
const AUTO_SCROLL_THRESHOLD_PX = 96;
const TEXTAREA_MAX_HEIGHT_PX = 170;
const smoothScrollStates = new WeakMap();

function hideChatLoader() {
  if (!chatLoaderEl || chatLoaderHidden) return;
  chatLoaderHidden = true;

  if (prefersReducedMotion) {
    chatLoaderEl.remove();
    return;
  }

  chatLoaderEl.classList.add('is-hidden');
  window.setTimeout(() => {
    chatLoaderEl.remove();
  }, 460);
}

function scrollMessagesToBottom(forceInstant = false) {
  if (!messagesEl) return;
  const top = messagesEl.scrollHeight;
  if (forceInstant || prefersReducedMotion) {
    messagesEl.scrollTop = top;
    return;
  }
  messagesEl.scrollTo({ top, behavior: 'smooth' });
}

function isNearMessagesBottom() {
  if (!messagesEl) return true;
  const distanceToBottom = messagesEl.scrollHeight - (messagesEl.scrollTop + messagesEl.clientHeight);
  return distanceToBottom <= AUTO_SCROLL_THRESHOLD_PX;
}

function resizeMessageInput() {
  if (!inputEl) return;
  inputEl.style.height = 'auto';
  inputEl.style.height = `${Math.min(inputEl.scrollHeight, TEXTAREA_MAX_HEIGHT_PX)}px`;
}

function containsMatrixCheatCode(text) {
  return MATRIX_CHEAT_REGEX.test(text);
}

function randomMatrixColumn(length) {
  let value = '';
  for (let i = 0; i < length; i += 1) {
    const index = Math.floor(Math.random() * MATRIX_COLUMN_CHARS.length);
    value += `${MATRIX_COLUMN_CHARS[index]}\n`;
  }
  return value;
}

function ensureMatrixCheatRain() {
  if (!matrixCheatRainEl || matrixCheatRainEl.childElementCount > 0) return;

  const columns = Math.max(16, Math.floor(window.innerWidth / 24));
  for (let i = 0; i < columns; i += 1) {
    const column = document.createElement('span');
    column.className = 'matrix-cheat-column';
    column.style.left = `${(i / columns) * 100}%`;
    column.style.setProperty('--matrix-fall-duration', `${(2.2 + Math.random() * 3).toFixed(2)}s`);
    column.style.setProperty('--matrix-fall-delay', `${(-Math.random() * 3.8).toFixed(2)}s`);
    column.style.setProperty('--matrix-fall-opacity', (0.36 + Math.random() * 0.54).toFixed(2));
    column.style.setProperty('--matrix-fall-size', `${12 + Math.floor(Math.random() * 6)}px`);
    column.textContent = randomMatrixColumn(20 + Math.floor(Math.random() * 18));
    matrixCheatRainEl.appendChild(column);
  }
}

function triggerMatrixCheatSequence() {
  if (isMatrixSequenceRunning) return;
  isMatrixSequenceRunning = true;
  ensureMatrixCheatRain();
  setSendingState(true);

  if (typingEl) typingEl.hidden = true;
  if (inputEl) {
    inputEl.disabled = true;
    inputEl.blur();
  }
  if (newChatBtn) newChatBtn.disabled = true;
  if (toggleSidebarBtn) toggleSidebarBtn.disabled = true;
  if (logoutBtn) logoutBtn.disabled = true;

  document.body.classList.add('matrix-cheat-mode');
  matrixCheatOverlayEl?.classList.add('is-active');

  window.setTimeout(() => {
    window.location.assign(MATRIX_REDIRECT_PATH);
  }, MATRIX_CHEAT_DURATION_MS);
}

function setSendingState(nextState) {
  isSending = nextState;
  if (sendBtn) {
    sendBtn.disabled = nextState;
    sendBtn.classList.toggle('is-loading', nextState);
    sendBtn.setAttribute('aria-busy', String(nextState));
  }
}

function smoothWheelScroll(element, deltaY) {
  if (!element) return;

  const maxTop = Math.max(0, element.scrollHeight - element.clientHeight);
  if (maxTop <= 0) return;

  const state = smoothScrollStates.get(element) || { target: element.scrollTop, rafId: 0 };
  state.target = Math.max(0, Math.min(maxTop, state.target + deltaY));

  if (state.rafId) {
    smoothScrollStates.set(element, state);
    return;
  }

  const tick = () => {
    const distance = state.target - element.scrollTop;
    if (Math.abs(distance) < 0.7) {
      element.scrollTop = state.target;
      state.rafId = 0;
      smoothScrollStates.set(element, state);
      return;
    }

    element.scrollTop += distance * 0.22;
    state.rafId = requestAnimationFrame(tick);
    smoothScrollStates.set(element, state);
  };

  state.rafId = requestAnimationFrame(tick);
  smoothScrollStates.set(element, state);
}

function enableSmoothWheelScrolling(element) {
  if (!element || prefersReducedMotion || !hasFinePointer) return;

  element.addEventListener('wheel', (event) => {
    if (element.scrollHeight <= element.clientHeight) return;
    event.preventDefault();
    smoothWheelScroll(element, event.deltaY);
  }, { passive: false });
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

function appendMessage(role, content, ts = Date.now(), options = { autoScroll: true }) {
  const safeRole = role === 'user' ? 'user' : 'assistant';
  const shouldAutoScroll = options.autoScroll !== false && (options.forceAutoScroll || isNearMessagesBottom());

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
  if (shouldAutoScroll) {
    scrollMessagesToBottom();
  }
}

function renderMessages(items) {
  messagesEl.innerHTML = '';
  items.forEach(m => appendMessage(m.role, m.content, m.ts, { autoScroll: false }));
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
  if (isSending) return;
  const text = inputEl.value.trim();
  if (!text) return;

  const chat = getCurrentChat();
  if (!chat) return;

  inputEl.value = '';
  resizeMessageInput();
  const userMessage = { role: 'user', content: text, ts: Date.now() };
  chat.messages.push(userMessage);
  chat.updatedAt = Date.now();

  if (chat.title === 'Ny chat') {
    chat.title = text.length > 42 ? `${text.slice(0, 42)}…` : text;
  }

  saveChats();
  chatTitleEl.textContent = chat.title;
  appendMessage('user', text, userMessage.ts, { forceAutoScroll: true });
  renderChatList();

  if (containsMatrixCheatCode(text)) {
    triggerMatrixCheatSequence();
    return;
  }

  setSendingState(true);
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
    setSendingState(false);
    inputEl?.focus();
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
inputEl?.addEventListener('input', resizeMessageInput);

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
resizeMessageInput();
enableSmoothWheelScrolling(messagesEl);
enableSmoothWheelScrolling(sidebarEl);
window.setTimeout(hideChatLoader, 360);
