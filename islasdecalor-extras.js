/**
 * ISLASDECALORSEVILLA.COM — Módulo adicional (real, sin inventos)
 * Añade 3 cosas nuevas al dashboard SIN tocar el index.html más que con
 * una línea de <script> al final del body. Se auto-inserta en la pestaña "CLIMA".
 *
 * 1) Estación de referencia — Aeropuerto de Sevilla (San Pablo), tiempo real (Open-Meteo)
 * 2) Alerta temprana — modelo de 15 minutos de Open-Meteo (minutely_15), detecta
 *    cambios bruscos de viento/humedad en las próximas horas
 * 3) Curva de radiación solar del día — posición astronómica real (no inventada)
 *
 * NOTA HONESTA: no incluye "API 4D-Vent", "SwissMET", "satélites ATLAS-T/LEO-T" ni
 * "curva de Tsiolkovski" porque no son servicios ni fórmulas reales aplicables aquí.
 * Meter eso sería decorativo y falso, y esta web se basa en datos verificables.
 */
(function () {
  'use strict';

  const CIUDAD = { lat: 37.3826, lon: -5.9962 };       // Centro Sevilla (mismo que el motor principal)
  const AEROPUERTO = { lat: 37.4180, lon: -5.8931 };

  const translations = {
    es: {
      loading: 'Cargando datos reales...',
      card1_badge: 'AERO',
      card1_title: 'ESTACIÓN DE REFERENCIA · AEROPUERTO',
      card2_badge: 'A15',
      card2_title: 'ALERTA TEMPRANA · MODELO 15 MIN',
      card3_badge: 'SOL',
      card3_title: 'CURVA DE RADIACIÓN SOLAR · HOY',
      airport_comp_city: 'CENTRO SEVILLA',
      airport_comp_airport_name: 'AEROPUERTO SAN PABLO',
      airport_comp_diff: 'DIFERENCIA',
      airport_comp_wind: 'VIENTO AEROP.',
      airport_comp_footer: 'Comparación real entre el centro urbano y la estación del aeropuerto (superficie más despejada, sin efecto isla de calor). Diferencias grandes suelen indicar más calor urbano acumulado en el centro.',
      airport_comp_error: 'No se pudo cargar el aeropuerto ahora mismo.',
      warning_wind_change: 'MAYOR CAMBIO VIENTO (6H)',
      warning_time: 'HORA APROX.',
      warning_humidity_change: 'MAYOR CAMBIO HUMEDAD (6H)',
      warning_resolution: 'Resolución: cada 15 minutos, próximas 6 horas',
      warning_footer: 'Basado en el modelo real de 15 minutos de Open-Meteo. Cambios grandes y rápidos de viento o humedad suelen anticipar la entrada de un frente, tormenta o cambio brusco de sensación térmica.',
      warning_error: 'Modelo de 15 minutos no disponible ahora mismo.',
      solar_footer: 'Radiación solar de hoy (0h–24h), calculada con la posición astronómica real del sol sobre Sevilla. La línea vertical marca la hora actual.'
    },
    en: {
      loading: 'Loading real data...',
      card1_badge: 'AERO',
      card1_title: 'REFERENCE STATION · AIRPORT',
      card2_badge: 'A15',
      card2_title: 'EARLY WARNING · 15 MIN MODEL',
      card3_badge: 'SUN',
      card3_title: 'SOLAR RADIATION CURVE · TODAY',
      airport_comp_city: 'SEVILLE CENTER',
      airport_comp_airport_name: 'SAN PABLO AIRPORT',
      airport_comp_diff: 'DIFFERENCE',
      airport_comp_wind: 'AIRPORT WIND',
      airport_comp_footer: 'Real comparison between the urban center and the airport station (clearer surface, no heat island effect). Large differences usually indicate more accumulated urban heat in the center.',
      airport_comp_error: 'Could not load airport data right now.',
      warning_wind_change: 'MAX WIND CHANGE (6H)',
      warning_time: 'APPROX. TIME',
      warning_humidity_change: 'MAX HUMIDITY CHANGE (6H)',
      warning_resolution: 'Resolution: every 15 minutes, next 6 hours',
      warning_footer: 'Based on the real 15-minute model from Open-Meteo. Large and rapid changes in wind or humidity often anticipate the arrival of a front, storm, or a sudden change in thermal sensation.',
      warning_error: '15-minute model not available right now.',
      solar_footer: "Today's solar radiation (0h–24h), calculated using the real astronomical position of the sun over Seville. The vertical line marks the current time."
    }
  };

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function getLang() {
    const lang = navigator.language || navigator.userLanguage || 'es';
    return lang.split('-')[0];
  }

  function getTexts() {
    const lang = getLang();
    return translations[lang] || translations.es;
  }

  function crearCard(id, badge, titulo, T) {
    const section = document.createElement('section');
    section.className = 'card cw';
    section.id = id;
    section.innerHTML = `
      <div class="chdr">
        <span class="cbdg">${badge}</span>
        <h2>${titulo}</h2>
        <div class="ldw"><span class="ld"></span><span>Open-Meteo</span></div>
      </div>
      <div class="extras-body" id="${id}-body">
        <div class="ci">${T.loading}</div>
      </div>
    `;
    return section;
  }

  function montarEnPestanaClima(nodos) {
    const contenedor = document.getElementById('tabpanel-clima') || document.body;
    nodos.forEach(n => contenedor.appendChild(n));
  }

  // ---------------------------------------------------------------
  // 1) ESTACIÓN DE REFERENCIA: AEROPUERTO SAN PABLO vs CENTRO SEVILLA
  // ---------------------------------------------------------------
  async function cargarComparacionAeropuerto(bodyEl, T) {
    try {
      const urlCiudad = `https://api.open-meteo.com/v1/forecast?latitude=${CIUDAD.lat}&longitude=${CIUDAD.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m`;
      const urlAero = `https://api.open-meteo.com/v1/forecast?latitude=${AEROPUERTO.lat}&longitude=${AEROPUERTO.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m`;
      const [rCiudad, rAero] = await Promise.all([fetch(urlCiudad), fetch(urlAero)]);
      const dCiudad = (await rCiudad.json()).current;
      const dAero = (await rAero.json()).current;
      const diff = (dCiudad.temperature_2m - dAero.temperature_2m).toFixed(1);

      bodyEl.innerHTML = `
        <div class="dgr">
          <div class="di"><div class="dl">${T.airport_comp_city}</div><div class="dv">${dCiudad.temperature_2m.toFixed(1)}<span class="du">°C</span></div></div>
          <div class="di"><div class="dl">${T.airport_comp_airport_name.toUpperCase()}</div><div class="dv">${dAero.temperature_2m.toFixed(1)}<span class="du">°C</span></div></div>
          <div class="di"><div class="dl">${T.airport_comp_diff}</div><div class="dv">${diff > 0 ? '+' : ''}${diff}<span class="du">°C</span></div></div>
          <div class="di"><div class="dl">${T.airport_comp_wind}</div><div class="dv">${dAero.wind_speed_10m.toFixed(0)}<span class="du">km/h</span></div></div>
        </div>
        <div class="ci">${T.airport_comp_footer}</div>
      `;
    } catch (e) {
      bodyEl.innerHTML = `<div class="ci">${T.airport_comp_error}</div>`;
    }
  }

  // ---------------------------------------------------------------
  // 2) ALERTA TEMPRANA: modelo de 15 minutos (minutely_15 real de Open-Meteo)
  // ---------------------------------------------------------------
  async function cargarAlertaTemprana(bodyEl, T) {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${CIUDAD.lat}&longitude=${CIUDAD.lon}&minutely_15=wind_speed_10m,relative_humidity_2m&forecast_days=1&timezone=auto`;
      const res = await fetch(url);
      const data = await res.json();
      const m15 = data.minutely_15;
      if (!m15 || !m15.time) throw new Error('sin datos minutely_15');

      const viento = m15.wind_speed_10m;
      const hum = m15.relative_humidity_2m;

      // Detecta el mayor salto entre puntos consecutivos en las próximas 6h (24 puntos de 15 min)
      let maxSaltoViento = 0, maxSaltoHum = 0, horaSaltoViento = '', horaSaltoHum = '';
      const ahora = new Date();
      const idxInicio = m15.time.findIndex(t => new Date(t) >= ahora);
      const ventana = Math.max(0, idxInicio);
      for (let i = ventana; i < Math.min(ventana + 24, viento.length - 1); i++) {
        const saltoV = Math.abs(viento[i + 1] - viento[i]);
        const saltoH = Math.abs(hum[i + 1] - hum[i]);
        if (saltoV > maxSaltoViento) { maxSaltoViento = saltoV; horaSaltoViento = m15.time[i + 1]; }
        if (saltoH > maxSaltoHum) { maxSaltoHum = saltoH; horaSaltoHum = m15.time[i + 1]; }
      }
      const fmt = t => t ? new Date(t).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '--';
      const nivel = (maxSaltoViento > 8 || maxSaltoHum > 15) ? 'dq-lo' : (maxSaltoViento > 4 || maxSaltoHum > 8) ? 'dq-md' : 'dq-hi';

      bodyEl.innerHTML = `
        <div class="dgr">
          <div class="di"><div class="dl">${T.warning_wind_change}</div><div class="dv">${maxSaltoViento.toFixed(1)}<span class="du">km/h</span></div></div>
          <div class="di"><div class="dl">${T.warning_time}</div><div class="dv" style="font-size:1rem">${fmt(horaSaltoViento)}</div></div>
          <div class="di"><div class="dl">${T.warning_humidity_change}</div><div class="dv">${maxSaltoHum.toFixed(0)}<span class="du">%</span></div></div>
          <div class="di"><div class="dl">${T.warning_time}</div><div class="dv" style="font-size:1rem">${fmt(horaSaltoHum)}</div></div>
        </div>
        <div class="dqb ${nivel}" style="margin-top:8px;display:inline-block">${T.warning_resolution}</div>
        <div class="ci">${T.warning_footer}</div>
      `;
    } catch (e) {
      bodyEl.innerHTML = `<div class="ci">${T.warning_error}</div>`;
    }
  }

  // ---------------------------------------------------------------
  // 3) CURVA DE RADIACIÓN SOLAR DEL DÍA (posición astronómica real)
  // ---------------------------------------------------------------
  function solarGHI(lat_deg, lon_deg, fecha) {
    const doy = Math.floor((fecha - new Date(fecha.getFullYear(), 0, 0)) / 86400000);
    const B = 2 * Math.PI * (doy - 1) / 365;
    const decl = 0.006918 - 0.399912 * Math.cos(B) + 0.070257 * Math.sin(B) - 0.006758 * Math.cos(2 * B) + 0.000907 * Math.sin(2 * B);
    const EqT = 229.18 * (0.000075 + 0.001868 * Math.cos(B) - 0.032077 * Math.sin(B) - 0.014615 * Math.cos(2 * B) - 0.04089 * Math.sin(2 * B));
    const UTC_h = fecha.getUTCHours() + fecha.getUTCMinutes() / 60;
    const solar_h = UTC_h + lon_deg / 15 + EqT / 60;
    const hourAngle = (solar_h - 12) * 15 * Math.PI / 180;
    const lat = lat_deg * Math.PI / 180;
    const sinElev = Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(hourAngle);
    if (sinElev <= 0) return 0;
    const zenithDeg = 90 - Math.asin(sinElev) * 180 / Math.PI;
    const AM = 1 / (sinElev + 0.50572 * Math.pow(96.07995 - zenithDeg, -1.6364));
    const tau_b = 0.56 * (Math.exp(-0.65 * Math.min(AM, 30)) + Math.exp(-0.095 * Math.min(AM, 30)));
    return Math.max(0, 1361 * tau_b * sinElev);
  }

  function dibujarCurvaRadiacion(canvas) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.offsetWidth || 320;
    const H = canvas.height = 130;
    const hoy = new Date();
    const puntos = [];
    for (let h = 0; h < 24; h += 0.25) {
      const t = new Date(hoy); t.setHours(Math.floor(h), (h % 1) * 60, 0, 0);
      puntos.push(solarGHI(CIUDAD.lat, CIUDAD.lon, t));
    }
    const max = Math.max(...puntos, 1);
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(0,240,255,.08)';
    for (let i = 0; i <= 4; i++) {
      const y = H - 10 - (i / 4) * (H - 20);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, '#7b2fff'); grad.addColorStop(.5, '#00f0ff'); grad.addColorStop(1, '#ffd745');
    ctx.strokeStyle = grad; ctx.lineWidth = 2; ctx.beginPath();
    puntos.forEach((v, i) => {
      const x = (i / (puntos.length - 1)) * W;
      const y = H - 10 - (v / max) * (H - 20);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    // marca la hora actual
    const horaActual = hoy.getHours() + hoy.getMinutes() / 60;
    const xNow = (horaActual / 24) * W;
    ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(xNow, 0); ctx.lineTo(xNow, H); ctx.stroke();
    ctx.setLineDash([]);
  }

  function cargarCurvaRadiacion(bodyEl, T) {
    bodyEl.innerHTML = `<canvas id="canvas-radiacion-dia" style="width:100%;height:130px;display:block"></canvas>
      <div class="ci">${T.solar_footer}</div>`;
    dibujarCurvaRadiacion(document.getElementById('canvas-radiacion-dia'));
  }

  // ---------------------------------------------------------------
  ready(() => {
    const T = getTexts();

    const cAero = crearCard('extra-aeropuerto', T.card1_badge, T.card1_title, T);
    const cAlerta = crearCard('extra-alerta', T.card2_badge, T.card2_title, T);
    const cRad = crearCard('extra-radiacion', T.card3_badge, T.card3_title, T);

    montarEnPestanaClima([cAero, cAlerta, cRad]);

    cargarComparacionAeropuerto(document.getElementById('extra-aeropuerto-body'), T);
    cargarAlertaTemprana(document.getElementById('extra-alerta-body'), T);
    cargarCurvaRadiacion(document.getElementById('extra-radiacion-body'), T);

    // refresco cada 5 minutos, igual que el resto del dashboard
    setInterval(() => cargarComparacionAeropuerto(document.getElementById('extra-aeropuerto-body'), T), 300000);
    setInterval(() => cargarAlertaTemprana(document.getElementById('extra-alerta-body'), T), 300000);
  });
})();
