/**
 * Graviq — Embeddable AI Chat Widget
 * Self-contained vanilla JS widget with zero external dependencies.
 * Features: chat, gamification (buttons, quiz, spin wheel, rewards), progress bar
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

  // ===== Spin Wheel Config =====
  const WHEEL_SEGMENTS = [
    { label: '10% Off', color: '#6C5CE7' },
    { label: '15% Off', color: '#00D2FF' },
    { label: 'Free Trial', color: '#00E676' },
    { label: '20% Off', color: '#FFB74D' },
    { label: 'Bonus Gift', color: '#FF5252' },
    { label: '5% Off', color: '#AB47BC' },
  ];

  // ===== State =====
  let conversationId = null;
  let isOpen = false;
  let isSending = false;
  let impressionSent = false;

  // ===== DOM Elements =====
  let container, toggleBtn, chatWindow, messagesEl, inputEl, sendBtn, typingEl, progressEl, progressFill, progressLabel;

  // ===== Gamification Marker Parser =====
  function parseGamification(text) {
    const parts = [];
    const lines = text.split('\n');
    let textBuffer = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // [BUTTONS:Option A|Option B|Option C]
      const buttonsMatch = trimmed.match(/^\[BUTTONS:(.+)\]$/);
      if (buttonsMatch) {
        if (textBuffer.length > 0) {
          parts.push({ type: 'text', content: textBuffer.join('\n') });
          textBuffer = [];
        }
        const options = buttonsMatch[1].split('|').map(s => s.trim());
        parts.push({ type: 'buttons', options });
        continue;
      }

      // [QUIZ:Question?|Option A|Option B|Option C]
      const quizMatch = trimmed.match(/^\[QUIZ:(.+)\]$/);
      if (quizMatch) {
        if (textBuffer.length > 0) {
          parts.push({ type: 'text', content: textBuffer.join('\n') });
          textBuffer = [];
        }
        const quizParts = quizMatch[1].split('|').map(s => s.trim());
        const question = quizParts[0];
        const options = quizParts.slice(1);
        parts.push({ type: 'quiz', question, options });
        continue;
      }

      // [SPIN_WHEEL]
      if (trimmed === '[SPIN_WHEEL]') {
        if (textBuffer.length > 0) {
          parts.push({ type: 'text', content: textBuffer.join('\n') });
          textBuffer = [];
        }
        parts.push({ type: 'spin_wheel' });
        continue;
      }

      // [REWARD:Title|Subtitle]
      const rewardMatch = trimmed.match(/^\[REWARD:(.+)\]$/);
      if (rewardMatch) {
        if (textBuffer.length > 0) {
          parts.push({ type: 'text', content: textBuffer.join('\n') });
          textBuffer = [];
        }
        const rewardParts = rewardMatch[1].split('|').map(s => s.trim());
        parts.push({ type: 'reward', title: rewardParts[0], subtitle: rewardParts[1] || '' });
        continue;
      }

      textBuffer.push(line);
    }

    if (textBuffer.length > 0) {
      const text = textBuffer.join('\n').trim();
      if (text) parts.push({ type: 'text', content: text });
    }

    return parts.length > 0 ? parts : [{ type: 'text', content: text }];
  }

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

    // Fire impression tracking
    trackImpression();
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

  // ===== Impression Tracking =====
  function trackImpression() {
    if (impressionSent) return;
    impressionSent = true;
    apiPost(`/api/bots/${BOT_ID}/impression`, {
      sourceUrl: window.location.href,
    }).catch(() => {}); // Fire and forget
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
        if (m.role === 'assistant') addBotMessage(m.content);
      });
    } catch (err) {
      hideTyping();
      addSimpleMessage('Sorry, I\'m having trouble connecting. Please try again later.', 'bot');
      console.error('[Graviq] Start conversation error:', err);
    }
  }

  // ===== Send Message =====
  async function sendMessage(overrideText) {
    const text = overrideText || inputEl.value.trim();
    if (!text || isSending || !conversationId) return;

    isSending = true;
    sendBtn.disabled = true;
    if (!overrideText) inputEl.value = '';

    addSimpleMessage(text, 'user');
    showTyping();

    try {
      const data = await apiPost(`/api/conversations/${conversationId}/message`, {
        content: text,
        sourceUrl: window.location.href,
      });

      hideTyping();
      addBotMessage(data.reply);

      // Update progress bar
      if (data.progress) {
        updateProgress(data.progress);
      }
    } catch (err) {
      hideTyping();
      addSimpleMessage('Oops! Something went wrong. Let me try again...', 'bot');
      console.error('[Graviq] Message error:', err);
    } finally {
      isSending = false;
      sendBtn.disabled = !inputEl.value.trim();
      inputEl.focus();
    }
  }

  // ===== UI Helpers =====

  /** Add a simple text message bubble */
  function addSimpleMessage(text, sender) {
    const msg = document.createElement('div');
    msg.className = `graviq-message ${sender}`;
    msg.textContent = text;
    messagesEl.appendChild(msg);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  /** Add a bot message with gamification parsing */
  function addBotMessage(text) {
    const parts = parseGamification(text);

    for (const part of parts) {
      switch (part.type) {
        case 'text':
          addSimpleMessage(part.content, 'bot');
          break;
        case 'buttons':
          renderButtons(part.options);
          break;
        case 'quiz':
          renderQuiz(part.question, part.options);
          break;
        case 'spin_wheel':
          renderSpinWheel();
          break;
        case 'reward':
          renderReward(part.title, part.subtitle);
          break;
      }
    }
  }

  /** Render quick-reply buttons */
  function renderButtons(options) {
    const wrapper = document.createElement('div');
    wrapper.className = 'graviq-buttons-wrapper';

    options.forEach((label) => {
      const btn = document.createElement('button');
      btn.className = 'graviq-quick-btn';
      btn.textContent = label;
      btn.addEventListener('click', () => {
        // Disable all buttons in this group
        wrapper.querySelectorAll('.graviq-quick-btn').forEach(b => {
          b.disabled = true;
          b.classList.remove('selected');
        });
        btn.classList.add('selected');
        sendMessage(label);
      });
      wrapper.appendChild(btn);
    });

    messagesEl.appendChild(wrapper);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  /** Render a quiz card */
  function renderQuiz(question, options) {
    const card = document.createElement('div');
    card.className = 'graviq-quiz-card';

    const header = document.createElement('div');
    header.className = 'graviq-quiz-header';
    header.innerHTML = '🧠 Quick Quiz';

    const q = document.createElement('div');
    q.className = 'graviq-quiz-question';
    q.textContent = question;

    const optionsEl = document.createElement('div');
    optionsEl.className = 'graviq-quiz-options';

    options.forEach((label, idx) => {
      const opt = document.createElement('button');
      opt.className = 'graviq-quiz-option';
      opt.innerHTML = `<span class="graviq-quiz-letter">${String.fromCharCode(65 + idx)}</span>${label}`;
      opt.addEventListener('click', () => {
        optionsEl.querySelectorAll('.graviq-quiz-option').forEach(o => {
          o.disabled = true;
          o.classList.remove('selected');
        });
        opt.classList.add('selected');
        sendMessage(label);
      });
      optionsEl.appendChild(opt);
    });

    card.appendChild(header);
    card.appendChild(q);
    card.appendChild(optionsEl);
    messagesEl.appendChild(card);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  /** Render a spin-the-wheel */
  function renderSpinWheel() {
    const card = document.createElement('div');
    card.className = 'graviq-spin-card';

    const title = document.createElement('div');
    title.className = 'graviq-spin-title';
    title.textContent = '🎰 Spin to Win!';

    const wheelContainer = document.createElement('div');
    wheelContainer.className = 'graviq-wheel-container';

    const canvas = document.createElement('canvas');
    canvas.width = 220;
    canvas.height = 220;
    canvas.className = 'graviq-wheel-canvas';
    wheelContainer.appendChild(canvas);

    const pointer = document.createElement('div');
    pointer.className = 'graviq-wheel-pointer';
    pointer.textContent = '▼';
    wheelContainer.appendChild(pointer);

    const resultEl = document.createElement('div');
    resultEl.className = 'graviq-spin-result';

    const spinBtn = document.createElement('button');
    spinBtn.className = 'graviq-spin-btn';
    spinBtn.textContent = 'SPIN!';

    card.appendChild(title);
    card.appendChild(wheelContainer);
    card.appendChild(resultEl);
    card.appendChild(spinBtn);
    messagesEl.appendChild(card);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    // Draw wheel
    drawWheel(canvas);

    // Spin handler
    spinBtn.addEventListener('click', () => {
      spinBtn.disabled = true;
      spinBtn.textContent = 'Spinning...';

      const segmentAngle = 360 / WHEEL_SEGMENTS.length;
      const randomIdx = Math.floor(Math.random() * WHEEL_SEGMENTS.length);
      // Spin 5-8 full rotations + land on random segment
      const extraRotations = (5 + Math.random() * 3) * 360;
      const targetAngle = extraRotations + (360 - randomIdx * segmentAngle - segmentAngle / 2);

      canvas.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
      canvas.style.transform = `rotate(${targetAngle}deg)`;

      setTimeout(() => {
        const wonSegment = WHEEL_SEGMENTS[randomIdx];
        resultEl.textContent = `🎉 You won: ${wonSegment.label}!`;
        resultEl.classList.add('visible');
        spinBtn.textContent = 'Claim Reward ↓';
        spinBtn.disabled = false;
        spinBtn.onclick = () => {
          spinBtn.disabled = true;
          sendMessage(`I won ${wonSegment.label}! I'd like to claim it.`);
        };
      }, 4200);
    });
  }

  /** Draw the wheel segments on a canvas */
  function drawWheel(canvas) {
    const ctx = canvas.getContext('2d');
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = cx - 10;
    const segAngle = (2 * Math.PI) / WHEEL_SEGMENTS.length;

    WHEEL_SEGMENTS.forEach((seg, i) => {
      const startAngle = i * segAngle;
      const endAngle = startAngle + segAngle;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(startAngle + segAngle / 2);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(seg.label, r * 0.6, 4);
      ctx.restore();
    });

    // Center circle
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, 2 * Math.PI);
    ctx.fillStyle = '#1A1A2E';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  /** Render a reward card with confetti */
  function renderReward(title, subtitle) {
    const card = document.createElement('div');
    card.className = 'graviq-reward-card';

    card.innerHTML = `
      <div class="graviq-reward-confetti"></div>
      <div class="graviq-reward-icon">🎁</div>
      <div class="graviq-reward-title">${escapeHtml(title)}</div>
      ${subtitle ? `<div class="graviq-reward-subtitle">${escapeHtml(subtitle)}</div>` : ''}
    `;

    messagesEl.appendChild(card);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    // Trigger confetti animation
    setTimeout(() => card.classList.add('revealed'), 100);
  }

  /** Escape HTML to prevent XSS */
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
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
