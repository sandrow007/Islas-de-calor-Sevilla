/**
 * MANOLITO ENGINE v5.2 - Professional Agent Architecture (Fixed JSON Parse)
 * - Auto-instancia al cargar
 * - Shadow DOM: aislado de cualquier CSS de la web anfitriona
 * - Streaming y reintento automático blindado
 * - Parseo correcto de la respuesta JSON para extraer el texto puro
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
      try {
        return JSON.parse(localStorage.getItem('manolito_v5_ctx') || '[]');
      } catch (e) {
        return [];
      }
    }

    _saveMemory() {
      try {
        localStorage.setItem('manolito_v5_ctx', JSON.stringify(this.memory));
      } catch (e) {
        // localStorage lleno o bloqueado
      }
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
      } catch (e) {
        return '';
      }
    }

    // EL ARREGLO ESTÁ AQUÍ: URL correcta y desempaquetado de JSON
    async _callModel(messages, attempt = 0) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 40000);
      try {
        const response = await fetch('https://text.pollinations.ai/openai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({ 
            messages, 
            model: 'openai',
            seed: Math.floor(Math.random() * 100000) 
          })
        });
        clearTimeout(timeout);
        if (!response.ok) throw new Error('HTTP ' + response.status);
        
        // Convertimos el JSON a objeto y extraemos solo la respuesta humana
        const data = await response.json();
        return data.choices[0].message.content;
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
        content: context
          ? `CONTEXTO WEB: ${context}\n\nPREGUNTA: ${input}`
          : input
      };
      this.memory.push(payload);
      if (this.memory.length > 20) this.memory.shift();

      const messages = [
        { role: 'system', content: 'Eres Manolito, ingeniero experto. Directo, analítico, andaluz, sin florituras. Si hay contexto web, úsalo como fuente primaria. Responde siempre completo, sin cortar la idea a medias.' }
      ].concat(this.memory);

      try {
        const text = await this._callModel(messages);
        this.memory.push({ role: 'assistant', content: text });
        this._saveMemory();
        return text;
      } catch (e) {
        return 'Manolito no ha podido responder ahora mismo (servidor ocupado o sin conexión). Prueba otra vez en unos segundos.';
      }
    }

    initUI() {
      if (document.getElementById('manolito-host')) return;

      const host = document.createElement('div');
      host.id = 'manolito-host';
      host.style.cssText = 'all:initial;position:fixed;bottom:20px;right:20px;z-index:2147483647;';
      document.body.appendChild(host);

      const shadow = host.attachShadow({ mode: 'open' });
      shadow.innerHTML = `
        <style>
          * { box-sizing: border-box; }
          .m-fab {
            width: 58px; height: 58px; border-radius: 50%;
            background: #000; border: 2px solid #0f0; color: #0f0;
            font-family: monospace; font-weight: 700; font-size: 20px;
            cursor: pointer; box-shadow: 0 4px 18px rgba(0,0,0,.4);
          }
          .m-fab:hover { background: #0f0; color: #000; }
          #m-panel {
            display: none; flex-direction: column;
            width: 350px; max-width: 90vw; height: 500px; max-height: 75vh;
            background: #05070a; border: 2px solid #0f0; border-radius: 10px;
            position: absolute; bottom: 70px; right: 0;
            overflow: hidden; font-family: 'Courier New', monospace;
          }
          #m-panel.open { display: flex; }
          #m-header {
            display: flex; align-items: center; justify-content: space-between;
            padding: 8px 12px; background: #0a0d10; color: #0f0;
            font-size: 13px; letter-spacing: 1px; border-bottom: 1px solid #0f0;
          }
          #m-close { cursor: pointer; color: #0f0; background: none; border: none; font-size: 16px; }
          #m-log { flex: 1; overflow-y: auto; padding: 10px; color: #eee; font-size: 12.5px; line-height: 1.5; }
          #m-log .u { color: #7fb3ff; margin-bottom: 6px; }
          #m-log .a { color: #d8ffd8; margin-bottom: 14px; white-space: pre-wrap; }
          #m-cmd-row { display: flex; border-top: 1px solid #0f0; }
          #m-cmd { flex: 1; background: #111; border: none; color: #0f0; padding: 10px; outline: none; font-family: monospace; }
          #m-send { background: #0f0; border: none; color: #000; font-weight: 700; padding: 0 14px; cursor: pointer; }
          #m-typing { color: #888; font-style: italic; font-size: 12px; }
        </style>
        <button class="m-fab" id="m-t" title="Hablar con Manolito">M</button>
        <div id="m-panel">
          <div id="m-header"><span>MANOLITO</span><button id="m-close">✕</button></div>
          <div id="m-log"></div>
          <div id="m-cmd-row">
            <input id="m-cmd" placeholder="Escribe o pega una URL...">
            <button id="m-send">▶</button>
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
        log.insertAdjacentHTML('beforeend', `<div class="u">&gt; ${this._escape(cmd)}</div>`);
        const typing = document.createElement('div');
        typing.id = 'm-typing';
        typing.textContent = 'Manolito está procesando...';
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
