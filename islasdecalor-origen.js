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
    },
    ca: {
      tab: 'ORIGEN',
      badge: 'ORIGEN',
      title: 'PER QUÈ EXISTEIX AQUESTA PÀGINA',
      p1: 'Aquesta pàgina s\'ha format caminant per les carreres, no davant d\'una pantalla. Qui viu a Sevilla sap què és sortir a les vuit de la nit a l\'agost i sentir com el terra et escupa el calor que ha estat absorbint tot el dia. Això no és una mania teva: l\'asfalt i el cement funcionen com una estufa invisible que s\'omple durant el dia i es buida de nit. El problema és que fins ara no havia manera de veure-ho clar, en un mapa i sense haver d\'estudiar una carrera. Per això vaig fer això.',
      h2: 'Un problema que ens toca el borsa i la salut.',
      p2: 'El caloró no és només incòmode; és perillos. Afecta a qui pot sortir a la carrer sense fer-se un calors, a el que paguem d\'aire condicionat i a com es dissenyen els barris (per què en uns s\'achicharra i en altres es pot respirar?). Pujar aquestes dades a la vista de tots no és un gest tecnològic de postura; és donar a la gent la informació que necessitem avui, sense esperar mil anys que algú decideixi fer-ho oficial.',
      h3: 'On anem?',
      p3: 'El proper pas no és omplir la pantalla de llums brillants. És afinar la precisió: instal·lar sensors reals en diferents punts de Sevilla, comparar el model amb el que passa a la carrer, i que aquesta eina servís per a qui decideix on plantar un arbre, posar un toldo o enviar una alerta de calor extrem. Crescement bona és ser cada vegada més fiable, no més brillant.',
      h4: 'I l\'òr de la cuántica, sense contes.',
      p4: 'Aquí no estem vendent hum. Avui, el «motor quàntic» de la web és una simulació que corre en el teu propi navegador amb matemàtiques de sempre. No hi ha un ordinador quàntic real darrere, i això és l\'honestitat possible: la tecnologia quàntica real avui és cara, sorollosa i no donaria millors resultats. Però la manera com el sistema entén els dades (temperatura, humitat...) està preparada per al dia que aquesta nube quàntica funcioni de manera estable i barata. Aquell dia, canviem la simulació per hardware real i ja està. Mentre això, ciència bona, fantasia zero.'
    },
    gl: {
      tab: 'ORIGEN',
      badge: 'ORIGEN',
      title: 'POR QUÉ EXISTE ESTA PÁXINA',
      p1: 'Esta páxina nace de camiñar pola rúa, non diante dunha pantalla. Quien vive en Sevilla sabe o que é saír a horas avanzadas en agosto e sentir como o suelo te escupa o calor que ha estado absorbendo todo o día. Iso non é unha manía teva: o asfalto e o cemento funcionan coma unha estufa invisible que se carga de día e se vacía de noite. O problema é que ata agora non había maneira de verlo claro, nun mapa e sen ter que estudar unha carrera. Por iso monté isto.',
      h2: 'Un problema que nos toca o bolso e a saúde.',
      p2: 'O calorón non é só incómodo; é perigoso. Afecta a qui pode saír á rúa sen correr un golpe de calor, a o que pagamos de aire condicionado e a como se disen os barrios (por qué en uns achicharra e en outros se pode respirar?). Poner estes datos a vista de todos non é un postura tecnolóxica, é dar á gent a información que necesitamos hoxe, sen esperar mil anos a que alguén decida facelo oficial.',
      h3: 'On anem?',
      p3: 'O seguinte paso non é omplir a pantalla de lucecitas. É afinar a puntería: instalar medidores de verdade en distintos puntos de Sevilla, comparar o que di o modelo co que pasa na rúa, e que esta ferramenta sirva de algo a quen decide onde plantar un árbol, posar un toldo ou mandar un alerta por calor extremo. Crescement boa é ser cada vez máis fiable, non máis vistoso.',
      h4: 'E a cuántica, sin contos.',
      p4: 'Aquí non estamos vendendo humo. Agora mesmo, o “motor cuántico” da web é unha simulación que corre no teu propio navegador coas matemáticas de sempre. Non hai un ordenador cuántico de verdade atrás, e iso é o máis honesto que podemos facer: a tecnoloxía cuántica real hoxe é cara, ruidosa e non daría mellors resultados. Pero a forma en que o sistema entende os datos (temperatura, humidade...) está preparada para o día que esta nube cuántica funcione de xeito estable e barato. Ese día, cambiamos a simulación polo hardware real e xa está. Mientras tanto, ciencia de boa, fantasía zero.'
    },
    eu: {
      tab: 'ORIGEN',
      badge: 'ORIGEN',
      title: 'WEB HONEK EUSKARA EGOERAKO KONDEKTA',
      p1: 'Web honek sortu da kalean ibiltzean, ez pantaila aurrean. Sevilla-biztanleak jakiteko da, agostuaren gauetan sortu, eta ikusten du gurutzea kargatzen ari dena, eta gauetan erabiliko da. Això ez da zure mania: asfaltua eta cementua ezagutu gabeko eguzki-erloju gisa funtzionatzen dute, egunetan kargatzen eta gauetan gelditzen. Problema da, egun arte, ikusten ez genuen, mapa batean, eta egunetan ikasteko behar bezala. Horregatik egina da.',
      h2: 'Problema bat, bolsoa eta salutaren artean.',
      p2: 'Eguzki-erlojuak ez da bakarrik ezagutu gabeko; da arriskua. Afecta zuretzat sortzeko egun, aire kondizionatua eta barrioak (nola egiten da?); zuretxat sortzeko egun, aire kondizionatua eta barrioak (nola egiten da?). Informazioa behar dugu gaur, baina ez dugu 1000 urte esperar, pertsona bat egin egiten. Horretarako, zuretzat da.',
      h3: 'Non anem?',
      p3: 'Hurrengo pausoak ez da pantaila bete lucecitas. Afinatzea da: instal·lari sensoreak Sevilleko beste puntuetan, modeloarekin konparatzea, tresna hau erabiltzaileei da, arbolak landitzeko, toldoak erabiltzeko edo alerta bat bidaltzeko. Zarra dagoen irudi gaur egun, eta hau da: egungo teknologia guztia, eta haurrak gertatzen.',
      h4: 'Quantumari buruz, kontesak gabe.',
      p4: 'Horrek gure euskara ez da, baina webak "motor cuántico" da. Oso modu bat: ez da ordenador real, baina hau da egin daitekeena. Era berean, zenbatzuk ikusten diren, temperatura, humitatea, etc. Baina, egungo teknologia da, eta gaur egun ez da, baina hau da. Oso harrigarria da, baina gaur egun, gero, harrigarria izan daiteke.'
    },
    'ca-VA': {
      tab: 'ORIGEN',
      badge: 'ORIGEN',
      title: 'PER QUÈ EXISTEIX AQUESTA PÀGINA',
      p1: 'Aquesta pàgina s\'ha format caminant per les carreres, no davant d\'una pantalla. Qui viu a Sevilla sap què és sortir a les vuit de la nit a l\'agost i sentir com el sòl et escupa el calor que ha estat absorbint tot el dia. Això no és una mania teva: l\'asfalt i el cement funcionen com una estufa invisible que s\'omple durant el dia i es buida de nit. El problema és que fins ara no havia manera de veure-ho clar, en un mapa i sense haver d\'estudiar una carrera. Per això vaig fer això.',
      h2: 'Un problema que ens toca el borsa i la salut.',
      p2: 'El caloró no és només incòmode; és perillos. Afecta a qui pot sortir a la carrer sense fer-se un calors, a el que paguem d\'aire condicionat i a com es dissenyen els barris (per què en uns s\'achicharra i en altres es pot respirar?). Pujar aquestes dades a la vista de tots no és un gest tecnològic de postura; és donar a la gent la informació que necessitem avui, sense esperar mil anys que algú decideixi fer-ho oficial.',
      h3: 'On anem?',
      p3: 'El proper pas no és omplir la pantalla de llums brillants. És afinar la precisió: instal·lar sensors reals en diferents punts de Sevilla, comparar el model amb el que passa a la carrer, i que aquesta eina servís per a qui decideix on plantar un arbre, posar un toldo o enviar una alerta de calor extrem. Crescement bona és ser cada vegada més fiable, no més brillant.',
      h4: 'I l\'òr de la cuántica, sense contes.',
      p4: 'Aquí no estem vendent hum. Avui, el «motor quàntic» de la web és una simulació que corre en el teu propi navegador amb matemàtiques de sempre. No hi ha un ordinador quàntic real darrere, i això és l\'honestitat possible: la tecnologia quàntica real avui és cara, sorollosa i no donaria millors resultats. Però la manera com el sistema entén els dades (temperatura, humitat...) està preparada per al dia que aquesta nube quàntica funcioni de manera estable i barata. Aquell dia, canviem la simulació per hardware real i ja està. Mientras tanto, ciència bona, fantasia zero.'
    },
    oc: {
      tab: 'ORIGEN',
      badge: 'ORIGEN',
      title: 'PER QUÈ EXISTEIX AQUESTA PÀGINA',
      p1: 'Aquesta pàgina s\'ha format caminant per las carreres, no davant d\'una pantalla. Qui viu a Sevilla sap què és sortir a las vuit de la nit a l\'agost e sentir com el sòl et escupa el calor que ha estat absorbint tot el dia. Això no es una mania teva: l\'asfalt e el cement funcionen com una estufa invisible que s\'omple durant el dia e se buida de nit. El problema es que fins ara no havia manera de veure-lo clar, en un mapa e sense haver d\'estudiar una carrera. Per això vaig fer això.',
      h2: 'Un problema que nos toca el borsa e la salut.',
      p2: 'El caloró no es només incòmode; es perillos. Afecta a qui pot sortir a la carrer sense fer-se un calors, a el que paguem d\'aire condicionat e a com es dissenyen els barris (per què en uns s\'achicharra e en altres es pot respirar?). Pujar aquestes dades a la vista de tots no es un gest tecnològic de postura; es donar a la gent la informació que necessitem avui, sense esperar mil anys que algú decideixi fer-ho oficial.',
      h3: 'On anem?',
      p4: 'Aquí no estem vendent hum. Avui, el «motor quàntic» de la web es una simulació que corre en el teu propi navegador amb matemàtiques de sempre. No hi ha un ordinador quàntic real darrere, e això es l\'honestitat possible: la tecnologia quàntica real avui es cara, sorollosa e no donaria millors resultats. Però la manera com el sistema entén els dades (temperatura, humitat...) es preparada per al dia que aquesta nube quàntica funcioni de manera estable e barata. Aquell dia, canviem la simulació per hardware real e ja està. Mentre això, ciència bona, fantasia zero.'
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
