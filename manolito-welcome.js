/**
 * MANOLITO∞ — Flujo de bienvenida (v2, con integración real)
 * Splash con dos opciones: "Entrada Directa" (salta la intro y va al
 * dashboard) o "Giralda" (intro clasica, tocar 5 veces la Giralda).
 */
(function () {
  'use strict';
  if (window.__manolitoWelcomeLoaded) return;
  window.__manolitoWelcomeLoaded = true;

  const STORAGE_KEY = 'manolito_welcome_choice_v1';

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

  function entrarDirecto(reintentos) {
    if (typeof window.revealDash === 'function') {
      if (typeof window.__stopIntro === 'function') window.__stopIntro();
      window.revealDash();
      return;
    }
    if (reintentos > 0) {
      setTimeout(() => entrarDirecto(reintentos - 1), 200);
      return;
    }
    const pi = document.getElementById('pi');
    const pd = document.getElementById('pd');
    if (pi) pi.style.display = 'none';
    if (pd) { pd.style.display = 'block'; pd.style.opacity = '1'; }
  }

  function enterMode(mode) {
    if (mode === 'direct') {
      entrarDirecto(15);
    }
    document.dispatchEvent(new CustomEvent('manolito:mode', { detail: { mode } }));
  }

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
    .mwl-btn .mwl-ico { flex-shrink: 0; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; color: #00f0ff; }
    .mwl-btn .mwl-ico svg { width: 22px; height: 22px; }
    .mwl-btn .mwl-lbl { font-size: .88rem; font-weight: 700; letter-spacing: .3px; }
    .mwl-btn .mwl-desc { font-size: .62rem; color: rgba(180,210,255,.55); margin-top: 2px; }
    .mwl-btn.mwl-giralda { border-color: rgba(255,0,229,.2); background: rgba(255,0,229,.05); }
    .mwl-btn.mwl-giralda .mwl-ico { color: #ff00e5; }
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
  `;

  function injectStyles() {
    if (document.getElementById('mwl-styles')) return;
    const s = document.createElement('style');
    s.id = 'mwl-styles';
    s.textContent = splashCSS;
    document.head.appendChild(s);
  }

  const ICONO_DIRECTA = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 20v-6"/><circle cx="12" cy="10" r="3"/><path d="M7 7a7 7 0 0 1 10 0"/><path d="M4 4a11 11 0 0 1 16 0"/></svg>`;
  const ICONO_GIRALDA = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 3v3"/><path d="M12 3c4 1 6 4 6 8s-3 7-6 7-6-3-6-7 2-7 6-8Z"/><path d="M12 8c2 .6 3 2 3 4s-1.4 3.4-3 3.4S9 13.6 9 12s1-3.4 3-4Z"/></svg>`;

  function showSplash() {
    if (document.getElementById('mwl-splash')) return;
    injectStyles();

    const saved = getChoice();
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.skipWelcome) {
          enterMode(parsed.mode);
          return;
        }
      } catch (e) {}
    }

    const splash = document.createElement('div');
    splash.id = 'mwl-splash';
    splash.innerHTML = `
      <div class="mwl-wrap">
        <div class="mwl-logo">Manolit&#8734;</div>
        <div class="mwl-sub">Laboratorio de ideas climáticas</div>
        <div class="mwl-honest">
          El clima real viene de <strong>Open-Meteo</strong> y <strong>NASA POWER</strong>.<br>
          El motor de predicción simbólica <em>Giralda</em> es experimental y puede dar resultados inesperados. ¿Cómo quieres empezar?
        </div>
        <div class="mwl-btns">
          <div class="mwl-btn" data-mode="direct">
            <span class="mwl-ico">${ICONO_DIRECTA}</span>
            <span>
              <div class="mwl-lbl">Entrada Directa</div>
              <div class="mwl-desc">Pronóstico estándar con datos reales</div>
            </span>
          </div>
          <div class="mwl-btn mwl-giralda" data-mode="giralda">
            <span class="mwl-ico">${ICONO_GIRALDA}</span>
            <span>
              <div class="mwl-lbl">Giralda</div>
              <div class="mwl-desc">Modo experimental con predicción simbólica</div>
            </span>
          </div>
        </div>
        <button class="mwl-skip">Saltar &#8594;</button>
        <div class="mwl-remember">
          <input type="checkbox" id="mwl-remember-check" />
          <label for="mwl-remember-check">No volver a preguntar</label>
        </div>
      </div>
    `;
    document.body.appendChild(splash);

    splash.querySelectorAll('.mwl-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        const remember = splash.querySelector('#mwl-remember-check');
        setChoice(mode, remember ? remember.checked : false);
        splash.remove();
        enterMode(mode);
      });
    });

    splash.querySelector('.mwl-skip').addEventListener('click', () => {
      splash.remove();
      enterMode('direct');
    });
  }

  ready(showSplash);
})();
