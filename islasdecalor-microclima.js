/* ============================================================
   MICROCLIMA URBANO SEVILLA v3.1 — campo térmico estilo meteoblue
   con tonalidades Manolit∞
   ------------------------------------------------------------
   Cambios v3:
   - Adiós leaflet.heat (manchas redondas = manta). Ahora el campo
     se dibuja PÍXEL A PÍXEL con interpolación bilineal sobre la
     rejilla IDW: degradado suave y continuo estilo meteoblue.
   - Translúcido de verdad: las calles se leen debajo.
   - Paleta Manolit∞: teal (fresco) → cian → violeta → magenta
     → rojo intenso (más calor). Nada de semáforo genérico.
   - Leyenda con rango real en °C dentro del panel desplegable.
   - Sigue sin haber nada fijo: panel ▸/▾, leyenda UHI plegable
     y botón 👁 que oculta TODOS los cuadros del mapa.
   ============================================================ */

(function () {
  'use strict';

  /* ---- CONSTANTES AJUSTABLES ---- */
  const REJILLA = 56;              // celdas por eje del campo (física)
  const RES_CANVAS = 320;          // resolución del lienzo dibujado
  const IDW_POTENCIA = 2.2;
  const DEBOUNCE_MS = 350;
  const CURVA = 1.6;               // realce de contraste (>1 = más contraste)

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

  // Paleta Manolit∞: paradas [posición 0..1, r, g, b, alpha 0..255]
  // Alphas bajos hasta la zona caliente: solo los focos de calor brillan,
  // el resto deja ver el mapa (nada de manta uniforme).
  const PALETA = [
    [0.00,   0, 255, 200,   0],   // teal, invisible (fresco)
    [0.30,   0, 240, 255,  14],   // cian Manolito, velo suave
    [0.52, 123,  47, 255,  38],   // violeta
    [0.72, 255,   0, 229,  72],   // magenta
    [0.87, 255, 106,  60, 104],   // coral caliente
    [1.00, 255,  40,   0, 132]    // rojo intenso (máximo calor)
  ];

  let mapa = null;
  let capaImagen = null;
  let lienzo = null;
  let activo = false;
  let temporizador = null;
  let ultimaTemp = null;

  /* ---- color de la paleta para v en 0..1 ---- */
  function colorPaleta(v) {
    v = Math.max(0, Math.min(1, v));
    for (let i = 1; i < PALETA.length; i++) {
      if (v <= PALETA[i][0]) {
        const [p0, r0, g0, b0, a0] = PALETA[i - 1];
        const [p1, r1, g1, b1, a1] = PALETA[i];
        const f = (v - p0) / (p1 - p0 || 1);
        return [
          Math.round(r0 + (r1 - r0) * f),
          Math.round(g0 + (g1 - g0) * f),
          Math.round(b0 + (b1 - b0) * f),
          Math.round(a0 + (a1 - a0) * f)
        ];
      }
    }
    const p = PALETA[PALETA.length - 1];
    return [p[1], p[2], p[3], p[4]];
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

  /* ---- dibujo píxel a píxel (bilineal sobre la rejilla) ---- */
  function pintarCampo(grid, n, bounds) {
    if (!lienzo) {
      lienzo = document.createElement('canvas');
      lienzo.width = RES_CANVAS; lienzo.height = RES_CANVAS;
    }
    const ctx = lienzo.getContext('2d');
    const img = ctx.createImageData(RES_CANVAS, RES_CANVAS);
    const px = img.data;
    const paso = (n - 1) / (RES_CANVAS - 1);

    for (let y = 0; y < RES_CANVAS; y++) {
      const gy = y * paso;
      const y0 = Math.floor(gy), y1 = Math.min(n - 1, y0 + 1);
      const fy = gy - y0;
      for (let x = 0; x < RES_CANVAS; x++) {
        const gx = x * paso;
        const x0 = Math.floor(gx), x1 = Math.min(n - 1, x0 + 1);
        const fx = gx - x0;
        const v = grid[y0][x0] * (1 - fx) * (1 - fy) + grid[y0][x1] * fx * (1 - fy)
                + grid[y1][x0] * (1 - fx) * fy + grid[y1][x1] * fx * fy;
        const [r, g, b, a] = colorPaleta(v);
        const k = (y * RES_CANVAS + x) * 4;
        px[k] = r; px[k + 1] = g; px[k + 2] = b; px[k + 3] = a;
      }
    }
    ctx.putImageData(img, 0, 0);

    const url = lienzo.toDataURL('image/png');
    const b = [[bounds.getSouth(), bounds.getWest()], [bounds.getNorth(), bounds.getEast()]];
    if (capaImagen) {
      capaImagen.setUrl(url);
      capaImagen.setBounds(b);
    } else {
      capaImagen = L.imageOverlay(url, b, { opacity: 1, interactive: false, zIndex: 350 }).addTo(mapa);
    }
  }

  async function recalcular() {
    if (!activo || !mapa || typeof L === 'undefined') return;

    const tBase = await temperaturaBase();
    if (tBase === null || !activo) return;
    const fis = fisicaActual();
    const deltaUHI = fis ? parseFloat(fis.delta_UHI) : 3.0;
    ultimaTemp = tBase;

    const bounds = mapa.getBounds();
    const anclas = (typeof HEAT_ZONES !== 'undefined' ? HEAT_ZONES : []).concat(ANCLAS_FRIAS);

    // Rejilla física: valor UHI por celda
    const crudo = [];
    let uMin = Infinity, uMax = -Infinity;
    for (let i = 0; i < REJILLA; i++) {
      crudo[i] = [];
      for (let j = 0; j < REJILLA; j++) {
        const lat = bounds.getSouth() + (bounds.getNorth() - bounds.getSouth()) * (i + 0.5) / REJILLA;
        const lon = bounds.getWest() + (bounds.getEast() - bounds.getWest()) * (j + 0.5) / REJILLA;
        const uhi = deltaUHI * densidadInterpolada(lat, lon, anclas);
        crudo[i][j] = uhi;
        if (uhi < uMin) uMin = uhi;
        if (uhi > uMax) uMax = uhi;
      }
    }

    // Normalización relativa con curva de contraste
    const rango = (uMax - uMin) || 1;
    const grid = crudo.map(fila => fila.map(uhi => Math.pow((uhi - uMin) / rango, CURVA)));

    pintarCampo(grid, REJILLA, bounds);
    actualizarPanel(tBase, uMin, uMax);
  }

  /* ---- panel desplegable ---- */

  function crearPanel() {
    if (document.getElementById('microclima-panel')) return;
    const cont = document.getElementById('lmap');
    if (!cont) return;

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

    const gradCSS = 'linear-gradient(90deg,' +
      PALETA.map(p => `rgba(${p[1]},${p[2]},${p[3]},${(p[4] / 128).toFixed(2)}) ${(p[0] * 100).toFixed(0)}%`).join(',') + ')';

    panel.innerHTML =
      '<button id="mc-toggle-panel" style="width:100%;text-align:left;background:none;border:none;color:#e8f0ff;' +
      'padding:9px 12px;cursor:pointer;font-weight:600;font-size:12px;display:flex;justify-content:space-between;align-items:center;">' +
      '🌡️ Microclima urbano <span id="mc-chevron" style="opacity:.7">▸</span></button>' +
      '<div id="mc-cuerpo" style="display:none;padding:0 12px 10px 12px;">' +
      '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:4px 0;">' +
      '<input type="checkbox" id="mc-activar"> Mapa de calor continuo</label>' +
      '<div id="mc-datos" style="display:none;font-size:11px;line-height:1.5;opacity:.9;margin-top:4px;"></div>' +
      '<div id="mc-leyenda" style="display:none;margin-top:6px;">' +
      '<div style="height:8px;border-radius:4px;background:' + gradCSS + ';"></div>' +
      '<div id="mc-rango" style="display:flex;justify-content:space-between;font-size:10px;margin-top:2px;opacity:.8;"><span></span><span></span></div>' +
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
    cuerpo.style.display = 'none';

    cab.addEventListener('click', () => {
      const abierto = cuerpo.style.display !== 'none';
      cuerpo.style.display = abierto ? 'none' : 'block';
      cab.textContent = abierto ? 'UHI (°C) ▸' : 'UHI (°C) ▾';
    });
  }

  function actualizarPanel(tBase, uMin, uMax) {
    const datos = document.getElementById('mc-datos');
    const leyenda = document.getElementById('mc-leyenda');
    const rango = document.getElementById('mc-rango');
    if (!datos) return;
    datos.style.display = 'block';
    leyenda.style.display = 'block';
    datos.innerHTML =
      'Aire ahora: <b>' + tBase.toFixed(1) + '°C</b><br>' +
      'Isla de calor máx.: <b>+' + uMax.toFixed(1) + '°C</b> en zonas densas<br>' +
      'Suelo urbano estimado: <b>hasta ' + (tBase + uMax).toFixed(0) + '°C</b>';
    if (rango) {
      rango.children[0].textContent = (tBase + uMin).toFixed(0) + '°C';
      rango.children[1].textContent = (tBase + uMax).toFixed(0) + '°C';
    }
  }

  function encender() {
    activo = true;
    recalcular();
  }

  function apagar() {
    activo = false;
    if (capaImagen && mapa) { try { mapa.removeLayer(capaImagen); } catch (e) {} capaImagen = null; }
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

    const obs = setInterval(() => {
      hacerLeyendaPlegable();
      if (document.querySelector('#lmap .uhi-legend[data-mc-plegable]')) clearInterval(obs);
    }, 700);

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