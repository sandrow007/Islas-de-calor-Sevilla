/* ============================================================
   MICROCLIMA URBANO SEVILLA — mapa de calor continuo (opcional)
   ------------------------------------------------------------
   Adaptado del módulo "Microclima Global" de Manolito Aire
   (MapLibre) a la arquitectura Leaflet de islasdecalorsevilla.com.

   Qué pinta: un mapa de calor CONTINUO sobre toda la ciudad
   (no solo los puntos), opcional y desplegable, usando:

     1) La física YA EXISTENTE de la web: physCore.compute()
        (Stefan-Boltzmann + Brutsaert) con el tiempo real (ATMOS)
     2) Las densidades REALES de HEAT_ZONES (ya calculadas desde
        OpenStreetMap) como anclas, interpoladas con IDW
     3) Anclas frías del Guadalquivir y grandes parques

   HONESTIDAD (criterio de la casa): esto es una ESTIMACIÓN por
   modelo, NO una medición por satélite. La leyenda lo dice claro.

   RENDIMIENTO: apagado por defecto. Solo calcula al activarlo y
   recalcula (con debounce) al mover el mapa o cambiar el tiempo.
   CERO llamadas extra a APIs si ATMOS ya tiene datos.
   ============================================================ */

(function () {
  'use strict';

  /* ---- CONSTANTES AJUSTABLES ---- */
  const REJILLA = 46;              // celdas por eje del campo interpolado
  const IDW_POTENCIA = 2.2;        // potencia de interpolación IDW
  const DEBOUNCE_MS = 400;
  const RADIO_HEAT = 55, BLUR_HEAT = 40, OPACIDAD_MIN = 0.35;

  // Anclas frías extra: el río y masas de agua/verde que enfrían
  // (densidad ~0 = sin isla de calor). Complementan HEAT_ZONES.
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

  /* ---- motor del campo térmico ---- */

  function fisicaActual() {
    // Usa EXACTAMENTE el mismo modelo que el resto de la web.
    if (typeof physCore === 'undefined' || typeof ATMOS === 'undefined') return null;
    if (ATMOS.src === 'init' || !ATMOS.T) return null;
    return physCore.compute(ATMOS.T, ATMOS.RH || 50, ATMOS.P || 1013, ATMOS.ws || 5, ATMOS.S_in || 0, 'urban');
  }

  async function temperaturaBase() {
    // 1) Preferir los datos reales que ya tiene la web (cero llamadas)
    if (typeof ATMOS !== 'undefined' && ATMOS.src !== 'init' && ATMOS.T) return ATMOS.T;
    // 2) Respaldo honesto: Open-Meteo (1 llamada)
    try {
      const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=37.389&longitude=-5.984&current=temperature_2m');
      const d = await r.json();
      const t = Number(d && d.current && d.current.temperature_2m);
      return isFinite(t) ? t : null;
    } catch (e) { return null; }
  }

  function densidadInterpolada(lat, lon, anclas) {
    // IDW: la densidad en un punto es la media ponderada por 1/d^p
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
    const deltaUHI = fis ? parseFloat(fis.delta_UHI) : 3.0; // respaldo si la física aún no está lista
    ultimaTemp = tBase;

    const bounds = mapa.getBounds();
    const anclas = (typeof HEAT_ZONES !== 'undefined' ? HEAT_ZONES : []).concat(ANCLAS_FRIAS);

    const puntos = [];
    let uhiMax = 0;
    for (let i = 0; i < REJILLA; i++) {
      for (let j = 0; j < REJILLA; j++) {
        const lat = bounds.getSouth() + (bounds.getNorth() - bounds.getSouth()) * (i + 0.5) / REJILLA;
        const lon = bounds.getWest() + (bounds.getEast() - bounds.getWest()) * (j + 0.5) / REJILLA;
        const dens = densidadInterpolada(lat, lon, anclas);
        const uhi = deltaUHI * dens;
        if (uhi > uhiMax) uhiMax = uhi;
        // Misma normalización que los puntos existentes de la web
        const intensidad = Math.max(0.08, Math.min(1, (uhi + 1) / 5.5));
        puntos.push([lat, lon, intensidad]);
      }
    }

    if (capa) { try { mapa.removeLayer(capa); } catch (e) {} }
    capa = L.heatLayer(puntos, {
      radius: RADIO_HEAT, blur: BLUR_HEAT, maxZoom: 17, minOpacity: OPACIDAD_MIN,
      gradient: { 0.0: 'rgba(0,255,140,.75)', 0.3: 'rgba(180,255,0,.78)', 0.55: 'rgba(255,221,0,.82)', 0.75: 'rgba(255,136,0,.85)', 1.0: 'rgba(255,40,0,.9)' }
    }).addTo(mapa);

    actualizarPanel(tBase, deltaUHI, uhiMax);
  }

  /* ---- panel desplegable ---- */

  function crearPanel() {
    if (document.getElementById('microclima-panel')) return;
    const cont = document.getElementById('lmap');
    if (!cont) return;

    const panel = document.createElement('div');
    panel.id = 'microclima-panel';
    panel.style.cssText = 'position:absolute;top:10px;left:10px;z-index:800;width:220px;' +
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

    cont.style.position = cont.style.position || 'relative';
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

    // Si cambian los datos meteorológicos, recalcula (sondeo ligero)
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