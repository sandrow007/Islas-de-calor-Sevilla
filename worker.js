/**
 * Worker de islasdecalorsevilla.com
 * - Sirve la web estática (assets) tal cual, sin tocar nada.
 * - Además, expone /api/manolito: un proxy hacia OpenRouter.
 */

const MODEL = 'openrouter/free';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }

    if (url.pathname === '/api/manolito') {
      return handleManolito(request, env);
    }

    // Cualquier otra ruta: la web estática de siempre, sin cambios.
    return env.ASSETS.fetch(request);
  }
};

async function handleManolito(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'JSON invalido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const messages = Array.isArray(body.messages) ? body.messages : null;
  if (!messages) {
    return new Response(JSON.stringify({ error: 'Falta el array messages' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!env.OPENROUTER_API_KEY) {
    return new Response(JSON.stringify({ error: 'Falta configurar OPENROUTER_API_KEY como secreto del Worker' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

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
        max_tokens: body.max_tokens || 1200
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    const data = await orRes.json();

    if (!orRes.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || 'Error de OpenRouter' }), {
        status: orRes.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const texto = data.choices?.[0]?.message?.content || '';

    return new Response(JSON.stringify({ text: texto }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Fallo al contactar OpenRouter: ' + e.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
