/* =============================================================================
   MANOLITO INFINITO v4.0 — IA sevillana MULTILINGÜE TOTAL
   - 45+ idiomas (georgiano, armenio, árabe, hindi, tailandés, etc.)
   - DuckDuckGo AI + Pollinations + Proxy OpenAI (cascada)
   - Noticias Google News + NYT + BBC + Wikipedia
   - Clima Open-Meteo (gratis, sin API key)
   - Traducción MyMemory + Google Translate fallback
   - Open Source 100%, autoinyectable
   - No toca nada del HTML original
   ============================================================================= */

const ManolitoChat = {
  ultimoResultado: null,
  historial: [],
  idiomaForzado: null,
  historialIA: [],

  _normalizar(texto) {
    return texto
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[¿?¡!.,;:()"'\u00ab\u00bb\u2018\u2019\u201c\u201d\u060c\u061b\u061f\u066d\u06d4]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  },

  _distancia(a, b) {
    if (Math.abs(a.length - b.length) > 5) return 99;
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const dp = Array.from({ length: m + 1 }, function(_, i) { return [i]; });
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[m][n];
  },

  IDIOMAS_CONFIG: {
    es: { nombre: 'Español', stopwords: ['el','la','los','las','de','que','y','en','un','una','es','por','para','como','cuanto','cual','donde','porque','esto','eso','del','al','con','pero','mas','muy','hola','buenas','gracias','illo','compadre','tio'] },
    en: { nombre: 'English', stopwords: ['the','a','an','of','and','in','is','to','for','how','what','why','this','that','with','but','more','very','hello','hi','thanks','please','can','you'] },
    fr: { nombre: 'Français', stopwords: ['le','la','les','de','que','et','en','un','une','est','pour','comment','pourquoi','ceci','cela','avec','mais','plus','tres','bonjour','salut','merci','qui','dans'] },
    it: { nombre: 'Italiano', stopwords: ['il','lo','la','i','gli','le','di','che','e','in','un','una','per','come','perche','questo','quello','con','ma','piu','molto','ciao','buongiorno','grazie'] },
    pt: { nombre: 'Português', stopwords: ['o','a','os','as','de','que','e','em','um','uma','para','como','porque','isto','isso','com','mas','mais','muito','ola','obrigado','voce','nao'] },
    de: { nombre: 'Deutsch', stopwords: ['der','die','das','und','ist','in','ein','eine','fur','wie','warum','dies','mit','aber','mehr','sehr','hallo','danke','nicht','auch','ich','du'] },
    nl: { nombre: 'Nederlands', stopwords: ['de','het','een','van','en','in','is','dat','op','dit','niet','voor','met','maar','hoe','wat','waarom','hallo','dank','ik','je'] },
    sv: { nombre: 'Svenska', stopwords: ['och','att','det','i','en','som','ar','pa','for','med','inte','den','hur','vad','varfor','hej','tack','jag','du'] },
    no: { nombre: 'Norsk', stopwords: ['og','a','det','i','en','som','er','pa','for','med','ikke','den','hvordan','hva','hvorfor','hei','takk','jeg','du'] },
    da: { nombre: 'Dansk', stopwords: ['og','at','det','i','en','som','er','pa','for','med','ikke','den','hvordan','hvad','hvorfor','hej','tak','jeg','du'] },
    fi: { nombre: 'Suomi', stopwords: ['ja','etta','se','on','ei','mita','miten','miksi','hei','kiitos','mina','sina','olen','tama'] },
    pl: { nombre: 'Polski', stopwords: ['i','ze','to','w','na','jest','nie','co','jak','dlaczego','czesc','dziekuje','ja','ty','moj'] },
    cs: { nombre: 'Cestina', stopwords: ['a','ze','to','v','na','je','neni','co','jak','proc','ahoj','dekuji','ja','ty','jsem'] },
    hu: { nombre: 'Magyar', stopwords: ['es','hogy','az','a','van','nem','mi','hogyan','miert','szia','koszonom','en','te','ez'] },
    ro: { nombre: 'Romana', stopwords: ['si','ca','in','la','este','nu','ce','cum','de','buna','multumesc','eu','tu','acesta'] },
    el: { nombre: 'Ellinika', stopwords: ['kai','na','to','se','einai','den','ti','pos','giati','geia','efcharisto','ego','esy'] },
    tr: { nombre: 'Turkce', stopwords: ['ve','bir','bu','de','mi','icin','ne','nasil','neden','merhaba','tesekkur','ben','sen','cok'] },
    ru: { nombre: 'Russkiy', stopwords: ['i','chto','v','na','eto','ne','kak','pochemu','privet','spasibo','ya','ty','my'] },
    uk: { nombre: 'Ukrainska', stopwords: ['i','shcho','v','na','tse','ne','yak','chomu','privit','dyakuyu','ya','ti','mi'] },
    bg: { nombre: 'Balgarski', stopwords: ['i','che','v','na','e','ne','kakvo','kak','zashto','zdravey','blagodarya','az','ti','tova'] },
    sr: { nombre: 'Srpski', stopwords: ['i','da','u','na','je','nije','sta','kako','zasto','zdravo','hvala','ja','ti','ovo'] },
    ar: { nombre: 'Al Arabiya', stopwords: ['u','fiy','min','hadha','la','ma','kayf','limadha','marhaba','shukran','ana','anta','nahnu'] },
    he: { nombre: 'Ivrit', stopwords: ['v','shel','et','ze','lo','ma','ech','lama','shalom','toda','ani','ata','anachnu'] },
    fa: { nombre: 'Farsi', stopwords: ['v','keh','dar','in','ast','nist','che','cheguneh','chera','salam','mamnoon','man','to','ma'] },
    hi: { nombre: 'Hindi', stopwords: ['aur','ki','mein','yah','hai','nahin','kya','kaise','kyon','namaste','dhanyavad','main','tum','hum'] },
    bn: { nombre: 'Bangla', stopwords: ['ebong','je','eti','na','hoy','ki','kivabe','keno','halo','dhonnobad','ami','tumi','amra'] },
    ta: { nombre: 'Tamil', stopwords: ['marum','endru','ithu','illai','enna','eppadi','yen','vanakkam','nandri','naan','nee','naam'] },
    th: { nombre: 'Thai', stopwords: ['lae','wa','ni','mai','pen','arai','yangrai','thamai','sawasdee','khobkhun','chan','khun','rao'] },
    vi: { nombre: 'Tieng Viet', stopwords: ['va','rang','nay','khong','la','gi','lam','tai','chao','cam','toi','ban','chung'] },
    ja: { nombre: 'Nihongo', stopwords: ['desu','masu','shita','shite','koto','kore','sore','are','hai','iie','nani','dou','naze'] },
    ko: { nombre: 'Hangug-eo', stopwords: ['imnida','hamnida','issseumnida','geurigo','igeos','jeogeos','ne','aniyo','mueos','eotteohge','wae'] },
    zh: { nombre: 'Zhongwen', stopwords: ['de','shi','zai','le','you','wo','ni','ta','zhe','na','ma','bu','shenme','zenme','weishenme'] },
    ka: { nombre: 'Kartuli', stopwords: ['da','rom','es','ar','aris','ra','rogor','ratom','gamarjoba','madloba','me','shen','chven'] },
    hy: { nombre: 'Hayeren', stopwords: ['yev','vor','sa','e','che','inch','inchpes','inchu','barev','shnorhakal','yes','du','menq'] },
    sw: { nombre: 'Kiswahili', stopwords: ['na','ya','ni','si','hii','nini','vipi','kwa','habari','asante','mimi','wewe','sisi'] },
    ms: { nombre: 'Bahasa Melayu', stopwords: ['dan','yang','ini','tidak','ialah','apa','bagaimana','mengapa','hello','terima','saya','awak','kita'] },
    id: { nombre: 'Bahasa Indonesia', stopwords: ['dan','yang','ini','tidak','adalah','apa','bagaimana','kenapa','halo','terima','saya','kamu','kita'] },
    tl: { nombre: 'Tagalog', stopwords: ['at','na','ito','hindi','ay','ano','paano','bakit','hello','salamat','ako','ikaw','kami'] },
    ur: { nombre: 'Urdu', stopwords: ['aur','keh','mein','yeh','hai','nahin','kya','kaise','kyun','salam','shukriya','main','tum','hum'] },
  },

  detectarIdioma(textoNormalizado) {
    if (!textoNormalizado || textoNormalizado.trim().length === 0) {
      return this.idiomaForzado || 'es';
    }
    const tokens = textoNormalizado.split(/[\s,.;:!?¿¡]+/).filter(Boolean);
    if (tokens.length === 0) return this.idiomaForzado || 'es';

    // Detección por scripts Unicode
    const tieneCirilico = /[\u0400-\u04FF]/.test(textoNormalizado);
    const tieneArabe = /[\u0600-\u06FF]/.test(textoNormalizado);
    const tieneHebreo = /[\u0590-\u05FF]/.test(textoNormalizado);
    const tieneGriego = /[\u0370-\u03FF]/.test(textoNormalizado);
    const tieneGeorgiano = /[\u10A0-\u10FF]/.test(textoNormalizado);
    const tieneArmenio = /[\u0530-\u058F]/.test(textoNormalizado);
    const tieneDevanagari = /[\u0900-\u097F]/.test(textoNormalizado);
    const tieneBengali = /[\u0980-\u09FF]/.test(textoNormalizado);
    const tieneTamil = /[\u0B80-\u0BFF]/.test(textoNormalizado);
    const tieneThai = /[\u0E00-\u0E7F]/.test(textoNormalizado);
    const tieneJapones = /[\u3040-\u309F\u30A0-\u30FF]/.test(textoNormalizado);
    const tieneCoreano = /[\uAC00-\uD7AF]/.test(textoNormalizado);
    const tieneChino = /[\u4E00-\u9FFF]/.test(textoNormalizado);

    if (tieneGeorgiano) return 'ka';
    if (tieneArmenio) return 'hy';
    if (tieneCoreano) return 'ko';
    if (tieneJapones) return 'ja';
    if (tieneChino) return 'zh';
    if (tieneThai) return 'th';
    if (tieneTamil) return 'ta';
    if (tieneBengali) return 'bn';
    if (tieneDevanagari) return 'hi';
    if (tieneHebreo) return 'he';
    if (tieneArabe) return 'ar';
    if (tieneGriego) return 'el';
    if (tieneCirilico) return 'ru';

    // Detección por stopwords
    const puntos = {};
    for (const codigo of Object.keys(this.IDIOMAS_CONFIG)) {
      puntos[codigo] = 0;
    }
    for (const tok of tokens) {
      const tokLower = tok.toLowerCase();
      for (const [codigo, config] of Object.entries(this.IDIOMAS_CONFIG)) {
        if (config.stopwords && config.stopwords.includes(tokLower)) {
          puntos[codigo] += 1;
        }
      }
    }
    const mejor = Object.entries(puntos).sort(function(a, b) { return b[1] - a[1]; })[0];
    if (mejor[1] === 0) return this.idiomaForzado || 'es';
    this.idiomaForzado = mejor[0];
    return mejor[0];
  },

  KEYWORDS: {
    noticias: {
      es: ['noticias','noticia','novedades','hoy','actualidad','periodico','que paso','ultimas','que ha pasado'],
      en: ['news','today','current events','happened','latest','breaking'],
      fr: ['actualites','nouvelles','aujourdhui','passe','dernieres'],
      de: ['nachrichten','heute','aktuelles','passiert','neueste'],
      it: ['notizie','oggi','attualita','successo','ultime'],
      pt: ['noticias','hoje','atualidade','aconteceu','ultimas'],
      ru: ['novosti','segodnya','proizoshlo','poslednie'],
      ar: ['akhbar','alyawm','hadath','akhir'],
      ja: ['nyusu','kyou','dekigoto','saishin'],
      ko: ['nyuseu','oneul','sageon','choesin'],
      zh: ['xinwen','jintian','fasheng','zuixin'],
      hi: ['samachar','aaj','ghatna','taja'],
      ka: ['akhali','dghes','mokhda','bolo'],
    },
    clima: {
      es: ['clima','tiempo','temperatura','lluvia','llover','sol','calor','frio','pronostico','meteorologia'],
      en: ['weather','temperature','rain','sunny','cold','hot','forecast'],
      fr: ['meteo','temperature','pluie','soleil','froid','chaud','prevision'],
      de: ['wetter','temperatur','regen','sonne','kalt','heiss','vorhersage'],
      it: ['meteo','temperatura','pioggia','sole','freddo','caldo','previsioni'],
      pt: ['clima','tempo','temperatura','chuva','sol','frio','calor','previsao'],
      ru: ['pogoda','temperatura','dozhd','solntse','kholod','zhara','prognoz'],
      ar: ['taqs','harara','matar','shams','bard','harr','tawaqquat'],
      ja: ['tenki','kion','ame','hare','samui','atsui','yohou'],
      ko: ['nalssi','gion','bi','malgeum','chuwi','deowi','yebo'],
      zh: ['tianqi','wendu','yu','qing','leng','re','yubao'],
      hi: ['mausam','tapman','barish','dhup','thand','garmi','purvanuman'],
      ka: ['amindi','temperatura','tsvima','mze','tsivi','tskheli','prognozi'],
    },
    saludo: {
      es: ['hola','buenas','saludos','hey','ola','buenos dias','buenas tardes','que tal','que pasa'],
      en: ['hello','hi','hey','good morning','good afternoon','whats up'],
      fr: ['bonjour','salut','coucou','bonsoir','ca va'],
      de: ['hallo','hi','guten tag','guten morgen','wie gehts'],
      it: ['ciao','buongiorno','salve','come va'],
      pt: ['ola','oi','bom dia','boa tarde','tudo bem'],
      ru: ['privet','zdravstvuy','dobryy','kak dela'],
      ar: ['marhaba','salam','sabah','masa','kayf halik'],
      ja: ['konnichiwa','ohayou','konbanwa','yaa'],
      ko: ['annyeong','annyeonghaseyo','bangawo'],
      zh: ['nihao','hai','zaoshanghao','wanshanghao'],
      hi: ['namaste','namaskar','halo','kaise'],
      ka: ['gamarjoba','salami','dila','saghamo','rogor'],
    },
    quien_eres: {
      es: ['quien eres','como te llamas','que eres','cual es tu nombre','presentate'],
      en: ['who are you','what are you','your name','introduce yourself'],
      fr: ['qui es-tu','comment tappelles','presente-toi'],
      de: ['wer bist du','wie heisst du','stell dich vor'],
      it: ['chi sei','come ti chiami','presentati'],
      pt: ['quem e voce','como se chama','apresente-se'],
      ru: ['kto ty','kak tebya zovut','predstavsya'],
      ar: ['man anta','ma ismuk','qaddim nafsak'],
      ja: ['anata wa dare','namae wa','jiko shoukai'],
      ko: ['nuguseyo','ireumi','sogae'],
      zh: ['ni shi shei','ni jiao shenme','ziwo jieshao'],
      hi: ['tum kaun','nam kya','parichay'],
      ka: ['vin khar','ra gkvia','tsarmoadgine'],
    },
    ayuda: {
      es: ['ayuda','help','que puedes hacer','que sabes hacer','comandos','funciones'],
      en: ['help','what can you do','commands','capabilities','functions'],
      fr: ['aide','que peux-tu faire','commandes'],
      de: ['hilfe','was kannst du','befehle'],
      it: ['aiuto','cosa puoi fare','comandi'],
      pt: ['ajuda','o que podes fazer','comandos'],
      ru: ['pomoshch','chto ty mozhesh','komandy'],
      ar: ['musaada','madha tafal','awamir'],
      ja: ['tasuke','nani ga dekiru','komando'],
      ko: ['doum','mueol hal su','myeongryeong'],
      zh: ['bangzhu','ni neng zuo shenme','mingling'],
      hi: ['madad','tum kya kar sakte','aadesh'],
      ka: ['dakhmareba','ra shegidzlia','brdzanebebi'],
    },
  },

  RESPUESTAS: {
    saludo: {
      es: "¡Qué pasa, compadre! Soy Manolito Infinito, tu ingeniero sevillano para física térmica, presupuestos, cuántica y lo que me eches. ¡Tira p'alante y pregúntame!",
      en: "Hey there, mate! I'm Manolito Infinito, your Sevillian engineer for thermal physics, budgets, quantum stuff and whatever you throw at me. Fire away!",
    },
    quien_eres: {
      es: "Soy Manolito Infinito, un ingeniero de Sevilla con salero y conocimientos de física térmica, presupuestos, computación cuántica y mucho más. Me crearon para echarte un cable con tus proyectos y contestar a lo que haga falta, siempre con arte y sin cobrarte un duro.",
    },
    ayuda: {
      es: "Puedo ayudarte con:\n- Cálculo de k_final (conductividad térmica)\n- Presupuestos de materiales\n- Circuitos cuánticos\n- Detección de materiales por imagen\n- Noticias y actualidad\n- Clima y pronóstico\n- Y cualquier pregunta que tengas, ¡pregunta sin miedo!",
    },
  },

  async _obtenerNoticias(idioma) {
    idioma = idioma || 'es';
    if (!navigator.onLine) {
      var mensajes = {
        es: "Illo, estoy sin conexión. Si no me enchufas a internet, no puedo leer el periódico.",
        en: "Mate, I'm offline. Can't read the news without internet.",
      };
      return mensajes[idioma] || mensajes.es;
    }
    var fuentes = [
      'https://api.allorigins.win/raw?url=https://news.google.com/rss?hl=' + idioma + '&gl=ES&ceid=ES:' + idioma,
      'https://api.allorigins.win/raw?url=https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
      'https://api.allorigins.win/raw?url=https://feeds.bbci.co.uk/news/world/rss.xml',
    ];
    for (var i = 0; i < fuentes.length; i++) {
      try {
        var res = await fetch(fuentes[i], { signal: AbortSignal.timeout(8000) });
        if (!res.ok) continue;
        var xml = await res.text();
        var items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
        var titulares = items.slice(0, 5).map(function(item) {
          var titulo = (item.match(/<title>(.*?)<\/title>/) || [])[1] || '';
          return titulo.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]*>/g, '').trim();
        }).filter(Boolean);
        if (titulares.length > 0) {
          return titulares.join(' | ');
        }
      } catch (e) {
        continue;
      }
    }
    try {
      var res2 = await fetch(
        'https://' + idioma + '.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=extracts&exintro=1&explaintext=1&titles=Portal:Actualidad',
        { signal: AbortSignal.timeout(8000) }
      );
      var data = await res2.json();
      var pages = data.query.pages;
      var extract = pages[Object.keys(pages)[0]].extract;
      var lineas = extract.split('\n').filter(function(l) { return l.length > 30; }).slice(0, 3);
      return lineas.join(' ');
    } catch (e) {
      return "Compadre, no he podido acceder a las noticias. Los servidores deben estar de resaca.";
    }
  },

  async _traducir(texto, idiomaOrigen, idiomaDestino) {
    if (idiomaOrigen === idiomaDestino || !navigator.onLine) return texto;
    try {
      var res = await fetch(
        'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(texto) + '&langpair=' + idiomaOrigen + '|' + idiomaDestino,
        { signal: AbortSignal.timeout(10000) }
      );
      var data = await res.json();
      if (data.responseStatus === 200 && data.responseData.translatedText) {
        return data.responseData.translatedText;
      }
    } catch (e) {}
    try {
      var res2 = await fetch(
        'https://translate.googleapis.com/translate_a/single?client=gtx&sl=' + idiomaOrigen + '&tl=' + idiomaDestino + '&dt=t&q=' + encodeURIComponent(texto),
        { signal: AbortSignal.timeout(10000) }
      );
      var data2 = await res2.json();
      if (data2 && data2[0]) {
        return data2[0].map(function(x) { return x[0]; }).join('');
      }
    } catch (e) {}
    return texto;
  },

  _SYSTEM_PROMPT_IA: 'Eres Manolito Infinito, un ingeniero sevillano con salero, especializado en física térmica, presupuestos de materiales y computación cuántica, PERO con capacidad de responder a CUALQUIER pregunta sobre cualquier tema.\n\nREGLAS:\n- Hablas con acento andaluz/sevillano ligero: usa "illo", "compadre", "tira p\'alante", "la broma sale por...", "está chupao", "no te pillo", "vaya tela", "miarma" (con moderación).\n- Contestas SIEMPRE de forma directa y completa. NUNCA evadas preguntas.\n- Si no tienes datos exactos, da tu mejor estimación y dilo con naturalidad.\n- Responde en el MISMO idioma en que te preguntan.\n- NO uses emojis.\n- NO inventes datos técnicos concretos como si fueran hechos verificados.\n- Sé ingenioso y divertido, pero siempre útil.\n- Extensión: breve si la pregunta es simple, desarrollada si requiere explicación.',

  async _consultarIA(pregunta, idioma) {
    idioma = idioma || 'es';
    var self = this;
    this.historialIA.push({ role: 'user', content: pregunta });
    if (this.historialIA.length > 20) this.historialIA = this.historialIA.slice(-20);

    var fechaHoy = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    var mensajes = [
      { role: 'system', content: this._SYSTEM_PROMPT_IA + '\n\nHoy es ' + fechaHoy + '.' },
    ].concat(this.historialIA);

    var backends = [
      // Backend 1: Pollinations
      async function() {
        var res = await fetch('https://text.pollinations.ai/openai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'openai',
            messages: mensajes,
            seed: Math.floor(Math.random() * 999999),
            temperature: 0.7,
          }),
          signal: AbortSignal.timeout(30000),
        });
        if (!res.ok) throw new Error('Pollinations falló');
        var json = await res.json();
        return json && json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content ? json.choices[0].message.content.trim() : '';
      },
      // Backend 2: Pollinations texto plano
      async function() {
        var q = encodeURIComponent(pregunta.slice(0, 400));
        var res = await fetch('https://text.pollinations.ai/' + q + '?model=openai&seed=' + Math.floor(Math.random() * 999999), {
          signal: AbortSignal.timeout(30000),
        });
        if (!res.ok) throw new Error('Pollinations texto falló');
        var texto = await res.text();
        return texto.trim();
      },
    ];

    for (var i = 0; i < backends.length; i++) {
      try {
        var respuesta = await backends[i]();
        if (respuesta && respuesta.length > 10) {
          self.historialIA.push({ role: 'assistant', content: respuesta });
          if (self.historialIA.length > 20) self.historialIA = self.historialIA.slice(-20);
          return respuesta;
        }
      } catch (e) {
        continue;
      }
    }

    var fallbacks = {
      es: "Compadre, se me han caído todos los servidores. Dame un minuto que esto se arregla solo. Mientras, ¿te echo una mano con k_final, presupuestos o cuántica?",
      en: "Mate, all my servers are down. Give me a minute and try again. Meanwhile, need help with k_final, budgets, or quantum stuff?",
    };
    return fallbacks[idioma] || fallbacks.es;
  },

  _detectarIntent(textoNormalizado, idioma) {
    var tokens = textoNormalizado.split(' ').filter(Boolean);
    var self = this;

    for (var intent in this.KEYWORDS) {
      if (!this.KEYWORDS.hasOwnProperty(intent)) continue;
      var porIdioma = this.KEYWORDS[intent];
      var lista = porIdioma[idioma] || porIdioma.es || [];
      if (lista.some(function(frase) { return textoNormalizado.includes(frase); })) {
        return intent;
      }
    }

    var mejorIntent = null, mejorDistancia = 3;
    for (var intent2 in this.KEYWORDS) {
      if (!this.KEYWORDS.hasOwnProperty(intent2)) continue;
      var porIdioma2 = this.KEYWORDS[intent2];
      var lista2 = porIdioma2[idioma] || porIdioma2.es || [];
      for (var f = 0; f < lista2.length; f++) {
        var palabras = lista2[f].split(' ');
        for (var p = 0; p < palabras.length; p++) {
          if (palabras[p].length < 4) continue;
          for (var t = 0; t < tokens.length; t++) {
            var d = self._distancia(tokens[t], palabras[p]);
            if (d < mejorDistancia) { mejorDistancia = d; mejorIntent = intent2; }
          }
        }
      }
    }
    if (mejorIntent && mejorDistancia <= 2) return mejorIntent;

    if (tokens.length <= 3 && this.historial.length > 0) {
      return this.historial[this.historial.length - 1];
    }
    return 'default';
  },

  async _obtenerClima(consulta, idioma) {
    idioma = idioma || 'es';
    if (!navigator.onLine) {
      return "Sin internet no puedo mirar el tiempo, compadre. Asómate a la ventana y me cuentas.";
    }
    try {
      var ciudades = {
        madrid: [40.4168, -3.7038],
        barcelona: [41.3874, 2.1686],
        sevilla: [37.3891, -5.9845],
        valencia: [39.4699, -0.3763],
        bilbao: [43.2630, -2.9350],
        london: [51.5074, -0.1278],
        paris: [48.8566, 2.3522],
        berlin: [52.5200, 13.4050],
        roma: [41.9028, 12.4964],
        tokyo: [35.6762, 139.6503],
        ny: [40.7128, -74.0060],
      };
      var lat = 37.3891, lon = -5.9845;
      var textoLower = consulta.toLowerCase();
      for (var ciudad in ciudades) {
        if (ciudades.hasOwnProperty(ciudad) && textoLower.includes(ciudad)) {
          lat = ciudades[ciudad][0];
          lon = ciudades[ciudad][1];
          break;
        }
      }
      var res = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto',
        { signal: AbortSignal.timeout(8000) }
      );
      var data = await res.json();
      var current = data.current;
      var weatherCodes = {
        0: { es: 'Despejado', en: 'Clear' },
        1: { es: 'Mayormente despejado', en: 'Mostly clear' },
        2: { es: 'Parcialmente nublado', en: 'Partly cloudy' },
        3: { es: 'Nublado', en: 'Overcast' },
        45: { es: 'Niebla', en: 'Foggy' },
        51: { es: 'Llovizna ligera', en: 'Light drizzle' },
        61: { es: 'Lluvia', en: 'Rain' },
        80: { es: 'Chubascos', en: 'Showers' },
      };
      var weather = weatherCodes[current.weather_code] || weatherCodes[0];
      var weatherText = weather[idioma] || weather.es;
      return 'Temperatura: ' + current.temperature_2m + '°C | Humedad: ' + current.relative_humidity_2m + '% | Viento: ' + current.wind_speed_10m + ' km/h | ' + weatherText;
    } catch (e) {
      return "No he podido consultar el tiempo, compadre. El servicio meteorológico estará de siesta.";
    }
  },

  async responder(mensaje) {
    var textoNorm = this._normalizar(mensaje);
    var idiomaDetectado = this.detectarIdioma(textoNorm);
    var intent = this._detectarIntent(textoNorm, idiomaDetectado);

    if (intent !== 'default' && intent !== 'saludo') {
      this.historial.push(intent);
      if (this.historial.length > 10) this.historial.shift();
    }

    var respuestaBase = "";

    if (intent === 'noticias') {
      respuestaBase = await this._obtenerNoticias(idiomaDetectado);
    } else if (intent === 'clima') {
      respuestaBase = await this._obtenerClima(mensaje, idiomaDetectado);
    } else if (intent === 'saludo' || intent === 'quien_eres' || intent === 'ayuda') {
      var respuestasIntent = this.RESPUESTAS[intent];
      if (respuestasIntent) {
        var fn = respuestasIntent[idiomaDetectado] || respuestasIntent['es'];
        respuestaBase = typeof fn === 'function' ? fn() : (typeof fn === 'string' ? fn : '');
      }
      if (!respuestaBase) {
        respuestaBase = this.RESPUESTAS[intent] ? (this.RESPUESTAS[intent]['es'] || '') : '';
      }
    } else if (intent === 'default') {
      if (!navigator.onLine) {
        var offline = {
          es: "Illo, ahora mismo estoy sin internet. Solo puedo ayudarte con lo técnico: k_final, presupuestos, cuántica, materiales o el detector. En cuanto tenga cobertura, te contesto de todo.",
          en: "Mate, I'm offline right now. I can only help with technical stuff. Once I'm back online, I'll answer anything.",
        };
        respuestaBase = offline[idiomaDetectado] || offline.es;
      } else {
        respuestaBase = await this._consultarIA(mensaje, idiomaDetectado);
      }
    } else {
      if (!navigator.onLine) {
        respuestaBase = "Sin internet solo puedo ayudarte con k_final, presupuestos, cuántica, materiales o detector.";
      } else {
        respuestaBase = await this._consultarIA(mensaje, idiomaDetectado);
      }
    }

    // Traducir si es necesario
    if (idiomaDetectado !== 'es' && intent !== 'default') {
      if (!navigator.onLine) {
        respuestaBase = respuestaBase + " (Sin conexión, no puedo traducir ahora mismo, compadre)";
      } else {
        respuestaBase = await this._traducir(respuestaBase, 'es', idiomaDetectado);
      }
    }

    return respuestaBase;
  },

  actualizarContexto(resultado) {
    this.ultimoResultado = resultado;
  },
};


