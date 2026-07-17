/* MANOLITO AGENT v7.0 - DEFINITIVO */
const ManolitoChat = {
  memory: JSON.parse(localStorage.getItem('manolito_ctx') || '[]'),

  async _cleanWebText(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    doc.querySelectorAll('script, style, nav, footer, header, .ads, .sidebar, iframe').forEach(el => el.remove());
    return doc.body.innerText.replace(/\s+/g, ' ').substring(0, 3500);
  },

  async _leerWeb(url) {
    try {
      const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      return await this._cleanWebText(data.contents);
    } catch (e) { return "Esa web está más cerrada que el barco del arroz, miarma."; }
  },

  async responder(mensaje) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const match = mensaje.match(urlRegex);
    let contexto = "";
    if (match) contexto = await this._leerWeb(match[0]);

    const payload = { role: 'user', content: contexto ? `Web analizada: ${contexto}. Pregunta: ${mensaje}` : mensaje };
    this.memory.push(payload);
    if (this.memory.length > 15) this.memory.shift();

    try {
      const response = await fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'system', content: "Eres Manolito, el ingeniero sevillano. Directo, serio, profesional, sin emojis y con guasa natural. Si hay datos web, analízalos con rigor. Si te piden una burrada, suelta un 'vaya tela' elegante y corrige con datos." }].concat(this.memory),
          seed: 777
        })
      });
      const text = await response.text();
      this.memory.push({ role: 'assistant', content: text });
      localStorage.setItem('manolito_ctx', JSON.stringify(this.memory));
      return text;
    } catch (e) { return "Servidores de resaca, compadre. Prueba en un rato."; }
  }
};

window.ManolitoChat = ManolitoChat;

(function() {
  if (document.getElementById('m-root')) return;
  const root = document.createElement('div');
  root.id = 'm-root';
  root.innerHTML = `<style>
    #m-root{position:fixed;bottom:20px;right:20px;z-index:99999;font-family:inherit;}
    .m-fab{width:55px;height:55px;background:var(--bg);border:2px solid var(--qc);color:var(--qc);border-radius:50%;cursor:pointer;font-weight:900;box-shadow:0 0 15px rgba(0,240,255,0.2);}
    .m-panel{display:none;width:340px;height:480px;background:var(--bg);border:2px solid var(--qc);position:absolute;bottom:70px;right:0;border-radius:8px;flex-direction:column;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.5);}
    .m-log{flex:1;overflow-y:auto;padding:15px;color:var(--tx);font-size:13px;line-height:1.5;}
    .m-cmd{background:var(--bm);border:none;border-top:1px solid var(--qc);color:var(--qc);padding:15px;outline:none;font-family:inherit;width:100%;}
  </style>
  <button class="m-fab" id="m-t">M</button><div class="m-panel" id="m-p"><div class="m-log" id="m-l"></div><input class="m-cmd" id="m-i" placeholder="¿Qué necesitas?"></div>`;
  document.body.appendChild(root);
  document.getElementById('m-t').onclick = () => { const p = document.getElementById('m-p'); p.style.display = p.style.display === 'flex' ? 'none' : 'flex'; };
  document.getElementById('m-i').onkeydown = async (e) => {
    if (e.key === 'Enter') {
      const v = e.target.value;
      if(!v) return;
      document.getElementById('m-l').innerHTML += `<div style="margin-bottom:8px; opacity:0.6">> ${v}</div>`;
      e.target.value = '';
      const r = await ManolitoChat.responder(v);
      document.getElementById('m-l').innerHTML += `<div style="margin-bottom:12px; color:var(--qc)">${r}</div>`;
      document.getElementById('m-l').scrollTop = 9999;
    }
  };
})();
