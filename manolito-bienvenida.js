/**
 * MANOLITO∞ — Flujo de bienvenida + entrada directa
 * Drop-in: añade <script src="manolito-bienvenida.js"></script> justo antes del cierre </body>
 * en tu index.html (después de los otros <script>).
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'manolito_welcome_choice_v1';

  /* ================================================================
     UTILIDADES
     ================================================================ */
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function getChoice() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }

  function setChoice(mode, skipWelcome) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, skipWelcome, ts: Date.now() }));
    } catch (e) {}
  }

  /* ================================================================
     FUNCIONES DE ENTRADA A LA APLICACIÓN
     (adaptables a como se inicie Manolito en tu proyecto)
     ================================================================ */
  function enterMode(mode) {
    if (mode === 'direct') {
      enterDirect();
    } else if (mode === 'giralda') {
      enterGiralda();
    }
  }

  function enterDirect() {
    // Oculta el botón flotante de Giralda si existiera
    const skipGiralda = document.getElementById('mwl-skip-giralda');
    if (skipGiralda) skipGiralda.classList.remove('vis');

    // Notifica al núcleo de la app – personaliza esta parte según tu inicialización
    if (typeof window.initManolito === 'function') {
      window.initManolito('direct');
    } else {
      document.dispatchEvent(new CustomEvent('manolito:mode', { detail: { mode: 'direct' } }));
    }
  }

  function enterGiralda() {
    // Muestra un botón flotante que permite volver al modo directo
    let skipBtn = document.getElementById('mwl-skip-giralda');
    if (!skipBtn) {
      skipBtn = document.createElement('button');
      skipBtn.id = 'mwl-skip-giralda';
      skipBtn.textContent = '← Salir de Giralda';
      skipBtn.addEventListener('click', () => enterDirect());
      document.body.appendChild(skipBtn);
    }
    skipBtn.classList.add('vis');

    if (typeof window.initManolito === 'function') {
      window.initManolito('giralda');
    } else {
      document.dispatchEvent(new CustomEvent('manolito:mode', { detail: { mode: 'giralda' } }));
    }
  }

  /* ================================================================
     ESTILOS INJECTADOS (para no tocar tu CSS)
     ================================================================ */
  const splashCSS = `
    #mwl-splash {
      position: fixed; inset: 0; z-index: 99999;
      background: radial-gradient(circle at 50% 40%, #0d1029 0%, #03050f 70%);
      display: flex; align-items: center; justify-content: center;
      font-family: 'SF Pro Display','Segoe UI',system-ui,sans-serif;
      color: #e8f0ff; overflow: hidden;
    }
    #mwl-splash::before {
      content: ''; position: absolute; inset: 0;
      background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2300f0ff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
      opacity: .6; pointer-events: none;
    }
    .mwl-wrap {
      position: relative; z-index: 2;
      width: min(520px, 92vw);
      background: rgba(10,12,31,.92);
      border: 1px solid rgba(0,240,255,.18);
      border-radius: 18px;
      padding: 36px 32px 28px;
      box-shadow: 0 24px 80px rgba(0,0,0,.6), 0 0 60px rgba(0,240,255,.06);
      text-align: center; animation: mwlIn .55s ease both;
    }
    @keyframes mwlIn {
      from { opacity: 0; transform: translateY(18px) scale(.97); }
      to   { opacity: 1; transform: translateY(0)  scale(1); }
    }
    .mwl-logo {
      font-size: 2.6rem; font-weight: 900; letter-spacing: -2px;
      background: linear-gradient(135deg, #00f0ff 0%, #00ffc8 30%, #e8f0ff 55%, #7b2fff 75%, #ff00e5 100%);
      background-size: 300% 300%; -webkit-background-clip: text; background-clip: text;
      -webkit-text-fill-color: transparent; margin-bottom: 6px;
    }
    .mwl-sub {
      font-size: .62rem; letter-spacing: 4px; text-transform: uppercase;
      color: rgba(180,210,255,.5); margin-bottom: 22px;
    }
    .mwl-honest {
      font-size: .78rem; line-height: 1.6; color: rgba(200,220,255,.75);
      margin-bottom: 26px; text-align: left;
      background: rgba(0,240,255,.04); border: 1px solid rgba(0,240,255,.1);
      border-radius: 10px; padding: 14px 16px;
    }
    .mwl-honest strong { color: #00f0ff; }
    .mwl-honest em { color: #00ffc8; font-style: normal; }
    .mwl-btns { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
    .mwl-btn {
      display: flex; align-items: center; gap: 14px;
      background: rgba(0,240,255,.06); border: 1px solid rgba(0,240,255,.16);
      border-radius: 12px; padding: 14px 16px; cursor: pointer;
      color: #e8f0ff; text-align: left; transition: all .25s;
    }
    .mwl-btn:hover { border-color: rgba(0,240,255,.45); background: rgba(0,240,255,.1); transform: translateY(-1px); }
    .mwl-btn .mwl-ico { font-size: 1.6rem; flex-shrink: 0; width: 36px; text-align: center; }
    .mwl-btn .mwl-lbl { font-size: .88rem; font-weight: 700; letter-spacing: .3px; }
    .mwl-btn .mwl-desc { font-size: .62rem; color: rgba(180,210,255,.55); margin-top: 2px; }
    .mwl-btn.mwl-giralda { border-color: rgba(255,0,229,.2); background: rgba(255,0,229,.05); }
    .mwl-btn.mwl-giralda:hover { border-color: rgba(255,0,229,.5); background: rgba(255,0,229,.1); }
    .mwl-skip {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: .6rem; letter-spacing: 2px; text-transform: uppercase;
      color: rgba(180,210,255,.35); background: none; border: none;
      cursor: pointer; margin-top: 4px;
    }
    .mwl-skip:hover { color: #00f0ff; }
    .mwl-remember {
      display: flex; align-items: center; justify-content: center; gap: 6px;
      font-size: .58rem; color: rgba(180,210,255,.4); margin-top: 10px;
    }
    .mwl-remember input { accent-color: #00f0ff; cursor: pointer; }
    .mwl-remember label { cursor: pointer; }

    /* Botón flotante para saltar la Giralda */
    #mwl-skip-giralda {
      position: fixed; top: 18px; right: 18px; z-index: 99998;
      background: rgba(10,12,31,.85); border: 1px solid rgba(0,240,255,.25);
      color: #00f0ff; font-size: .6rem; font-weight: 700; letter-spacing: 1.5px;
      text-transform: uppercase; padding: 8px 14px; border-radius: 20px;
      cursor: pointer; backdrop-filter: blur(10px);
      opacity: 0; pointer-events: none; transition: opacity .4s;
    }
    #mwl-skip-giralda.vis { opacity: 1; pointer-events: auto; }
    #mwl-skip-giralda:hover { background: rgba(0,240,255,.15); }
  `;

  function injectStyles() {
    if (document.getElementById('mwl-styles')) return;
    const s = document.createElement('style');
    s.id = 'mwl-styles';
    s.textContent = splashCSS;
    document.head.appendChild(s);
  }

  /* ================================================================
     SPLASH DE BIENVENIDA
     ================================================================ */
  function showSplash() {
    injectStyles();

    const saved = getChoice();
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.skipWelcome) {
          // Entrada directa según la elección guardada
          enterMode(parsed.mode);
          return;
        }
      } catch (e) {}
    }

    const splash = document.createElement('div');
    splash.id = 'mwl-splash';
    splash.innerHTML = `
      <div class="mwl-wrap">
        <div class="mwl-logo">Manolit∞</div>
        <div class="mwl-sub">Laboratorio de ideas climáticas</div>

        <div class="mwl-honest">
          El clima real viene de <strong>Open-Meteo</strong> y <strong>NASA POWER</strong>.<br>
          El motor de predicción simbólica <em>Giralda</em> es experimental y puede dar resultados inesperados. ¿Cómo quieres empezar?
        </div>

        <div class="mwl-btns">
          <div class="mwl-btn" data-mode="direct">
            <span class="mwl-ico">📡</span>
            <span>
              <div class="mwl-lbl">Entrada Directa</div>
              <div class="mwl-desc">Pronóstico estándar con datos reales</div>
            </span>
          </div>
          <div class="mwl-btn mwl-giralda" data-mode="giralda">
            <span class="mwl-ico">🌀</span>
            <span>
              <div class="mwl-lbl">Giralda</div>
              <div class="mwl-desc">Modo experimental con predicción simbólica</div>
            </span>
          </div>
        </div>

        <button class="mwl-skip">Saltar →</button>

        <div class="mwl-remember">
          <input type="checkbox" id="mwl-remember-check" />
          <label for="mwl-remember-check">No volver a preguntar</label>
        </div>
      </div>
    `;

    document.body.appendChild(splash);

    // ------------------- EVENTOS -------------------
    const modeButtons = splash.querySelectorAll('.mwl-btn');
    const skipBtn = splash.querySelector('.mwl-skip');
    const rememberCheck = splash.querySelector('#mwl-remember-check');

    function chooseMode(mode, skipSave) {
      // Guardar preferencias si se solicitó
      if (!skipSave) {
        setChoice(mode, rememberCheck.checked);
      }
      splash.remove();
      enterMode(mode);
    }

    modeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        chooseMode(mode, false);
      });
    });

    skipBtn.addEventListener('click', () => {
      // Saltar sin guardar preferencia (entrada directa por esta vez)
      chooseMode('direct', true);
    });
  }

  // Iniciar cuando el DOM esté listo
  ready(showSplash);
})();
