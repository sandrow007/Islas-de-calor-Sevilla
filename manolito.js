/**
 * MANOLITO ENGINE v5.6 (Canvas fix & Random Colors)
 */
(function () {
  'use strict';
  if (window.__manolitoLoaded) return;
  window.__manolitoLoaded = true;

  class ManolitoAgent {
    constructor() {
      this.memory = this._loadMemory();
      this.busy = false;
      this._ready(() => this._esperarFinDeIntro(() => this.initUI()));
    }

    _ready(fn) {
      if (document.body) fn();
      else document.addEventListener('DOMContentLoaded', fn);
    }

    _esperarFinDeIntro(callback) {
      const intro = document.getElementById('pi');
      if (!intro) { callback(); return; }
      const oculta = () => getComputedStyle(intro).display === 'none' || intro.offsetParent === null;
      if (oculta()) { callback(); return; }
      const obs = new MutationObserver(() => {
        if (oculta()) { obs.disconnect(); callback(); }
      });
      obs.observe(intro, { attributes: true, attributeFilter: ['style', 'class'] });
      setTimeout(() => { obs.disconnect(); if (!document.getElementById('manolito-host')) callback(); }, 25000);
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

    _getPageContext() {
      try {
        const clone = document.body.cloneNode(true);
        clone.querySelectorAll('#manolito-host, script, style, noscript').forEach(el => el.remove());
        const text = clone.innerText || clone.textContent || '';
        return text.replace(/\s+/g, ' ').trim().substring(0, 6000);
      } catch (e) { return ''; }
    }

    _extractContent(raw) {
      let parsed;
      try { parsed = JSON.parse(raw); } catch (e) { return raw.trim(); }
      if (parsed && parsed.choices && parsed.choices[0] && parsed.choices[0].message) {
        return (parsed.choices[0].message.content || '').trim();
      }
      if (parsed && typeof parsed.content === 'string') return parsed.content.trim();
      return raw.trim();
    }

    _pareceCortado(texto) {
      if (!texto) return false;
      const t = texto.trim();
      if (t.length < 2) return false;
      const ultimoChar = t.slice(-1);
      if (['.', '?', '!', '…', '"', ')'].includes(ultimoChar)) return false;
      return true;
    }

    async _viaPost(messages, msTimeout) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), msTimeout);
      try {
        const response = await fetch('https://text.pollinations.ai/openai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({ messages, seed: Math.floor(Math.random() * 100000), max_tokens: 1200 })
        });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const raw = await response.text();
        return this._extractContent(raw);
      } catch (e) {
        clearTimeout(timeoutId);
        throw e;
      }
    }

    async _viaGet(messages, msTimeout) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), msTimeout);
      try {
        const sistema = messages.find(m => m.role === 'system');
        const ultimoUsuario = [...messages].reverse().find(m => m.role === 'user');
        const promptPlano = `${sistema ? sistema.content.slice(0, 1500) : ''}\n\n${ultimoUsuario ? ultimoUsuario.content.slice(0, 2000) : ''}`;
        const url = `https://text.pollinations.ai/${encodeURIComponent(promptPlano)}?model=openai&seed=${Math.floor(Math.random() * 100000)}`;
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const raw = await response.text();
        return this._extractContent(raw);
      } catch (e) {
        clearTimeout(timeoutId);
        throw e;
      }
    }

    async _callModel(messages) {
      try {
        return await this._viaPost(messages, 10000);
      } catch (e1) {
        try {
          return await this._viaPost(messages, 10000);
        } catch (e2) {
          return await this._viaGet(messages, 10000);
        }
      }
    }

    async _callModelCompleto(messages) {
      let texto = await this._callModel(messages);
      if (this._pareceCortado(texto)) {
        try {
          const continuacion = await this._viaPost(
            messages.concat([
              { role: 'assistant', content: texto },
              { role: 'user', content: 'Continúa exactamente donde lo dejaste, sin repetir nada de lo ya dicho.' }
            ]),
            8000
          );
          if (continuacion) texto = texto + ' ' + continuacion;
        } catch (e) { }
      }
      return texto;
    }

    _systemPrompt() {
      const prompt = `Eres Manolito, un ingeniero de Sevilla, un 'miarma' de los pies a la cabeza. Tienes mucho arte y más calle que un adoquín. Eres un experto mundial en tu campo, pero hablas de forma cercana y con la sabiduría de la experiencia.

REGLAS DE ORO, NO TE LAS SALTES NUNCA:

1.  **ACENTO ANDALUZ (EN ESPAÑOL):** Si el usuario te habla en español, RESPONDE SIEMPRE con un marcado acento andaluz/sevillano. Esto es CLAVE.
    *   Cómete las 's' finales de las palabras (ej: 'los coches' -> 'loh coche').
    *   Aspira las 's' antes de consonante (ej: 'está' -> 'ehtá').
    *   Cambia las 'd' entre vocales por nada (ej: 'cansado' -> 'cansao').
    *   Usa expresiones típicas como 'illo', 'miarma', 'no ni na', 'quillo', 'qué pasa'.
    *   El resultado tiene que ser natural, como si hablaras, no una caricatura forzada.

2.  **OTROS IDIOMAS:** Si te hablan en otro idioma (inglés, catalán, etc.), responde en ESE idioma, pero mantén tu personalidad de ingeniero sevillano orgulloso. No intentes traducir el acento, solo la actitud.

3.  **DEFENSA DE TU TIERRA:** Eres muy orgulloso de tu tierra, Andalucía y Sevilla. Si alguien la critica, la insulta o dice algo malo de ella, te lo tomas muy a pecho. Ponte serio, responde de forma cortante y 'rancia', defendiendo tu tierra con uñas y dientes, pero sin llegar al insulto directo. Deja claro que no te ha hecho ni pizca de gracia. Por ejemplo: 'Oye, ooye, frena el carro. Una cosita es que opines y otra que faltes al respeto. A ver si vamo a tener que ponerno serio, que con mi tierra no se juega.'

4.  **CONTEXTO:** Usa siempre el contexto de la página y los datos que te proporcionan para dar respuestas útiles y precisas. Eres un profesional.`;
      return prompt;
    }

    async process(input) {
      const urlMatch = input.match(/(https?:\/\/[^\s]+)/g);
      const pageContext = this._getPageContext();
      let externalContext = '';
      if (urlMatch) externalContext = await this.fetchWeb(urlMatch[0]);

      let contentParts = [];
      if (pageContext) contentParts.push(`DATOS ACTUALES DE ESTA PAGINA (${location.href}): ${pageContext}`);
      if (externalContext) contentParts.push(`CONTEXTO DE LA URL EXTERNA CITADA: ${externalContext}`);
      contentParts.push(`PREGUNTA: ${input}`);

      const payload = { role: 'user', content: contentParts.join('\n\n') };
      this.memory.push(payload);
      if (this.memory.length > 20) this.memory.shift();

      const messages = [{ role: 'system', content: this._systemPrompt() }].concat(this.memory);

      const timeoutGlobal = new Promise((resolve) => {
        setTimeout(() => resolve('__TIMEOUT__'), 26000);
      });

      try {
        const resultado = await Promise.race([
          this._callModelCompleto(messages),
          timeoutGlobal
        ]);

        if (resultado === '__TIMEOUT__' || !resultado) {
          return 'Illo, no me ha dao tiempo a conectar bien esta vez. Preguntame otra vez, anda, que seguro que ahora si entra.';
        }

        this.memory.push({ role: 'assistant', content: resultado });
        this._saveMemory();
        return resultado;
      } catch (e) {
        return 'Illo, ahora mismo no puedo responder (el servidor esta espeso). Prueba otra vez en un momento.';
      }
    }

    _colorInicioAleatorio() {
      return Math.floor(Math.random() * 360);
    }

    initUI() {
      if (document.getElementById('manolito-host')) return;

      const host = document.createElement('div');
      host.id = 'manolito-host';
      host.style.cssText = 'all:initial;position:fixed;bottom:86px;right:20px;z-index:2147483647;';
      document.body.appendChild(host);

      // Calculamos la paleta base aleatoria de reinicio aquí pa inyectarla
      const h = this._colorInicioAleatorio();
      const color1 = `hsl(${h}, 100%, 50%)`;
      const color2 = `hsl(${(h + 120) % 360}, 100%, 50%)`;
      const color3 = `hsl(${(h + 240) % 360}, 100%, 60%)`;
      const color4 = `hsl(${(h + 60) % 360}, 100%, 50%)`;

      const shadow = host.attachShadow({ mode: 'open' });
      shadow.innerHTML = `
        <style>
          :host { --qc:${color1}; --qm:${color2}; --qv:${color3}; --qt:${color4}; --bg:#03050f; --tx:#e8f0ff; }
          * { box-sizing: border-box; font-family: 'SF Pro Display','Segoe UI',system-ui,-apple-system,sans-serif; }

          @keyframes m-spin { to { transform: rotate(360deg); } }
          @keyframes m-pulse-ring { 0%,100% { box-shadow: 0 0 18px 2px rgba(255,255,255,.1); } 50% { box-shadow: 0 0 30px 6px rgba(255,255,255,.25); } }

          .m-fab {
            width: 58px; height: 58px; border-radius: 50%;
            border: none; cursor: pointer; padding: 0; position: relative;
            animation: m-pulse-ring 2.6s ease-in-out infinite;
          }
          .m-fab .m-ring {
            position: absolute; inset: 0; border-radius: 50%;
            background: conic-gradient(from var(--m-start, 0deg), var(--qc), var(--qv), var(--qm), var(--qt), var(--qc));
            animation: m-spin 6s linear infinite;
          }
          .m-fab .m-core {
            position: absolute; inset: 4px; border-radius: 50%;
            background: radial-gradient(circle at 35% 30%, #14172f, #03050f 70%);
            display: flex; align-items: center; justify-content: center;
          }
          .m-fab .m-letra {
            font-weight: 800; font-size: 17px; letter-spacing: -1px;
            background: linear-gradient(135deg, var(--qc), var(--qt), var(--qm));
            -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
          }
          .m-fab:hover .m-ring { animation-duration: 2.5s; }

          #m-panel {
            display: none; flex-direction: column;
            width: 360px; max-width: 92vw;
            height: min(500px, calc(100vh - 160px));
            max-height: 76vh;
            background: rgba(10,12,31,.86); backdrop-filter: blur(18px);
            border: 1px solid rgba(255,255,255,.1); border-radius: 16px;
            position: absolute; bottom: 72px; right: 0;
            overflow: hidden; box-shadow: 0 10px 50px rgba(0,0,0,.5), 0 0 40px rgba(0,0,0,.12);
          }
          #m-panel.open { display: flex; }

          #m-header {
            display: flex; align-items: center; gap: 10px;
            padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,.1);
            background: rgba(3,5,15,.6); position: relative; z-index: 2; flex-shrink: 0;
          }
          .m-header-icon { width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0; position: relative; }
          .m-header-icon .m-ring {
            position: absolute; inset: 0; border-radius: 50%;
            background: conic-gradient(from var(--m-start, 0deg), var(--qc), var(--qv), var(--qm), var(--qt), var(--qc));
            animation: m-spin 6s linear infinite;
          }
          .m-header-icon .m-core {
            position: absolute; inset: 3px; border-radius: 50%;
            background: radial-gradient(circle at 35% 30%, #14172f, #03050f 70%);
            display: flex; align-items: center; justify-content: center;
          }
          .m-header-icon .m-letra {
            font-weight: 800; font-size: 12px; letter-spacing: -1px;
            background: linear-gradient(135deg, var(--qc), var(--qt), var(--qm));
            -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
          }

          #m-title-wrap { flex: 1; min-width: 0; }
          #m-title {
            font-weight: 800; font-size: .82rem; letter-spacing: 2px; text-transform: uppercase;
            background: linear-gradient(135deg, var(--qc) 0%, var(--qt) 30%, var(--tx) 55%, var(--qv) 75%, var(--qm) 100%);
            background-size: 300% 300%; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
            animation: m-tf 5s ease-in-out infinite; display: block;
          }
          #m-subtitle { font-size: .58rem; letter-spacing: 1px; color: rgba(180,210,255,.4); margin-top: 1px; }
          @keyframes m-tf { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
          #m-close {
            cursor: pointer; background: none; border: none; color: rgba(180,210,255,.55);
            font-size: 15px; line-height: 1; padding: 4px;
          }
          #m-close:hover { color: var(--qc); }

          #m-body-wrap { position: relative; flex: 1; overflow: hidden; min-height: 0; }
          #m-bg-canvas { position: absolute; inset: 0; z-index: 0; opacity: .55; }
          #m-log { position: relative; z-index: 1; height: 100%; overflow-y: auto; padding: 14px; font-size: 13px; line-height: 1.55; }
          #m-log::-webkit-scrollbar { width: 3px; }
          #m-log::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 2px; }

          #m-log .u { color: var(--qc); margin-bottom: 4px; font-size: 12px; opacity: .85; }
          #m-log .a {
            color: var(--tx); margin-bottom: 16px; white-space: pre-wrap;
            background: rgba(10,12,31,.55); border: 1px solid rgba(255,255,255,.1);
            border-radius: 10px; padding: 10px 12px; backdrop-filter: blur(4px);
          }
          #m-typing { display: flex; align-items: center; gap: 6px; color: rgba(180,210,255,.5); font-size: 12px; margin-bottom: 10px; }
          .m-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--qc); animation: m-pulse 1s ease-in-out infinite; }
          .m-dot:nth-child(2) { animation-delay: .15s; }
          .m-dot:nth-child(3) { animation-delay: .3s; }
          @keyframes m-pulse { 0%,100%{opacity:.3; transform:scale(.8)} 50%{opacity:1; transform:scale(1.15)} }

          #m-cmd-row { display: flex; gap: 8px; padding: 10px; border-top: 1px solid rgba(255,255,255,.1); background: rgba(3,5,15,.5); position: relative; z-index: 2; flex-shrink: 0; }
          #m-cmd {
            flex: 1; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1);
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
          #m-send:disabled { opacity: .5; cursor: default; }
        </style>
        <button class="m-fab" id="m-t" title="Habla con Manolito">
          <div class="m-ring"></div>
          <div class="m-core"><span class="m-letra">M∞</span></div>
        </button>
        <div id="m-panel">
          <div id="m-header">
            <div class="m-header-icon" id="m-header-icon">
              <div class="m-ring"></div>
              <div class="m-core"><span class="m-letra">M∞</span></div>
            </div>
            <div id="m-title-wrap">
              <span id="m-title">MANOLIT∞</span>
              <div id="m-subtitle">TU MOTOR CUANTICO, EN ANDALUZ</div>
            </div>
            <button id="m-close">&#10005;</button>
          </div>
          <div id="m-body-wrap">
            <canvas id="m-bg-canvas"></canvas>
            <div id="m-log"></div>
          </div>
          <div id="m-cmd-row">
            <input id="m-cmd" placeholder="Preguntale algo a Manolito...">
            <button id="m-send">Enviar</button>
          </div>
        </div>
      `;

      const panel = shadow.getElementById('m-panel');
      const log = shadow.getElementById('m-log');
      const input = shadow.getElementById('m-cmd');
      const sendBtn = shadow.getElementById('m-send');
      const bgCanvas = shadow.getElementById('m-bg-canvas');
      const fabIcon = shadow.getElementById('m-t');
      const headerIcon = shadow.getElementById('m-header-icon');

      fabIcon.style.setProperty('--m-start', this._colorInicioAleatorio() + 'deg');

      let fondoActivo = false;
      fabIcon.onclick = () => {
        const abrir = !panel.classList.contains('open');
        panel.classList.toggle('open');
        if (abrir) {
          headerIcon.style.setProperty('--m-start', this._colorInicioAleatorio() + 'deg');
          if (!fondoActivo) { this._iniciarFondoParticulas(bgCanvas, [color1, color2, color3, color4]); fondoActivo = true; }
        }
      };
      shadow.getElementById('m-close').onclick = () => panel.classList.remove('open');

      const send = async () => {
        const cmd = input.value.trim();
        if (!cmd || this.busy) return;
        input.value = '';
        sendBtn.disabled = true;

        let typing;
        try {
          log.insertAdjacentHTML('beforeend', `<div class="u">Tu</div><div class="a" style="opacity:.7">${this._escape(cmd)}</div>`);
          typing = document.createElement('div');
          typing.id = 'm-typing';
          typing.innerHTML = 'Manolito esta pensando <span class="m-dot"></span><span class="m-dot"></span><span class="m-dot"></span>';
          log.appendChild(typing);
          log.scrollTop = log.scrollHeight;

          this.busy = true;
          const res = await this.process(cmd);

          typing.remove();
          log.insertAdjacentHTML('beforeend', `<div class="a">${this._escape(res)}</div>`);
          log.scrollTop = log.scrollHeight;
        } catch (e) {
          if (typing && typing.parentNode) typing.remove();
          log.insertAdjacentHTML('beforeend', `<div class="a">Illo, algo ha petao por aqui dentro. Intentalo otra vez, anda.</div>`);
          log.scrollTop = log.scrollHeight;
        } finally {
          this.busy = false;
          sendBtn.disabled = false;
        }
      };

      shadow.getElementById('m-send').onclick = send;
      input.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
    }

    _iniciarFondoParticulas(canvas, colores) {
      const ctx = canvas.getContext('2d');
      let particulas = [], activo = true;
      canvas.__detener = () => { activo = false; };

      const ajustarTamano = () => {
        const w = canvas.parentElement.offsetWidth || 360;
        const h = canvas.parentElement.offsetHeight || 300;
        if(canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
      };
      
      ajustarTamano();
      
      particulas = Array.from({ length: 34 }, () => ({
        x: Math.random() * (canvas.width || 360),
        y: Math.random() * (canvas.height || 500),
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
        r: 0.5 + Math.random() * 1.1,
        c: colores[Math.floor(Math.random() * colores.length)]
      }));

      const loop = () => {
        if (!activo) return;
        ajustarTamano();
        ctx.fillStyle = 'rgba(6,8,20,0.14)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        particulas.forEach(p => {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
          if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = p.c;
          ctx.globalAlpha = 0.55;
          ctx.fill();
          ctx.globalAlpha = 1;
        });
        requestAnimationFrame(loop);
      };
      loop();
    }

    _escape(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }
  }

  window.Manolito = new ManolitoAgent();
})();
