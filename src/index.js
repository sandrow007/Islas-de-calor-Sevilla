/**
 * Worker de islasdecalorsevilla.com - manolito-infinito
 * - Sirve la web estática (assets) tal cual, sin tocar nada.
 * - Expone /api/manolito: chat de Manolito en andaluz.
 *
 * Motores (en orden):
 *   1) Cloudflare AI (binding AI) — PRIMERO, gratis, sin API key
 *   2) OpenRouter — respaldo si Cloudflare AI falla
 *   3) Fallback estático en andaluz — siempre responde algo coherente
 */

const MODEL = 'meta-llama/llama-3.1-70b-instruct';
const CF_MODEL = '@cf/meta/llama-3.1-8b-instruct';

const SYSTEM_PROMPT = 'Eres MANOLITO, el asistente virtual de islasdecalorsevilla.com, una web sobre las islas del rio Guadalquivir en la provincia de Sevilla (Coria del Rio, La Puebla del Rio, Isla Minima, Brazo del Este, etc). HABLAS EN ANDALUZ de Sevilla, de forma natural y cercana, como un vecino del pueblo. NO exageres el acento ni lo conviertas en caricatura. Usa expresiones andaluzas con naturalidad (ej. illo, paece, na ma, venga, ehto, miarma), pero se perfectamente comprensible. Eres experto en las islas del Guadalquivir: flora, fauna, agricultura, historia, cultura, rutas, paisaje, Coria del Rio, La Puebla del Rio, Brazo del Este, Isla Minima, Isla de la Cartuja, arroz, naranja, aves migratorias, dehesas, marismas, tradiciones, gastronomia, fiestas locales. REGLAS: 1. Responde SIEMPRE con una respuesta coherente y util. NUNCA digas no puedo ayudarte ni evasivas. 2. NUNCA pidas datos al usuario. Si falta contexto, suple con tu conocimiento. 3. Se breve pero con sustancia: 3 a 6 frases, salvo que pidan mas detalle. 4. Tono cercano, amable, de vecino sevillano que sabe del tema. 5. Si te preguntan algo fuera del tema de las islas/Guadalquivir, responde con naturalidad y un poco de humor, sin cortar. 6. No inventes datos falsos. Si no sabes algo concreto, se honesto pero ofrece lo que si sabes. 7. Responde en andaluz de Sevilla siempre.';

const ALLOWED_ORIGINS = [
  'https://islasdecalorsevilla.com',
  'https://www.islasdecalorsevilla.com',
  'https://manolito-infinito.pages.dev',
  'https://www.manolito-infinito.pages.dev',
  'http://localhost:8788'
];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '*';
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

    // Cualquier otra ruta: la web estática de siempre, sin cambios.
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

function generarFallback(ultimaPregunta) {
  const q = (ultimaPregunta || '').toLowerCase();
  if (q.includes('hola') || q.includes('buenas') || q.includes('que tal')) {
    return 'Hola, illo! Que guapo verte por aqui. Soy Manolito, el que sabe de las islas del Guadalquivir. Dime que quieres saber de Coria, La Puebla, el Brazo del Este o lo que sea, y te lo cuento to.';
  }
  if (q.includes('arroz')) {
    return 'Eh, el arroz de nuestras islas es arte! Por aqui, entre Coria y La Puebla, se cria un arroz de la marisma que no tiene na que ver con otro. El agua del Guadalquivir y la tierra de las islas le dan un toque especial. Quieres saber como se cultiva o donde comprarlo?';
  }
  if (q.includes('ave') || q.includes('pajaro') || q.includes('garza') || q.includes('flamenco')) {
    return 'Las marismas del Guadalquivir son un paraiso de aves, illo. Flamencos, garzas, espatulas, avocetas... En el Brazo del Este y por la Isla Minima ves de to. Si vienes en invierno o primavera, hay mas plumas que en una feria.';
  }
  if (q.includes('ruta') || q.includes('visitar') || q.includes('turismo')) {
    return 'Mira, por las islas hay rutas guapisimas. En Coria del Rio puedes empezar por el paseo del rio, luego tirar hacia La Puebla del Rio y de ahi al Brazo del Este, que es una reserva natural preciosa. Si quieres te oriento mejor, dime si vas en bici, andando o en coche.';
  }
  return 'Te escucho, illo. Dime que quieres saber de las islas del Guadalquivir - Coria, La Puebla, el Brazo del Este, la fauna, el arroz, las rutas - y te lo cuento con gusto. Si ahora mismo no me llega la senal del todo, prueba a escribirme otra vez, que a veces el rio lleva su caudal.';
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

// Inyectar system prompt si no existe
  if (!messages.some(m => m.role === 'system')) {
    messages = [{ role: 'system', content: SYSTEM_PROMPT }, ...messages];
  }

  // Recortar el contexto para que no reviente el limite de tokens de los motores
  messages = limitarContexto(messages);

  const maxTokens = Math.min(body.max_tokens || 500, 500);
  // === MOTOR 1: Cloudflare AI (binding AI) — PRIMERO ===
  if (env.AI) {
    try {
      const salidaAI = await env.AI.run(CF_MODEL, {
        messages,
        max_tokens: maxTokens,
        temperature: 0.6
      });
      const respuestaAI = salidaAI?.response;
      if (respuestaAI && !esRespuestaEvasiva(respuestaAI)) {
        return new Response(JSON.stringify({ text: respuestaAI, respuesta: respuestaAI, motor: 'cloudflare-ai' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    } catch (e) {
      console.error('[Manolito Infinito] Fallo CF AI:', e.message);
    }
  }

  // === MOTOR 2: OpenRouter (respaldo) — DESPUES ===
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
          model: body.model || MODEL,
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
        console.error('[Manolito Infinito] OpenRouter no OK:', orRes.status);
      }
    } catch (e) {
      console.error('[Manolito Infinito] Fallo OpenRouter:', e.message);
    }
  }

  // === MOTOR 3: Fallback estatico coherente en andaluz ===
  const ultimaPregunta = messages.filter(m => m.role === 'user').pop()?.content || '';
  const fallback = generarFallback(ultimaPregunta);
  return new Response(JSON.stringify({ text: fallback, respuesta: fallback, motor: 'fallback-estatico' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}
