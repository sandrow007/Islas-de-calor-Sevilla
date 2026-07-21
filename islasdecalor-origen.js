/**
 * ISLASDECALORSEVILLA.COM — Por qué nace esta web, su importancia para Sevilla y su futuro
 * Se auto-inserta como una NUEVA pestaña "ORIGEN" en el dashboard (junto a MAPA, CLIMA, etc.)
 * usando la misma funcion switchDashTab() que ya existe en la pagina.
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
        <p style="margin-bottom:14px">Esta página nace de andar por la calle, no delante de una pantalla. Quien vive en Sevilla sabe lo que es salir a las tantas en agosto y notar cómo el suelo te escupe el calor que ha estado chupando todo el día. Eso no es una manía tuya: el asfalto y el cemento funcionan como una estufa invisible que se carga de día y se vacía de noche. El problema es que hasta ahora no había manera de verlo claro, en un mapa y sin tener que estudiar una carrera. Por eso monté esto.</p>

        <p style="margin-bottom:14px"><strong style="color:#00f0ff">Un problema que nos toca el bolsillo y la salud.</strong>
        El calorón no es solo incómodo; es peligroso. Afecta a quién puede salir a la calle sin jugarse un golpe de calor, a lo que pagamos de aire acondicionado y a cómo se diseñan los barrios (¿por qué en unos achicharra y en otros se puede respirar?). Poner estos datos a la vista de todos no es postureo tecnológico, es darle a la gente información que necesitamos hoy, sin esperar mil años a que alguien decida hacerlo oficial.</p>

        <p style="margin-bottom:14px"><strong style="color:#00f0ff">Hacia dónde vamos.</strong>
        El siguiente paso no es llenar la pantalla de lucecitas. Es afinar la puntería: instalar medidores de verdad en distintos puntos de Sevilla, comparar lo que dice el modelo con lo que pasa en la calle, y que esta herramienta sirva de algo a quienes deciden dónde plantar un árbol, poner un toldo o mandar una alerta por calor extremo. Crecer bien es ser cada vez más fiable, no más vistoso.</p>

        <p style="margin-bottom:0"><strong style="color:#7b2fff">Y lo de la cuántica, sin cuentos.</strong>
        Aquí no estamos vendiendo humo. Ahora mismo, el “motor cuántico” de la web es una simulación que corre en tu propio navegador con matemáticas de las de siempre. No hay un ordenador cuántico de verdad detrás, y eso es justo lo más honesto que podemos hacer: la tecnología cuántica real hoy es cara, ruidosa y no daría mejores resultados. Pero la forma en que el sistema entiende los datos (temperatura, humedad…) está preparada para el día que esa nube cuántica funcione de forma estable y barata. Ese día, cambiamos la simulación por el hardware real y ya está. Mientras tanto, ciencia de la buena, fantasía cero.</p>
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