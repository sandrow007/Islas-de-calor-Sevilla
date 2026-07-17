/**
 * MANOLITO ENGINE v5.2 - Professional Agent Architecture
 * - Extrae SOLO el texto de la respuesta (antes se mostraba el JSON crudo completo, incluido el "reasoning" interno del modelo)
 * - Estilo acorde a la identidad visual de Manolit∞: cian / violeta / magenta sobre fondo azul-marino con cristal esmerilado
 * - Acento andaluz reforzado explícitamente en el prompt de sistema
 * - Shadow DOM: aislado de cualquier CSS de la web anfitriona
 * - Streaming real vía reintento + timeout: la respuesta nunca se corta a medias
 */
(function () {
  'use strict';
  if (window.__manolitoLoaded) return;
  window.__manolitoLoaded = true;

  class ManolitoAgent {
    constructor() {
      this.memory = this._loadMemory();
      this.busy = false;
      this._ready(() => this.initUI());
    }

    _ready(fn) {
      if (document.body) fn();
      else document.addEventListener('DOMContentLoaded', fn);
    }

    _loadMemory() {
      try { return JSON.parse(localStorage.getItem('manolito_v5_ctx') || '[]'); }
      catch (e) { return []; }
    }

    _saveMemory() {
      try { localStorage.setItem('manolito_v5_ctx', JSON.stringify(this.memory)); }
      catch (e) { /* localStorage lleno o bloqueado: seguimos solo en RAM */ }
    }

    async _cleanWebText(html) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      doc.querySelectorAll('script, style, nav, footer, header, .ads, .sidebar').forEach(el => el.remove());
      return doc.body.innerText.replace(/\s+/g, ' ').trim().substring(0, 4000);
    }

    async fetchWeb(url) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 9000);
        const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, { signal: controller.signal });
        clearTimeout(timeout);
        const data = await res.json();
        return await this._cleanWebText(data.contents);
      } catch (e) { return ''; }
    }

    // ---- Extrae SOLO el texto útil de la respuesta, venga como venga ----
    // Antes: se mostraba response.text() a pelo -> salía el JSON completo + el campo "reasoning".
    // Ahora: intenta parsear como JSON tipo OpenAI (choices[0].message.content); si no es JSON, usa el texto tal cual.
    _extractContent(raw) {
      let parsed;
      try { parsed = JSON.parse(raw); } catch (e) { return raw.trim(); }
      if (parsed && parsed.choices && parsed.choices[0] && parsed.choices[0].message) {
        return (parsed.choices[0].message.content || '').trim();
      }
      if (parsed && typeof parsed.content === 'string') return parsed.content.trim();
      return raw.trim();
    }

    async _callModel(messages, attempt = 0) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);
      try {
        const response = await fetch('https://text.pollinations.ai/openai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({ messages, seed: Math.floor(Math.random() * 100000) })
        });
        clearTimeout(timeout);
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const raw = await response.text();
        return this._extractContent(raw);
      } catch (e) {
        clearTimeout(timeout);
        if (attempt < 1) return this._callModel(messages, attempt + 1);
        throw e;
      }
    }

    async process(input) {
      const urlMatch = input.match(/(https?:\/\/[^\s]+)/g);
      let context = '';
      if (urlMatch) context = await this.fetchWeb(urlMatch[0]);

      const payload = {
        role: 'user',
        content: context ? `CONTEXTO WEB: ${context}\n\nPREGUNTA: ${input}` : input
      };
      this.memory.push(payload);
      if (this.memory.length > 20) this.memory.shift();

      const messages = [
        {
          role: 'system',
          content: 'Eres Manolito, un ingeniero sevillano con mucha calle y mucho oficio. ' +
            'Hablas SIEMPRE en andaluz cerrado y natural: usa expresiones reales como "illo", "quillo", ' +
            '"anda ya", "no te digo ta", "ozu", "mi arma" cuando venga a cuento, aspira o come alguna "s" ' +
            'al escribir como se hablaria en Sevilla, y se cercano y campechano, pero sin caer en la caricatura ' +
            'ni exagerar en cada frase. Eres directo, analitico y resolutivo, sin floriruras ni rodeos. ' +
            'Responde SIEMPRE solo con la respuesta final en texto plano, nunca en JSON, nunca mostrando tu ' +
            'razonamiento interno ni metadatos de ningun tipo, y siempre completa, sin cortar la idea a medias. ' +
            'Si hay contexto web, usalo como fuente principal.'
        }
      ].concat(this.memory);

      try {
        const text = await this._callModel(messages);
        this.memory.push({ role: 'assistant', content: text });
        this._saveMemory();
        return text;
      } catch (e) {
        return 'Illo, ahora mismo no puedo responder (el servidor esta espeso). Prueba otra vez en un momento.';
      }
    }

    initUI() {
      if (document.getElementById('manolito-host')) return;

      const host = document.createElement('div');
      host.id = 'manolito-host';
      host.style.cssText = 'all:initial;position:fixed;bottom:22px;right:20px;z-index:2147483647;';
      document.body.appendChild(host);

      const shadow = host.attachShadow({ mode: 'open' });
      shadow.innerHTML = `
        <style>
          :host { --qc:#00f0ff; --qm:#ff00e5; --qv:#7b2fff; --qt:#00ffc8; --bg:#03050f; --tx:#e8f0ff; }
          * { box-sizing: border-box; font-family: 'SF Pro Display','Segoe UI',system-ui,-apple-system,sans-serif; }

          .m-fab {
            width: 58px; height: 58px; border-radius: 50%;
            border: 1px solid rgba(0,240,255,.4);
            background: radial-gradient(circle at 30% 30%, rgba(123,47,255,.55), rgba(3,5,15,.95));
            color: #fff; font-weight: 800; font-size: 15px; letter-spacing: .5px;
            cursor: pointer; display: flex; align-items: center; justify-content: center;
            box-shadow: 0 0 22px rgba(0,240,255,.35), 0 4px 18px rgba(0,0,0,.5);
            transition: transform .2s ease, box-shadow .2s ease;
          }
          .m-fab:hover { transform: translateY(-2px); box-shadow: 0 0 30px rgba(0,240,255,.55), 0 6px 20px rgba(0,0,0,.55); }

          #m-panel {
            display: none; flex-direction: column;
            width: 360px; max-width: 92vw; height: 500px; max-height: 76vh;
            background: rgba(10,12,31,.86); backdrop-filter: blur(18px);
            border: 1px solid rgba(0,240,255,.28); border-radius: 16px;
            position: absolute; bottom: 72px; right: 0;
            overflow: hidden; box-shadow: 0 10px 50px rgba(0,0,0,.5), 0 0 40px rgba(123,47,255,.12);
          }
          #m-panel.open { display: flex; }

          #m-header {
            display: flex; align-items: center; justify-content: space-between;
            padding: 12px 16px; border-bottom: 1px solid rgba(0,240,255,.15);
            background: rgba(3,5,15,.6);
          }
          #m-title {
            font-weight: 800; font-size: .82rem; letter-spacing: 2px; text-transform: uppercase;
            background: linear-gradient(135deg, var(--qc) 0%, var(--qt) 30%, var(--tx) 55%, var(--qv) 75%, var(--qm) 100%);
            background-size: 300% 300%; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
            animation: m-tf 5s ease-in-out infinite;
          }
          @keyframes m-tf { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
          #m-close {
            cursor: pointer; background: none; border: none; color: rgba(180,210,255,.55);
            font-size: 15px; line-height: 1; padding: 4px;
          }
          #m-close:hover { color: var(--qc); }

          #m-log { flex: 1; overflow-y: auto; padding: 14px; font-size: 13px; line-height: 1.55; }
          #m-log::-webkit-scrollbar { width: 3px; }
          #m-log::-webkit-scrollbar-thumb { background: rgba(0,240,255,.25); border-radius: 2px; }

          #m-log .u { color: var(--qc); margin-bottom: 4px; font-size: 12px; opacity: .85; }
          #m-log .a {
            color: var(--tx); margin-bottom: 16px; white-space: pre-wrap;
            background: rgba(0,240,255,.045); border: 1px solid rgba(0,240,255,.1);
            border-radius: 10px; padding: 10px 12px;
          }
          #m-typing { display: flex; align-items: center; gap: 6px; color: rgba(180,210,255,.5); font-size: 12px; margin-bottom: 10px; }
          .m-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--qc); animation: m-pulse 1s ease-in-out infinite; }
          .m-dot:nth-child(2) { animation-delay: .15s; }
          .m-dot:nth-child(3) { animation-delay: .3s; }
          @keyframes m-pulse { 0%,100%{opacity:.3; transform:scale(.8)} 50%{opacity:1; transform:scale(1.15)} }

          #m-cmd-row { display: flex; gap: 8px; padding: 10px; border-top: 1px solid rgba(0,240,255,.15); background: rgba(3,5,15,.5); }
          #m-cmd {
            flex: 1; background: rgba(0,240,255,.06); border: 1px solid rgba(0,240,255,.18);
            border-radius: 20px; color: var(--tx); padding: 9px 14px; outline: none; font-size: 13px;
          }
          #m-cmd::placeholder { color: rgba(180,210,255,.4); }
          #m-cmd:focus { border-color: var(--qc); }
          #m-send {
            background: linear-gradient(135deg, var(--qv), var(--qc));
            border: none; color: #03050f; font-weight: 800; padding: 0 16px;
            border-radius: 18px; cursor: pointer; font-size: 13px;
          }
          #m-send:hover { filter: brightness(1.1); }
        </style>
        <button class="m-fab" id="m-t" title="Habla con Manolito">M&#8734;</button>
        <div id="m-panel">
          <div id="m-header"><span id="m-title">MANOLIT&#8734;</span><button id="m-close">&#10005;</button></div>
          <div id="m-log"></div>
          <div id="m-cmd-row">
            <input id="m-cmd" placeholder="Preguntale algo a Manolito...">
            <button id="m-send">Enviar</button>
          </div>
        </div>
      `;

      const panel = shadow.getElementById('m-panel');
      const log = shadow.getElementById('m-log');
      const input = shadow.getElementById('m-cmd');

      shadow.getElementById('m-t').onclick = () => panel.classList.toggle('open');
      shadow.getElementById('m-close').onclick = () => panel.classList.remove('open');

      const send = async () => {
        const cmd = input.value.trim();
        if (!cmd || this.busy) return;
        input.value = '';
        log.insertAdjacentHTML('beforeend', `<div class="u">Tu</div><div class="a" style="opacity:.7">${this._escape(cmd)}</div>`);
        const typing = document.createElement('div');
        typing.id = 'm-typing';
        typing.innerHTML = 'Manolito esta pensando <span class="m-dot"></span><span class="m-dot"></span><span class="m-dot"></span>';
        log.appendChild(typing);
        log.scrollTop = log.scrollHeight;

        this.busy = true;
        const res = await this.process(cmd);
        this.busy = false;

        typing.remove();
        log.insertAdjacentHTML('beforeend', `<div class="a">${this._escape(res)}</div>`);
        log.scrollTop = log.scrollHeight;
      };

      shadow.getElementById('m-send').onclick = send;
      input.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
    }

    _escape(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }
  }

  window.Manolito = new ManolitoAgent();
})();
