/* ApnaQuran talking assistant. Gemini requests use a Supabase Edge Function. */
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
        <div class="aq-assistant-heading"><strong>ApnaQuran Assistant</strong><small>Voice &amp; text assistant</small></div>
        <button class="aq-assistant-iconbtn" id="aqAssistantClose" type="button" aria-label="Minimize assistant">−</button>
      </header>
      <div class="aq-assistant-messages" id="aqAssistantMessages" aria-live="polite">
        <div class="aq-assistant-bubble">Welcome to ApnaQuran! How can I help you today?</div>
      </div>
      <div class="aq-assistant-note">AI-generated answers may need verification. For exact Quran quotations or religious rulings, consult trusted sources or a qualified scholar.</div>
      <div class="aq-assistant-language"><label for="aqAssistantLanguage">Language / زبان</label><select id="aqAssistantLanguage" aria-label="Choose assistant language"><option value="auto">Auto detect / خودکار</option><option value="en">English</option><option value="ur">اردو (Urdu)</option></select></div>
      <div class="aq-assistant-controls">
        <button class="aq-assistant-action" id="aqAssistantMic" type="button" aria-label="Speak your message" title="Speak your message">🎙</button>
        <input class="aq-assistant-input" id="aqAssistantInput" type="text" maxlength="500" placeholder="Ask in English or Urdu…" aria-label="Type your message">
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
  const language = document.getElementById('aqAssistantLanguage');
  const speech = window.speechSynthesis;
  const API_URL = 'https://yayljmqelmsmcsuhxqdj.supabase.co/functions/v1/apnaquran-assistant';
  const SUPABASE_PUBLIC_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlheWxqbXFlbG1zbWNzdWh4cWRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3ODUyOTMsImV4cCI6MjA5OTM2MTI5M30.XITDKls3bKtsXVssJuGQvy8iE4gwl2VtDF1F3dbrDcs';
  const history = [];
  let busy = false;
  function detectReplyLanguage(text) {
    // Urdu script is the strongest signal, including Urdu typed with a keyboard.
    if (/[\u0600-\u06FF]/.test(text)) return 'ur';

    // Require multiple Roman Urdu markers so English questions about Quran or namaz
    // do not automatically switch to Urdu.
    const normalized = text.toLowerCase().replace(/[^a-z\s']/g, ' ').replace(/\s+/g, ' ').trim();
    const markers = [
      'kya', 'kaise', 'kaisay', 'kyun', 'mujhe', 'mujhay', 'aap', 'apka',
      'hai', 'hain', 'hoon', 'hun', 'tha', 'thi', 'the', 'batao', 'batayein',
      'samjhao', 'samjhayen', 'mein', 'main', 'mera', 'meri', 'mere',
      'nahi', 'nahin', 'karo', 'karein', 'ka', 'ki', 'ke', 'ko', 'se',
      'aur', 'lekin', 'shukriya', 'assalam', 'alaikum', 'parha', 'parhne'
    ];
    const words = new Set(normalized.split(' ').filter(Boolean));
    const markerCount = markers.reduce((count, word) => count + (words.has(word) ? 1 : 0), 0);
    const strongPhrase = /\b(kya hai|kaise karun|kaise karoon|mujhe batao|mujhe samjhao|aap bataein|iska matlab|is ka matlab|kya matlab)\b/.test(normalized);
    return markerCount >= 2 || strongPhrase ? 'ur' : 'en';
  }
  function speak(text, lang) {
    if (!('speechSynthesis' in window)) return false;
    try {
      speech.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const isUrdu = lang === 'ur' || /[\u0600-\u06FF]/.test(text);
      const requested = isUrdu ? 'ur-PK' : 'en-US';
      const voices = speech.getVoices();
      const voice = voices.find(v => isUrdu
        ? /^ur(-|$)/i.test(v.lang) || /urdu/i.test(v.name)
        : /^en(-|$)/i.test(v.lang));
      // Do not silently read Urdu text with an English voice; that sounds incorrect.
      if (isUrdu && !voice) return false;
      utterance.lang = requested;
      utterance.rate = 0.88;
      if (voice) utterance.voice = voice;
      speech.speak(utterance);
      return true;
    } catch (_) { return false; }
  }
  function setOpen(open, focusInput) {
    panel.hidden = !open;
    launch.hidden = open;
    launch.setAttribute('aria-expanded', String(open));
    if (open && focusInput) input.focus({ preventScroll: true });
  }
  function addBubble(text, isUser) {
    const bubble = document.createElement('div');
    const hasUrduScript = /[\u0600-\u06FF]/.test(text);
    bubble.className = 'aq-assistant-bubble' + (isUser ? ' aq-user' : '');
    bubble.lang = hasUrduScript ? 'ur' : 'en';
    bubble.dir = hasUrduScript ? 'rtl' : 'auto';
    bubble.style.textAlign = hasUrduScript ? 'right' : 'left';
    bubble.style.unicodeBidi = 'plaintext';
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
  async function sendMessage() {
    const value = input.value.trim();
    if (!value || busy) return;
    addBubble(value, true);
    input.value = '';
    busy = true;
    send.disabled = true;
    mic.disabled = true;
    input.disabled = true;
    const replyLanguage = language.value === 'en' ? 'en' : language.value === 'ur' ? 'ur' : detectReplyLanguage(value);
    status.textContent = 'Thinking…';
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_PUBLIC_KEY,
          'Authorization': 'Bearer ' + SUPABASE_PUBLIC_KEY
        },
        body: JSON.stringify({ message: value, language: replyLanguage, history: history.slice(-6) })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'The assistant is temporarily unavailable.');
      if (typeof data.reply !== 'string' || !data.reply.trim()) throw new Error('I could not prepare an answer just now. Please try again.');
      const answer = data.reply.trim();
      addBubble(answer, false);
      history.push({ role: 'user', text: value }, { role: 'model', text: answer });
      if (history.length > 8) history.splice(0, history.length - 8);
      if (replyLanguage === 'ur') {
        status.textContent = speak(answer, replyLanguage)
          ? 'جواب تیار ہے · اردو آواز چل رہی ہے'
          : 'جواب اردو میں تیار ہے، لیکن اس براؤزر میں اردو آواز دستیاب نہیں۔ اردو آواز کے بغیر انگریزی آواز نہیں چلائی گئی۔';
      } else {
        status.textContent = speak(answer, replyLanguage)
          ? 'Answer ready · speaking'
          : 'Answer ready · speech playback is unavailable in this browser.';
      }
    } catch (error) {
      addBubble(error instanceof Error ? error.message : 'Connection failed. Please try again.', false);
      status.textContent = 'Could not reach the assistant. Please try again.';
    } finally {
      busy = false;
      send.disabled = false;
      mic.disabled = false;
      input.disabled = false;
      input.focus({ preventScroll: true });
    }
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
    // SpeechRecognition requires one locale. In Auto mode, use English for dictation;
    // users can select Urdu when speaking Urdu, and the transcript is then language-detected.
    recognition.lang = language.value === 'ur' ? 'ur-PK' : 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    mic.disabled = true;
    status.textContent = 'Listening… speak now.';
    recognition.onresult = function (event) {
      input.value = event.results[0][0].transcript;
      status.textContent = 'Voice captured. Sending your question…';
      sendMessage();
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