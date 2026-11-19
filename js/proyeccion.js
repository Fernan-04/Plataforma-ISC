// =========================================================
// Panel ISC UTP 2027 · Proyección
// · panelProyeccion: lista de la laptop de la sala (orden oficial por etapa).
// · abrirSala: pantalla completa con portada del turno, el PDF del equipo
//   (PDF.js, sin botones de descarga) y el cronómetro de pitch / preguntas.
//   La usan Proyección, el Admin («Proyectar») y el Equipo («Ensayar»).
// Teclas (clicker): → / PageDown / Espacio = siguiente · ← / PageUp = anterior
//                   B = pantalla negra · T = iniciar / pausar el tiempo
// =========================================================
import { api } from "./api.js?v=202611190650";
import { $, $$, esc, I, aviso, fondoAnimado, IMG } from "./ui.js?v=202611190650";
import { eje as ejeDe, etapa as etapaDe, textoTiempos } from "./rubrica.js?v=202611190650";

const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
const CLAVE_ETAPA = "isc-utp-proy-etapa";

let cargaPdfjs = null;
function pdfjs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  cargaPdfjs ||= new Promise((ok, mal) => {
    const sc = document.createElement("script");
    sc.src = PDFJS;
    sc.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER; ok(window.pdfjsLib); };
    sc.onerror = () => { cargaPdfjs = null; mal(new Error("No se pudo cargar el visor de PDF. Revisa la conexión a internet.")); };
    document.head.append(sc);
  });
  return cargaPdfjs;
}

