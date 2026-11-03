"use strict";
// Controles e mensagens usam exclusivamente WebSocket seguro; não há fetch/CGI.
const $ = id => document.getElementById(id);
const url = `wss://${location.host}/AA/AA9/ws`;
let socket, retry, state = "unknown", pending = null;
let messages = [], counts = {TCP: 0, UDP: 0}, debugLines = [];
function debug(text) {
  debugLines.push(`[${new Date().toISOString()}] ${text}`);
  debugLines = debugLines.slice(-200);
  $("debugInfo").textContent = debugLines.join("\n");
}
function updateControls() {
  const connected = socket?.readyState === WebSocket.OPEN;
  $("startServer").disabled = !connected || Boolean(pending) || state !== "stopped";
  $("stopServer").disabled = !connected || Boolean(pending) || state !== "running";
}
function status(value, message) {
  state = value;
  $("statusDot").className = `status-dot ${value === "running" ? "status-online" : "status-offline"}`;
  $("statusText").textContent = message;
  updateControls();
}
function send(action) {
  if (socket?.readyState !== WebSocket.OPEN) return;
  debug(`Enviando ação: ${action}`);
  socket.send(JSON.stringify({action}));
}
function render() {
  $("tcpCount").textContent = counts.TCP;
  $("udpCount").textContent = counts.UDP;
  $("totalCount").textContent = counts.TCP + counts.UDP;
  const visible = messages.filter(m => $("filter").value === "all" || m.protocol === $("filter").value);
  const fragment = document.createDocumentFragment();
  for (const m of visible) {
    const row = document.createElement("article");
    row.className = "message";
    const meta = document.createElement("p"), body = document.createElement("p");
    const flag = document.createElement("strong");
    flag.className = `flag ${m.protocol.toLowerCase()}`;
    flag.textContent = m.protocol;
    meta.append(flag, ` ${m.ip}:${m.port} · ${new Date(m.timestamp).toLocaleString("pt-BR")}`);
    body.textContent = m.message; // Conteúdo recebido nunca é interpretado como HTML.
    row.append(meta, body); fragment.append(row);
  }
  $("messageList").replaceChildren(fragment);
  $("noMessages").hidden = visible.length > 0;
  $("messageList").scrollTop = $("messageList").scrollHeight;
}
function connect() {
  if (location.protocol !== "https:") {
    status("unknown", "Abra esta página por HTTPS para utilizar WSS."); return;
  }
  debug(`Conectando ao WebSocket: ${url}`);
  socket = new WebSocket(url);
  socket.onopen = () => {
    $("connectionText").textContent = "WSS conectado · TLS ativo";
    debug("WebSocket seguro conectado"); send("status");
  };
  socket.onmessage = event => {
    let data;
    try { data = JSON.parse(event.data); } catch { debug("JSON recebido inválido"); return; }
    debug(`Mensagem recebida: ${event.data}`);
    if (data.type === "status") {
      clearTimeout(pending); pending = null;
      status(data.server_status, data.success ? (data.server_status === "running" ? "Servidor online" : "Servidor offline") : data.message);
    } else if (data.type === "message" && ["TCP", "UDP"].includes(data.protocol)) {
      counts[data.protocol]++; messages.push(data); messages = messages.slice(-500); render();
    } else if (data.type === "error") {
      debug(data.message);
    }
  };
  socket.onerror = () => debug("Falha WSS. Verifique a conexão HTTPS e o proxy WSS do Apache.");
  socket.onclose = () => {
    clearTimeout(pending); pending = null;
    status("unknown", "Status indisponível: WSS desconectado");
    $("connectionText").textContent = "WSS desconectado · nova tentativa em 3 segundos";
    debug("WebSocket desconectado"); clearTimeout(retry); retry = setTimeout(connect, 3000);
  };
}
for (const [id, action, label] of [["startServer", "start", "Iniciando servidor..."], ["stopServer", "stop", "Parando servidor..."]]) {
  $(id).onclick = () => {
    pending = setTimeout(() => { pending = null; status("unknown", "Operação sem resposta; verificando status..."); send("status"); }, 8000);
    status("pending", label); send(action);
  };
}
$("clearMessages").onclick = () => { messages = []; counts = {TCP: 0, UDP: 0}; render(); };
$("filter").onchange = render;
$("debugToggle").onclick = () => {
  const expanded = $("debugInfo").hidden;
  $("debugInfo").hidden = !expanded;
  $("debugToggle").setAttribute("aria-expanded", String(expanded));
  $("debugToggle").textContent = `${expanded ? "Ocultar" : "Exibir"} informações de depuração`;
};
setInterval(() => { if (!pending) send("status"); }, 30000);
render(); connect();
