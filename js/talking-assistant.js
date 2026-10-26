/* ApnaQuran talking assistant prototype.
   This stage provides the welcome, browser speech and text UI only.
   A trusted AI answer service is not connected yet; no Quran answers are fabricated. */
(function () {
  'use strict';
  if (document.getElementById('aqAssistantPanel')) return;
  const root = document.createElement('div');
  root.innerHTML = `
    <button class="aq-assistant-launch" id="aqAssistantLaunch" type="button" aria-controls="aqAssistantPanel" aria-expanded="true">
      <span class="aq-orb" aria-hidden="true"></span><span>Talk to ApnaQuran</span>
    </button>
    <section class="aq-assistant-panel" id="aqAssistantPanel" role="dialog" aria-label="ApnaQuran talking assistant">
      <header class="aq-assistant-head">
        <div class="aq-assistant-mark" aria-hidden="true">۞</div>
        <div class="aq-assistant-heading"><strong>ApnaQuran Assistant</strong><small>Voice &amp; text preview</small></div>
        <button class="aq-assistant-iconbtn" id="aqAssistantClose" type="button" aria-label="Minimize assistant">−</button>
      </header>
      <div class="aq-assistant-messages" id="aqAssistantMessages" aria-live="polite">
        <div class="aq-assistant-bubble">Welcome to ApnaQuran! How can I help you today?</div>
      </div>
      <div class="aq-assistant-note">This is the first interface preview. AI-powered answers will be connected in the next step. Please verify religious guidance with trusted sources.</div>
      <div class="aq-assistant-controls">
        <button class="aq-assistant-action" id="aqAssistantMic" type="button" aria-label="Speak your message" title="Speak your message">🎙</button>
        <input class="aq-assistant-input" id="aqAssistantInput" type="text" maxlength="500" placeholder="Type your message…" aria-label="Type your message">
        <button class="aq-assistant-action" id="aqAssistantSend" type="button">Send</button>
      </div>
      <div class="aq-assistant-status" id="aqAssistantStatus" role="status">Tap the microphone to try voice input.</div>
    </section>`;
  document.body.appendChild(root);
  const panel = document.getElementById('aqAssistantPanel');
  const launch = document.getElementById('aqAssistantLaunch');
  const close = document.getElementById('aqAssistantClose');
  const mic = document.getElementById('aqAssistantMic');
  const input = document.getElementById('aqAssistantInput');
  const send = document.getElementById('aqAssistantSend');
  const messages = document.getElementById('aqAssistantMessages');
  const status = document.getElementById('aqAssistantStatus');
  const speech = window.speechSynthesis;
  function setOpen(open, focusInput) {
    panel.hidden = !open;
    launch.hidden = open;
    launch.setAttribute('aria-expanded', String(open));
    if (open && focusInput) input.focus({ preventScroll: true });
  }
  function addBubble(text, isUser) {
    const bubble = document.createElement('div');
    bubble.className = 'aq-assistant-bubble' + (isUser ? ' aq-user' : '');
    bubble.textContent = text;
    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
  }
  function speakWelcome() {
    if (!('speechSynthesis' in window)) return;
    try {
      if (sessionStorage.getItem('aqWelcomeSpoken')) return;
      sessionStorage.setItem('aqWelcomeSpoken', '1');
    } catch (_) { /* Storage may be disabled; continue with best-effort greeting. */ }
    const utterance = new SpeechSynthesisUtterance('Welcome to ApnaQuran! How can I help you today?');
    utterance.lang = 'en-US';
    utterance.rate = 0.92;
    try { speech.speak(utterance); } catch (_) { /* Browsers may block autoplay speech. */ }
  }
  function sendMessage() {
    const value = input.value.trim();
    if (!value) return;
    addBubble(value, true);
    input.value = '';
    addBubble('Thank you for your question. The AI answer service is not connected in this preview yet, so I do not want to guess about Quranic verses or religious guidance.', false);
    status.textContent = 'Preview only — AI answers are not connected yet.';
  }
  launch.addEventListener('click', function () { setOpen(true, true); });
  close.addEventListener('click', function () { setOpen(false); });
  send.addEventListener('click', sendMessage);
  input.addEventListener('keydown', function (event) { if (event.key === 'Enter') sendMessage(); });
  mic.addEventListener('click', function () {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      status.textContent = 'Voice input is not supported in this browser. Please type your message.';
      return;
    }
    const recognition = new Recognition();
    recognition.lang = document.documentElement.lang === 'ur' ? 'ur-PK' : 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    mic.disabled = true;
    status.textContent = 'Listening… speak now.';
    recognition.onresult = function (event) {
      input.value = event.results[0][0].transcript;
      status.textContent = 'Voice captured. Press Send to continue.';
      input.focus();
    };
    recognition.onerror = function () { status.textContent = 'Could not hear you. Check microphone permission or type instead.'; };
    recognition.onend = function () { mic.disabled = false; };
    try { recognition.start(); } catch (_) { mic.disabled = false; status.textContent = 'Microphone could not start. Please try again or type instead.'; }
  });
  setOpen(true);
  // Autoplay is best-effort; browser policy may require the visitor to interact first.
  window.addEventListener('load', function () { window.setTimeout(speakWelcome, 450); }, { once: true });
})();