const mmss = (seg) => { const s = Math.abs(Math.round(seg)); return `${seg < 0 ? "+" : ""}${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

function pitido() {
  try {
    const C = window.AudioContext || window.webkitAudioContext;
    const ctx = new C();
    [0, 0.35, 0.7].forEach((t) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880; o.type = "square"; g.gain.value = 0.15;
      o.connect(g); g.connect(ctx.destination);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.22);
    });
    setTimeout(() => ctx.close?.(), 1500);
  } catch { /* sin audio */ }
}

// =========================================================
// SALA (pantalla completa)
// =========================================================
/**
 * @param {object} o
 * @param {Array}  o.equipos  [{id, nombre_proyecto, eje, orden, archivos:{pdf_ruta, ppt_ruta}, integrantes:[{nombre, es_lider}]}]
 * @param {object} o.config   {min_pitch, min_preguntas}
 * @param {number} [o.indice] equipo inicial
 * @param {string} [o.titulo] p. ej. «Semifinal Local»
 * @param {boolean}[o.ensayo] modo ensayo del equipo (muestra las teclas que llegan)
 * @param {Function}[o.alSalir]
 */
export function abrirSala({ equipos, config, indice = 0, titulo = "", ensayo = false, alSalir }) {
  const minPitch = Number(config?.min_pitch) || 5;
  const minPreg = config?.min_preguntas == null || config?.min_preguntas === "" ? null : Number(config.min_preguntas);
  let i = Math.max(0, Math.min(indice, equipos.length - 1));
  let vista = "portada"; // portada | diapositivas
  let doc = null, pagina = 1, paginas = 0, cargando = false, docDe = null;
  let fase = "pitch", corriendo = false, inicio = 0, acumulado = 0, sono = false, timer = null, ocultar = null;
  let negro = false;

  const el = document.createElement("div");
  el.className = "sala-isc";
  el.tabIndex = 0;
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-label", "Pantalla de proyección");
  el.innerHTML = `
    <header class="sala-isc__top">
      <span class="isc-marca"><img class="isc-marca__icono" src="${IMG.icono}" alt=""><span><b>ISC UTP</b><small>${esc(titulo || (ensayo ? "Ensayo del pitch" : "Proyección"))}</small></span></span>
      <span class="sala-isc__turno" data-turno></span>
      <span class="sala-isc__fase" data-fase></span>
      <span class="sala-isc__reloj" data-reloj aria-live="off"></span>
    </header>
    <main class="sala-isc__vista" data-vista></main>
    <div class="sala-isc__negro" data-negro hidden></div>
    ${ensayo ? `<div class="sala-isc__tecla" data-tecla hidden></div>` : ""}
    <nav class="sala-isc__ctrl" data-ctrl>
      ${equipos.length > 1 ? `<button class="btn btn--mini" data-c="ant-eq" title="Equipo anterior">${I.atras}<span>Equipo</span></button>
      <button class="btn btn--mini" data-c="sig-eq" title="Equipo siguiente"><span>Equipo</span>${I.flecha}</button>` : ""}
      <button class="btn btn--mini" data-c="portada">${I.info}<span>Portada</span></button>
      <button class="btn btn--mini" data-c="diapos">${I.pizarra}<span>Diapositivas</span></button>
      <span class="sala-isc__sep"></span>
      <button class="btn btn--mini" data-c="fase" title="Cambiar entre pitch y preguntas">${I.reloj}<span data-fase-btn>Preguntas</span></button>
      <button class="btn btn--mini btn--naranja" data-c="tiempo" title="Iniciar / pausar (T)"><span data-tiempo-btn>Iniciar</span></button>
      <button class="btn btn--mini" data-c="reiniciar" title="Reiniciar el tiempo">${I.girar}</button>
      <button class="btn btn--mini" data-c="negro" title="Pantalla negra (B)">B</button>
      <span class="sala-isc__sep"></span>
      <a class="btn btn--mini" data-ppt target="_blank" rel="noopener" hidden>${I.descargar}<span>PPT</span></a>
      <button class="btn btn--mini" data-c="completa" title="Pantalla completa">⛶</button>
      <button class="btn btn--mini btn--peligro" data-c="salir">${I.cerrar}<span>Salir</span></button>
    </nav>`;
  document.body.append(el);
  document.body.classList.add("sin-scroll");
  el.focus();

  const eq = () => equipos[i];
  const transcurrido = () => acumulado + (corriendo ? (Date.now() - inicio) / 1000 : 0);
  const limite = () => (fase === "pitch" ? minPitch * 60 : minPreg != null ? minPreg * 60 : null);

  function pintarReloj() {
    const lim = limite();
    const t = transcurrido();
    const r = $("[data-reloj]", el);
    if (lim == null) {
      r.textContent = mmss(t);
      r.className = "sala-isc__reloj sala-isc__reloj--libre";
    } else {
      const quedan = lim - t;
      r.textContent = mmss(quedan);
      r.className = "sala-isc__reloj" + (quedan <= 0 ? " sala-isc__reloj--fin" : quedan <= 60 ? " sala-isc__reloj--alerta" : "");
      if (quedan <= 0 && corriendo && !sono) { sono = true; pitido(); }
    }
    if (!corriendo && t === 0) r.classList.add("sala-isc__reloj--espera");
    $("[data-fase]", el).textContent = fase === "pitch" ? `Pitch · ${minPitch} min` : `Preguntas · ${minPreg == null ? "sin límite" : `${minPreg} min`}`;
    $("[data-fase-btn]", el).textContent = fase === "pitch" ? "Preguntas" : "Pitch";
    $("[data-tiempo-btn]", el).textContent = corriendo ? "Pausar" : t > 0 ? "Seguir" : "Iniciar";
  }
  function tick() { pintarReloj(); }
  function iniciarPausar() {
    if (corriendo) { acumulado = transcurrido(); corriendo = false; clearInterval(timer); }
    else {
      corriendo = true; inicio = Date.now(); clearInterval(timer); timer = setInterval(tick, 250);
      if (vista === "portada" && eq().archivos?.pdf_ruta) mostrar("diapositivas");
    }
    pintarReloj();
  }
  function reiniciar() { corriendo = false; clearInterval(timer); acumulado = 0; sono = false; pintarReloj(); }
  function cambiarFase(f) { reiniciar(); fase = f || (fase === "pitch" ? "preguntas" : "pitch"); pintarReloj(); }

  function pintarCabecera() {
    const e = eq();
    $("[data-turno]", el).innerHTML = `<small>Turno ${String(e.orden ?? i + 1).padStart(2, "0")} de ${String(equipos.length).padStart(2, "0")}</small><b>${esc(e.nombre_proyecto)}</b>`;
    const ppt = $("[data-ppt]", el);
    const url = e.archivos?.ppt_ruta ? api.urlArchivo(e.archivos.ppt_ruta) : null;
    ppt.hidden = !url;
    if (url) ppt.href = url;
  }

  function portadaHtml() {
    const e = eq();
    const lider = (e.integrantes || []).find((x) => x.es_lider);
    return `<div class="sala-isc__portada">
      <p class="sala-isc__pre">${esc(titulo || "ISC UTP 2027")} · Turno ${String(e.orden ?? i + 1).padStart(2, "0")} de ${String(equipos.length).padStart(2, "0")}</p>
      <h1>${esc(e.nombre_proyecto)}</h1>
      ${e.eje ? `<p class="sala-isc__eje">${esc(ejeDe(e.eje)?.nombre || "")}</p>` : ""}
      <p class="sala-isc__gente">${(e.integrantes || []).map((x) => (x.es_lider ? `<b>★ ${esc(x.nombre)}</b>` : esc(x.nombre))).join(" · ")}</p>
      <p class="sala-isc__ayuda">${e.archivos?.pdf_ruta ? `Pulsa <b>Iniciar</b> o la tecla <b>T</b> para empezar el pitch (${minPitch}:00).` : `⚠️ Este equipo no subió su PDF.${lider ? " Pide al líder que comparta su pantalla." : ""}`}</p>
    </div>`;
  }

  async function cargarDoc() {
    const e = eq();
    if (docDe === e.id && doc) return doc;
    doc = null; docDe = e.id; pagina = 1; paginas = 0;
    const url = e.archivos?.pdf_ruta ? api.urlArchivo(e.archivos.pdf_ruta) : null;
    if (!url) throw new Error(e.archivos?.pdf_ruta ? "El PDF de prueba se pierde al recargar la página (solo en modo de prueba). Vuelve a subirlo." : "Este equipo no subió su PDF.");
    const lib = await pdfjs();
    const d = await lib.getDocument({ url }).promise;
    if (docDe !== e.id) return null; // cambiaron de equipo mientras cargaba
    doc = d; paginas = d.numPages;
    return d;
  }

  async function pintarPagina() {
    const v = $("[data-vista]", el);
    if (!doc) return;
    const p = await doc.getPage(pagina);
    const caja = v.getBoundingClientRect();
    const base = p.getViewport({ scale: 1 });
    const escala = Math.min((caja.width || 1280) / base.width, (caja.height || 720) / base.height);
    const dpr = window.devicePixelRatio || 1;
    const vp = p.getViewport({ scale: escala * dpr });
    let cv = $("canvas", v);
    if (!cv) { v.innerHTML = `<canvas class="sala-isc__pdf"></canvas><span class="sala-isc__pag" data-pag></span>`; cv = $("canvas", v); }
    cv.width = vp.width; cv.height = vp.height;
    cv.style.width = `${vp.width / dpr}px`; cv.style.height = `${vp.height / dpr}px`;
    await p.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise;
    const pg = $("[data-pag]", v);
    if (pg) pg.textContent = `${pagina} / ${paginas}`;
  }

  async function mostrar(que) {
    vista = que;
    const v = $("[data-vista]", el);
    if (que === "portada") { v.innerHTML = portadaHtml(); return; }
    if (cargando) return;
    cargando = true;
    v.innerHTML = `<p class="sala-isc__msg">Cargando el PDF…</p>`;
    try {
      await cargarDoc();
      if (vista === "diapositivas") await pintarPagina();
    } catch (ex) {
      v.innerHTML = `<p class="sala-isc__msg">${esc(ex.message)}</p>`;
    } finally { cargando = false; }
  }

  async function mover(d) {
    if (vista !== "diapositivas") { if (d > 0) return mostrar("diapositivas"); return; }
    if (!doc) return;
    const n = Math.max(1, Math.min(paginas, pagina + d));
    if (n !== pagina) { pagina = n; await pintarPagina(); }
  }

  function irEquipo(n) {
    if (n < 0 || n >= equipos.length) return;
    i = n; doc = null; docDe = null; fase = "pitch"; reiniciar(); pintarCabecera(); mostrar("portada");
  }

  function alternarNegro(v) {
    negro = v ?? !negro;
    $("[data-negro]", el).hidden = !negro;
  }

  function salir() {
    clearInterval(timer); clearTimeout(ocultar);
    document.removeEventListener("keydown", teclas, true);
    window.removeEventListener("resize", alCambiarTam);
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    el.remove();
    document.body.classList.remove("sin-scroll");
    alSalir?.();
  }

  function marcarTecla(txt) {
    const t = $("[data-tecla]", el);
    if (!t) return;
    t.textContent = `Tecla recibida: ${txt}`;
    t.hidden = false;
    clearTimeout(t._o); t._o = setTimeout(() => (t.hidden = true), 1400);
  }

  function teclas(ev) {
    if (!document.body.contains(el)) return;
    if (ev.target.closest?.("input, textarea, select")) return;
    const k = ev.key;
    const nombre = { ArrowRight: "→", ArrowLeft: "←", PageDown: "PageDown", PageUp: "PageUp", " ": "Espacio" }[k] || k.toUpperCase();
    if (["ArrowRight", "PageDown", " ", "ArrowDown"].includes(k)) { ev.preventDefault(); if (negro) alternarNegro(false); mover(1); marcarTecla(nombre); }
    else if (["ArrowLeft", "PageUp", "ArrowUp"].includes(k)) { ev.preventDefault(); if (negro) alternarNegro(false); mover(-1); marcarTecla(nombre); }
    else if (k === "b" || k === "B" || k === ".") { ev.preventDefault(); alternarNegro(); marcarTecla("B"); }
    else if (k === "t" || k === "T") { ev.preventDefault(); iniciarPausar(); marcarTecla("T"); }
    else if (k === "Escape" && !document.fullscreenElement) { ev.preventDefault(); salir(); }
  }
  document.addEventListener("keydown", teclas, true);

  let tam = null;
  function alCambiarTam() { clearTimeout(tam); tam = setTimeout(() => { if (vista === "diapositivas" && doc) pintarPagina(); }, 150); }
  window.addEventListener("resize", alCambiarTam);

  // Barra de control: aparece al mover el mouse
  function mostrarCtrl() {
    el.classList.add("sala-isc--ctrl");
    clearTimeout(ocultar);
    ocultar = setTimeout(() => el.classList.remove("sala-isc--ctrl"), 2800);
  }
  el.addEventListener("mousemove", mostrarCtrl);
  el.addEventListener("touchstart", mostrarCtrl, { passive: true });

  el.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-c]");
    if (!b) return;
    const c = b.dataset.c;
    if (c === "ant-eq") irEquipo(i - 1);
    else if (c === "sig-eq") irEquipo(i + 1);
    else if (c === "portada") mostrar("portada");
    else if (c === "diapos") mostrar("diapositivas");
    else if (c === "fase") cambiarFase();
    else if (c === "tiempo") iniciarPausar();
    else if (c === "reiniciar") reiniciar();
    else if (c === "negro") alternarNegro();
    else if (c === "completa") { if (document.fullscreenElement) document.exitFullscreen?.(); else el.requestFullscreen?.().catch(() => aviso("Tu navegador no permitió la pantalla completa. Usa F11.", "error")); }
    else if (c === "salir") salir();
    el.focus();
  });

  pintarCabecera();
  mostrar("portada");
  pintarReloj();
  mostrarCtrl();
  return { salir, el };
}

// =========================================================
// PANEL de la laptop de proyección
// =========================================================
export function panelProyeccion(app, s, h) {
  let datos = null;
  let etapaSel = (() => { try { return sessionStorage.getItem(CLAVE_ETAPA) || "semifinal"; } catch { return "semifinal"; } })();

  async function cargar(conAviso = false) {
    try {
      datos = await api.proyeccionPanel(s.codigo);
      pintar();
      if (conAviso) aviso("Datos actualizados");
    } catch (ex) {
      app.innerHTML = `${fondoAnimado(8)}<main class="contenedor"><div class="vacio"><b>No se pudo cargar la proyección</b>${esc(ex.message)}
        <div style="margin-top:14px;display:flex;gap:8px;justify-content:center"><button class="btn" data-r>${I.girar}Reintentar</button><button class="btn" data-s>${I.salir}Salir</button></div></div></main>`;
      $("[data-r]", app).onclick = () => cargar();
      $("[data-s]", app).onclick = h.salir;
    }
  }

  function pintar() {
    document.title = "Proyección · ISC UTP";
    const et = datos.etapas.find((x) => x.id === etapaSel) || datos.etapas[0];
    const info = etapaDe(et.id);
    const sinOrden = et.equipos.some((e) => e.orden == null);
    app.innerHTML = `
    ${fondoAnimado(10)}
    <header class="barra">
      ${h.marcaISC("Proyección")}
      <div class="der">
        <button class="btn btn--mini" data-recargar>${I.girar}<span>Actualizar</span></button>
        <button class="btn btn--mini" data-salir>${I.salir}<span>Salir</span></button>
      </div>
    </header>
    <main class="contenedor">
      <div class="adm-hola"><h1>Proyección del pitch</h1>
        <p>Abre la pantalla completa en el proyector (o compártela en el Zoom). Tiempo por equipo: <b>${esc(textoTiempos({ pitch: datos.config.min_pitch, preguntas: datos.config.min_preguntas }))}</b>.</p></div>
      <nav class="pestanas">${datos.etapas.map((x) => `<button class="pestana" aria-selected="${x.id === et.id}" data-etapa="${x.id}">${x.id === "final" ? I.copa : I.vivo}${esc(etapaDe(x.id)?.corto || x.nombre)} · ${esc(etapaDe(x.id)?.dia || "")}<span class="n">${x.equipos.length}</span></button>`).join("")}</nav>
      ${sinOrden && et.equipos.length ? `<p class="nota">El orden de exposición aún no está definido: se muestran en el orden de registro. La organización lo define en Admin → Presentaciones.</p>` : ""}
      ${et.equipos.length ? `
        <div class="herramientas"><button class="btn btn--naranja btn--grande" data-proyectar="0">${I.pizarra}Abrir pantalla completa · Turno 01</button></div>
        <div class="jur-eqs">${et.equipos.map((e, n) => `<button class="jur-eq" data-proyectar="${n}">
          <span class="jur-eq__turno"><small>Turno</small>${String(e.orden ?? n + 1).padStart(2, "0")}</span>
          <span class="jur-eq__txt"><b>${esc(e.nombre_proyecto)}</b><small>${esc(ejeDe(e.eje)?.nombre || "")}</small></span>
          ${e.archivos?.pdf_ruta ? `<span class="chip chip--verde">${I.check}PDF</span>` : `<span class="chip chip--rojo">Sin PDF</span>`}
          <span class="jur-eq__ir">Proyectar ${I.flecha}</span></button>`).join("")}</div>`
        : `<div class="vacio"><b>No hay equipos en la ${esc(info?.corto || et.nombre)}</b>${et.id === "final" ? "Aparecerán cuando se definan los clasificados." : ""}</div>`}
      <section class="tarjeta adm-caja" style="margin-top:20px">
        <h2>${I.info}Controles con el puntero (clicker)</h2>
        <p class="ayuda">→ / PageDown / Espacio: siguiente diapositiva · ← / PageUp: anterior · <b>B</b>: pantalla negra · <b>T</b>: iniciar o pausar el tiempo · Mueve el mouse para ver la barra de control.</p>
      </section>
    </main>
    ${h.bandaDemo()}`;
    $("[data-salir]", app).onclick = h.salir;
    $("[data-recargar]", app).onclick = () => cargar(true);
    $$("[data-etapa]", app).forEach((b) => (b.onclick = () => { etapaSel = b.dataset.etapa; try { sessionStorage.setItem(CLAVE_ETAPA, etapaSel); } catch { /* */ } pintar(); }));
    $$("[data-proyectar]", app).forEach((b) => (b.onclick = () => abrirSala({ equipos: et.equipos, config: datos.config, indice: Number(b.dataset.proyectar), titulo: et.nombre, alSalir: () => cargar() })));
  }

  app.innerHTML = `${fondoAnimado(8)}<main class="contenedor"><p class="vacio">Cargando…</p></main>`;
  cargar();
}

