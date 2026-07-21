export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // — API routes —
    if (url.pathname.startsWith("/api/")) {
      // Ejemplo: GET /api/hello
      if (url.pathname === "/api/hello") {
        return Response.json({ message: "Hola desde manolito-infinito API" });
      }

      // Añade aquí tus endpoints del API
      return Response.json({ error: "Endpoint no encontrado" }, { status: 404 });
    }

    // — Static assets fallback —
    return env.ASSETS.fetch(request);
  }
};
