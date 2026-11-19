// =========================================================
// Panel ISC UTP 2027 · Equipo
// Su equipo y turno, cuenta regresiva al cierre, subir PDF / PPT / video
// (máx. 50 MB), ensayar el pitch y ver sus resultados cuando se publiquen.
// =========================================================
import { api } from "./api.js?v=202611190703";
import { $, $$, esc, I, aviso, confirmar, fondoAnimado, lanzarConfeti } from "./ui.js?v=202611190703";
import { CRITERIOS, TOTAL, TIPOS_INTEGRANTE, eje as ejeDe, etapa as etapaDe, textoTiempos } from "./rubrica.js?v=202611190703";
import { abrirSala } from "./proyeccion.js?v=202611190703";
import { unDecimal } from "./calculo.js?v=202611190703";

const MAX = 50 * 1024 * 1024;
const ZONA = "America/Lima";
const SLOTS = [
  { tipo: "pdf", nombre: "Presentación en PDF", obligatorio: true, acepta: ".pdf,application/pdf", ext: /\.pdf$/i, ayuda: "Es lo que se proyecta. Exporta tu PPT o Canva como PDF.", icono: "pizarra" },
  { tipo: "ppt", nombre: "PPT de respaldo", obligatorio: false, acepta: ".ppt,.pptx", ext: /\.pptx?$/i, ayuda: "Opcional. Por si hace falta abrir el original.", icono: "caja" },
  { tipo: "video", nombre: "Video", obligatorio: false, acepta: "video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm", ext: /\.(mp4|mov|webm)$/i, ayuda: "Opcional (MP4, MOV o WEBM).", icono: "camara" },
];
const fechaLarga = (iso) => (iso ? new Date(iso).toLocaleString("es-PE", { timeZone: ZONA, weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" }) : "sin fecha");
const tipoNombre = (id) => TIPOS_INTEGRANTE.find((t) => t.id === id)?.nombre || id;
const peso = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

function cuenta(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return null;
  const d = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000), m = Math.floor((ms % 3600000) / 60000);
  return d > 0 ? `${d} d ${h} h ${m} min` : h > 0 ? `${h} h ${m} min` : `${m} min`;
}

export function panelEquipo(app, s, h) {
  let datos = null;
  let reloj = null;

  async function cargar(conAviso = false) {
    try {
      datos = await api.equipoPanel(s.codigo);
      pintar();
      if (conAviso) aviso("Datos actualizados");
    } catch (ex) {
      app.innerHTML = `${fondoAnimado(8)}<main class="contenedor"><div class="vacio"><b>No se pudieron cargar los datos de tu equipo</b>${esc(ex.message)}
        <div style="margin-top:14px;display:flex;gap:8px;justify-content:center"><button class="btn" data-r>${I.girar}Reintentar</button><button class="btn" data-s>${I.salir}Salir</button></div></div></main>`;
      $("[data-r]", app).onclick = () => cargar();
      $("[data-s]", app).onclick = h.salir;
    }
  }

  function slotHtml(sl) {
    const a = datos.archivos || {};
    const ruta = a[`${sl.tipo}_ruta`], nombre = a[`${sl.tipo}_nombre`];
    const url = ruta ? api.urlArchivo(ruta) : null;
    const puede = datos.config.subida_permitida;
    return `<div class="pres-slot ${ruta ? "pres-slot--ok" : ""}" data-slot="${sl.tipo}">
      <span class="pres-slot__ico">${I[sl.icono]}</span>
      <div class="pres-slot__txt">
        <b>${esc(sl.nombre)} ${sl.obligatorio ? `<span class="chip ${ruta ? "chip--verde" : "chip--rojo"}">${ruta ? "Listo" : "Obligatorio"}</span>` : ruta ? `<span class="chip chip--verde">Listo</span>` : ""}</b>
        ${ruta ? `<span class="pres-slot__arch">${I.check}${esc(nombre || "archivo")}</span>` : `<small>${esc(sl.ayuda)}</small>`}
        <small class="eq-subiendo" data-estado hidden></small>
      </div>
      <div class="pres-slot__acc">
        ${ruta && url ? `<a class="btn btn--mini" href="${esc(url)}" target="_blank" rel="noopener">${I.flecha}Ver</a>` : ""}
        ${puede ? `<label class="btn btn--mini ${ruta ? "" : "btn--naranja"}">${I.descargar}${ruta ? "Reemplazar" : "Subir"}
            <input type="file" accept="${sl.acepta}" data-subir="${sl.tipo}" hidden></label>
          ${ruta ? `<button class="btn btn--mini btn--peligro btn--icono" data-quitar="${sl.tipo}" aria-label="Quitar ${esc(sl.nombre)}">${I.basura}</button>` : ""}` : ""}
      </div>
    </div>`;
  }

  function resultadosHtml() {
    if (!datos.resultados?.length) return "";
    return datos.resultados.map((r) => {
      const info = etapaDe(r.etapa);
      const cal = r.calificaciones || [];
      const porCrit = CRITERIOS.map((c) => {
        const vs = cal.filter((x) => !x.no_presento).map((x) => Number(x.puntajes?.[c.id]) || 0);
        const v = cal.length ? cal.reduce((t, x) => t + (x.no_presento ? 0 : Number(x.puntajes?.[c.id]) || 0), 0) / cal.length : null;
        return { c, v, n: vs.length };
      });
      const estado = r.sancion ? `<span class="chip chip--rojo">${r.sancion.tipo === "walkover" ? "Walkover" : "Descalificado"}</span>`
        : r.etapa === "semifinal" ? (r.clasifico ? `<span class="chip chip--verde">${I.copa}¡Pasaron a la Final!</span>` : `<span class="chip">No clasificó a la Final</span>`)
        : r.puesto === 1 ? `<span class="chip chip--ambar">${I.copa}¡Ganadores!</span>` : "";
      return `<section class="tarjeta eq-res">
        <div class="eq-res__cab">
          <div><h2>${esc(r.nombre)} · resultados</h2>${estado}</div>
          <div class="eq-res__nota"><b>${r.promedio != null ? Math.round(r.promedio) : "—"}</b><small>/ ${TOTAL} pts${r.puesto ? ` · ${r.puesto}.º lugar` : ""}</small></div>
        </div>
        ${r.sancion ? `<p class="nota">${esc(r.sancion.motivo || "")}</p>` : ""}
        <div class="tabla-pts">${porCrit.map(({ c, v }) => `<div><span>${esc(c.nombre)} <small class="adm-sub">${c.max} pts</small></span><b>${unDecimal(v)}</b></div>`).join("")}</div>
        <h3 class="eq-res__sub">Comentarios del jurado</h3>
        ${cal.length ? cal.map((x, n) => `<article class="eq-com">
          <b>Jurado ${n + 1} · ${x.no_presento ? "No se presentó" : `${x.total} pts`}</b>
          ${x.comentario ? `<p>${esc(x.comentario)}</p>` : ""}
          ${!x.no_presento ? `<details><summary>Ver justificación por criterio</summary><ul>${CRITERIOS.map((c) => `<li><b>${esc(c.nombre)} (${x.puntajes?.[c.id] ?? "—"}/${c.max}):</b> ${esc(x.justificaciones?.[c.id] || "")}</li>`).join("")}</ul></details>` : ""}
        </article>`).join("") : `<p class="ayuda">No hay calificaciones registradas.</p>`}
      </section>`;
    }).join("");
  }

  function pintar() {
    clearInterval(reloj);
    const e = datos.equipo, cfg = datos.config;
    document.title = `${e.nombre_proyecto} · Equipo · ISC UTP`;
    const etapaActual = e.etapa_alcanzada === "final" ? "final" : "semifinal";
    const turno = etapaActual === "final" ? e.orden_final : e.orden_semifinal;
    const info = etapaDe(etapaActual);
    const falta = cfg.fecha_limite_archivos ? cuenta(cfg.fecha_limite_archivos) : null;
    const tienePdf = !!datos.archivos?.pdf_ruta;

    app.innerHTML = `
    ${fondoAnimado(10)}
    <header class="barra">
      ${h.marcaISC("Panel del equipo")}
      <div class="der">
        <button class="btn btn--mini" data-recargar>${I.girar}<span>Actualizar</span></button>
        <button class="btn btn--mini" data-salir>${I.salir}<span>Salir</span></button>
      </div>
    </header>
    <main class="contenedor jur-entra">
      <section class="tarjeta bienvenida jur-hero">
        <div class="jur-hero__aura"></div>
        <div class="jur-hero__txt">
          <span class="jur-hero__sobre">Equipo · ${esc(info?.nombre || "")}</span>
          <h1>${esc(e.nombre_proyecto)}</h1>
          <p>${esc(ejeDe(e.eje)?.nombre || "")}${e.ods ? ` · ${esc(e.ods)}` : ""}</p>
          <div class="jur-hero__chips">
            <span class="chip ${turno ? "chip--celeste" : ""}">${I.bandera}${turno ? `Turno ${String(turno).padStart(2, "0")} de ${datos.total_equipos}` : "Turno: por sortear"}</span>
            <span class="chip">${I.reloj}${esc(info?.dia || "")} · ${esc(info?.hora || "")}</span>
            <span class="chip">${esc(textoTiempos({ pitch: cfg.min_pitch, preguntas: cfg.min_preguntas }))}</span>
          </div>
        </div>
        <div class="jur-anillo" style="--p:${tienePdf ? 100 : 0}"><b>${tienePdf ? "✓" : "PDF"}</b><span>${tienePdf ? "PDF listo" : "Falta tu PDF"}</span></div>
      </section>

      ${resultadosHtml()}

      <section class="tarjeta eq-plazo ${cfg.subida_permitida ? "" : "eq-plazo--cerrado"}">
        ${I.reloj}
        <div><b>${cfg.subida_permitida ? `Cierre: ${esc(fechaLarga(cfg.fecha_limite_archivos))}` : "La subida de archivos está cerrada"}</b>
          <small data-cuenta>${cfg.subida_permitida && falta ? `Faltan ${falta}` : cfg.subida_permitida ? "" : "Si necesitas cambiar algo, escribe a la organización."}</small></div>
      </section>

      <div class="dos-col eq-cols">
        <section class="tarjeta adm-caja">
          <h2>${I.pizarra}Tu presentación</h2>
          <p class="ayuda">Máximo 50 MB por archivo. Puedes reemplazarlos hasta el cierre.</p>
          <div class="pres-slots">${SLOTS.map(slotHtml).join("")}</div>
          <button class="btn btn--primario" data-ensayar ${tienePdf ? "" : "disabled"}>${I.pizarra}Ensayar mi pitch</button>
          <p class="ayuda">${tienePdf ? "Abre la misma pantalla que verá el jurado, con el cronómetro. Prueba también tu clicker: verás cada tecla que llega." : "Sube tu PDF para poder ensayar."}</p>
        </section>
        <section class="tarjeta adm-caja">
          <h2>${I.personas}Integrantes</h2>
          <ul class="eq-ints">${datos.integrantes.map((i) => `<li>${i.es_lider ? `<b>★ ${esc(i.nombres)} ${esc(i.apellidos)}</b> <small>Líder</small>` : `${esc(i.nombres)} ${esc(i.apellidos)}`}${i.tipo !== "utp" ? ` <small>· ${esc(tipoNombre(i.tipo))}</small>` : ""}</li>`).join("")}</ul>
          <p class="ayuda">Para cambiar integrantes o el nombre del proyecto, escribe a la organización. Desde la Semifinal la composición queda fija.</p>
        </section>
      </div>
    </main>
    ${h.bandaDemo()}`;

    $("[data-salir]", app).onclick = h.salir;
    $("[data-recargar]", app).onclick = () => cargar(true);
    const ens = $("[data-ensayar]", app);
    ens.onclick = () => abrirSala({
      equipos: [{ id: e.id, nombre_proyecto: e.nombre_proyecto, eje: e.eje, orden: turno, archivos: datos.archivos,
        integrantes: datos.integrantes.map((i) => ({ nombre: `${i.nombres} ${i.apellidos}`, es_lider: i.es_lider })) }],
      config: cfg, titulo: "Ensayo del pitch", ensayo: true,
    });

    $$("[data-subir]", app).forEach((inp) => (inp.onchange = () => subir(inp.dataset.subir, inp.files?.[0], inp)));
    $$("[data-quitar]", app).forEach((b) => (b.onclick = async () => {
      const sl = SLOTS.find((x) => x.tipo === b.dataset.quitar);
      if (!(await confirmar(`¿Quitar ${sl.nombre.toLowerCase()}?`, sl.obligatorio ? "Sin PDF no se podrá proyectar tu pitch. Podrás subir otro hasta el cierre." : "Podrás subir otro hasta el cierre.", { boton: "Quitar", peligro: true }))) return;
      try { datos.archivos = await api.quitarArchivo(s.codigo, sl.tipo); aviso("Archivo quitado"); pintar(); }
      catch (ex) { aviso(ex.message, "error"); }
    }));

    if (cfg.subida_permitida && cfg.fecha_limite_archivos) {
      reloj = setInterval(() => {
        const c = $("[data-cuenta]", app);
        if (!c || !document.body.contains(c)) return clearInterval(reloj);
        const f = cuenta(cfg.fecha_limite_archivos);
        if (!f) { clearInterval(reloj); cargar(); return; }
        c.textContent = `Faltan ${f}`;
      }, 30000);
    }
  }

  async function subir(tipo, archivo, inp) {
    if (!archivo) return;
    const sl = SLOTS.find((x) => x.tipo === tipo);
    if (!sl.ext.test(archivo.name)) { aviso(`Ese archivo no es válido para «${sl.nombre}».`, "error"); inp.value = ""; return; }
    if (archivo.size > MAX) { aviso(`El archivo pesa ${peso(archivo.size)}. El máximo es 50 MB.`, "error"); inp.value = ""; return; }
    const caja = $(`[data-slot="${tipo}"]`, app);
    const est = $("[data-estado]", caja);
    est.hidden = false;
    est.textContent = `Subiendo ${archivo.name} (${peso(archivo.size)})… no cierres esta página.`;
    $$("input, button, label", caja).forEach((x) => { x.disabled = true; x.classList?.add("deshabilitado"); });
    try {
      datos.archivos = await api.subirArchivo(s.codigo, tipo, archivo);
      aviso(`${sl.nombre}: subido`);
      if (tipo === "pdf") lanzarConfeti();
      pintar();
    } catch (ex) {
      est.textContent = ex.message;
      aviso(ex.message, "error");
      $$("input, button, label", caja).forEach((x) => { x.disabled = false; x.classList?.remove("deshabilitado"); });
      inp.value = "";
    }
  }

  app.innerHTML = `${fondoAnimado(8)}<main class="contenedor"><p class="vacio">Cargando…</p></main>`;
  cargar();
}
