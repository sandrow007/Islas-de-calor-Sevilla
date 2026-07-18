/**
 * ISLASDECALORSEVILLA.COM — Por qué nace esta web, su importancia para Sevilla y su futuro
 * Se auto-inserta como una NUEVA pestaña "ORIGEN" en el dashboard (junto a MAPA, CLIMA, etc.)
 * usando la misma funcion switchDashTab() que ya existe en la pagina.
 *
 * Postura sobre computacion cuantica: ciencia real, sin vender mitos.
 * - Hoy el "motor cuantico" de esta web es una SIMULACION CLASICA de un circuito cuantico
 *   pequeño (state vector, unas pocas puertas, medicion por regla de Born). Corre en el
 *   navegador con matematicas normales, no en un ordenador cuantico real.
 * - Eso es honesto y sigue siendo util: la forma de codificar variables fisicas como angulos
 *   de rotacion (angle feature map) es una tecnica real de aprendizaje automatico cuantico,
 *   aunque aqui se ejecute de forma simulada.
 * - El dia que la computacion cuantica en la nube sea accesible, estable y util para cargas de
 *   trabajo de este tamano (hoy no lo es: el ruido y el coste no compensan frente a un
 *   ordenador clasico para un problema tan pequeño), esta web esta pensada para poder migrar
 *   ese modulo a hardware cuantico real sin rehacer el resto del sistema. Eso es una promesa
 *   de arquitectura, no una promesa de magia.
 */
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  const HTML_PANEL = `
    <section class="card cm">
      <div class="chdr">
        <span class="cbdg">ORIGEN</span>
        <h2>POR QUÉ EXISTE ESTA WEB</h2>
      </div>
      <div style="font-size:.82rem; line-height:1.85; color:rgba(232,240,255,.85); text-transform:none; letter-spacing:normal;">
        <p style="margin-bottom:14px">Esta web nació de una pregunta muy concreta y muy sevillana: ¿por qué hay calles del
        centro de Sevilla que de noche siguen ardiendo como si fuera mediodía? El asfalto y el hormigón absorben calor
        durante el día y lo sueltan muy despacio, así que el alivio del atardecer nunca llega del todo en las zonas más
        construidas. Eso no es una sensación subjetiva: es física medible, y hasta hace poco no había una forma sencilla
        de verlo con datos reales, en el momento, sin ser ingeniero ni climatólogo.</p>

        <p style="margin-bottom:14px"><strong style="color:#00f0ff">Por qué le importa a Sevilla en concreto.</strong>
        Sevilla es, de forma recurrente, una de las capitales europeas con más días de calor extremo al año. Eso afecta
        a la salud de la gente mayor y de quien trabaja al aire libre, al gasto energético de cada casa, a cómo se
        diseñan las calles nuevas y a decisiones tan simples como en qué sombra sentarte a esperar el autobús. Una
        herramienta que traduzca ese problema a datos claros, gratuitos y abiertos no es un capricho tecnológico: es
        información de salud pública puesta al alcance de cualquiera, sin depender de que una institución decida
        publicarla primero.</p>

        <p style="margin-bottom:14px"><strong style="color:#00f0ff">Cómo debería crecer a partir de aquí.</strong>
        El siguiente paso realista no es más brillo ni más animaciones: es más precisión y más colaboración. Eso
        significa, con los pies en el suelo: sumar estaciones de referencia reales (barrios, colegios, centros de
        salud) en vez de depender solo de un punto central; contrastar el modelo con mediciones de campo cuando sea
        posible; y, sobre todo, ponerlo en manos de quien toma decisiones de verdad sobre el espacio público —
        urbanismo, salud pública, protección civil — para que un dato bien presentado ayude a decidir mejor dónde poner
        sombra, vegetación o pavimento claro. Crecer bien aquí es crecer en fiabilidad, no en efectos visuales.</p>

        <p style="margin-bottom:0"><strong style="color:#7b2fff">Sobre la parte cuántica: ciencia real, no venta de humo.</strong>
        Hoy en día, el "motor cuántico" de esta web es una <em>simulación clásica</em> de un circuito cuántico pequeño:
        corre con matemáticas normales en tu navegador, no en un ordenador cuántico de verdad. Eso no es un engaño, es
        honestidad: la forma de codificar temperatura, humedad o radiación como ángulos de rotación (una técnica real
        llamada <em>angle feature map</em>) es auténtica computación cuántica en su diseño, aunque hoy se ejecute de
        forma simulada, porque ejecutarla en hardware cuántico real, para un problema de este tamaño, todavía no aporta
        ninguna ventaja real frente a un ordenador normal — el ruido de las máquinas actuales lo penaliza más de lo que
        ayuda. El día que la computación cuántica en la nube sea estable, accesible y realmente útil para cálculos de
        este tipo, esta web está construida para poder mover esa pieza a hardware cuántico real sin rehacer el resto
        del sistema. Eso es lo único que se promete aquí: una arquitectura preparada para cuando la ciencia lo permita
        de verdad, no una fantasía de que ya está pasando.</p>
      </div>
    </section>
  `;

  function insertarPestana() {
    const tabs = document.getElementById('dtabs');
    const main = document.getElementById('dmain');
    if (!tabs || !main) return;
    if (document.getElementById('tabpanel-origen')) return;

    const boton = document.createElement('button');
    boton.className = 'dtab';
    boton.setAttribute('data-tab', 'origen');
    boton.innerHTML = '<span>ORIGEN</span>';
    boton.onclick = function () {
      if (typeof window.switchDashTab === 'function') window.switchDashTab('origen', boton);
    };
    tabs.appendChild(boton);

    const panel = document.createElement('div');
    panel.className = 'tab-panel';
    panel.id = 'tabpanel-origen';
    panel.innerHTML = HTML_PANEL;
    main.appendChild(panel);
  }

  ready(insertarPestana);
})();
