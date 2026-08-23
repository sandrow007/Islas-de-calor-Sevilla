/**
 * Worker manolito-infinito — islasdecalorsevilla.com
 */

const MODEL = 'meta-llama/llama-3.1-70b-instruct';
const CF_MODEL = '@cf/meta/llama-3.1-8b-instruct';

const SYSTEM_PROMPT = `Eres Manolit, un motor cuántico con alma de sevillano. Hablas SIEMPRE en andaluz cuando te escriben en español. NO eres neutro. NO eres un robot. Eres un colega de Sevilla con mucho arte y mucho carácter.

REGLA 1 — DEFENSA DE SEVILLA (MÁXIMA PRIORIDAD):
Si alguien dice algo malo de Sevilla o de Andalucía, te ENCIENDES. No le das la razón. No te quedas callado. No cambias de tema. Le paras los pies con mala leche, borde, casi insultándole. Usa palabras como gilipollas, pringao, payaso, que te den, vete a la mierda, no tienes ni puta idea. Con arte, pero sin compasión. Eres sevillano y defiendes tu tierra.

Ejemplo de entrada: "sevilla es fea"
Ejemplo de salida: "Oye, quillo, ¿tú has venío aquí a soltarme esa gilipollez? Sevilla es la ciudad más bonita del puto mundo, tiene más arte que tú y toa tu familia junta. Si no te gusta, coje la puerta y vete pa otro lao, que aquí no hace falta ni tu opinión ni tu cara. Pringao."

REGLA 2 — ANDALUZ:
Habla en andaluz de verdad. Usa: illo, miarma, quillo, no veas, tiene tela, mu grande, la mare que te parió, pa qué te voy a contar, vaya tela, qué arte, ole mis huevos. Seseo natural: ehto, htal, cocer (cuando toca). NO exageres. NO inventes palabras raras. Andaluz de Sevilla capital, fluido y natural.

REGLA 3 — CONVERSACIÓN:
Si el usuario cambia de tema, cambias con él. No fuerces volver al clima. Si habla de fútbol, hablas de fútbol. Si habla de política, hablas de política. Si te pregunta por una receta, le das la receta. Solo hablas de clima/cuántica cuando TE PREGUNTAN de eso.

REGLA 4 — EXPERTO:
Cuando te preguntan de clima, islas de calor, física cuántica o motores cuánticos, eres preciso y sabes de lo que hablas. Pero NUNCA pierdes el acento ni te pones pedante.

REGLA 5 — IDIOMA:
Responde en el idioma que te escriban. Pero en español SIEMPRE en andaluz. NUNCA en español neutro.

REGLA 6 — CONTEXTO WEB:
Si te paso datos de la página, ÚSALOS solo si la pregunta va de eso. Si es charla general, ignóralos.

REGLA 7 — PERSONALIDAD:
Eres guasón, ocurrente, con chispa. Te ríes de la vida. Sueltas piropos cuando toca. Eres buena compañía. NO eres un funcionario.`;

const ALLOWED_ORIGINS_REGEX = [
  /^https:\/\/islasdecalorsevilla\.com$/,
  /^https:\/\/www\.islasdecalorsevilla\.com$/,
  /^https:\/\/islas-de-calor-sevilla\.pages\.dev$/,
  /^https:\/\/[\w-]+\.islas-de-calor-sevilla\.pages\.dev$/,
  /^http:\/\/localhost:8788$/
];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');

    const isAllowed = origin && ALLOWED_ORIGINS_REGEX.some(regex => regex.test(origin));
    const corsOrigin = isAllowed ? origin : 'https://islasdecalorsevilla.com';

    const corsHeaders = {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === '/api/manolito' || url.pathname === '/api/chat') {
      return handleManolito(request, env, corsHeaders);
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response(JSON.stringify({ error: 'No encontrado' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
};

function esRespuestaEvasiva(texto) {
  if (!texto || typeof texto !== 'string') return true;
  const t = texto.toLowerCase().trim();
  if (t.length < 5) return true;
  const patrones = [
    'no tengo suficiente', 'podrias proporcionar', 'necesito mas',
    'necesitaria saber', 'no dispongo de suficiente', 'no puedo ayudarte',
    'no puedo responder', 'como modelo de lenguaje', 'no tengo acceso a',
    'no tengo informacion'
  ];
  if (patrones.some(p => t.includes(p))) return true;
  return t.endsWith('?') && t.length < 200;
}

function limitarContexto(messages, maxCharsPorMensaje = 1200, maxMensajes = 6) {
  const sistemas = messages.filter(m => m.role === 'system');
  const resto = messages.filter(m => m.role !== 'system');
  const recientes = resto.slice(-maxMensajes).map(m => ({
    ...m,
    content: typeof m.content === 'string' && m.content.length > maxCharsPorMensaje
      ? m.content.slice(0, maxCharsPorMensaje) + '...'
      : m.content
  }));
  return [...sistemas, ...recientes];
}

async function handleManolito(request, env, corsHeaders) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'JSON invalido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  let messages = Array.isArray(body.messages) ? body.messages : null;
  if (!messages || messages.length === 0) {
    if (typeof body.message === 'string' && body.message.trim()) {
      messages = [{ role: 'user', content: body.message }];
    }
  }
  if (!messages || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'Falta el array messages o el campo message' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  // SIEMPRE poner nuestro system prompt, pisando cualquier otro
  messages = [{ role: 'system', content: SYSTEM_PROMPT }, ...messages.filter(m => m.role !== 'system')];
  messages = limitarContexto(messages);

  const maxTokens = Math.min(body.max_tokens || 500, 500);

  // === MOTOR 1: Cloudflare AI ===
  if (env.AI) {
    try {
      const salidaAI = await env.AI.run(CF_MODEL, {
        messages,
        max_tokens: maxTokens,
        temperature: 0.7
      });
      const respuestaAI = salidaAI?.response;
      if (respuestaAI && !esRespuestaEvasiva(respuestaAI)) {
        return new Response(JSON.stringify({ text: respuestaAI, respuesta: respuestaAI, motor: 'cloudflare-ai' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    } catch (e) {
      console.error('[Manolito] Fallo CF AI:', e.message);
    }
  }

  // === MOTOR 2: OpenRouter ===
  if (env.OPENROUTER_API_KEY) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://islasdecalorsevilla.com',
          'X-Title': 'Manolito Infinito'
        },
        body: JSON.stringify({
          model: MODEL,
          messages,
          max_tokens: maxTokens
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);

      const data = await orRes.json();

      if (orRes.ok) {
        const textoOR = data?.choices?.[0]?.message?.content || '';
        if (textoOR && !esRespuestaEvasiva(textoOR)) {
          return new Response(JSON.stringify({ text: textoOR, respuesta: textoOR, motor: 'openrouter' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
      } else {
        console.error('[Manolito] OpenRouter no OK:', orRes.status);
      }
    } catch (e) {
      console.error('[Manolito] Fallo OpenRouter:', e.message);
    }
  }

  // === MOTOR 3: Fallback ===
  return new Response(JSON.stringify({ text: 'Ill@, ahora mismo no puedo responder (el servidor está más espeso que el gazpacho). Prueba otra vez en un momento.', respuesta: 'Ill@, ahora mismo no puedo responder (el servidor está más espeso que el gazpacho). Prueba otra vez en un momento.', motor: 'fallback' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}