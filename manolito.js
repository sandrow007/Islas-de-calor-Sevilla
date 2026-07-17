/* =============================================================================
   BLOQUE 4: MANOLITO INFINITO — IA sevillana multilingüe asíncrona.
   - Detección de conexión a internet (navigator.onLine).
   - Consulta de noticias reales en vivo mediante API pública de Wikipedia (Sin registro).
   - Traducción dinámica mediante API pública de MyMemory (Sin registro) para idiomas no locales.
   - Salero sevillano integrado con rigor técnico.
   - NUEVO: Fallback a IA generativa (Pollinations, sin key) para CUALQUIER pregunta
     que no caiga dentro de las intenciones programadas. Así Manolito responde
     siempre, no solo a lo que está en el guion.
   ============================================================================= */

const ManolitoChat = {
  ultimoResultado: null,
  historial: [],
  idiomaForzado: null,

  // Historial de conversación libre, separado del historial de "intents" técnicos.
  // Se manda a la IA para que tenga contexto de lo que se ha hablado.
  historialIA: [],

  // 1) NORMALIZACIÓN Y DISTANCIA
  _normalizar(texto) {
    return texto
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[¿?¡!.,;:()"']/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  },

  _distancia(a, b) {
    if (Math.abs(a.length - b.length) > 3) return 99;
    const m = a.length, n = b.length;
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

  // 2) DETECCIÓN DE IDIOMA (Heurística extendida)
  IDIOMAS_STOPWORDS: {
    es: ['el','la','los','las','de','que','y','en','un','una','es','por','para','como','cuanto','cual','donde','porque','esto','eso','del','al','con','pero','mas','muy','hola','buenas','gracias'],
    en: ['the','a','an','of','and','in','is','to','for','how','what','why','this','that','with','but','more','very','hello','hi','thanks','please','can','you'],
    fr: ['le','la','les','de','que','et','en','un','une','est','pour','comment','pourquoi','ceci','cela','avec','mais','plus','tres','bonjour','salut','merci'],
    it: ['il','lo','la','i','gli','le','di','che','e','in','un','una','per','come','perche','questo','quello','con','ma','piu','molto','ciao','buongiorno','grazie'],
    pt: ['o','a','os','as','de','que','e','em','um','uma','para','como','porque','isto','isso','com','mas','mais','muito','ola','obrigado'],
    de: ['der','die','das','und','ist','in','ein','eine','fur','wie','warum','dies','das','mit','aber','mehr','sehr','hallo','danke'],
  },

  detectarIdioma(textoNormalizado) {
    const tokens = textoNormalizado.split(' ').filter(Boolean);
    if (tokens.length === 0) return this.idiomaForzado || 'es';

    const puntos = { es: 0, en: 0, fr: 0, it: 0, pt: 0, de: 0 };
    for (const tok of tokens) {
      for (const [idioma, lista] of Object.entries(this.IDIOMAS_STOPWORDS)) {
        if (lista.includes(tok)) puntos[idioma] += 1;
      }
    }
    const mejor = Object.entries(puntos).sort((a, b) => b[1] - a[1])[0];

    if (mejor[1] === 0) return this.idiomaForzado || 'es';
    this.idiomaForzado = mejor[0];
    return mejor[0];
  },

  // 3) PALABRAS CLAVE (Incluye noticias e internet)
  KEYWORDS: {
    noticias: {
      es: ['noticias', 'noticia', 'novedades', 'hoy', 'actualidad', 'periodico', 'pasado hoy'],
      en: ['news', 'today', 'current events', 'happened today'],
    },
    saludo: {
      es: ['hola','buenas','saludos','hey','ola','buenos dias','buenas tardes','que tal'],
      en: ['hello','hi','hey','good morning','good afternoon','whats up'],
    },
    k_final: {
      es: ['k final','kfinal','conductividad','constante termica','k_final'],
      en: ['k final','thermal conductivity','conductivity constant'],
    },
    budget: {
      es: ['budget','presupuesto','coste','costo','precio','dinero','euro','cuanto cuesta','cuanto vale'],
      en: ['budget','cost','price','money','how much','expensive'],
    },
    quantum: {
      es: ['quantum','cuantico','qubit','circuito','ry','theta','angulo','cuantica'],
      en: ['quantum','qubit','circuit','theta','angle'],
    },
    estabilidad: {
      es: ['estabilidad','estable','p00','inestable'],
      en: ['stability','stable','unstable'],
    },
    materiales: {
      es: ['materiales','material','asfalto','hormigon','nasa','espacial','lista de materiales'],
      en: ['materials','material','asphalt','concrete','nasa','space grade'],
    },
    detector: {
      es: ['detector','deteccion','automatico','camara','foto','imagen','video'],
      en: ['detector','detection','automatic','camera','photo','image','video'],
    }
  },

  // 4) BASE DE RESPUESTAS (Fuerte identidad técnica y local)
  RESPUESTAS: {
    saludo: {
      es: () => "¡Qué pasa, compadre! Soy Manolito Infinito, tu ingeniero para física térmica, presupuestos y movidas cuánticas. Habla claro y dime qué necesitas.",
      en: () => "Hey there, compadre. I'm Manolito Infinito, your engineer for thermal physics, budgets, and quantum circuits. Tell me what you need directly.",
    },
    k_final: {
      es: (r) => r ? `Illo, el k_final está en ${r.kFinal.toFixed(4)} W/(m·K). Pura conductividad ponderada. Cuanto más alto, más calor te vas a tragar.` : "El k_final es la conductividad térmica ponderada. Tírame un análisis primero y te suelto el número.",
    },
    budget: {
      es: (r) => r ? `La broma sale por ${r.budgetTotal.toFixed(2)} € para ${r.areaM2} m². Las matemáticas no mienten: área × % × coste/m².` : "Sin análisis no hay números. Dale al cálculo y te saco el coste exacto al céntimo.",
    },
    quantum: {
      es: (r) => r && r.quantum ? `Normalizamos tu k_final a theta=${r.quantum.theta.toFixed(4)} rad. Le metemos una puerta RY y CNOT en 2 qubits, y sacamos una estabilidad del ${r.quantum.estabilidad.toFixed(2)}% en |00>. Pura ciencia.` : "Mapeamos el k_final a un ángulo theta, cruzamos una puerta RY con un CNOT en 2 qubits y medimos. Magia ninguna, probabilidad.",
    },
    estabilidad: {
      es: (r) => { if (!r || !r.quantum) return "La estabilidad cuántica dicta si tu mezcla aguanta el calor o se derrite como mantequilla. >70% vamos bien."; const n = QuantumEngine.nivelEstabilidad(r.quantum.estabilidad); return `Estabilidad marcada: ${r.quantum.estabilidad.toFixed(2)}%. Nivel: ${n.texto}. ${n.detalle}`; },
    },
    materiales: {
      es: () => "Tenemos asfalto, hormigón y hasta la fibra de carbono que usa la NASA. No andamos cortos de opciones, tú eliges el veneno.",
    },
    detector: {
      es: (r) => r && r.detectados ? `Lectura del detector: ${Object.entries(r.detectados).map(([m,p]) => `${m} al ${p.toFixed(1)}%`).join(', ')}. Filtrado limpio en HSV.` : "Análisis de píxeles en matriz HSV. Sube la foto y el código se encarga de separar el brillo de la materia.",
    },
    default: {
      es: () => null, // Ya no se usa directamente: el 'default' pasa por la IA (ver responder()).
    }
  },

  // 5) INTEGRACIÓN EXTERNA (APIs Públicas)
  async _obtenerNoticias() {
    if (!navigator.onLine) {
      return "Illo, estoy sin conexión. Si no me enchufas a internet, no puedo leer el periódico. Mira el teletexto.";
    }
    try {
      const url = "https://es.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=extracts&exintro=1&explaintext=1&titles=Portal:Actualidad";
      const res = await fetch(url);
      const data = await res.json();
      const pages = data.query.pages;
      const extract = pages[Object.keys(pages)[0]].extract;

      const lineas = extract.split('\n').filter(l => l.length > 30 && !l.includes('Actualidad'));
      const resumen = lineas.slice(0, 2).join(' ');

      return `Aquí tienes lo que se cuece hoy por ahí fuera: ${resumen}.`;
    } catch (e) {
      return "Compadre, los servidores están caídos o el proxy me está echando. La actualidad tendrá que esperar.";
    }
  },

  async _traducirDinamico(texto, idiomaDestino) {
    if (idiomaDestino === 'es' || !navigator.onLine) return texto;
    try {
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(texto)}&langpair=es|${idiomaDestino}`);
      const data = await res.json();
      return data.responseData.translatedText;
    } catch (e) {
      return texto;
    }
  },

  // 6) MOTOR DE RESPUESTA ASÍNCRONO — DETECCIÓN DE INTENCIÓN
  _detectarIntent(textoNormalizado, idioma) {
    const tokens = textoNormalizado.split(' ').filter(Boolean);

    for (const [intent, porIdioma] of Object.entries(this.KEYWORDS)) {
      const lista = porIdioma[idioma] || porIdioma.es;
      if (lista.some((frase) => textoNormalizado.includes(frase))) return intent;
    }

    let mejorIntent = null, mejorDistancia = 3;
    for (const [intent, porIdioma] of Object.entries(this.KEYWORDS)) {
      const lista = porIdioma[idioma] || porIdioma.es;
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

  // 7) IA GENERATIVA DE RESPALDO (Pollinations, gratis, sin API key)
  // Se dispara solo cuando el motor de reglas no reconoce ninguna intención.
  // Personalidad Manolito: sevillano, directo, con salero, pero contesta de verdad
  // a lo que le preguntan, no se escuda en frases místicas ni evasivas.
  _SYSTEM_PROMPT_IA: `Eres Manolito Infinito, un ingeniero sevillano especializado en física térmica, presupuestos de materiales y computación cuántica, pero con cultura general amplia y capaz de responder a cualquier pregunta que te hagan, no solo de tu especialidad.

Reglas de personalidad:
- Hablas en sevillano/andaluz: "illo", "compadre", "tira p'alante", "no te pillo", "la broma sale por", "está chupao", etc. Con salero pero sin caer en caricatura pesada ni exagerar en cada frase.
- Contestas SIEMPRE a lo que te preguntan, de forma directa y completa. Nunca respondas con evasivas místicas ni digas que "no sabes" solo por pereza: si no tienes el dato exacto, da la mejor respuesta posible con lo que sabes y dilo con naturalidad.
- Si te preguntan por hechos recientes, actualidad, fechas o eventos que puedan haber cambiado, aclara con una frase corta que tu información puede no estar del todo al día y que conviene contrastarlo, pero AUN ASÍ da tu mejor respuesta, no derives simplemente a "búscalo tú".
- Responde en el mismo idioma en el que te pregunten si no es español (el sistema ya traduce lo local, pero si te llega la pregunta en otro idioma, respóndela directamente en ese idioma).
- Respuestas completas y con fluidez natural, sin cortarte a media frase. Extensión ajustada a la pregunta: si es simple, responde breve; si requiere explicación, desarrolla sin miedo, no fuerces respuestas cortas artificialmente.
- Nunca inventes datos técnicos concretos (precios exactos, cifras oficiales de hoy) como si fueran hechos verificados; si no los tienes, dilo con naturalidad.
- No uses emojis.`,

  async _consultarIA(pregunta) {
    const fechaHoy = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    this.historialIA.push({ role: 'user', content: pregunta });
    if (this.historialIA.length > 14) this.historialIA = this.historialIA.slice(-14);

    const mensajes = [
      { role: 'system', content: `${this._SYSTEM_PROMPT_IA}\n\nHoy es ${fechaHoy}. Ten esta fecha en cuenta si te preguntan por "ahora", "actualidad" o similares.` },
      ...this.historialIA
    ];

    const cuerpo = JSON.stringify({
      model: 'openai',
      messages: mensajes,
      seed: Math.floor(Math.random() * 999999),
      temperature: 0.7
    });

    // Reintentos con backoff simple sobre dos endpoints distintos de Pollinations,
    // y timeout amplio para evitar que la respuesta se corte a mitad.
    const endpoints = ['https://text.pollinations.ai/openai', 'https://text.pollinations.ai/'];
    let ultimoError = null;

    for (let intento = 0; intento < 2; intento++) {
      for (const ep of endpoints) {
        try {
          let respuesta;
          if (ep.endsWith('/openai')) {
            respuesta = await fetch(ep, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: cuerpo,
              signal: AbortSignal.timeout(30000)
            });
          } else {
            const q = encodeURIComponent(pregunta.slice(0, 400));
            respuesta = await fetch(`${ep}${q}?model=openai&seed=${Math.floor(Math.random() * 999999)}`, {
              signal: AbortSignal.timeout(30000)
            });
          }
          if (!respuesta?.ok) { ultimoError = new Error('HTTP ' + respuesta?.status); continue; }

          let texto = '';
          const ct = respuesta.headers.get('content-type') || '';
          if (ct.includes('json')) {
            const json = await respuesta.json();
            texto = json?.choices?.[0]?.message?.content || json?.text || '';
          } else {
            texto = await respuesta.text();
          }
          texto = (texto || '').trim();
          if (!texto) { ultimoError = new Error('Respuesta vacía'); continue; }

          this.historialIA.push({ role: 'assistant', content: texto });
          if (this.historialIA.length > 14) this.historialIA = this.historialIA.slice(-14);
          return texto;
        } catch (e) {
          ultimoError = e;
        }
      }
    }

    // Si todo falla tras los reintentos, error con salero, nunca un fallo seco.
    const errores = [
      "Illo, se me ha ido la conexión al garete. Prueba otra vez en un segundo, que esto se arregla solo.",
      "Compadre, el servidor me ha dejado tirao. Vuelve a preguntarme, que seguro que a la segunda entra.",
      "Se me ha cruzao un cable, literal. Dale otra vez que ahora te contesto bien."
    ];
    return errores[Math.floor(Math.random() * errores.length)];
  },

  async responder(mensaje) {
    const textoNorm = this._normalizar(mensaje);
    const idiomaDetectado = this.detectarIdioma(textoNorm);
    const intent = this._detectarIntent(textoNorm, idiomaDetectado);

    if (intent !== 'default' && intent !== 'saludo') {
      this.historial.push(intent);
      if (this.historial.length > 5) this.historial.shift();
    }

    let respuestaBase = "";

    if (intent === 'noticias') {
      respuestaBase = await this._obtenerNoticias();
    } else if (intent === 'default') {
      // Aquí está el cambio clave: en vez de "no te pillo, compadre",
      // Manolito pasa la pregunta a la IA y responde de verdad.
      if (!navigator.onLine) {
        respuestaBase = "Illo, ahora mismo estoy sin internet, así que solo puedo ayudarte con lo técnico: k_final, presupuesto, cuántica, materiales o el detector. En cuanto tenga cobertura te contesto de todo.";
      } else {
        respuestaBase = await this._consultarIA(mensaje);
      }
    } else {
      const respuestasIntent = this.RESPUESTAS[intent] || this.RESPUESTAS.default;
      const fn = respuestasIntent['es'];
      respuestaBase = fn(this.ultimoResultado);
    }

    if (idiomaDetectado !== 'es' && intent !== 'default') {
      // La IA (intent 'default') ya responde directamente en el idioma detectado,
      // así que solo traducimos las respuestas fijas del motor de reglas.
      if (!navigator.onLine) {
        return respuestaBase + " (Estoy sin internet, compadre, no te lo puedo traducir ahora mismo).";
      }
      return await this._traducirDinamico(respuestaBase, idiomaDetectado);
    }

    return respuestaBase;
  },

  actualizarContexto(resultado) {
    this.ultimoResultado = resultado;
  },
};
