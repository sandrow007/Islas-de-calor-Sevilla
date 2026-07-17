/**
 * MANOLITO AGENT v6.2 - SEVILLA PROFESIONAL
 */
class ManolitoAgent {
  constructor() {
    this.memory = JSON.parse(localStorage.getItem('manolito_ctx') || '[]');
    this.injectStyles();
    this.initUI();
  }

  injectStyles() {
    if (document.getElementById('m-style')) return;
    const style = document.createElement('style');
    style.id = 'm-style';
    style.textContent = `
      #m-root { position:fixed; bottom:20px; right:20px; z-index:99999; font-family:inherit; }
      .m-fab { width:55px; height:55px; background:var(--bg); border:2px solid var(--qc); color:var(--qc); border-radius:50%; cursor:pointer; font-weight:900; box-shadow:0 0 15px rgba(0,240,255,0.2); }
      .m-panel { display:none; width:340px; height:480px; background:var(--bg); border:2px solid var(--qc); position:absolute; bottom:70px; right:0; border-radius:8px; flex-direction:column; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.5); }
      .m-log { flex:1; overflow-y:auto; padding:15px; color:var(--tx); font-size:13px; line-height:1.5; }
      .m-cmd { background:var(--bm); border:none; border-top:1px solid var(--qc); color:var(--qc); padding:15px; outline:none; font-family:inherit; width:100%; }
    `;
    document.head.appendChild(style);
  }

  async _cleanWebText(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    doc.querySelectorAll('script, style, nav, footer, header, .ads, .sidebar, iframe').forEach(el => el.remove());
    return doc.body.innerText.replace(/\s+/g, ' ').substring(0, 3500);
  }

  async fetchWeb(url) {
    try {
      const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      return await this._cleanWebText(data.contents);
    } catch (e) { return "Esa web está cerrada, miarma."; }
  }

  async process(input) {
    const url = input.match(/(https?:\/\/[^\s]+)/g);
    let context = "";
    if (url) context = await this.fetchWeb(url[0]);

    const payload = { role: 'user', content: context ? `Web analizada: ${context}. Pregunta: ${input}` : input };
    this.memory.push(payload);
    if (this.memory.length > 15) this.memory.shift();

    try {
      const response = await fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // AQUÍ ESTÁ EL EQUILIBRIO: RIGOR PROFESIONAL + PERSONALIDAD SEVILLANA
          messages: [{ role: 'system', content: `Eres Manolito, ingeniero experto en Sevilla. Tu prioridad es la precisión técnica y la utilidad profesional. No inventas, no alhagas, no usas emojis. Tu tono es directo, serio cuando el tema lo requiere, pero con la guasa y el salero natural de un sevillano listo. Si hay contexto web, analízalo con rigor. Si te piden una burrada, responde con un "vaya tela" elegante y corrige con datos. Eres profesional, punto.` }].concat(this.memory),
          seed: 777
        })
      });
      const text = await response.text();
      this.memory.push({ role: 'assistant', content: text });
      localStorage.setItem('manolito_ctx', JSON.stringify(this.memory));
      return text;
    } catch (e) { return "Servidores de resaca. Prueba en un rato."; }
  }

  initUI() {
    const root = document.createElement('div');
    root.id = 'm-root';
    root.innerHTML = `<button class="m-fab" id="m-t">M</button><div class="m-panel" id="m-p"><div class="m-log" id="m-l"></div><input class="m-cmd" id="m-i" placeholder="¿Qué pasa?"></div>`;
    document.body.appendChild(root);
    document.getElementById('m-t').onclick = () => {
      const p = document.getElementById('m-p');
      p.style.display = p.style.display === 'flex' ? 'none' : 'flex';
    };
    document.getElementById('m-i').onkeydown = async (e) => {
      if (e.key === 'Enter') {
        const v = e.target.value;
        if(!v) return;
        document.getElementById('m-l').innerHTML += `<div style="margin-bottom:8px; opacity:0.6">> ${v}</div>`;
        e.target.value = '';
        const r = await this.process(v);
        document.getElementById('m-l').innerHTML += `<div style="margin-bottom:12px; color:var(--qc)">${r}</div>`;
        document.getElementById('m-l').scrollTop = 9999;
      }
    };
  }
}

new ManolitoAgent();
document.head.appendChild(document.createElement('script')).src = 'chat-injector.js';
