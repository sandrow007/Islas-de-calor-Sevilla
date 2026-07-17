/**
 * MANOLITO ENGINE v5.0 - Professional Agent Architecture
 * - DOM Sanitizer (Web Parsing)
 * - Persistent State Manager
 * - Async Agent Logic
 */

class ManolitoAgent {
  constructor() {
    this.memory = JSON.parse(localStorage.getItem('manolito_v5_ctx') || '[]');
    this.initUI();
  }

  // Limpiador de HTML profesional (quita basura de webs antes de leer)
  async _cleanWebText(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const scripts = doc.querySelectorAll('script, style, nav, footer, header, .ads, .sidebar');
    scripts.forEach(el => el.remove());
    return doc.body.innerText.replace(/\s+/g, ' ').substring(0, 4000);
  }

  async fetchWeb(url) {
    try {
      const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      return await this._cleanWebText(data.contents);
    } catch (e) {
      return "Error: No se pudo parsear el dominio.";
    }
  }

  async process(input) {
    const url = input.match(/(https?:\/\/[^\s]+)/g);
    let context = "";
    if (url) context = await this.fetchWeb(url[0]);

    const payload = { 
      role: 'user', 
      content: context ? `CONTEXTO WEB: ${context}\n\nPREGUNTA: ${input}` : input 
    };

    this.memory.push(payload);
    if (this.memory.length > 20) this.memory.shift();

    try {
      const response = await fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'system', content: 'Eres Manolito, ingeniero experto. Directo, analítico, andaluz, sin florituras. Si hay contexto web, úsalo como fuente primaria.' }].concat(this.memory),
          seed: 999
        })
      });
      const text = await response.text();
      this.memory.push({ role: 'assistant', content: text });
      localStorage.setItem('manolito_v5_ctx', JSON.stringify(this.memory));
      return text;
    } catch (e) {
      return "Servidor ocupado. Inténtalo otra vez.";
    }
  }

  initUI() {
    if (document.getElementById('m-root')) return;
    const root = document.createElement('div');
    root.id = 'm-root';
    root.innerHTML = `<style>#m-root{position:fixed;bottom:20px;right:20px;z-index:99999;}.m-fab{width:60px;height:60px;background:#000;border:2px solid #0f0;border-radius:50%;cursor:pointer;color:#0f0;}#m-panel{display:none;width:350px;height:500px;background:#000;border:2px solid #0f0;flex-direction:column;position:absolute;bottom:70px;right:0;border-radius:8px;}#m-log{flex:1;overflow-y:auto;padding:10px;color:#fff;font-size:12px;}#m-cmd{background:#111;border:none;color:#0f0;padding:10px;outline:none;}</style>
    <button class="m-fab" id="m-t">M</button><div id="m-panel"><div id="m-log"></div><input id="m-cmd" placeholder="Comando/URL..."></div>`;
    document.body.appendChild(root);
    document.getElementById('m-t').onclick = () => document.getElementById('m-panel').style.display = document.getElementById('m-panel').style.display === 'flex' ? 'none' : 'flex';
    document.getElementById('m-cmd').onkeydown = async (e) => {
      if (e.key === 'Enter') {
        const cmd = e.target.value;
        document.getElementById('m-log').innerHTML += `<div style="color:#aaa">> ${cmd}</div>`;
        e.target.value = '';
        const res = await this.process(cmd);
        document.getElementById('m-log').innerHTML += `<div style="margin-bottom:10px;">${res}</div>`;
      }
    };
  }
}


