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

  const translations = {
    es: {
      tab: 'ORIGEN',
      badge: 'ORIGEN',
      title: 'POR QUÉ EXISTE ESTA WEB',
      p1: 'Esta página nace de andar por la calle, no delante de una pantalla. Quien vive en Sevilla sabe lo que es salir a las tantas en agosto y notar cómo el suelo te escupe el calor que ha estado chupando todo el día. Eso no es una manía tuya: el asfalto y el cemento funcionan como una estufa invisible que se carga de día y se vacía de noche. El problema es que hasta ahora no había manera de verlo claro, en un mapa y sin tener que estudiar una carrera. Por eso monté esto.',
      h2: 'Un problema que nos toca el bolsillo y la salud.',
      p2: 'El calorón no es solo incómodo; es peligroso. Afecta a quién puede salir a la calle sin jugarse un golpe de calor, a lo que pagamos de aire acondicionado y a cómo se diseñan los barrios (¿por qué en unos achicharra y en otros se puede respirar?). Poner estos datos a la vista de todos no es postureo tecnológico, es darle a la gente información que necesitamos hoy, sin esperar mil años a que alguien decida hacerlo oficial.',
      h3: 'Hacia dónde vamos.',
      p3: 'El siguiente paso no es llenar la pantalla de lucecitas. Es afinar la puntería: instalar medidores de verdad en distintos puntos de Sevilla, comparar lo que dice el modelo con lo que pasa en la calle, y que esta herramienta sirva de algo a quienes deciden dónde plantar un árbol, poner un toldo o mandar una alerta por calor extremo. Crecer bien es ser cada vez más fiable, no más vistoso.',
      h4: 'Y lo de la cuántica, sin cuentos.',
      p4: 'Aquí no estamos vendiendo humo. Ahora mismo, el “motor cuántico” de la web es una simulación que corre en tu propio navegador con matemáticas de las de siempre. No hay un ordenador cuántico de verdad detrás, y eso es justo lo más honesto que podemos hacer: la tecnología cuántica real hoy es cara, ruidosa y no daría mejores resultados. Pero la forma en que el sistema entiende los datos (temperatura, humedad…) está preparada para el día que esa nube cuántica funcione de forma estable y barata. Ese día, cambiamos la simulación por el hardware real y ya está. Mientras tanto, ciencia de la buena, fantasía cero.'
    },
    en: {
      tab: 'ORIGIN',
      badge: 'ORIGIN',
      title: 'WHY THIS WEBSITE EXISTS',
      p1: "This page was born from walking the streets, not from sitting in front of a screen. Anyone who lives in Seville knows what it's like to go out late in August and feel the ground spit back the heat it has been absorbing all day. That's not just in your head: asphalt and concrete act like an invisible heater that charges up during the day and releases at night. The problem is that until now, there was no way to see it clearly, on a map, and without needing a degree. That's why I built this.",
      h2: 'A problem that affects our wallets and our health.',
      p2: "The intense heat isn't just uncomfortable; it's dangerous. It affects who can go outside without risking heatstroke, what we pay for air conditioning, and how neighborhoods are designed (why is it scorching in some and breathable in others?). Making this data visible to everyone isn't a tech gimmick; it's giving people information we need today, without waiting a thousand years for someone to make it official.",
      h3: 'Where we are headed.',
      p3: "The next step isn't to fill the screen with flashy lights. It's to improve accuracy: install real sensors in different parts of Seville, compare the model's predictions with what's happening on the street, and make this tool useful for those who decide where to plant a tree, put up an awning, or issue an extreme heat alert. To grow well is to become more reliable, not more flashy.",
      h4: 'And about the quantum stuff, no fairy tales.',
      p4: "We're not selling snake oil here. Right now, the website's \"quantum engine\" is a simulation that runs in your own browser using regular math. There's no real quantum computer behind it, and that's honestly the best we can do: real quantum technology today is expensive, noisy, and wouldn't give better results. But the way the system understands the data (temperature, humidity...) is prepared for the day that quantum cloud computing becomes stable and cheap. On that day, we'll swap the simulation for real hardware, and that's it. In the meantime, good science, zero fantasy."
    }
  };

  function getLang() {
    const lang = navigator.language || navigator.userLanguage || 'es';
    return lang.split('-')[0];
  }

  function getTexts() {
    const lang = getLang();
    return translations[lang] || translations.es;
  }

  function insertarPestana() {
    const tabs = document.getElementById('dtabs');
    const main = document.getElementById('dmain');
    if (!tabs || !main) return;
    if (document.getElementById('tabpanel-origen')) return;

    const T = getTexts();

    const boton = document.createElement('button');
    boton.className = 'dtab';
    boton.setAttribute('data-tab', 'origen');
    boton.innerHTML = `<span>${T.tab}</span>`;
    boton.onclick = function () {
      if (typeof window.switchDashTab === 'function') window.switchDashTab('origen', boton);
    };
    tabs.appendChild(boton);

    const panel = document.createElement('div');
    panel.className = 'tab-panel';
    panel.id = 'tabpanel-origen';
    panel.innerHTML = `
    <section class="card cm">
      <div class="chdr">
        <span class="cbdg">${T.badge}</span>
        <h2>${T.title}</h2>
      </div>
      <div style="font-size:.82rem; line-height:1.85; color:rgba(232,240,255,.85); text-transform:none; letter-spacing:normal;">
        <p style="margin-bottom:14px">${T.p1}</p>

        <p style="margin-bottom:14px"><strong style="color:#00f0ff">${T.h2}</strong>
        ${T.p2}</p>

        <p style="margin-bottom:14px"><strong style="color:#00f0ff">${T.h3}</strong>
        ${T.p3}</p>

        <p style="margin-bottom:0"><strong style="color:#7b2fff">${T.h4}</strong>
        ${T.p4}</p>
      </div>
    </section>
  `;
    main.appendChild(panel);
  }

  ready(insertarPestana);
})();
