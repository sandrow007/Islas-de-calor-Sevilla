(function () {
  'use strict';

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

  function enterMode(mode) {
    console.log('Modo seleccionado:', mode);
    // Aquí luego puedes llamar a tu función real o disparar un evento
    // Ejemplo: window.initManolito?.(mode);
  }

  const splashCSS = `...`; // (igual que antes, recortado por brevedad, pégalo completo)

  function injectStyles() {
    if (document.getElementById('mwl-styles')) return;
    const s = document.createElement('style');
    s.id = 'mwl-styles';
    s.textContent = splashCSS;
    document.head.appendChild(s);
  }

  function showSplash() {
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
        <div class="mwl-logo">Manolit∞</div>
        <div class="mwl-sub">Laboratorio de ideas climáticas</div>
        <div class="mwl-honest">
          El clima real viene de <strong>Open-Meteo</strong> y <strong>NASA POWER</strong>.<br>
          El motor de predicción simbólica <em>Giralda</em> es experimental y puede dar resultados inesperados. ¿Cómo quieres empezar?
        </div>
        <div class="mwl-btns">
          <div class="mwl-btn" data-mode="direct">
            <span class="mwl-ico">📡</span>
            <span><div class="mwl-lbl">Entrada Directa</div><div class="mwl-desc">Pronóstico estándar</div></span>
          </div>
          <div class="mwl-btn mwl-giralda" data-mode="giralda">
            <span class="mwl-ico">🌀</span>
            <span><div class="mwl-lbl">Giralda</div><div class="mwl-desc">Modo experimental</div></span>
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

    splash.querySelectorAll('.mwl-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        setChoice(mode, splash.querySelector('#mwl-remember-check').checked);
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
