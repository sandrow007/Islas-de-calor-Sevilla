/* =============================================================================
   MANOLITO INFINITO v4.2 — IA sevillana + WEB READER
   ============================================================================= */

const ManolitoChat = {
  historialIA: [],

  // Módulo de lectura web
  async _leerWeb(url) {
    try {
      const res = await fetch('https://api.allorigins.win/get?url=' + encodeURIComponent(url));
      const data = await res.json();
      return data.contents.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').substring(0, 3000);
    } catch (e) {
      return "Illo, esa web no se deja leer o está caída.";
    }
  },

  // Motor principal
  async responder(mensaje) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const match = mensaje.match(urlRegex);
    let contexto = "";

    if (match) {
      contexto = await this._leerWeb(match[0]);
    }

    const promptFinal = contexto 
      ? `Web analizada: ${contexto}. Pregunta: ${mensaje}` 
      : mensaje;

    this.historialIA.push({ role: 'user', content: promptFinal });
    if (this.historialIA.length > 10) this.historialIA.shift();

    try {
      const res = await fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'system', content: 'Eres Manolito, ingeniero sevillano. Responde siempre en andaluz, directo, sin emojis y usando la información de la web si te la paso.' }].concat(this.historialIA),
          seed: Math.floor(Math.random() * 999999)
        })
      });
      const respuesta = await res.text();
      this.historialIA.push({ role: 'assistant', content: respuesta });
      return respuesta;
    } catch (e) {
      return "Compadre, los servidores están de resaca. Prueba otra vez.";
    }
  }
};

/* ==========================================================================
   INTERFAZ DE CHAT (Auto-inyectable)
   ========================================================================== */
(function() {
  if (document.getElementById('manolito-chat-root')) return;

  const root = document.createElement('div');
  root.id = 'manolito-chat-root';
  root.innerHTML = `
    <style>
      .manolito-btn { position: fixed; bottom: 20px; right: 20px; z-index: 9999; width: 50px; height: 50px; border-radius: 50%; background: #00f0ff; border: none; cursor: pointer; }
      .manolito-window { position: fixed; bottom: 80px; right: 20px; z-index: 9998; width: 300px; height: 400px; background: #000; border: 1px solid #00f0ff; display: none; flex-direction: column; }
    </style>
    <button class="manolito-btn" id="manolito-toggle">M</button>
    <div class="manolito-window" id="manolito-window">
      <div id="manolito-msg" style="flex:1; overflow-y:auto; padding:10px; color:#fff;"></div>
      <input type="text" id="manolito-input" style="width:100%;" placeholder="Pregunta o pega URL...">
    </div>
  `;
  document.body.appendChild(root);

  document.getElementById('manolito-toggle').onclick = () => {
    const w = document.getElementById('manolito-window');
    w.style.display = w.style.display === 'flex' ? 'none' : 'flex';
  };

  document.getElementById('manolito-input').onkeypress = async (e) => {
    if (e.key === 'Enter') {
      const input = e.target.value;
      document.getElementById('manolito-msg').innerHTML += `<div>Tú: ${input}</div>`;
      e.target.value = '';
      const res = await ManolitoChat.responder(input);
      document.getElementById('manolito-msg').innerHTML += `<div>Manolito: ${res}</div>`;
    }
  };
})();
