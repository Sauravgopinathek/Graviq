/**
 * Graviq — Embeddable AI Chat Widget
 * Self-contained vanilla JS widget with zero external dependencies.
 */
(function () {
  'use strict';

  // ===== Configuration =====
  const config = window.aiLeadBot || {};
  const BOT_ID = config.botId;
  const THEME = config.theme || 'dark';
  const POSITION = config.position || 'bottom-right';

  function getWidgetScriptSrc() {
    if (document.currentScript && document.currentScript.src) {
      return document.currentScript.src;
    }

    const scripts = document.getElementsByTagName('script');
    for (let i = scripts.length - 1; i >= 0; i -= 1) {
      const src = scripts[i].src || '';
      if (src.includes('/widget.js')) {
        return src;
      }
    }

    return null;
  }

  const WIDGET_SCRIPT_SRC = getWidgetScriptSrc();
  const SERVER_URL = WIDGET_SCRIPT_SRC ? new URL(WIDGET_SCRIPT_SRC, window.location.href).origin : null;

  if (!BOT_ID) {
    console.error('[Graviq] Missing botId in window.aiLeadBot config');
    return;
  }

  if (!SERVER_URL) {
    console.error('[Graviq] Unable to resolve backend URL from widget.js script source');
    return;
  }

  // ===== Inject Styles =====
  const CSS = `WIDGET_CSS_PLACEHOLDER`;

  function injectStyles() {
    if (document.getElementById('graviq-widget-styles')) return;
    const style = document.createElement('style');
    style.id = 'graviq-widget-styles';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  // ===== SVG Icons =====
  const ICONS = {
    chat: '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>',
    send: '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>',
  };

  // ===== State =====
  let conversationId = null;
  let isOpen = false;
  let isSending = false;

  // ===== DOM Elements =====
  let container, toggleBtn, chatWindow, messagesEl, inputEl, sendBtn, typingEl, progressEl, progressFill, progressLabel;

  // ===== Build DOM =====
  function createWidget() {
    injectStyles();

    container = document.createElement('div');
    container.className = `graviq-widget-container theme-${THEME} position-${POSITION}`;

    container.innerHTML = `
      <div class="graviq-chat-window position-${POSITION}" id="graviq-chat-window">
        <div class="graviq-chat-header">
          <div class="graviq-chat-header-avatar">🤖</div>
          <div class="graviq-chat-header-info">
            <h3>Chat with us</h3>
            <span>Online now</span>
          </div>
        </div>
        <div class="graviq-progress" id="graviq-progress">
          <div class="graviq-progress-label" id="graviq-progress-label">Getting to know you...</div>
          <div class="graviq-progress-bar">
            <div class="graviq-progress-fill" id="graviq-progress-fill"></div>
          </div>
        </div>
        <div class="graviq-messages" id="graviq-messages">
        </div>
        <div class="graviq-typing" id="graviq-typing">
          <div class="graviq-typing-dot"></div>
          <div class="graviq-typing-dot"></div>
          <div class="graviq-typing-dot"></div>
        </div>
        <div class="graviq-input-area">
          <input type="text" class="graviq-input" id="graviq-input" placeholder="Type a message..." autocomplete="off" />
          <button class="graviq-send-btn" id="graviq-send-btn" disabled>
            ${ICONS.send}
          </button>
        </div>
        <div class="graviq-powered">Powered by <a href="#" target="_blank">Graviq</a></div>
      </div>
      <button class="graviq-toggle-btn" id="graviq-toggle-btn">
        ${ICONS.chat}
      </button>
    `;

    document.body.appendChild(container);

    // Cache elements
    toggleBtn = document.getElementById('graviq-toggle-btn');
    chatWindow = document.getElementById('graviq-chat-window');
    messagesEl = document.getElementById('graviq-messages');
    inputEl = document.getElementById('graviq-input');
    sendBtn = document.getElementById('graviq-send-btn');
    typingEl = document.getElementById('graviq-typing');
    progressEl = document.getElementById('graviq-progress');
    progressFill = document.getElementById('graviq-progress-fill');
    progressLabel = document.getElementById('graviq-progress-label');

    // Event listeners
    toggleBtn.addEventListener('click', toggleChat);
    sendBtn.addEventListener('click', sendMessage);
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    inputEl.addEventListener('input', () => {
      sendBtn.disabled = !inputEl.value.trim() || isSending;
    });
  }

  // ===== Toggle Chat =====
  function toggleChat() {
    isOpen = !isOpen;
    chatWindow.classList.toggle('open', isOpen);
    toggleBtn.classList.toggle('open', isOpen);
    toggleBtn.innerHTML = isOpen ? ICONS.close : ICONS.chat;

    if (isOpen && !conversationId) {
      startConversation();
    }

    if (isOpen) {
      setTimeout(() => inputEl.focus(), 350);
    }
  }

  // ===== API Helpers =====
  async function apiPost(endpoint, body) {
    const res = await fetch(`${SERVER_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `API error: ${res.status}`);
    }
    return res.json();
  }

  // ===== Start Conversation =====
  async function startConversation() {
    try {
      showTyping();
      const data = await apiPost('/api/conversations', {
        botId: BOT_ID,
        sourceUrl: window.location.href,
      });
      conversationId = data.conversation.id;
      const messages = data.conversation.messages || [];

      hideTyping();
      messages.forEach((m) => {
        if (m.role === 'assistant') addMessage(m.content, 'bot');
      });
    } catch (err) {
      hideTyping();
      addMessage('Sorry, I\'m having trouble connecting. Please try again later.', 'bot');
      console.error('[Graviq] Start conversation error:', err);
    }
  }

  // ===== Send Message =====
  async function sendMessage() {
    const text = inputEl.value.trim();
    if (!text || isSending || !conversationId) return;

    isSending = true;
    sendBtn.disabled = true;
    inputEl.value = '';

    addMessage(text, 'user');
    showTyping();

    try {
      const data = await apiPost(`/api/conversations/${conversationId}/message`, {
        content: text,
        sourceUrl: window.location.href,
      });

      hideTyping();
      addMessage(data.reply, 'bot');

      // Update progress bar
      if (data.progress) {
        updateProgress(data.progress);
      }
    } catch (err) {
      hideTyping();
      addMessage('Oops! Something went wrong. Let me try again...', 'bot');
      console.error('[Graviq] Message error:', err);
    } finally {
      isSending = false;
      sendBtn.disabled = !inputEl.value.trim();
      inputEl.focus();
    }
  }

  // ===== UI Helpers =====
  function addMessage(text, sender) {
    const msg = document.createElement('div');
    msg.className = `graviq-message ${sender}`;
    msg.textContent = text;
    messagesEl.appendChild(msg);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function showTyping() {
    typingEl.classList.add('visible');
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function hideTyping() {
    typingEl.classList.remove('visible');
  }

  function updateProgress(progress) {
    if (progress.percentage > 0) {
      progressEl.classList.add('visible');
      progressFill.style.width = `${progress.percentage}%`;

      if (progress.stepsLeft > 0) {
        progressLabel.textContent = `${progress.stepsLeft} step${progress.stepsLeft > 1 ? 's' : ''} left`;
      } else {
        progressLabel.textContent = '✨ All done! Thanks for chatting!';
      }
    }
  }

  // ===== Initialize =====
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createWidget);
  } else {
    createWidget();
  }
})();
