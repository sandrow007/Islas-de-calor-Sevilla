/**
 * ISLASDECALORSEVILLA.COM — Ampliación honesta de la pestaña "CLIMA ESPACIAL · NOAA"
 * Se auto-inserta en #tabpanel-espacio con una sola línea de <script> en el index.
 *
 * Añade:
 * 1) Tendencia del indice Kp en las ultimas 24h (dato historico real de NOAA)
 * 2) Riesgo de arrastre atmosferico para la ISS (relacion fisica real y documentada:
 *    mas actividad solar -> atmosfera alta mas caliente y densa -> mas rozamiento en orbita baja).
 *    Se presenta como estimacion cualitativa, NO como un calculo orbital exacto.
 * 3) Visibilidad de aurora segun Kp (tabla real aproximada), dejando claro que desde
 *    Sevilla (37.4 N) practicamente nunca se vera, ni con Kp maximo.
 * 4) Panel de honestidad: como se conecta esto (o no) con el resto del dashboard.
 *
 * NO incluye nada de "API 4D-Vent", "SwissMET", "ATLAS-T/LEO-T" ni relaciones
 * inventadas con la temperatura urbana: no existen o no estan probadas, y esta
 * web se basa en datos reales y verificables.
 */
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function crearCard(id, badge, titulo) {
    const section = document.createElement('section');
    section.className = 'card';
    section.id = id;
    section.innerHTML = `
      <div class="chdr">
        <span class="cbdg">${badge}</span>
        <h2>${titulo}</h2>
        <div class="ldw"><span class="ld"></span><span>NOAA SWPC</span></div>
      </div>
      <div class="extras-body" id="${id}-body">
        <div class="ci">Cargando datos reales...</div>
      </div>
    `;
    return section;
  }

  function montarEnPestanaEspacio(nodos) {
    const contenedor = document.getElementById('tabpanel-espacio') || document.body;
    nodos.forEach(n => contenedor.appendChild(n));
  }

  // ---------------------------------------------------------------
  // 1) TENDENCIA DEL INDICE KP (24H REALES)
  // ---------------------------------------------------------------
  async function cargarTendenciaKp(bodyEl) {
    try {
      const res = await fetch('https://services.swpc.noaa.gov/json/planetary_k_index_1m.json');
      const datos = await res.json();
      // el feed trae valores cada minuto; tomamos 1 de cada ~60 para cubrir ~24h sin saturar
      const ultimos = datos.slice(-1440);
      const paso = Math.max(1, Math.floor(ultimos.length / 48));
      const muestra = ultimos.filter((_, i) => i % paso === 0);
      const valores = muestra.map(d => parseFloat(d.kp_index ?? d.Kp ?? d.kp ?? 0));

      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:120px;display:block;margin-top:6px';
      bodyEl.innerHTML = '';
      bodyEl.appendChild(canvas);

      const ctx = canvas.getContext('2d');
      const W = canvas.width = canvas.offsetWidth || 320;
      const H = canvas.height = 120;
      ctx.clearRect(0, 0, W, H);
      const max = 9; // escala Kp siempre de 0 a 9
      // lineas guia G1-G4
      [4, 5, 6, 7].forEach(k => {
        const y = H - 8 - (k / max) * (H - 16);
        ctx.strokeStyle = 'rgba(255,215,69,.12)';
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      });
      const barW = W / valores.length;
      valores.forEach((v, i) => {
        const h = (v / max) * (H - 16);
        const color = v < 4 ? '#00ff88' : v < 5 ? '#ffee00' : v < 6 ? '#ff8800' : '#ff3300';
        ctx.fillStyle = color;
        ctx.fillRect(i * barW + 1, H - 8 - h, Math.max(1, barW - 2), h);
      });

      const actual = valores[valores.length - 1] ?? 0;
      // proteger contra valores vacíos y formatear el máximo
      const maximo = Math.max(0, ...valores);
      bodyEl.insertAdjacentHTML('beforeend', `
        <div class="ci" style="margin-top:8px">
          Últimas ~24h · Kp actual: <strong style="color:var(--qc)">${actual.toFixed(1)}</strong>
          · máximo del periodo: <strong style="color:var(--qc)">${maximo.toFixed(1)}</strong>
        </div>
      `);
    } catch (e) {
      bodyEl.innerHTML = `<div class="ci">No se pudo cargar la tendencia de Kp ahora mismo.</div>`;
    }
  }

  // ---------------------------------------------------------------
  // 2) RIESGO DE ARRASTRE ATMOSFÉRICO PARA LA ISS (estimación cualitativa honesta)
  // ---------------------------------------------------------------
  async function cargarRiesgoArrastreISS(bodyEl) {
    try {
      const [rKp, rF107] = await Promise.all([
        fetch('https://services.swpc.noaa.gov/json/planetary_k_index_1m.json'),
        fetch('https://services.swpc.noaa.gov/json/solar-cycle/observed-solar-cycle-indices.json')
      ]);
      const kd = await rKp.json();
      const fd = await rF107.json();
      const kp = parseFloat(kd[kd.length - 1]?.kp_index ?? kd[kd.length - 1]?.Kp ?? 0);
      const f107 = parseFloat(fd[fd.length - 1]?.f10_7obs ?? 0);

      // Umbrales de referencia usados habitualmente en meteorologia espacial (NOAA/NASA):
      // F10.7 < 90 flujo solar bajo, 90-150 moderado, >150 alto.
      // Kp < 4 tranquilo, 4-6 tormenta moderada, >6 tormenta fuerte.
      // A mayor flujo solar y mayor Kp, la termosfera se calienta y se expande, aumentando
      // la densidad a la altura de la ISS (~400 km) y por tanto el rozamiento (drag) que sufre.
      let nivel, clase, explicacion;
      if (f107 > 150 || kp > 6) {
        nivel = 'ALTO'; clase = 'dq-lo';
        explicacion = 'Actividad solar alta: la atmósfera superior se expande más de lo normal y la ISS sufre más rozamiento del habitual, lo que obliga a corregir su órbita con más frecuenc[...]';
      } else if (f107 > 90 || kp > 4) {
        nivel = 'MODERADO'; clase = 'dq-md';
        explicacion = 'Actividad solar moderada: algo más de rozamiento del promedio, dentro de rango gestionable sin intervención urgente.';
      } else {
        nivel = 'BAJO'; clase = 'dq-hi';
        explicacion = 'Actividad solar tranquila: la atmósfera a la altura de la ISS está en condiciones normales de densidad y rozamiento.';
      }

      bodyEl.innerHTML = `
        <div class="dgr">
          <div class="di"><div class="dl">FLUJO F10.7</div><div class="dv">${f107.toFixed(0)}<span class="du">sfu</span></div></div>
          <div class="di"><div class="dl">INDICE KP</div><div class="dv">${kp.toFixed(1)}</div></div>
        </div>
        <div class="dqb ${clase}" style="margin-top:8px;display:inline-block">Rozamiento estimado en órbita de la ISS: ${nivel}</div>
        <div class="ci">${explicacion} Es la única relación física real y documentada entre este panel y otra parte de la web (la pestaña del ISS). Es una estimación cualitativa por umbrales[...] 
      `;
    } catch (e) {
      bodyEl.innerHTML = `<div class="ci">No se pudo calcular el riesgo de arrastre ahora mismo.</div>`;
    }
  }

  // ---------------------------------------------------------------
  // 3) VISIBILIDAD DE AURORA SEGÚN KP (tabla real aproximada)
  // ---------------------------------------------------------------
  // Latitud geomagnética mínima aproximada donde suele verse la aurora, por nivel de Kp
  // (tabla de referencia habitual usada por servicios de previsión de auroras).
  const TABLA_AURORA = [
    { kp: 0, lat: 66.5 }, { kp: 1, lat: 64.5 }, { kp: 2, lat: 62.4 }, { kp: 3, lat: 60.4 },
    { kp: 4, lat: 58.3 }, { kp: 5, lat: 56.3 }, { kp: 6, lat: 54.2 }, { kp: 7, lat: 52.2 },
    { kp: 8, lat: 50.1 }, { kp: 9, lat: 48.1 }
  ];
  const LATITUD_GEOGRAFICA_SEVILLA = 37.4;

  async function cargarVisibilidadAurora(bodyEl) {
    try {
      const res = await fetch('https://services.swpc.noaa.gov/json/planetary_k_index_1m.json');
      const datos = await res.json();
      const kp = Math.round(parseFloat(datos[datos.length - 1]?.kp_index ?? datos[datos.length - 1]?.Kp ?? 0));
      const fila = TABLA_AURORA[Math.min(9, Math.max(0, kp))];
      const distancia = (fila.lat - LATITUD_GEOGRAFICA_SEVILLA).toFixed(0);

      bodyEl.innerHTML = `
        <div class="dgr">
          <div class="di"><div class="dl">KP ACTUAL</div><div class="dv">${kp}</div></div>
          <div class="di"><div class="dl">LATITUD MÍN. AURORA</div><div class="dv">~${fila.lat.toFixed(0)}<span class="du">°N</span></div></div>
          <div class="di"><div class="dl">SEVILLA</div><div class="dv">${LATITUD_GEOGRAFICA_SEVILLA}<span class="du">°N</span></div></div>
        </div>
        <div class="ci">Con este Kp, la aurora suele verse solo por encima de ~${fila.lat.toFixed(0)}°N (norte de Europa/Escandinavia). Sevilla está unos ${distancia}° más al sur, así que au[...]</div>
      `;
    } catch (e) {
      bodyEl.innerHTML = `<div class="ci">No se pudo calcular la visibilidad de aurora ahora mismo.</div>`;
    }
  }

  // ---------------------------------------------------------------
  // 4) PANEL DE HONESTIDAD: cómo se conecta esto con el resto de la web
  // ---------------------------------------------------------------
  function crearPanelHonestidad() {
    const section = document.createElement('section');
    section.className = 'card';
    section.innerHTML = `
      <div class="chdr">
        <span class="cbdg">INFO</span>
        <h2>¿QUÉ RELACIÓN TIENE ESTO CON EL RESTO DE LA WEB?</h2>
      </div>
      <div class="ci" style="text-align:left;text-transform:none;letter-spacing:normal;font-size:.68rem;line-height:1.6;opacity:.85">
        El clima espacial (Kp y F10.7) tiene una conexión física real y documentada con la pestaña del ISS:
        más actividad solar calienta y expande la atmósfera alta, aumentando el rozamiento que sufre la
        estación en órbita baja. Esa relación sí está bien establecida.<br><br>
        Lo que NO existe es una relación probada entre el clima espacial y el índice cuántico climático (QCI)
        o el calor que se siente en la calle en Sevilla: el motor cuántico se alimenta solo de temperatura,
        humedad, viento y radiación solar reales, no del Kp ni del F10.7. Esta pestaña se muestra de forma
        independiente, como información real y curiosa, no como parte del cálculo de riesgo térmico urbano.
      </div>
    `;
    return section;
  }

  // ---------------------------------------------------------------
  ready(() => {
    const cKp = crearCard('extra-kp-trend', 'KP24', 'TENDENCIA DEL ÍNDICE KP · 24H');
    const cIss = crearCard('extra-iss-drag', 'ISS', 'RIESGO DE ARRASTRE ATMOSFÉRICO · ISS');
    const cAurora = crearCard('extra-aurora', 'AUR', 'VISIBILIDAD DE AURORA');
    const cHonestidad = crearPanelHonestidad();

    montarEnPestanaEspacio([cKp, cIss, cAurora, cHonestidad]);

    cargarTendenciaKp(document.getElementById('extra-kp-trend-body'));
    cargarRiesgoArrastreISS(document.getElementById('extra-iss-drag-body'));
    cargarVisibilidadAurora(document.getElementById('extra-aurora-body'));

    setInterval(() => cargarTendenciaKp(document.getElementById('extra-kp-trend-body')), 300000);
    setInterval(() => cargarRiesgoArrastreISS(document.getElementById('extra-iss-drag-body')), 300000);
    setInterval(() => cargarVisibilidadAurora(document.getElementById('extra-aurora-body')), 300000);
  });

})();
