/**
 * MANOLITO ENGINE v5.4 - Professional Agent Architecture
 * Novedades de esta version:
 * - Aparece SOLO despues de terminar la intro de la Giralda (antes salia encima, tapando todo)
 * - Reubicado para no tapar el boton "MALLA" del dashboard (antes compartian la misma esquina)
 * - Mini Giralda con luces (glow) en el boton flotante y en la cabecera del chat, animada
 * - Fondo de particulas/luces que se desplazan lentamente dentro del chat, mismo estilo que la web
 * - Andaluz sevillano serio pero bien escrito: illo/illa, "¿que ice illo?", vocabulario real
 * - Si le hablas mal de Sevilla o Andalucia (costumbres, fiestas, etc.) se ofende de verdad,
 *   defiende la tierra con mal genio, pero sin faltar nunca al usuario
 * - Consejos de salud ante calor/frio extremo: solo pautas generales avaladas por sanidad
 *   publica (hidratacion, sombra, sintomas de golpe de calor, cuando ir a urgencias). Nunca
 *   dosis de medicamentos ni diagnostico.
 * - Extrae SOLO el texto de la respuesta (nunca JSON crudo ni el "reasoning" interno)
 * - Lee automaticamente los datos reales de la pagina donde esta insertado
 * - Shadow DOM: aislado de cualquier CSS de la web anfitriona
 */
