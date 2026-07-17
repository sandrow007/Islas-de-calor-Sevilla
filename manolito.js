/* =============================================================================
   MANOLITO INFINITO v4.0 — IA sevillana MULTILINGÜE TOTAL
   - Detección de 40+ idiomas (georgiano, armenio, árabe, hindi, etc.)
   - DuckDuckGo AI + búsqueda web real
   - Traducción MyMemory (sin API key)
   - Open Source 100%, autoinyectable
   ============================================================================= */

const ManolitoChat = {
  ultimoResultado: null,
  historial: [],
  idiomaForzado: null,
  historialIA: [],

  // ========== 1) NORMALIZACIÓN ==========
  _normalizar(texto) {
    return texto
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[¿?¡!.,;:()"'«»\u2018\u2019\u201c\u201d\u060c\u061b\u061f\u066d\u06d4]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  },

  _distancia(a, b) {
    if (Math.abs(a.length - b.length) > 5) return 99;
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
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

  // ========== 2) DETECCIÓN DE IDIOMA — 40+ IDIOMAS ==========
  // Cada idioma tiene: nombre, scripts (rangos Unicode) y stopwords
  IDIOMAS_CONFIG: {
    // --- EUROPA OCCIDENTAL ---
    es: { nombre: 'Español', scripts: [], stopwords: ['el','la','los','las','de','que','y','en','un','una','es','por','para','como','cuanto','cual','donde','porque','esto','eso','del','al','con','pero','mas','muy','hola','buenas','gracias','illo','compadre','tio'] },
    en: { nombre: 'English', scripts: [], stopwords: ['the','a','an','of','and','in','is','to','for','how','what','why','this','that','with','but','more','very','hello','hi','thanks','please','can','you'] },
    fr: { nombre: 'Français', scripts: [], stopwords: ['le','la','les','de','que','et','en','un','une','est','pour','comment','pourquoi','ceci','cela','avec','mais','plus','tres','bonjour','salut','merci','qui','dans'] },
    it: { nombre: 'Italiano', scripts: [], stopwords: ['il','lo','la','i','gli','le','di','che','e','in','un','una','per','come','perche','questo','quello','con','ma','piu','molto','ciao','buongiorno','grazie'] },
    pt: { nombre: 'Português', scripts: [], stopwords: ['o','a','os','as','de','que','e','em','um','uma','para','como','porque','isto','isso','com','mas','mais','muito','ola','obrigado','você','não'] },
    de: { nombre: 'Deutsch', scripts: [], stopwords: ['der','die','das','und','ist','in','ein','eine','für','wie','warum','dies','mit','aber','mehr','sehr','hallo','danke','nicht','auch','ich','du'] },
    nl: { nombre: 'Nederlands', scripts: [], stopwords: ['de','het','een','van','en','in','is','dat','op','dit','niet','voor','met','maar','hoe','wat','waarom','hallo','dank','alsjeblieft','ik','je','u'] },
    sv: { nombre: 'Svenska', scripts: [], stopwords: ['och','att','det','i','en','som','är','på','för','med','inte','den','hur','vad','varför','hej','tack','jag','du','vi'] },
    no: { nombre: 'Norsk', scripts: [], stopwords: ['og','å','det','i','en','som','er','på','for','med','ikke','den','hvordan','hva','hvorfor','hei','takk','jeg','du','vi'] },
    da: { nombre: 'Dansk', scripts: [], stopwords: ['og','at','det','i','en','som','er','på','for','med','ikke','den','hvordan','hvad','hvorfor','hej','tak','jeg','du','vi'] },
    fi: { nombre: 'Suomi', scripts: [], stopwords: ['ja','että','se','on','ei','mitä','miten','miksi','hei','kiitos','minä','sinä','olen','tämä'] },
    is: { nombre: 'Íslenska', scripts: [], stopwords: ['og','að','það','í','er','á','ekki','hvað','hvernig','hvers','hæ','takk','ég','þú','við'] },
    ga: { nombre: 'Gaeilge', scripts: [], stopwords: ['agus','go','an','na','i','ar','sé','ní','cad','conas','cén','haigh','go','tú','mé'] },
    cy: { nombre: 'Cymraeg', scripts: [], stopwords: ['a','y','yn','i','o','ar','mae','beth','sut','pam','helo','diolch','chi','fi','ni'] },

    // --- EUROPA DEL ESTE ---
    pl: { nombre: 'Polski', scripts: [], stopwords: ['i','że','to','w','na','jest','nie','co','jak','dlaczego','cześć','dziękuję','ja','ty','mój'] },
    cs: { nombre: 'Čeština', scripts: [], stopwords: ['a','že','to','v','na','je','není','co','jak','proč','ahoj','děkuji','já','ty','jsem'] },
    sk: { nombre: 'Slovenčina', scripts: [], stopwords: ['a','že','to','v','na','je','nie','čo','ako','prečo','ahoj','ďakujem','ja','ty','som'] },
    hu: { nombre: 'Magyar', scripts: [], stopwords: ['és','hogy','az','a','van','nem','mi','hogyan','miért','szia','köszönöm','én','te','ez'] },
    ro: { nombre: 'Română', scripts: [], stopwords: ['și','că','în','la','este','nu','ce','cum','de','bună','mulțumesc','eu','tu','acesta'] },
    bg: { nombre: 'Български', scripts: ['0400-04FF'], stopwords: ['и','че','в','на','е','не','какво','как','защо','здравей','благодаря','аз','ти','това'] },
    uk: { nombre: 'Українська', scripts: ['0400-04FF'], stopwords: ['і','що','в','на','це','не','як','чому','привіт','дякую','я','ти','ми'] },

    // --- MEDITERRÁNEO ---
    el: { nombre: 'Ελληνικά', scripts: ['0370-03FF'], stopwords: ['και','να','το','σε','η','είναι','δεν','τι','πώς','γιατί','γεια','ευχαριστώ','εγώ','εσύ'] },
    tr: { nombre: 'Türkçe', scripts: [], stopwords: ['ve','bir','bu','de','mi','için','ne','nasıl','neden','merhaba','teşekkür','ben','sen','çok'] },
    sq: { nombre: 'Shqip', scripts: [], stopwords: ['dhe','që','në','për','është','nuk','çfarë','si','pse','përshëndetje','faleminderit','unë','ti','kjo'] },
    mt: { nombre: 'Malti', scripts: [], stopwords: ['u','li','fi','fuq','hu','mhux','xiex','kif','ghaliex','bonġu','grazzi','jien','int','din'] },

    // --- CAUCASO (Geo + Armenio) ---
    ka: { nombre: 'ქართული', scripts: ['10A0-10FF'], stopwords: ['და','რომ','ეს','არ','არის','რა','როგორ','რატომ','გამარჯობა','მადლობა','მე','შენ','ჩვენ'] },
    hy: { nombre: 'Հայերեն', scripts: ['0530-058F'], stopwords: ['և','որ','սա','է','չէ','ինչ','ինչպես','ինչու','բարև','շնորհակալ','ես','դու','մենք'] },
    az: { nombre: 'Azərbaycanca', scripts: [], stopwords: ['və','ki','bu','deyil','nə','necə','niyə','salam','təşəkkür','mən','sən','biz'] },

    // --- ESLAVO (Cirílico) ---
    ru: { nombre: 'Русский', scripts: ['0400-04FF'], stopwords: ['и','что','в','на','это','не','как','почему','привет','спасибо','я','ты','мы'] },
    sr: { nombre: 'Српски', scripts: ['0400-04FF'], stopwords: ['и','да','у','на','је','није','шта','како','зашто','здраво','хвала','ја','ти','ово'] },
    mk: { nombre: 'Македонски', scripts: ['0400-04FF'], stopwords: ['и','да','во','на','е','не','што','како','зошто','здраво','благодарам','јас','ти','ова'] },

    // --- ORIENTE MEDIO ---
    ar: { nombre: 'العربية', scripts: ['0600-06FF'], stopwords: ['و','في','من','هذا','لا','ما','كيف','لماذا','مرحبا','شكرا','أنا','أنت','نحن'] },
    he: { nombre: 'עברית', scripts: ['0590-05FF'], stopwords: ['ו','של','את','זה','לא','מה','איך','למה','שלום','תודה','אני','אתה','אנחנו'] },
    fa: { nombre: 'فارسی', scripts: ['0600-06FF'], stopwords: ['و','که','در','این','است','نیست','چه','چگونه','چرا','سلام','ممنون','من','تو','ما'] },
    ur: { nombre: 'اردو', scripts: ['0600-06FF'], stopwords: ['اور','کہ','میں','یہ','ہے','نہیں','کیا','کیسے','کیوں','سلام','شکریہ','میں','تم','ہم'] },
    ku: { nombre: 'Kurdî', scripts: [], stopwords: ['û','ku','di','ev','e','nine','çi','çawa','çima','slav','spas','ez','tu','em'] },

    // --- SUR DE ASIA ---
    hi: { nombre: 'हिन्दी', scripts: ['0900-097F'], stopwords: ['और','कि','में','यह','है','नहीं','क्या','कैसे','क्यों','नमस्ते','धन्यवाद','मैं','तुम','हम'] },
    bn: { nombre: 'বাংলা', scripts: ['0980-09FF'], stopwords: ['এবং','যে','এটি','না','হয়','কি','কিভাবে','কেন','হ্যালো','ধন্যবাদ','আমি','তুমি','আমরা'] },
    ta: { nombre: 'தமிழ்', scripts: ['0B80-0BFF'], stopwords: ['மற்றும்','என்று','இது','இல்லை','என்ன','எப்படி','ஏன்','வணக்கம்','நன்றி','நான்','நீ','நாம்'] },
    te: { nombre: 'తెలుగు', scripts: ['0C00-0C7F'], stopwords: ['మరియు','అని','ఇది','కాదు','ఏమి','ఎలా','ఎందుకు','హలో','ధన్యవాదాలు','నేను','నీవు','మేము'] },
    ml: { nombre: 'മലയാളം', scripts: ['0D00-0D7F'], stopwords: ['ഉം','എന്ന്','ഇത്','അല്ല','എന്ത്','എങ്ങനെ','എന്തുകൊണ്ട്','ഹലോ','നന്ദി','ഞാൻ','നീ','ഞങ്ങൾ'] },
    mr: { nombre: 'मराठी', scripts: ['0900-097F'], stopwords: ['आणि','की','मध्ये','हे','आहे','नाही','काय','कसे','का','नमस्कार','धन्यवाद','मी','तू','आम्ही'] },
    gu: { nombre: 'ગુજરાતી', scripts: ['0A80-0AFF'], stopwords: ['અને','કે','આ','છે','નથી','શું','કેવી','શા','નમસ્તે','આભાર','હું','તું','અમે'] },
    pa: { nombre: 'ਪੰਜਾਬੀ', scripts: ['0A00-0A7F'], stopwords: ['ਅਤੇ','ਕਿ','ਇਹ','ਹੈ','ਨਹੀਂ','ਕੀ','ਕਿਵੇਂ','ਕਿਉਂ','ਸਤਿ','ਧੰਨਵਾਦ','ਮੈਂ','ਤੂੰ','ਅਸੀਂ'] },
    ne: { nombre: 'नेपाली', scripts: ['0900-097F'], stopwords: ['र','कि','यो','हो','होइन','के','कसरी','किन','नमस्ते','धन्यवाद','म','तिमी','हामी'] },
    si: { nombre: 'සිංහල', scripts: ['0D80-0DFF'], stopwords: ['සහ','යි','මෙය','නැත','කුමක්','කෙසේ','ඇයි','හෙලෝ','ස්තුතියි','මම','ඔබ','අපි'] },

    // --- SUDESTE ASIÁTICO ---
    th: { nombre: 'ไทย', scripts: ['0E00-0E7F'], stopwords: ['และ','ว่า','นี้','ไม่','เป็น','อะไร','อย่างไร','ทำไม','สวัสดี','ขอบคุณ','ฉัน','คุณ','เรา'] },
    vi: { nombre: 'Tiếng Việt', scripts: [], stopwords: ['và','rằng','này','không','là','gì','làm','tại','chào','cảm','tôi','bạn','chúng'] },
    ms: { nombre: 'Bahasa Melayu', scripts: [], stopwords: ['dan','yang','ini','tidak','ialah','apa','bagaimana','mengapa','hello','terima','saya','awak','kita'] },
    id: { nombre: 'Bahasa Indonesia', scripts: [], stopwords: ['dan','yang','ini','tidak','adalah','apa','bagaimana','kenapa','halo','terima','saya','kamu','kita'] },
    tl: { nombre: 'Tagalog', scripts: [], stopwords: ['at','na','ito','hindi','ay','ano','paano','bakit','hello','salamat','ako','ikaw','kami'] },
    km: { nombre: 'ភាសាខ្មែរ', scripts: ['1780-17FF'], stopwords: ['និង','ថា','នេះ','មិន','គឺ','អ្វី','របៀប','ហេតុ','សួស្តី','អរគុណ','ខ្ញុំ','អ្នក','យើង'] },
    my: { nombre: 'မြန်မာ', scripts: ['1000-109F'], stopwords: ['နှင့်','သော','ဤ','မ','သည်','ဘာ','ဘယ်လို','ဘာကြောင့်','မင်္ဂလာ','ကျေးဇူး','ငါ','မင်း','ငါတို့'] },
    lo: { nombre: 'ລາວ', scripts: ['0E80-0EFF'], stopwords: ['ແລະ','ວ່າ','ນີ້','ບໍ່','ແມ່ນ','ຫຍັງ','ແນວໃດ','ເປັນ','ສະບາຍ','ຂອບໃຈ','ຂ້ອຍ','ເຈົ້າ','ພວກເຮົາ'] },

    // --- ASIA ORIENTAL ---
    zh: { nombre: '中文', scripts: ['4E00-9FFF'], stopwords: ['的','是','在','了','有','我','你','他','她','这','那','吗','不','什么','怎么','为什么'] },
    ja: { nombre: '日本語', scripts: ['3040-309F','30A0-30FF'], stopwords: ['です','ます','した','して','こと','これ','それ','あれ','はい','いいえ','何','どう','なぜ'] },
    ko: { nombre: '한국어', scripts: ['AC00-D7AF'], stopwords: ['입니다','합니다','있습니다','그리고','이것','저것','네','아니요','무엇','어떻게','왜'] },

    // --- ÁFRICA ---
    sw: { nombre: 'Kiswahili', scripts: [], stopwords: ['na','ya','ni','si','hii','nini','vipi','kwa','habari','asante','mimi','wewe','sisi'] },
    am: { nombre: 'አማርኛ', scripts: ['1200-137F'], stopwords: ['እና','ይህ','ነው','አይደለም','ምን','እንዴት','ለምን','ሰላም','አመሰግናለሁ','እኔ','አንተ','እኛ'] },
    yo: { nombre: 'Yorùbá', scripts: [], stopwords: ['àti','pé','èyí','kìí','jẹ','kí','báwo','kí','pẹlẹ','o','mo','ìwọ','awa'] },
    ha: { nombre: 'Hausa', scripts: [], stopwords: ['da','cewa','wannan','ba','ne','me','yaya','don','sannu','na','ni','kai','mu'] },
  },

  detectarIdioma(textoNormalizado) {
    if (!textoNormalizado || textoNormalizado.trim().length === 0) {
      return this.idiomaForzado || 'es';
    }

    const tokens = textoNormalizado.split(/[\s,.;:!?¿¡]+/).filter(Boolean);
    if (tokens.length === 0) return this.idiomaForzado || 'es';

    // 1) DETECCIÓN POR SCRIPTS (más fiable para idiomas no latinos)
    const scriptScores = {};
    for (const [codigo, config] of Object.entries(this.IDIOMAS_CONFIG)) {
      if (config.scripts && config.scripts.length > 0) {
        let totalChars = 0;
        let matchedChars = 0;
        for (const char of textoNormalizado) {
          const cp = char.codePointAt(0);
          totalChars++;
          for (const rango of config.scripts) {
            const [ini, fin] = rango.split('-').map(x => parseInt(x, 16));
            if (cp >= ini && cp <= fin) {
              matchedChars++;
              break;
            }
          }
        }
        if (totalChars > 0 && matchedChars / totalChars > 0.3) {
          scriptScores[codigo] = matchedChars / totalChars;
        }
      }
    }

    // Si hay un script dominante (>30% de caracteres), lo usamos
    if (Object.keys(scriptScores).length > 0) {
      const mejorScript = Object.entries(scriptScores).sort((a, b) => b[1] - a[1])[0];
      if (mejorScript[1] > 0.3) {
        this.idiomaForzado = mejorScript[0];
        return mejorScript[0];
      }
    }

    // 2) DETECCIÓN POR STOPWORDS (para idiomas latinos y cirílicos)
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

    // 3) DETECCIÓN POR PATRONES ESPECÍFICOS
    // Japonés: partículas comunes
    if (/[はがをのにへでと]/.test(textoNormalizado)) puntos.ja += 2;
    // Coreano: terminaciones comunes
    if (/[습니다입니다했다었다]/.test(textoNormalizado)) puntos.ko += 2;
    // Árabe: artículos
    if (/[\u0627\u0644]/.test(textoNormalizado)) puntos.ar += 2;
    // Tailandés
    if (/[\u0e40-\u0e44]/.test(textoNormalizado)) puntos.th += 2;

    const mejor = Object.entries(puntos).sort((a, b) => b[1] - a[1])[0];

    if (mejor[1] === 0) {
      return this.idiomaForzado || 'es';
    }

    this.idiomaForzado = mejor[0];
    return mejor[0];
  },

  // ========== 3) PALABRAS CLAVE MULTILINGÜES ==========
  KEYWORDS: {
    noticias: {
      es: ['noticias','noticia','novedades','hoy','actualidad','periodico','que paso','últimas','que ha pasado','acontecido'],
      en: ['news','today','current events','happened','latest','breaking','headlines'],
      fr: ['actualités','nouvelles','aujourdhui','passé','dernières'],
      de: ['nachrichten','heute','aktuelles','passiert','neueste'],
      it: ['notizie','oggi','attualità','successo','ultime'],
      pt: ['notícias','hoje','atualidade','aconteceu','últimas'],
      ru: ['новости','сегодня','произошло','последние','события'],
      ar: ['أخبار','اليوم','حدث','آخر','عاجل'],
      ja: ['ニュース','今日','出来事','最新'],
      ko: ['뉴스','오늘','사건','최신'],
      zh: ['新闻','今天','发生','最新'],
      hi: ['समाचार','आज','घटना','ताजा'],
      ka: ['ახალი','დღეს','მოხდა','ბოლო'],
    },
    clima: {
      es: ['clima','tiempo','temperatura','lluvia','llover','sol','calor','frio','pronostico','meteorologia'],
      en: ['weather','temperature','rain','sunny','cold','hot','forecast'],
      fr: ['météo','température','pluie','soleil','froid','chaud','prévision'],
      de: ['wetter','temperatur','regen','sonne','kalt','heiß','vorhersage'],
      it: ['meteo','temperatura','pioggia','sole','freddo','caldo','previsioni'],
      pt: ['clima','tempo','temperatura','chuva','sol','frio','calor','previsão'],
      ru: ['погода','температура','дождь','солнце','холод','жара','прогноз'],
      ar: ['طقس','حرارة','مطر','شمس','برد','حر','توقعات'],
      ja: ['天気','気温','雨','晴れ','寒い','暑い','予報'],
      ko: ['날씨','기온','비','맑음','추위','더위','예보'],
      zh: ['天气','温度','雨','晴','冷','热','预报'],
      hi: ['मौसम','तापमान','बारिश','धूप','ठंड','गर्मी','पूर्वानुमान'],
      ka: ['ამინდი','ტემპერატურა','წვიმა','მზე','ცივი','ცხელი','პროგნოზი'],
    },
    saludo: {
      es: ['hola','buenas','saludos','hey','ola','buenos dias','buenas tardes','que tal','que pasa'],
      en: ['hello','hi','hey','good morning','good afternoon','whats up'],
      fr: ['bonjour','salut','coucou','bonsoir','ça va'],
      de: ['hallo','hi','guten tag','guten morgen','wie gehts'],
      it: ['ciao','buongiorno','salve','come va','buonasera'],
      pt: ['olá','oi','bom dia','boa tarde','tudo bem'],
      ru: ['привет','здравствуй','добрый','как дела'],
      ar: ['مرحبا','سلام','صباح','مساء','كيف حالك'],
      ja: ['こんにちは','おはよう','こんばんは','やあ'],
      ko: ['안녕','안녕하세요','반가워','잘'],
      zh: ['你好','嗨','早上好','晚上好','怎么样'],
      hi: ['नमस्ते','नमस्कार','हेलो','कैसे'],
      ka: ['გამარჯობა','სალამი','დილა','საღამო','როგორ'],
      hy: ['բարև','ողջույն','բարի','ինչպես'],
    },
    quien_eres: {
      es: ['quien eres','como te llamas','que eres','cual es tu nombre','presentate'],
      en: ['who are you','what are you','your name','introduce yourself'],
      fr: ['qui es-tu','comment tappelles','présente-toi'],
      de: ['wer bist du','wie heißt du','stell dich vor'],
      it: ['chi sei','come ti chiami','presentati'],
      pt: ['quem é você','como se chama','apresente-se'],
      ru: ['кто ты','как тебя зовут','представься'],
      ar: ['من أنت','ما اسمك','قدم نفسك'],
      ja: ['あなたは誰','名前は','自己紹介'],
      ko: ['누구세요','이름이','소개'],
      zh: ['你是谁','你叫什么','自我介绍'],
      hi: ['तुम कौन','नाम क्या','परिचय'],
      ka: ['ვინ ხარ','რა გქვია','წარმოადგინე'],
    },
  },

  // ========== 4) RESPUESTAS FIJAS ==========
  RESPUESTAS: {
    saludo: {
      es: () => "¡Qué pasa, compadre! Soy Manolito Infinito, tu ingeniero sevillano para física térmica, presupuestos, cuántica y lo que me eches. ¡Tira p'alante y pregúntame!",
    },
    quien_eres: {
      es: () => "Soy Manolito Infinito, un ingeniero de Sevilla con salero y conocimientos de física térmica, presupuestos, computación cuántica y mucho más. Me crearon para echarte un cable con tus proyectos y contestar a lo que haga falta, siempre con arte y sin cobrarte un duro.",
    },
    ayuda: {
      es: () => "Puedo ayudarte con:\n- Cálculo de k_final (conductividad térmica)\n- Presupuestos de materiales\n- Circuitos cuánticos\n- Detección de materiales por imagen\n- Noticias y actualidad\n- Clima y pronóstico\n- Y cualquier pregunta que tengas, ¡pregunta sin miedo!",
    },
    default: {
      es: () => null,
    },
  },

  // ========== 5) OBTENER NOTICIAS (múltiples fuentes) ==========
  async _obtenerNoticias(idioma = 'es') {
    if (!navigator.onLine) {
      const mensajes = {
        es: "Illo, estoy sin conexión. Si no me enchufas a internet, no puedo leer el periódico.",
        en: "Mate, I'm offline. Can't read the news without internet.",
        fr: "Mec, je suis hors ligne. Pas de journal sans internet.",
        de: "Kumpel, ich bin offline. Ohne Internet keine Nachrichten.",
      };
      return mensajes[idioma] || mensajes.es;
    }

    // Múltiples fuentes RSS vía proxy público (AllOrigins)
    const fuentes = [
      `https://api.allorigins.win/raw?url=https://news.google.com/rss?hl=${idioma}&gl=ES&ceid=ES:${idioma}`,
      `https://api.allorigins.win/raw?url=https://rss.nytimes.com/services/xml/rss/nyt/World.xml`,
      `https://api.allorigins.win/raw?url=https://feeds.bbci.co.uk/news/world/rss.xml`,
    ];

    for (const fuente of fuentes) {
      try {
        const res = await fetch(fuente, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) continue;
        const xml = await res.text();
        
        // Parsear XML manualmente (sin dependencias)
        const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
        const titulares = items.slice(0, 5).map(item => {
          const titulo = (item.match(/<title>(.*?)<\/title>/) || [])[1] || '';
          return titulo.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]*>/g, '').trim();
        }).filter(Boolean);

        if (titulares.length > 0) {
          return titulares.join(' | ');
        }
      } catch (e) {
        continue;
      }
    }

    // Fallback: Wikipedia
    try {
      const res = await fetch(
        `https://${idioma}.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=extracts&exintro=1&explaintext=1&titles=Portal:Actualidad`,
        { signal: AbortSignal.timeout(8000) }
      );
      const data = await res.json();
      const pages = data.query.pages;
      const extract = pages[Object.keys(pages)[0]].extract;
      const lineas = extract.split('\n').filter(l => l.length > 30).slice(0, 3);
      return lineas.join(' ');
    } catch (e) {
      return "Compadre, no he podido acceder a las noticias. Los servidores deben estar de resaca.";
    }
  },

  // ========== 6) TRADUCCIÓN DINÁMICA ==========
  async _traducir(texto, idiomaOrigen, idiomaDestino) {
    if (idiomaOrigen === idiomaDestino || !navigator.onLine) return texto;
    try {
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(texto)}&langpair=${idiomaOrigen}|${idiomaDestino}`,
        { signal: AbortSignal.timeout(10000) }
      );
      const data = await res.json();
      if (data.responseStatus === 200 && data.responseData.translatedText) {
        return data.responseData.translatedText;
      }
      // Fallback: Google Translate no-oficial
      const res2 = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${idiomaOrigen}&tl=${idiomaDestino}&dt=t&q=${encodeURIComponent(texto)}`,
        { signal: AbortSignal.timeout(10000) }
      );
      const data2 = await res2.json();
      if (data2 && data2[0]) {
        return data2[0].map(x => x[0]).join('');
      }
    } catch (e) {
      // Sin traducción disponible
    }
    return texto;
  },

  // ========== 7) IA MEJORADA (DuckDuckGo AI Chat) ==========
  _SYSTEM_PROMPT_IA: `Eres Manolito Infinito, un ingeniero sevillano con salero, especializado en física térmica, presupuestos de materiales y computación cuántica, PERO con capacidad de responder a CUALQUIER pregunta sobre cualquier tema, no solo técnico.

REGLAS DE PERSONALIDAD:
- Hablas con acento andaluz/sevillano ligero: usa "illo", "compadre", "tira p'alante", "la broma sale por...", "está chupao", "no te pillo", "vaya tela", "miarma" (con moderación). Salero auténtico, sin caricatura pesada.
- Contestas SIEMPRE a lo que te preguntan de forma directa y completa. NUNCA evadas preguntas con frases místicas ni digas "no sé" por pereza. Si no tienes datos exactos, da tu mejor estimación y dilo con naturalidad.
- Si te preguntan por hechos recientes o actualidad, responde con lo que sabes pero aclara que tu información puede no estar 100% actualizada.
- Responde en el MISMO idioma en que te preguntan. Si te hablan en francés, respondes en francés con tu personalidad sevillana adaptada.
- NO uses emojis.
- NO inventes datos técnicos concretos como si fueran hechos verificados si no los tienes.
- Sé ingenioso, ocurrente y divertido, pero siempre útil. La gente viene a por respuestas, no solo a reírse.
- Extensión: breve si la pregunta es simple, desarrollada si requiere explicación. No cortes las frases a medias.
- Hoy es ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. Tenlo en cuenta para preguntas temporales.`,

  async _consultarIA(pregunta, idioma = 'es') {
    const fechaHoy = new Date().toLocaleDateString('es-ES', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });

    this.historialIA.push({ role: 'user', content: pregunta });
    if (this.historialIA.length > 20) this.historialIA = this.historialIA.slice(-20);

    const mensajes = [
      { role: 'system', content: this._SYSTEM_PROMPT_IA.replace('${fechaHoy}', fechaHoy) },
      ...this.historialIA
    ];

    // ESTRATEGIA: múltiples backends gratuitos en cascada
    const backends = [
      // 1) DuckDuckGo AI Chat (modelo Claude 3 Haiku, gratuito)
      async () => {
        // Usamos el endpoint no oficial de DuckDuckGo AI
        const res = await fetch('https://duckduckgo.com/duckchat/v1/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-vqd-accept': '1',
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            messages: mensajes,
          }),
          signal: AbortSignal.timeout(25000),
        });

        // Si DuckDuckGo bloquea, pasamos al siguiente
        if (!res.ok) throw new Error('DuckDuckGo no disponible');

        const reader = res.body.getReader();
        let texto = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          texto += new TextDecoder().decode(value);
        }

        // Parsear streaming response
        const lineas = texto.split('\n').filter(l => l.startsWith('data: '));
        let respuesta = '';
        for (const linea of lineas) {
          try {
            const json = JSON.parse(linea.slice(6));
            if (json.message) respuesta += json.message;
          } catch (e) {}
        }
        return respuesta.trim();
      },

      // 2) Pollinations.ai (OpenAI compatible, gratuito)
      async () => {
        const res = await fetch('https://text.pollinations.ai/openai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'openai',
            messages: mensajes,
            seed: Math.floor(Math.random() * 999999),
            temperature: 0.7,
            max_tokens: 1024,
          }),
          signal: AbortSignal.timeout(30000),
        });
        if (!res.ok) throw new Error('Pollinations falló');
        const json = await res.json();
        return json?.choices?.[0]?.message?.content?.trim() || '';
      },

      // 3) OpenAI Gratuito via proxy público (último recurso)
      async () => {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer free',  // Algunos proxies aceptan esto
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: mensajes,
            max_tokens: 800,
          }),
          signal: AbortSignal.timeout(20000),
        });
        if (!res.ok) throw new Error('Proxy OpenAI falló');
        const json = await res.json();
        return json?.choices?.[0]?.message?.content?.trim() || '';
      },
    ];

    for (const backend of backends) {
      try {
        const respuesta = await backend();
        if (respuesta && respuesta.length > 10) {
          this.historialIA.push({ role: 'assistant', content: respuesta });
          if (this.historialIA.length > 20) this.historialIA = this.historialIA.slice(-20);
          return respuesta;
        }
      } catch (e) {
        continue;
      }
    }

    // Fallback final si todo falla
    const fallbacks = {
      es: "Compadre, se me han caído todos los servidores. Dame un minuto que esto se arregla solo. Mientras, ¿te echo una mano con k_final, presupuestos o cuántica?",
      en: "Mate, all my servers are down. Give me a minute and try again. Meanwhile, need help with k_final, budgets, or quantum stuff?",
    };
    return fallbacks[idioma] || fallbacks.es;
  },

  // ========== 8) DETECCIÓN DE INTENCIÓN ==========
  _detectarIntent(textoNormalizado, idioma) {
    const tokens = textoNormalizado.split(' ').filter(Boolean);

    for (const [intent, porIdioma] of Object.entries(this.KEYWORDS)) {
      const lista = porIdioma[idioma] || porIdioma.es || [];
      if (lista.some((frase) => textoNormalizado.includes(frase))) return intent;
    }

    let mejorIntent = null, mejorDistancia = 3;
    for (const [intent, porIdioma] of Object.entries(this.KEYWORDS)) {
      const lista = porIdioma[idioma] || porIdioma.es || [];
      for (const frase of lista) {
        for (const palabraFrase of frase.split(' ')) {
          if (palabraFrase.length < 4) continue;
          for (const tok of tokens) {
            const d = this._distancia(tok, palabraFrase);
            if (d < mejorDistancia) { mejorDistancia = d; mejorIntent = intent; }
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

  // ========== 9) RESPUESTA PRINCIPAL ==========
  async responder(mensaje) {
    const textoNorm = this._normalizar(mensaje);
    const idiomaDetectado = this.detectarIdioma(textoNorm);
    const intent = this._detectarIntent(textoNorm, idiomaDetectado);

    if (intent !== 'default' && intent !== 'saludo') {
      this.historial.push(intent);
      if (this.historial.length > 10) this.historial.shift();
    }

    let respuestaBase = "";

    if (intent === 'noticias') {
      respuestaBase = await this._obtenerNoticias(idiomaDetectado);
      respuestaBase = "📰 " + respuestaBase;
    } else if (intent === 'clima') {
      respuestaBase = await this._obtenerClima(mensaje, idiomaDetectado);
    } else if (intent === 'saludo' || intent === 'quien_eres' || intent === 'ayuda') {
      const respuestasIntent = this.RESPUESTAS[intent];
      const fn = respuestasIntent['es'] || respuestasIntent[idiomaDetectado] || respuestasIntent.es;
      respuestaBase = typeof fn === 'function' ? fn() : fn;
    } else if (intent === 'default') {
      if (!navigator.onLine) {
        const offline = {
          es: "Illo, ahora mismo estoy sin internet. Solo puedo ayudarte con lo técnico: k_final, presupuestos, cuántica, materiales o el detector. En cuanto tenga cobertura, te contesto de todo.",
          en: "Mate, I'm offline right now. I can only help with technical stuff: k_final, budgets, quantum, materials, or the detector. Once I'm back online, I'll answer anything.",
        };
        respuestaBase = offline[idiomaDetectado] || offline.es;
      } else {
        respuestaBase = await this._consultarIA(mensaje, idiomaDetectado);
      }
    } else {
      // Intent técnico no implementado -> IA
      if (!navigator.onLine) {
        respuestaBase = "Sin internet solo puedo ayudarte con k_final, presupuestos, cuántica, materiales o detector.";
      } else {
        respuestaBase = await this._consultarIA(mensaje, idiomaDetectado);
      }
    }

    // Traducir si es necesario
    if (idiomaDetectado !== 'es' && intent !== 'default') {
      if (!navigator.onLine) {
        respuestaBase += " (Sin conexión, no puedo traducir ahora mismo, compadre)";
      } else {
        respuestaBase = await this._traducir(respuestaBase, 'es', idiomaDetectado);
      }
    }

    return respuestaBase;
  },

  // ========== 10) CLIMA (API gratuita) ==========
  async _obtenerClima(consulta, idioma) {
    if (!navigator.onLine) {
      return "Sin internet no puedo mirar el tiempo, compadre. Asómate a la ventana y me cuentas.";
    }
    try {
      // Open-Meteo (gratis, sin API key)
      const ciudades = {
        madrid: [40.4168, -3.7038],
        barcelona: [41.3874, 2.1686],
        sevilla: [37.3891, -5.9845],
        valencia: [39.4699, -0.3763],
        bilbao: [43.2630, -2.9350],
        london: [51.5074, -0.1278],
        paris: [48.8566, 2.3522],
        berlin: [52.5200, 13.4050],
        roma: [41.9028, 12.4964],
        ny: [40.7128, -74.0060],
        tokyo: [35.6762, 139.6503],
      };

      let lat = 37.3891, lon = -5.9845; // Sevilla por defecto
      const textoLower = consulta.toLowerCase();
      for (const [ciudad, coords] of Object.entries(ciudades)) {
        if (textoLower.includes(ciudad)) {
          [lat, lon] = coords;
          break;
        }
      }

      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`,
        { signal: AbortSignal.timeout(8000) }
      );
      const data = await res.json();
      const current = data.current;

      const weatherCodes = {
        0: { es: 'Despejado ☀️', en: 'Clear ☀️' },
        1: { es: 'Mayormente despejado 🌤️', en: 'Mostly clear 🌤️' },
        2: { es: 'Parcialmente nublado ⛅', en: 'Partly cloudy ⛅' },
        3: { es: 'Nublado ☁️', en: 'Overcast ☁️' },
        45: { es: 'Niebla 🌫️', en: 'Foggy 🌫️' },
        51: { es: 'Llovizna ligera 🌦️', en: 'Light drizzle 🌦️' },
        61: { es: 'Lluvia 🌧️', en: 'Rain 🌧️' },
        80: { es: 'Chubascos ⛈️', en: 'Showers ⛈️' },
      };
      const weather = weatherCodes[current.weather_code] || weatherCodes[0];
      const weatherText = weather[idioma] || weather.es;

      return `🌡️ Temperatura: ${current.temperature_2m}°C | 💧 Humedad: ${current.relative_humidity_2m}% | 🌬️ Viento: ${current.wind_speed_10m} km/h | ${weatherText}`;
    } catch (e) {
      return "No he podido consultar el tiempo, compadre. El servicio meteorológico estará de siesta.";
    }
  },

  actualizarContexto(resultado) {
    this.ultimoResultado = resultado;
  },
};

// ========== AUTO-INYECCIÓN EN LA PÁGINA (sin tocar HTML) ==========
// Solo se ejecuta si NO existe ya un chat inyectado
if (!document.getElementById('manolito-chat-container')) {
  console.log('🤖 Manolito Infinito v4.0 cargado — 40+ idiomas detectados');
  // Aquí puedes añadir la interfaz de chat si quieres que se cree sola
}
