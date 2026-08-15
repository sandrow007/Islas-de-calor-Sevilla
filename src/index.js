var MODEL = "meta-llama/llama-3.1-70b-instruct";
var CF_MODEL = "@cf/meta/llama-3.1-8b-instruct";

var SYSTEM_PROMPT = "Eres MANOLITO, el asistente virtual de islasdecalorsevilla.com... (el prompt en andaluz)";

var ALLOWED_ORIGINS = [
  "https://islasdecalorsevilla.com",
  "https://www.islasdecalorsevilla.com",
  "http://localhost:8788"
];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    var corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : "*";
    var corsHeaders = {
      "Access-Control-Allow-Origin": corsOrigin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    if (url.pathname === "/api/manolito" || url.pathname === "/api/chat") {
      return handleManolito(request, env, corsHeaders);
    }
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response(JSON.stringify({ error: "No encontrado" }), {
      status: 404,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
};

async function handleManolito(request, env, corsHeaders) {
  // ... lee el body, prepara messages con SYSTEM_PROMPT ...

  // MOTOR 1: Cloudflare AI PRIMERO
  if (env.AI) {
    try {
      var salidaAI = await env.AI.run(CF_MODEL, {
        messages: messages,
        max_tokens: 800,
        temperature: 0.6
      });
      if (salidaAI?.response && !esRespuestaEvasiva(salidaAI.response)) {
        return new Response(JSON.stringify({ text: salidaAI.response, motor: "cloudflare-ai" }), {
          status: 200, headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    } catch (e) { console.error("Fallo CF AI:", e.message); }
  }

  // MOTOR 2: OpenRouter DESPUÉS
  if (env.OPENROUTER_API_KEY) {
    try {
      var orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + env.OPENROUTER_API_KEY
        },
        body: JSON.stringify({ model: MODEL, messages: messages, max_tokens: 800 })
      });
      if (orRes.ok) {
        var data = await orRes.json();
        var texto = data?.choices?.[0]?.message?.content;
        if (texto && !esRespuestaEvasiva(texto)) {
          return new Response(JSON.stringify({ text: texto, motor: "openrouter" }), {
            status: 200, headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
      }
    } catch (e) { console.error("Fallo OpenRouter:", e.message); }
  }

  // MOTOR 3: Fallback en andaluz
  return new Response(JSON.stringify({ text: "Te escucho, illo..." }), {
    status: 200, headers: { "Content-Type": "application/json", ...corsHeaders }
  });
}
