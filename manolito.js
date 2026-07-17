
 * MANOLITO AGENT v8.0 - VERDE QUE TE QUIERO VERDE
 * Licencia: MIT - Open Source, pa' to'l mundo.
 * Manolito, el ingeniero sevillano, con más guasa que la feria.
 * Conéctate a la IA sin clave, que aquí no se paga ni el cafelito.
 */

const ManolitoChat = {
  memory: JSON.parse(localStorage.getItem('manolito_ctx') || '[]'),

  async _cleanWebText(html) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      doc.querySelectorAll('script, style, nav, footer, header, .ads, .sidebar, iframe')
        .forEach(el => el.remove());
      return doc.body.innerText.replace(/\s+/g, ' ').substring(0, 3500);
    } catch (e) {
      return "No se pudo limpiar el texto, miarma.";
    }
  },

  async _leerWeb(url) {
    try {
      const res = await fetch('https://api.allorigins.win/get?url=' + encodeURIComponent(url));
      const data = await res.json();
      return await this._cleanWebText(data.contents);
    } catch (e) {
      return "Esa web está más cerrada que el barco del arroz, miarma.";
    }
  },

  async responder(mensaje) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const match = mensaje.match(urlRegex);
    let contexto = "";
    if (match) contexto = await this._leerWeb(match[0]);

    const payload = {
      role: 'user',
      content: contexto ? 'Web analizada: ' + contexto + '. Pregunta: ' + mensaje : mensaje
    };
    this.memory.push(payload);
    if (this.memory.length > 15) this.memory.shift();

    try {
      const response = await fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'Eres Manolito, el ingeniero sevillano. Directo, serio, profesional, sin emojis y con guasa natural. Si hay datos web, analízalos con rigor. Si te piden una burrada, suelta un "vaya tela" elegante y corrige con datos.'
            }
          ].concat(this.memory),
          seed: 777
        })
      });
      const text = await response.text();
      this.memory.push({ role: 'assistant', content: text });
      localStorage.setItem('manolito_ctx', JSON.stringify(this.memory));
      return text;
    } catch (e) {
      return "Servidores de resaca, compadre. Prueba en un rato.";
    }
  }
};

window.ManolitoChat = ManolitoChat;

(function() {
  if (document.getElementById('m-root')) return;

  const root = document.createElement('div');
  root.id = 'm-root';
  root.innerHTML = `
    <style>
      #m-root {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 99999;
        font-family: inherit;
      }
      .m-fab {
        width: 55px;
        height: 55px;
        background: #1a3a1a;
        border: 2px solid #00ff00;
        color: #00ff00;
        border-radius: 50%;
        cursor: pointer;
        font-weight: 900;
        box-shadow: 0 0 15px rgba(0,255,0,0.2);
        transition: transform 0.2s;
      }
      .m-fab:hover {
        transform: scale(1.1);
      }
      .m-panel {
        display: none;
        width: 340px;
        height: 480px;
        background: #0a1a0a;
        border: 2px solid #00ff00;
        position: absolute;
        bottom: 70px;
        right: 0;
        border-radius: 8px;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 10px 30px rgba(0,255,0,0.2);
      }
      .m-log {
        flex: 1;
        overflow-y: auto;
        padding: 15px;
        color: #00ff00;
        font-size: 13px;
        line-height: 1.5;
        word-wrap: break-word;
      }
      .m-cmd {
        background: #0a2a0a;
        border: none;
        border-top: 1px solid #00ff00;
        color: #00ff00;
        padding: 15px;
        outline: none;
        font-family: inherit;
        width: 100%;
        box-sizing: border-box;
      }
      .m-cmd::placeholder {
        color: #006600;
      }
      .m-log::-webkit-scrollbar {
        width: 6px;
      }
      .m-log::-webkit-scrollbar-track {
        background: #0a1a0a;
      }
      .m-log::-webkit-scrollbar-thumb {
        background: #00ff00;
        border-radius: 3px;
      }
    </style>
    <button class="m-fab" id="m-t">M</button>
    <div class="m-panel" id="m-p">
      <div class="m-log" id="m-l"></div>
      <input class="m-cmd" id="m-i" placeholder="¿Qué necesitas, compare?" />
    </div>
  `;
  document.body.appendChild(root);

  document.getElementById('m-t').onclick = function() {
    const p = document.getElementById('m-p');
    p.style.display = (p.style.display === 'flex') ? 'none' : 'flex';
    if (p.style.display === 'flex') {
      document.getElementById('m-i').focus();
    }
  };

  document.getElementById('m-i').onkeydown = function(e) {
    if (e.key === 'Enter') {
      const input = e.target;
      const pregunta = input.value.trim();
      if (!pregunta) return;
      const log = document.getElementById('m-l');
      log.innerHTML += '<div style="margin-bottom:8px; opacity:0.6; color:#00cc00;">> ' + pregunta + '</div>';
      input.value = '';
      ManolitoChat.responder(pregunta).then(function(respuesta) {
        log.innerHTML += '<div style="margin-bottom:12px; color:#00ff00;">' + respuesta + '</div>';
        log.scrollTop = log.scrollHeight;
      });
    }
  };
})();
