/* ApnaQuran assistant: text fallback plus real-time Gemini Live voice. */
(function () {
  'use strict';
  if (document.getElementById('aqAssistantPanel')) return;
  const root = document.createElement('div');
  root.innerHTML = `
    <button class="aq-assistant-launch" id="aqAssistantLaunch" type="button" aria-controls="aqAssistantPanel" aria-expanded="true"><span class="aq-orb" aria-hidden="true"></span><span>Talk to ApnaQuran</span></button>
    <section class="aq-assistant-panel" id="aqAssistantPanel" role="dialog" aria-label="ApnaQuran talking assistant">
      <header class="aq-assistant-head"><div class="aq-assistant-mark" aria-hidden="true">۞</div><div class="aq-assistant-heading"><strong>ApnaQuran Assistant</strong><small>Live voice &amp; text assistant</small></div><button class="aq-assistant-iconbtn" id="aqAssistantClose" type="button" aria-label="Minimize assistant">−</button></header>
      <div class="aq-assistant-messages" id="aqAssistantMessages" aria-live="polite"><div class="aq-assistant-bubble">Welcome to ApnaQuran! How can I help you today?</div></div>
      <div class="aq-assistant-note">AI-generated answers may need verification. For exact Quran quotations or religious rulings, consult trusted sources or a qualified scholar.</div>
      <div class="aq-assistant-controls"><button class="aq-assistant-action" id="aqAssistantMic" type="button" aria-label="Start live voice conversation" title="Start live voice conversation">🎙</button><input class="aq-assistant-input" id="aqAssistantInput" type="text" maxlength="500" placeholder="Ask in English or Urdu…" aria-label="Type your message"><button class="aq-assistant-action" id="aqAssistantSend" type="button">Send</button></div>
      <div class="aq-assistant-status" id="aqAssistantStatus" role="status">Tap 🎙 for a live voice conversation, or type a question.</div>
    </section>`;
  document.body.appendChild(root);
  const panel = document.getElementById('aqAssistantPanel'), launch = document.getElementById('aqAssistantLaunch');
  const close = document.getElementById('aqAssistantClose'), mic = document.getElementById('aqAssistantMic');
  const input = document.getElementById('aqAssistantInput'), send = document.getElementById('aqAssistantSend');
  const messages = document.getElementById('aqAssistantMessages'), status = document.getElementById('aqAssistantStatus');
  const API_URL = 'https://yayljmqelmsmcsuhxqdj.supabase.co/functions/v1/apnaquran-assistant';
  const LIVE_TOKEN_URL = 'https://yayljmqelmsmcsuhxqdj.supabase.co/functions/v1/apnaquran-live-token';
  const SUPABASE_PUBLIC_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlheWxqbXFlbG1zY3N1aHhxZGoiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc4Mzc4NTI5MywiZXhwIjoyMDk5MzYxMjkzfQ.XITDKls3bKtsXVssJuGQvy8iE4gwl2VtDF1F3dbrDcs';
  const SYSTEM_INSTRUCTION = 'You are the voice assistant for ApnaQuran.com. Be respectful, warm, concise, and clear. Help visitors navigate this website and discuss general Islamic learning carefully. Never invent Quran verses, surah/ayah references, hadith wording, citations, or scholarly rulings. If you cannot verify a religious claim, say so and direct the visitor to the Quran reader on ApnaQuran.com or a qualified scholar. Do not claim to be a scholar. Speak in the language the visitor uses when possible.';
  const history = [];
  let busy = false, liveSocket = null, liveStream = null, audioContext = null, processor = null, source = null, muteNode = null;
  let playbackCursor = 0, liveActive = false, assistantTurn = '';
  function setOpen(open, focusInput) { panel.hidden = !open; launch.hidden = open; launch.setAttribute('aria-expanded', String(open)); if (open && focusInput) input.focus({ preventScroll: true }); }
  function addBubble(text, isUser) {
    if (!text || !text.trim()) return null;
    const bubble = document.createElement('div'); bubble.className = 'aq-assistant-bubble' + (isUser ? ' aq-user' : '');
    bubble.textContent = text.trim(); messages.appendChild(bubble); messages.scrollTop = messages.scrollHeight; return bubble;
  }
  function base64ToBytes(value) { const binary = atob(value), bytes = new Uint8Array(binary.length); for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i); return bytes; }
  function bytesToBase64(bytes) { let binary = ''; for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(binary); }
  function downsampleTo16k(float32, inputRate) {
    const ratio = inputRate / 16000, length = Math.floor(float32.length / ratio), out = new Int16Array(length);
    for (let i = 0; i < length; i++) { const start = Math.floor(i * ratio), end = Math.min(Math.floor((i + 1) * ratio), float32.length); let sum = 0; for (let j = start; j < end; j++) sum += float32[j]; const sample = end > start ? sum / (end - start) : 0; out[i] = Math.max(-1, Math.min(1, sample)) * 32767; }
    return out;
  }
  function playPcm24k(base64) {
    if (!audioContext) return;
    const bytes = base64ToBytes(base64), pcm = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
    const buffer = audioContext.createBuffer(1, pcm.length, 24000), channel = buffer.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) channel[i] = pcm[i] / 32768;
    const node = audioContext.createBufferSource(); node.buffer = buffer; node.connect(audioContext.destination);
    playbackCursor = Math.max(playbackCursor, audioContext.currentTime + 0.03); node.start(playbackCursor); playbackCursor += buffer.duration;
  }
  function stopLive(showStatus) {
    liveActive = false;
    if (processor) { processor.onaudioprocess = null; try { processor.disconnect(); } catch (_) {} processor = null; }
    if (source) { try { source.disconnect(); } catch (_) {} source = null; }
    if (muteNode) { try { muteNode.disconnect(); } catch (_) {} muteNode = null; }
    if (liveStream) { liveStream.getTracks().forEach(track => track.stop()); liveStream = null; }
    if (liveSocket) { try { liveSocket.close(); } catch (_) {} liveSocket = null; }
    if (audioContext) { try { audioContext.close(); } catch (_) {} audioContext = null; }
    playbackCursor = 0; mic.textContent = '🎙'; mic.setAttribute('aria-label', 'Start live voice conversation');
    send.disabled = false; input.disabled = false; mic.disabled = false;
    if (showStatus) status.textContent = 'Voice session stopped. Tap 🎙 to start again.';
  }
  async function startLive() {
    if (liveActive) { stopLive(true); return; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.WebSocket) { status.textContent = 'Live microphone access is unavailable here. Please use HTTPS/Chrome or type your question.'; return; }
    liveActive = true; mic.disabled = true; send.disabled = true; input.disabled = true; status.textContent = 'Preparing secure voice session…';
    try {
      const tokenResponse = await fetch(LIVE_TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_PUBLIC_KEY, 'Authorization': 'Bearer ' + SUPABASE_PUBLIC_KEY }, body: '{}' });
      const tokenData = await tokenResponse.json().catch(() => ({}));
      if (!tokenResponse.ok || !tokenData.token) throw new Error(tokenData.details || tokenData.error || 'Could not prepare the live voice session.');
      liveStream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      audioContext = new (window.AudioContext || window.webkitAudioContext)(); await audioContext.resume();
      liveSocket = new WebSocket('wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=' + encodeURIComponent(tokenData.token));
      liveSocket.onopen = function () {
        if (!liveActive) return;
        liveSocket.send(JSON.stringify({ setup: { model: tokenData.model || 'models/gemini-3.8-live-extended-thinking', generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } }, thinkingConfig: { thinkingLevel: 'LOW' } }, inputAudioTranscription: {}, outputAudioTranscription: {}, systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] } } }));
        status.textContent = 'Connecting microphone…';
      };
      liveSocket.onmessage = function (event) {
        let data; try { data = JSON.parse(event.data); } catch (_) { return; }
        if (data.error) { status.textContent = data.error.message || 'Live voice API returned an error.'; return; }
        if (data.setupComplete) {
          source = audioContext.createMediaStreamSource(liveStream); processor = audioContext.createScriptProcessor(4096, 1, 1);
          processor.onaudioprocess = function (audioEvent) {
            if (!liveActive || !liveSocket || liveSocket.readyState !== WebSocket.OPEN) return;
            const pcm = downsampleTo16k(audioEvent.inputBuffer.getChannelData(0), audioContext.sampleRate);
            if (pcm.length) liveSocket.send(JSON.stringify({ realtimeInput: { audio: { mimeType: 'audio/pcm;rate=16000', data: bytesToBase64(new Uint8Array(pcm.buffer)) } } }));
          };
          muteNode = audioContext.createGain(); muteNode.gain.value = 0; source.connect(processor); processor.connect(muteNode); muteNode.connect(audioContext.destination); mic.disabled = false; mic.textContent = '■'; mic.setAttribute('aria-label', 'Stop live voice conversation');
          status.textContent = 'Listening now. Speak naturally; tap ■ to stop.';
        }
        const server = data.serverContent || data;
        if (server.inputTranscription && server.inputTranscription.text) addBubble('You: ' + server.inputTranscription.text, true);
        if (server.outputTranscription && server.outputTranscription.text) assistantTurn += server.outputTranscription.text;
        const parts = server.modelTurn && server.modelTurn.parts;
        if (Array.isArray(parts)) parts.forEach(function (part) {
          const inline = part.inlineData || part.inline_data;
          if (inline && inline.data && String(inline.mimeType || inline.mime_type || '').startsWith('audio/pcm')) playPcm24k(inline.data);
          if (part.text) assistantTurn += part.text;
        });
        if (server.interrupted) { playbackCursor = audioContext ? audioContext.currentTime : 0; assistantTurn = ''; }
        if (server.turnComplete && (!server.interactionStatus || server.interactionStatus === 'IDLE')) { if (assistantTurn.trim()) addBubble(assistantTurn, false); assistantTurn = ''; status.textContent = 'Listening… speak whenever you are ready.'; }
      };
      liveSocket.onerror = function () { status.textContent = 'Live voice connection failed. You can stop voice and type instead.'; };
      liveSocket.onclose = function (event) { if (liveActive) { stopLive(false); status.textContent = event.code === 1000 ? 'Voice session ended.' : 'Live voice disconnected (' + event.code + '). Check model access/quota, then try again.'; } };
    } catch (error) { stopLive(false); status.textContent = error instanceof Error ? error.message : 'Could not start the microphone. Check permission and try again.'; }
    finally { if (!liveActive) mic.disabled = false; }
  }
  async function sendMessage() {
    const value = input.value.trim(); if (!value || busy || liveActive) return;
    addBubble(value, true); input.value = ''; busy = true; send.disabled = true; mic.disabled = true; input.disabled = true; status.textContent = 'Thinking…';
    try {
      const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_PUBLIC_KEY, 'Authorization': 'Bearer ' + SUPABASE_PUBLIC_KEY }, body: JSON.stringify({ message: value, history: history.slice(-6) }) });
      const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || 'The assistant is temporarily unavailable.');
      if (typeof data.reply !== 'string' || !data.reply.trim()) throw new Error('I could not prepare an answer just now. Please try again.');
      const answer = data.reply.trim(); addBubble(answer, false); history.push({ role: 'user', text: value }, { role: 'model', text: answer }); if (history.length > 8) history.splice(0, history.length - 8);
      status.textContent = 'Answer ready.';
      if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(answer); utterance.lang = /[\u0600-\u06FF]/.test(answer) ? 'ur-PK' : 'en-US'; utterance.rate = 0.94; window.speechSynthesis.speak(utterance); }
    } catch (error) { addBubble(error instanceof Error ? error.message : 'Connection failed. Please try again.', false); status.textContent = 'Could not reach the text assistant. Please try again.'; }
    finally { busy = false; send.disabled = false; mic.disabled = false; input.disabled = false; input.focus({ preventScroll: true }); }
  }
  launch.addEventListener('click', function () { setOpen(true, true); });
  close.addEventListener('click', function () { if (liveActive) stopLive(true); setOpen(false); });
  send.addEventListener('click', sendMessage); input.addEventListener('keydown', function (event) { if (event.key === 'Enter') sendMessage(); }); mic.addEventListener('click', startLive);
  setOpen(true);
})();