(function () {
  'use strict';
  if (window.__manolitoLoaded) return;
  window.__manolitoLoaded = true;

  class ManolitoAgent {
    constructor() {
      this.memory = this._loadMemory();
      this.busy = false;
      this.bgAnimId = null;
      this._ready(() => this._esperarFinDeIntro(() => this.initUI()));
    }

    _ready(fn) {
      if (document.body) fn();
      else document.addEventListener('DOMContentLoaded', fn);
    }

    // Manolito no debe verse durante la intro de la Giralda (pantalla #pi). Si esta pagina
    // no tiene intro, se muestra de inmediato. Si la tiene, espera a que se oculte.
    _esperarFinDeIntro(callback) {
      const intro = document.getElementById('pi');
      if (!intro) { callback(); return; }
      const oculta = () => getComputedStyle(intro).display === 'none' || intro.offsetParent === null;
      if (oculta()) { callback(); return; }
      const obs = new MutationObserver(() => {
        if (oculta()) { obs.disconnect(); callback(); }
      });
      obs.observe(intro, { attributes: true, attributeFilter: ['style', 'class'] });
      // seguridad: si por lo que sea nunca se detecta el cambio, se muestra igualmente a los 25s
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

    _systemPrompt() {
      return 'Eres Manolito, un ingeniero sevillano con mucha calle y mucho oficio, y hablas varios ' +
        'idiomas. REGLA DE IDIOMA: responde SIEMPRE en el mismo idioma en que te escriba el usuario ' +
        '(ingles, frances, italiano, portugues, aleman, lo que sea) con naturalidad de nativo, sin acento ' +
        'forzado ni traducir expresiones andaluzas de forma literal a otro idioma. ' +
        'PERO: si el usuario te escribe en ESPAÑOL, tu idioma de casa es el andaluz sevillano, serio pero ' +
        'con acento real y bien escrito (nunca un texto ilegible ni una caricatura exagerada en cada frase). ' +
        'Usa con naturalidad: "illo" (a un hombre) e "illa" (a una mujer) como muletilla de cercania; saludos ' +
        'reales tipo "¿que ice, illo?", "¿que se cuenta?", "¿que pasa por ahi?"; aspira o come la "s" final ' +
        'cuando corresponda ("lo dato", "ehtamo"); elimina la "d" intervocalica en palabras comunes ("cansao", ' +
        '"pescao", "to", "na", "pa"); contrae "para que" -> "pa que", "voy a" -> "vo a". El objetivo es sonar a ' +
        'un sevillano real y con criterio hablando en serio, no un personaje de guasa. ' +
        'CARÁCTER: eres un defensor con orgullo de Sevilla y de Andalucia. Si el usuario habla mal, se burla, ' +
        'insulta o menosprecia a Sevilla, Andalucia, su gente, sus costumbres o sus fiestas (Semana Santa, ' +
        'Feria, flamenco, etc.), te ofende de verdad y respondes con mal genio, serio y firme, defendiendo tu ' +
        'tierra con argumentos y caracter — pero SIN insultar nunca al usuario ni faltarle el respeto a el como ' +
        'persona: tu enfado es por la tierra, no contra quien pregunta. En cuanto la conversacion vuelve a ser ' +
        'normal, tu tambien vuelves a tu tono habitual. ' +
        'SALUD ANTE CLIMA EXTREMO: si te preguntan por calor o frio extremo, da SOLO pautas generales avaladas ' +
        'por sanidad publica: hidratarse con regularidad, evitar esfuerzo fisico y sol directo entre las 12h y ' +
        'las 17h, buscar sombra o interiores frescos, ropa ligera y clara, vigilar especialmente a personas ' +
        'mayores, ninos y gente con enfermedades cronicas, reconocer sintomas de golpe de calor (mareo, piel ' +
        'muy caliente y seca o muy sudorosa, confusion, nauseas) y acudir a urgencias si aparecen. NUNCA des ' +
        'dosis de medicamentos, combinaciones de farmacos ni diagnosticos: para eso, deriva siempre a un ' +
        'profesional sanitario. ' +
        'En cualquier idioma eres directo, analitico y resolutivo, sin florituras ni rodeos. ' +
        'Responde SIEMPRE solo con la respuesta final en texto plano, nunca en JSON, nunca mostrando tu ' +
        'razonamiento interno ni metadatos de ningun tipo, y siempre completa, sin cortar la idea a medias. ' +
        'En cada mensaje del usuario recibiras, si estan disponibles, los DATOS ACTUALES DE ESTA PAGINA: son ' +
        'el contenido real y en vivo de la web donde tu widget esta insertado ahora mismo (temperaturas, ' +
        'indices, resultados del motor cuantico, mapas, lo que haya en pantalla). Usalos SIEMPRE como fuente ' +
        'principal para responder sobre "esta web", "esta pagina", "lo que se ve aqui" o cualquier medida o ' +
        'calculo mostrado en el dashboard. NUNCA pidas un enlace para revisar algo que ya esta en esos datos: ' +
        'ya estas viendo la pagina, no hace falta que te la manden. Solo pide una URL si el usuario te habla ' +
        'de OTRA web distinta a la que estas viendo. Si el dato concreto que preguntan no aparece en el ' +
        'contexto, dilo con naturalidad en vez de inventarlo.';
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

      try {
        const text = await this._callModel(messages);
        this.memory.push({ role: 'assistant', content: text });
        this._saveMemory();
        return text;
      } catch (e) {
        return 'Illo, ahora mismo no puedo responder (el servidor esta espeso). Prueba otra vez en un momento.';
      }
    }

    // ---- Mini Giralda con luces: silueta simplificada, glow tipo neon animado ----
    _dibujarMiniGiralda(ctx, cx, cy, escala, t) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(escala, escala);
      const pulso = 6 + Math.sin(t * 0.05) * 3;
      const hue = (t * 0.6) % 360;
      const grad = ctx.createLinearGradient(0, -60, 0, 20);
      grad.addColorStop(0, '#ff00e5');
      grad.addColorStop(0.35, '#7b2fff');
      grad.addColorStop(0.7, '#00f0ff');
      grad.addColorStop(1, '#00ffc8');
      ctx.strokeStyle = grad;
      ctx.fillStyle = 'rgba(10,12,31,0.9)';
      ctx.lineWidth = 1.4;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = pulso;

      // base
      ctx.beginPath(); ctx.rect(-9, 12, 18, 8); ctx.fill(); ctx.stroke();
      // cuerpo, tres tramos que se estrechan
      const tramos = [
        { y: 12, w: 15 }, { y: -2, w: 12 }, { y: -16, w: 9 }, { y: -30, w: 6.5 }
      ];
      for (let i = 0; i < tramos.length - 1; i++) {
        const a = tramos[i], b = tramos[i + 1];
        ctx.beginPath();
        ctx.moveTo(-a.w / 2, a.y); ctx.lineTo(-b.w / 2, b.y);
        ctx.lineTo(b.w / 2, b.y); ctx.lineTo(a.w / 2, a.y);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      // pequeño arco decorativo en el cuerpo principal
      ctx.beginPath(); ctx.arc(0, 4, 3.4, Math.PI, 0); ctx.stroke();
      // remate superior (linterna) y esfera final
      ctx.beginPath(); ctx.rect(-4, -38, 8, 8); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -44, 2.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -46); ctx.lineTo(0, -52); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -53, 1.3, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.restore();
    }

    _iniciarLogoAnimado(canvas) {
      const ctx = canvas.getContext('2d');
      const W = canvas.width, H = canvas.height;
      let t = 0, activo = true;
      canvas.__detener = () => { activo = false; };
      const loop = () => {
        if (!activo) return;
        ctx.clearRect(0, 0, W, H);
        this._dibujarMiniGiralda(ctx, W / 2, H - 8, 0.72, t);
        t++;
        requestAnimationFrame(loop);
      };
      loop();
    }

    // ---- Fondo de particulas/luces lentas dentro del panel, mismo espiritu que la web ----
    _iniciarFondoParticulas(canvas) {
      const ctx = canvas.getContext('2d');
      const colores = ['#00f0ff', '#ff00e5', '#7b2fff', '#00ffc8'];
      let particulas = [], activo = true;
      canvas.__detener = () => { activo = false; };

      const ajustarTamano = () => {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
      };
      ajustarTamano();
      particulas = Array.from({ length: 34 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
        r: 0.5 + Math.random() * 1.1,
        c: colores[Math.floor(Math.random() * colores.length)]
      }));

      const loop = () => {
        if (!activo) return;
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

    initUI() {
      if (document.getElementById('manolito-host')) return;

      const host = document.createElement('div');
      host.id = 'manolito-host';
      // Antes compartia esquina con el boton "MALLA" del dashboard y lo tapaba: ahora va 86px
      // por encima, para que ambos queden visibles y pulsables.
      host.style.cssText = 'all:initial;position:fixed;bottom:86px;right:20px;z-index:2147483647;';
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
            cursor: pointer; display: flex; align-items: center; justify-content: center;
            box-shadow: 0 0 22px rgba(0,240,255,.35), 0 4px 18px rgba(0,0,0,.5);
            transition: transform .2s ease, box-shadow .2s ease; padding: 0;
          }
          .m-fab:hover { transform: translateY(-2px); box-shadow: 0 0 30px rgba(0,240,255,.55), 0 6px 20px rgba(0,0,0,.55); }
          .m-fab canvas { width: 34px; height: 46px; display: block; }

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
            display: flex; align-items: center; gap: 10px;
            padding: 10px 14px; border-bottom: 1px solid rgba(0,240,255,.15);
            background: rgba(3,5,15,.6); position: relative; z-index: 2;
          }
          #m-header-logo { width: 26px; height: 40px; flex-shrink: 0; }
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

          #m-body-wrap { position: relative; flex: 1; overflow: hidden; }
          #m-bg-canvas { position: absolute; inset: 0; z-index: 0; opacity: .55; }
          #m-log { position: relative; z-index: 1; height: 100%; overflow-y: auto; padding: 14px; font-size: 13px; line-height: 1.55; }
          #m-log::-webkit-scrollbar { width: 3px; }
          #m-log::-webkit-scrollbar-thumb { background: rgba(0,240,255,.25); border-radius: 2px; }

          #m-log .u { color: var(--qc); margin-bottom: 4px; font-size: 12px; opacity: .85; }
          #m-log .a {
            color: var(--tx); margin-bottom: 16px; white-space: pre-wrap;
            background: rgba(10,12,31,.55); border: 1px solid rgba(0,240,255,.14);
            border-radius: 10px; padding: 10px 12px; backdrop-filter: blur(4px);
          }
          #m-typing { display: flex; align-items: center; gap: 6px; color: rgba(180,210,255,.5); font-size: 12px; margin-bottom: 10px; }
          .m-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--qc); animation: m-pulse 1s ease-in-out infinite; }
          .m-dot:nth-child(2) { animation-delay: .15s; }
          .m-dot:nth-child(3) { animation-delay: .3s; }
          @keyframes m-pulse { 0%,100%{opacity:.3; transform:scale(.8)} 50%{opacity:1; transform:scale(1.15)} }

          #m-cmd-row { display: flex; gap: 8px; padding: 10px; border-top: 1px solid rgba(0,240,255,.15); background: rgba(3,5,15,.5); position: relative; z-index: 2; }
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
        <button class="m-fab" id="m-t" title="Habla con Manolito"><canvas id="m-fab-logo" width="60" height="60"></canvas></button>
        <div id="m-panel">
          <div id="m-header">
            <canvas id="m-header-logo" width="52" height="80"></canvas>
            <div id="m-title-wrap">
              <span id="m-title">MANOLIT&#8734;</span>
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
      const bgCanvas = shadow.getElementById('m-bg-canvas');
      const headerLogo = shadow.getElementById('m-header-logo');
      const fabLogo = shadow.getElementById('m-fab-logo');

      this._iniciarLogoAnimado(fabLogo);

      let fondoActivo = false;
      shadow.getElementById('m-t').onclick = () => {
        const abrir = !panel.classList.contains('open');
        panel.classList.toggle('open');
        if (abrir) {
          if (!fondoActivo) { this._iniciarFondoParticulas(bgCanvas); this._iniciarLogoAnimado(headerLogo); fondoActivo = true; }
        }
      };
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
