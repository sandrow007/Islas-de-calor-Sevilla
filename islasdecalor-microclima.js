/* ============================================================
   MICROCLIMA URBANO SEVILLA v2 — mapa de calor continuo
   ------------------------------------------------------------
   Cambios v2 (tras revisión del mapa completo):
   - CONTRASTE REAL: la intensidad se normaliza con el rango del
     propio campo (fresco→caliente de verdad), no con escala fija:
     ya no es una manta naranja uniforme.
   - BASE TRANSPARENTE: las zonas frescas no tiñen el mapa; solo
     se ve color donde hay calor de verdad.
   - RADIO ADAPTATIVO al zoom: al acercar, el detalle mejora en
     vez de ponerse todo rojo.
   - NADA FIJO: todo cuadro del mapa se puede plegar u ocultar:
     · Panel microclima: desplegable (▸/▾).
     · Leyenda UHI: se pliega con ▸/▾ (la envuelve este módulo).
     · Control de capas y créditos: botón 👁 que lo oculta TODO.
   ============================================================ */

(function () {
  'use strict';

  /* ---- CONSTANTES AJUSTABLES ---- */
  const REJILLA = 56;              // celdas por eje del campo interpolado
  const IDW_POTENCIA = 2.2;
  const DEBOUNCE_MS = 400;
  const OPACIDAD_MIN = 0.30;

  // Anclas frías: el río y grandes zonas verdes (densidad ~0)
  const ANCLAS_FRIAS = [
    [37.4080, -6.0130, 0.02, 'Guadalquivir Norte'],
    [37.3970, -6.0080, 0.02, 'Guadalquivir Centro'],
    [37.3850, -6.0020, 0.02, 'Guadalquivir Sur'],
    [37.3730, -5.9990, 0.02, 'Guadalquivir Triana Sur'],
    [37.3620, -5.9860, 0.02, 'Guadalquivir Entrenúcleos'],
    [37.4120, -6.0030, 0.05, 'Parque del Alamillo (refuerzo)'],
    [37.3770, -5.9870, 0.05, 'María Luisa (refuerzo)']
  ];

  let mapa = null;
  let capa = null;
  let activo = false;
  let temporizador = null;
  let ultimaTemp = null;

  /* ---- radio/blur adaptativos al zoom ---- */
  function radioParaZoom() {
    const z = mapa ? mapa.getZoom() : 12;
    const r = Math.round(15 * Math.pow(1.38, z - 12));
    return Math.max(16, Math.min(64, r));
  }

  /* ---- motor del campo térmico ---- */

  function fisicaActual() {
    if (typeof physCore === 'undefined' || typeof ATMOS === 'undefined') return null;
    if (ATMOS.src === 'init' || !ATMOS.T) return null;
    return physCore.compute(ATMOS.T, ATMOS.RH || 50, ATMOS.P || 1013, ATMOS.ws || 5, ATMOS.S_in || 0, 'urban');
  }

  async function temperaturaBase() {
    if (typeof ATMOS !== 'undefined' && ATMOS.src !== 'init' && ATMOS.T) return ATMOS.T;
    try {
      const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=37.389&longitude=-5.984&current=temperature_2m');
      const d = await r.json();
      const t = Number(d && d.current && d.current.temperature_2m);
      return isFinite(t) ? t : null;
    } catch (e) { return null; }
  }

  function densidadInterpolada(lat, lon, anclas) {
    let num = 0, den = 0;
    for (const [la, lo, d] of anclas) {
      const dist2 = (lat - la) * (lat - la) + (lon - lo) * (lon - lo);
      if (dist2 < 1e-8) return d;
      const w = 1 / Math.pow(dist2, IDW_POTENCIA / 2);
      num += d * w; den += w;
    }
    return den > 0 ? num / den : 0.6;
  }

  async function recalcular() {
    if (!activo || !mapa || typeof L === 'undefined' || typeof L.heatLayer !== 'function') return;

    const tBase = await temperaturaBase();
    if (tBase === null || !activo) return;
    const fis = fisicaActual();
    const deltaUHI = fis ? parseFloat(fis.delta_UHI) : 3.0;
    ultimaTemp = tBase;

    const bounds = mapa.getBounds();
    const anclas = (typeof HEAT_ZONES !== 'undefined' ? HEAT_ZONES : []).concat(ANCLAS_FRIAS);

    // Primera pasada: campo de UHI para conocer el rango real
    const celdas = [];
    let uMin = Infinity, uMax = -Infinity;
    for (let i = 0; i < REJILLA; i++) {
      for (let j = 0; j < REJILLA; j++) {
        const lat = bounds.getSouth() + (bounds.getNorth() - bounds.getSouth()) * (i + 0.5) / REJILLA;
        const lon = bounds.getWest() + (bounds.getEast() - bounds.getWest()) * (j + 0.5) / REJILLA;
        const uhi = deltaUHI * densidadInterpolada(lat, lon, anclas);
        celdas.push([lat, lon, uhi]);
        if (uhi < uMin) uMin = uhi;
        if (uhi > uMax) uMax = uhi;
      }
    }

    // Segunda pasada: normalización RELATIVA (contraste real del campo)
    const rango = (uMax - uMin) || 1;
    const puntos = celdas.map(([lat, lon, uhi]) => {
      const rel = (uhi - uMin) / rango;          // 0 = lo más fresco visible, 1 = lo más caliente
      const intensidad = Math.pow(rel, 1.25);     // realza las diferencias
      return [lat, lon, intensidad];
    });

    if (capa) { try { mapa.removeLayer(capa); } catch (e) {} }
    const radio = radioParaZoom();
    capa = L.heatLayer(puntos, {
      radius: radio, blur: Math.round(radio * 0.8), maxZoom: 18, minOpacity: OPACIDAD_MIN,
      // Base transparente: lo fresco NO tiñe; el color entra solo donde hay calor
      gradient: {
        0.00: 'rgba(0,255,140,0)',
        0.18: 'rgba(0,255,140,0.12)',
        0.35: 'rgba(180,255,0,0.28)',
        0.55: 'rgba(255,221,0,0.45)',
        0.75: 'rgba(255,136,0,0.62)',
        0.90: 'rgba(255,72,0,0.78)',
        1.00: 'rgba(255,30,0,0.88)'
      }
    }).addTo(mapa);

    actualizarPanel(tBase, deltaUHI, uMax);
  }

  /* ---- panel desplegable ---- */

  function crearPanel() {
    if (document.getElementById('microclima-panel')) return;
    const cont = document.getElementById('lmap');
    if (!cont) return;

    // CSS: nada fijo — el botón 👁 oculta TODOS los cuadros del mapa
    const css = document.createElement('style');
    css.textContent =
      '.mc-todo-oculto .leaflet-control-layers,' +
      '.mc-todo-oculto .uhi-legend,' +
      '.mc-todo-oculto #map-credits,' +
      '.mc-todo-oculto #microclima-panel { display:none !important; }' +
      '#mc-ojo { position:absolute; top:96px; left:10px; z-index:900; width:34px; height:34px;' +
      'border-radius:10px; border:1px solid rgba(0,240,255,.25); background:rgba(8,12,24,0.88);' +
      'color:#e8f0ff; cursor:pointer; font-size:15px; line-height:1; backdrop-filter:blur(6px); }';
    document.head.appendChild(css);

    const panel = document.createElement('div');
    panel.id = 'microclima-panel';
    panel.style.cssText = 'position:absolute;top:10px;left:52px;z-index:800;width:224px;' +
      'background:rgba(8,12,24,0.88);color:#e8f0ff;border:1px solid rgba(0,240,255,.25);' +
      'border-radius:12px;font-family:inherit;font-size:12px;backdrop-filter:blur(6px);' +
      'box-shadow:0 4px 18px rgba(0,0,0,.4);overflow:hidden;';

    panel.innerHTML =
      '<button id="mc-toggle-panel" style="width:100%;text-align:left;background:none;border:none;color:#e8f0ff;' +
      'padding:9px 12px;cursor:pointer;font-weight:600;font-size:12px;display:flex;justify-content:space-between;align-items:center;">' +
      '🌡️ Microclima urbano <span id="mc-chevron" style="opacity:.7">▸</span></button>' +
      '<div id="mc-cuerpo" style="display:none;padding:0 12px 10px 12px;">' +
      '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:4px 0;">' +
      '<input type="checkbox" id="mc-activar"> Mapa de calor continuo</label>' +
      '<div id="mc-datos" style="display:none;font-size:11px;line-height:1.5;opacity:.9;margin-top:4px;"></div>' +
      '<div id="mc-leyenda" style="display:none;margin-top:6px;">' +
      '<div style="height:8px;border-radius:4px;background:linear-gradient(90deg,rgba(0,255,140,.9),rgba(180,255,0,.9),rgba(255,221,0,.9),rgba(255,136,0,.9),rgba(255,40,0,.95));"></div>' +
      '<div style="display:flex;justify-content:space-between;font-size:10px;margin-top:2px;opacity:.8;"><span>fresco</span><span>más calor</span></div>' +
      '<div style="font-size:9px;opacity:0.7;margin-top:5px;line-height:1.3;">ⓘ Estimación por modelo físico (Stefan-Boltzmann + densidad real OSM + río/parques), no medición por satélite.</div>' +
      '</div></div>';

    cont.appendChild(panel);

    document.getElementById('mc-toggle-panel').addEventListener('click', () => {
      const cuerpo = document.getElementById('mc-cuerpo');
      const abierto = cuerpo.style.display !== 'none';
      cuerpo.style.display = abierto ? 'none' : 'block';
      document.getElementById('mc-chevron').textContent = abierto ? '▸' : '▾';
    });

    document.getElementById('mc-activar').addEventListener('change', (e) => {
      if (e.target.checked) encender(); else apagar();
    });

    // Botón ojo: oculta/muestra TODOS los cuadros fijos del mapa
    const ojo = document.createElement('button');
    ojo.id = 'mc-ojo';
    ojo.title = 'Ocultar/mostrar todos los paneles del mapa';
    ojo.textContent = '👁';
    cont.appendChild(ojo);
    ojo.addEventListener('click', () => {
      cont.classList.toggle('mc-todo-oculto');
      ojo.textContent = cont.classList.contains('mc-todo-oculto') ? '🚫' : '👁';
    });
  }

  /* ---- pliega la leyenda UHI fija (la envuelve con ▸/▾) ---- */
  function hacerLeyendaPlegable() {
    const leyenda = document.querySelector('#lmap .uhi-legend');
    if (!leyenda || leyenda.dataset.mcPlegable) return;
    leyenda.dataset.mcPlegable = '1';

    const hijos = Array.from(leyenda.childNodes);
    const cuerpo = document.createElement('div');
    cuerpo.className = 'uhi-legend-cuerpo';
    hijos.forEach(h => cuerpo.appendChild(h));

    const cab = document.createElement('button');
    cab.textContent = 'UHI (°C) ▸';
    cab.style.cssText = 'background:none;border:none;color:#00f0ff;font-size:10px;font-weight:700;' +
      'letter-spacing:2px;cursor:pointer;padding:0 0 4px 0;font-family:inherit;';

    leyenda.innerHTML = '';
    leyenda.appendChild(cab);
    leyenda.appendChild(cuerpo);
    cuerpo.style.display = 'none'; // plegada por defecto

    cab.addEventListener('click', () => {
      const abierto = cuerpo.style.display !== 'none';
      cuerpo.style.display = abierto ? 'none' : 'block';
      cab.textContent = abierto ? 'UHI (°C) ▸' : 'UHI (°C) ▾';
    });
  }

  function actualizarPanel(tBase, deltaUHI, uhiMax) {
    const datos = document.getElementById('mc-datos');
    const leyenda = document.getElementById('mc-leyenda');
    if (!datos) return;
    datos.style.display = 'block';
    leyenda.style.display = 'block';
    datos.innerHTML =
      'Aire ahora: <b>' + tBase.toFixed(1) + '°C</b><br>' +
      'Isla de calor máx.: <b>+' + uhiMax.toFixed(1) + '°C</b> en zonas densas<br>' +
      'Suelo urbano estimado: <b>hasta ' + (tBase + uhiMax).toFixed(0) + '°C</b>';
  }

  function encender() {
    activo = true;
    recalcular();
  }

  function apagar() {
    activo = false;
    if (capa && mapa) { try { mapa.removeLayer(capa); } catch (e) {} capa = null; }
    const datos = document.getElementById('mc-datos');
    const leyenda = document.getElementById('mc-leyenda');
    if (datos) datos.style.display = 'none';
    if (leyenda) leyenda.style.display = 'none';
  }

  function alMoverse() {
    if (!activo) return;
    clearTimeout(temporizador);
    temporizador = setTimeout(recalcular, DEBOUNCE_MS);
  }

  /* ---- arranque: espera a que el mapa Leaflet exista ---- */
  function iniciar() {
    try { mapa = (typeof leafMap !== 'undefined') ? leafMap : null; } catch (e) { mapa = null; }
    if (!mapa) { setTimeout(iniciar, 600); return; }

    crearPanel();
    mapa.on('moveend zoomend', alMoverse);

    // La leyenda UHI se crea en initMap(); la plegamos cuando aparezca
    const obs = setInterval(() => {
      hacerLeyendaPlegable();
      if (document.querySelector('#lmap .uhi-legend[data-mc-plegable]')) clearInterval(obs);
    }, 700);

    // Si cambian los datos meteorológicos, recalcula
    setInterval(() => {
      if (!activo) return;
      if (typeof ATMOS !== 'undefined' && ATMOS.T && ATMOS.T !== ultimaTemp) recalcular();
    }, 30000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();