// =========================================================
// Panel ISC UTP 2027 · Admin: Resultados y Presentaciones
// Resultados: tabla por etapa (jurado × equipo), promedios, puestos,
// empates y desempate en sala, sanciones, «Pasar a la Final», publicar
// para los equipos, reporte imprimible y CSV.
// Presentaciones: archivos de cada equipo, orden de exposición (manual o
// sorteo) y «Proyectar».
// =========================================================
import { api } from "./api.js?v=202611190703";
import { $, $$, esc, I, aviso, modal, confirmar } from "./ui.js?v=202611190703";
import { ETAPAS, CRITERIOS, TOTAL, etapa as etapaDe, eje as ejeDe } from "./rubrica.js?v=202611190703";
import { calcularEtapa, empateCritico, unDecimal } from "./calculo.js?v=202611190703";
import { abrirSala } from "./proyeccion.js?v=202611190703";

const enEtapa = (e, et) => et === "semifinal" || e.etapa_alcanzada === "final";
const corto = (n) => String(n || "").split(/\s+/).slice(0, 2).join(" ");

// =========================================================
// RESULTADOS
// =========================================================
export function pestanaResultados(cuerpo, s, estado) {
  let R = null;
  estado.etapaRes ||= "semifinal";
  let vivo = null;

  async function cargar(conAviso = false) {
    try {
      R = await api.adminResultados(s.codigo);
      pintar();
      if (conAviso) aviso("Resultados actualizados");
    } catch (ex) {
      cuerpo.innerHTML = `<div class="vacio"><b>No se pudieron cargar los resultados</b>${esc(ex.message)}</div>`;
    }
  }

  function calc(etId) {
    const equipos = R.equipos.filter((e) => enEtapa(e, etId));
    return calcularEtapa({
      etapa: etId, equipos,
      calificaciones: R.calificaciones.filter((c) => c.etapa === etId),
      sanciones: R.sanciones.filter((x) => x.etapa === etId),
      desempates: R.desempates.filter((x) => x.etapa === etId),
    });
  }

  function pintar() {
    if (!document.body.contains(cuerpo)) return;
    const etId = estado.etapaRes;
    const info = etapaDe(etId);
    const et = R.etapas.find((x) => x.id === etId) || {};
    const jurados = R.jurados.filter((j) => (j.etapas || []).includes(etId));
    const filas = calc(etId);
    const esperadas = filas.length * jurados.length;
    const hechas = R.calificaciones.filter((c) => c.etapa === etId).length;
    const critico = empateCritico(filas, info.clasifican);
    const enFinal = R.equipos.filter((e) => e.etapa_alcanzada === "final");
    const top = filas.filter((f) => f.clasifica);

    cuerpo.innerHTML = `
      <nav class="pestanas pestanas--sub">${ETAPAS.map((x) => `<button class="pestana" aria-selected="${x.id === etId}" data-etapa-res="${x.id}">${x.id === "final" ? I.copa : I.vivo}${esc(x.nombre)}</button>`).join("")}</nav>
      <div class="kpis">
        <div class="kpi ${hechas < esperadas ? "kpi--alerta" : ""}"><b>${hechas}<small> / ${esperadas}</small></b><span>Calificaciones (${filas.length} equipos × ${jurados.length} jurados)</span></div>
        <div class="kpi"><b class="kpi__txt">${et.abierta ? "Abierta" : "Cerrada"}</b><span>Calificación de la ${esc(info.corto)} (cámbialo en Ajustes)</span></div>
        <div class="kpi"><b class="kpi__txt">${et.resultados_publicados ? "Publicados" : "No publicados"}</b><span>Los equipos ${et.resultados_publicados ? "ya ven" : "aún no ven"} sus resultados</span></div>
      </div>
      ${critico ? `<div class="cerrado">${I.alerta}<span><b>Hay un empate que define ${etId === "final" ? "el puesto" : "quién clasifica"}.</b> Se resolvió por promedio exacto y criterios de mayor peso y siguen empatados: el jurado decide en sala. Pulsa «Desempatar».</span></div>` : ""}
      ${filas.length ? `<div class="tabla-envoltura"><table class="tabla adm-res">
        <thead><tr><th class="num">#</th><th>Equipo</th>
          ${jurados.map((j) => `<th class="num" title="${esc(j.nombre)}">${esc(corto(j.nombre))}</th>`).join("")}
          ${CRITERIOS.map((c) => `<th class="num" title="${esc(c.nombre)} (${c.max})">${esc(c.nombre.split(" ")[0])}<br><small>${c.max}</small></th>`).join("")}
          <th class="num">Promedio</th><th>Estado</th><th></th></tr></thead>
        <tbody>${filas.map((f) => `<tr class="${f.clasifica ? "adm-res--top" : ""} ${f.sancion ? "adm-res--fuera" : ""}">
          <td class="num grande">${f.puesto ?? "—"}</td>
          <td><b>${esc(f.equipo.nombre_proyecto)}</b><br><small class="tenue">${esc(ejeDe(f.equipo.eje)?.nombre || "")}</small></td>
          ${jurados.map((j) => { const c = f.califs.find((x) => x.jurado_id === j.id); return `<td class="num">${!c ? `<span class="tenue">—</span>` : c.no_presento ? `<span class="chip chip--rojo" title="No se presentó">NP</span>` : c.total}</td>`; }).join("")}
          ${CRITERIOS.map((c) => `<td class="num">${unDecimal(f.porCriterio[c.id])}</td>`).join("")}
          <td class="num"><span class="grande">${f.promedio != null ? Math.round(f.promedio) : "—"}</span><br><small class="tenue">${f.promedio != null ? (Math.round(f.promedio * 100) / 100).toLocaleString("es-PE") : "sin notas"}</small></td>
          <td class="adm-res__estado">
            ${f.sancion ? `<span class="chip chip--rojo">${f.sancion.tipo === "walkover" ? "Walkover" : "Descalificado"}</span>` : ""}
            ${f.clasifica ? `<span class="chip chip--verde">${etId === "final" ? (f.puesto === 1 ? "🏆 Ganador" : `${f.puesto}.º lugar`) : "Clasifica"}</span>` : ""}
            ${f.empate ? `<span class="chip chip--ambar">Empate</span> <button class="btn btn--mini" data-desempatar="${f.puesto}">Desempatar</button>` : ""}
            ${f.desempate ? `<span class="chip chip--celeste" title="${esc(f.desempate.motivo)}">Desempate en sala</span> <button class="des-quitar" data-quitar-des="${f.desempate.id}">quitar</button>` : ""}
            ${etId === "semifinal" && f.equipo.etapa_alcanzada === "final" ? `<span class="chip chip--ambar">${I.copa}En la Final</span>` : ""}
          </td>
          <td class="adm-res__acc">
            <button class="btn btn--mini" data-sancion="${f.equipo.id}" title="Walkover o descalificación">${I.alerta}</button>
            <button class="btn btn--mini" data-reporte="${f.equipo.id}" title="Reporte para el equipo">${I.descargar}</button>
          </td>
        </tr>`).join("")}</tbody></table></div>`
        : `<div class="vacio"><b>No hay equipos en la ${esc(info.corto)}</b>${etId === "final" ? "Usa «Pasar a la Final» en la Semifinal." : ""}</div>`}
      <p class="ayuda" style="margin-top:8px">Puntaje = promedio de los jurados (sobre ${TOTAL}). «NP» = no se presentó (cuenta 0). Desempate: 1) promedio exacto, 2) Equipo → Idea → Impacto → Evidencia → Viabilidad, 3) decisión en sala.</p>

      <div class="adm-res__botones">
        ${etId === "semifinal" ? `<button class="btn btn--naranja" data-pasar ${!top.length || critico ? "disabled" : ""}>${I.copa}Pasar a la Final: ${top.length ? top.map((f) => esc(f.equipo.nombre_proyecto)).join(", ") : "—"}</button>` : ""}
        <button class="btn ${et.resultados_publicados ? "" : "btn--primario"}" data-publicar>${et.resultados_publicados ? `${I.candado}Ocultar resultados a los equipos` : `${I.abierto}Publicar resultados para los equipos`}</button>
        <button class="btn" data-csv>${I.tabla}Descargar CSV (Excel)</button>
        <button class="btn" data-recargar-res>${I.girar}Actualizar</button>
      </div>
      ${etId === "semifinal" && enFinal.length ? `<p class="ayuda">En la Final ahora: <b>${enFinal.map((e) => esc(e.nombre_proyecto)).join(", ")}</b>.</p>` : ""}
      ${R.desempates.filter((d) => d.etapa === etId).length ? `<h3 class="seccion-titulo">Desempates registrados</h3><ul class="adm-des">${R.desempates.filter((d) => d.etapa === etId).map((d) => `<li>${d.equipos.map((id) => esc(R.equipos.find((e) => e.id === id)?.nombre_proyecto || "?")).join(" › ")} — <i>${esc(d.motivo)}</i></li>`).join("")}</ul>` : ""}`;

    $$("[data-etapa-res]", cuerpo).forEach((b) => (b.onclick = () => { estado.etapaRes = b.dataset.etapaRes; pintar(); }));
    $("[data-recargar-res]", cuerpo).onclick = () => cargar(true);
    $("[data-csv]", cuerpo).onclick = () => csv(etId, filas, jurados);
    $$("[data-reporte]", cuerpo).forEach((b) => (b.onclick = () => reporte(etId, filas.find((f) => f.equipo.id === b.dataset.reporte))));
    $$("[data-sancion]", cuerpo).forEach((b) => (b.onclick = () => sancion(etId, filas.find((f) => f.equipo.id === b.dataset.sancion))));
    $$("[data-desempatar]", cuerpo).forEach((b) => (b.onclick = () => desempatar(etId, filas.filter((f) => f.empate && f.puesto === Number(b.dataset.desempatar)))));
    $$("[data-quitar-des]", cuerpo).forEach((b) => (b.onclick = async () => {
      if (!(await confirmar("¿Quitar este desempate?", "Los equipos volverán a figurar como empatados.", { boton: "Quitar" }))) return;
      try { await api.quitarDesempate(s.codigo, b.dataset.quitarDes); aviso("Desempate quitado"); cargar(); } catch (ex) { aviso(ex.message, "error"); }
    }));
    const pasar = $("[data-pasar]", cuerpo);
    if (pasar) pasar.onclick = async () => {
      const ok = await confirmar("¿Pasar a la Final?", `Pasarán a la Final: <b>${top.map((f) => esc(f.equipo.nombre_proyecto)).join(", ")}</b>. Los demás quedan en la Semifinal. Puedes repetirlo mientras la Final no tenga calificaciones.`, { boton: "Pasar a la Final" });
      if (!ok) return;
      try { await api.pasarFinal(s.codigo, top.map((f) => f.equipo.id)); aviso("Clasificados a la Final actualizados"); cargar(); } catch (ex) { aviso(ex.message, "error"); }
    };
    $("[data-publicar]", cuerpo).onclick = async () => {
      const pub = !et.resultados_publicados;
      const txt = pub ? `Cada equipo verá en su panel su puntaje, el promedio por criterio y los comentarios del jurado (sin nombres)${etId === "semifinal" ? " y si pasó a la Final" : " y su puesto"}.${hechas < esperadas ? `<br><br>⚠️ Faltan ${esperadas - hechas} calificaciones.` : ""}${critico ? "<br><br>⚠️ Hay un empate sin resolver." : ""}` : "Los equipos dejarán de ver sus resultados.";
      if (!(await confirmar(pub ? "¿Publicar resultados?" : "¿Ocultar resultados?", txt, { boton: pub ? "Publicar" : "Ocultar" }))) return;
      const ranking = filas.map((f) => ({ equipo_id: f.equipo.id, puesto: f.puesto, promedio: f.promedio == null ? null : Math.round(f.promedio * 100) / 100 }));
      try { await api.publicar(s.codigo, etId, pub, ranking); aviso(pub ? "Resultados publicados" : "Resultados ocultos"); cargar(); } catch (ex) { aviso(ex.message, "error"); }
    };
  }

  async function sancion(etId, f) {
    const m = modal(`<h2>Sanción · ${esc(f.equipo.nombre_proyecto)}</h2>
      <p class="ayuda">Walkover: no se presentó en su turno. Descalificado: por incumplir las bases. Queda fuera del ranking de la ${esc(etapaDe(etId).corto)}.</p>
      <form class="form">
        <label class="campo"><span>Sanción</span><select name="tipo">
          <option value="">Ninguna</option>
          <option value="walkover" ${f.sancion?.tipo === "walkover" ? "selected" : ""}>Walkover (no se presentó)</option>
          <option value="descalificado" ${f.sancion?.tipo === "descalificado" ? "selected" : ""}>Descalificado</option></select></label>
        <label class="campo"><span>Motivo</span><input name="motivo" maxlength="300" value="${esc(f.sancion?.motivo || "")}" placeholder="Ej.: no se conectó al Zoom en su turno"></label>
        <p class="error"></p>
        <div class="modal__acciones"><button type="button" class="btn" data-no>Cancelar</button><button class="btn btn--naranja">Guardar</button></div>
      </form>`);
    $("[data-no]", m.el).onclick = () => m.cerrar();
    $("form", m.el).onsubmit = async (ev) => {
      ev.preventDefault();
      const tipo = ev.target.elements.tipo.value, motivo = ev.target.elements.motivo.value.trim();
      if (tipo && !motivo) { $(".error", m.el).textContent = "Escribe el motivo."; return; }
      try { await api.sancion(s.codigo, etId, f.equipo.id, tipo, motivo); m.cerrar(); aviso(tipo ? "Sanción guardada" : "Sanción quitada"); cargar(); }
      catch (ex) { $(".error", m.el).textContent = ex.message; }
    };
  }

  async function desempatar(etId, grupo) {
    let orden = grupo.map((f) => f.equipo);
    const m = modal(`<h2>Desempate en sala</h2>
      <p class="ayuda">Estos equipos siguen empatados después del promedio exacto y de los criterios de mayor peso. Ordénalos según la decisión del jurado (el primero queda arriba) y escribe el motivo.</p>
      <ol class="adm-orden" data-lista></ol>
      <form class="form">
        <label class="campo"><span>Motivo (obligatorio)</span><textarea name="motivo" rows="2" maxlength="400" placeholder="Ej.: el jurado votó 3 a 1 por mayor impacto en comunidades"></textarea></label>
        <p class="error"></p>
        <div class="modal__acciones"><button type="button" class="btn" data-no>Cancelar</button><button class="btn btn--naranja">Guardar desempate</button></div>
      </form>`, { ancho: true });
    const lista = $("[data-lista]", m.el);
    const pintarLista = () => {
      lista.innerHTML = orden.map((e, n) => `<li><b>${esc(e.nombre_proyecto)}</b>
        <span><button type="button" class="btn btn--mini btn--icono" data-sube="${n}" ${n === 0 ? "disabled" : ""} aria-label="Subir">↑</button>
        <button type="button" class="btn btn--mini btn--icono" data-baja="${n}" ${n === orden.length - 1 ? "disabled" : ""} aria-label="Bajar">↓</button></span></li>`).join("");
    };
    lista.onclick = (ev) => {
      const b = ev.target.closest("[data-sube],[data-baja]");
      if (!b) return;
      const n = Number(b.dataset.sube ?? b.dataset.baja), d = b.dataset.sube != null ? -1 : 1;
      [orden[n], orden[n + d]] = [orden[n + d], orden[n]];
      pintarLista();
    };
    pintarLista();
    $("[data-no]", m.el).onclick = () => m.cerrar();
    $("form", m.el).onsubmit = async (ev) => {
      ev.preventDefault();
      const motivo = ev.target.elements.motivo.value.trim();
      if (!motivo) { $(".error", m.el).textContent = "Escribe el motivo del desempate."; return; }
      try { await api.desempate(s.codigo, etId, orden.map((e) => e.id), motivo); m.cerrar(); aviso("Desempate guardado"); cargar(); }
      catch (ex) { $(".error", m.el).textContent = ex.message; }
    };
  }

  function csv(etId, filas, jurados) {
    const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const cab = ["Puesto", "Equipo", "Eje", ...jurados.map((j) => j.nombre), ...CRITERIOS.map((c) => `${c.nombre} (prom.)`), "Promedio exacto", "Puntaje", "Estado"];
    const lineas = filas.map((f) => [
      f.puesto ?? "", f.equipo.nombre_proyecto, ejeDe(f.equipo.eje)?.nombre || "",
      ...jurados.map((j) => { const c = f.califs.find((x) => x.jurado_id === j.id); return !c ? "" : c.no_presento ? "NP" : c.total; }),
      ...CRITERIOS.map((c) => (f.porCriterio[c.id] == null ? "" : String(Math.round(f.porCriterio[c.id] * 100) / 100).replace(".", ","))),
      f.promedio == null ? "" : String(Math.round(f.promedio * 100) / 100).replace(".", ","),
      f.promedio == null ? "" : Math.round(f.promedio),
      [f.sancion ? f.sancion.tipo : "", f.clasifica ? "clasifica" : "", f.empate ? "empate" : ""].filter(Boolean).join(" "),
    ]);
    // Detalle: comentarios y justificaciones por jurado
    const det = [[], ["Detalle por jurado"], ["Equipo", "Jurado", "No se presentó", ...CRITERIOS.map((c) => c.nombre), ...CRITERIOS.map((c) => `Justificación ${c.nombre}`), "Total", "Comentario"]];
    filas.forEach((f) => f.califs.forEach((c) => det.push([f.equipo.nombre_proyecto, R.jurados.find((j) => j.id === c.jurado_id)?.nombre || "", c.no_presento ? "sí" : "",
      ...CRITERIOS.map((cr) => c.puntajes?.[cr.id] ?? ""), ...CRITERIOS.map((cr) => c.justificaciones?.[cr.id] ?? ""), c.total, c.comentario || ""])));
    const texto = "\ufeff" + [cab, ...lineas, ...det].map((l) => l.map(q).join(";")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([texto], { type: "text/csv;charset=utf-8" }));
    a.download = `resultados-isc-utp-${etId}.csv`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  function reporte(etId, f) {
    const info = etapaDe(etId);
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Reporte · ${esc(f.equipo.nombre_proyecto)}</title>
      <style>body{font:14px/1.5 system-ui,sans-serif;color:#111;max-width:760px;margin:24px auto;padding:0 16px}h1{margin:0}table{border-collapse:collapse;width:100%;margin:12px 0}td,th{border:1px solid #ccc;padding:6px 8px;text-align:left}th{background:#f2f0ff}.nota{font-size:40px;font-weight:800;color:#5B45E0}.c{border:1px solid #ddd;border-radius:8px;padding:10px 12px;margin:10px 0}small{color:#666}@media print{button{display:none}}</style></head><body>
      <button onclick="print()" style="float:right;padding:8px 14px">Imprimir / Guardar PDF</button>
      <small>ISC UTP 2027 · Programa Local UTP · ${esc(info.nombre)}</small>
      <h1>${esc(f.equipo.nombre_proyecto)}</h1>
      <p>${esc(ejeDe(f.equipo.eje)?.nombre || "")} · ${esc((f.equipo.integrantes || []).join(", "))}</p>
      <p><span class="nota">${f.promedio != null ? Math.round(f.promedio) : "—"}</span> / ${TOTAL} pts ${f.puesto ? ` · ${f.puesto}.º lugar` : ""}${f.sancion ? ` · <b>${f.sancion.tipo === "walkover" ? "Walkover" : "Descalificado"}</b>: ${esc(f.sancion.motivo)}` : ""}</p>
      <table><tr><th>Criterio</th><th>Peso</th><th>Promedio</th></tr>${CRITERIOS.map((c) => `<tr><td>${esc(c.nombre)}</td><td>${c.max}</td><td>${unDecimal(f.porCriterio[c.id])}</td></tr>`).join("")}</table>
      <h2>Comentarios del jurado</h2>
      ${f.califs.map((c, n) => `<div class="c"><b>Jurado ${n + 1} · ${c.no_presento ? "No se presentó" : `${c.total} pts`}</b>${c.comentario ? `<p>${esc(c.comentario)}</p>` : ""}
        ${!c.no_presento ? `<ul>${CRITERIOS.map((cr) => `<li><b>${esc(cr.nombre)} (${c.puntajes?.[cr.id] ?? "—"}/${cr.max}):</b> ${esc(c.justificaciones?.[cr.id] || "")}</li>`).join("")}</ul>` : ""}</div>`).join("") || "<p>Sin calificaciones.</p>"}
      </body></html>`;
    const w = window.open("", "_blank");
    if (!w) { aviso("El navegador bloqueó la ventana. Permite las ventanas emergentes para este sitio.", "error"); return; }
    w.document.write(html); w.document.close();
  }

  cuerpo.innerHTML = `<p class="vacio">Cargando resultados…</p>`;
  cargar();
  // En vivo: se actualiza solo cada 20 s mientras esta pestaña esté abierta y no haya ventanas abiertas
  vivo = setInterval(() => {
    if (!document.body.contains(cuerpo) || estado.pestana !== "resultados") return clearInterval(vivo);
    if (!document.querySelector(".velo") && !document.hidden) cargar();
  }, 20000);
}

// =========================================================
// PRESENTACIONES (archivos, orden y proyectar)
// =========================================================
export function pestanaPresentaciones(cuerpo, s, estado, datos, recargar) {
  estado.etapaPres ||= "semifinal";
  let borrador = null; // orden sin guardar [ids]

  function equiposDe(etId) {
    const campo = etId === "final" ? "orden_final" : "orden_semifinal";
    return datos.equipos.filter((e) => enEtapa(e, etId))
      .sort((a, b) => (a[campo] ?? 1e9) - (b[campo] ?? 1e9) || String(a.creado).localeCompare(String(b.creado)));
  }

  function pintar() {
    const etId = estado.etapaPres;
    const info = etapaDe(etId);
    const campo = etId === "final" ? "orden_final" : "orden_semifinal";
    let lista = equiposDe(etId);
    if (borrador) lista = borrador.map((id) => lista.find((e) => e.id === id)).filter(Boolean);
    const conOrden = lista.length && lista.every((e) => e[campo] != null);
    const conPdf = lista.filter((e) => e.archivos?.pdf_ruta).length;

    cuerpo.innerHTML = `
      <nav class="pestanas pestanas--sub">${ETAPAS.map((x) => `<button class="pestana" aria-selected="${x.id === etId}" data-etapa-pres="${x.id}">${x.id === "final" ? I.copa : I.vivo}${esc(x.nombre)}</button>`).join("")}</nav>
      <div class="kpis">
        <div class="kpi ${conPdf < lista.length ? "kpi--alerta" : ""}"><b>${conPdf}<small> / ${lista.length}</small></b><span>Equipos con PDF</span></div>
        <div class="kpi ${conOrden && !borrador ? "" : "kpi--alerta"}"><b class="kpi__txt">${borrador ? "Sin guardar" : conOrden ? "Definido" : "Pendiente"}</b><span>Orden de exposición · ${esc(info.corto)}</span></div>
      </div>
      ${borrador ? `<div class="cerrado">${I.alerta}<span>Este orden <b>aún no está guardado</b>. Pulsa «Guardar orden» para que lo vean los jurados, los equipos y la proyección.</span></div>` : ""}
      <div class="herramientas">
        <button class="btn btn--naranja" data-sortear ${lista.length < 2 ? "disabled" : ""}>🎲 Sortear el orden</button>
        <button class="btn ${borrador ? "btn--primario" : ""}" data-guardar-orden ${lista.length ? "" : "disabled"}>${I.check}Guardar orden</button>
        <div class="der">
          <button class="btn" data-copiar-orden ${lista.length ? "" : "disabled"}>${I.copiar}Copiar para WhatsApp</button>
          <button class="btn btn--primario" data-proyectar ${lista.length ? "" : "disabled"}>${I.pizarra}Proyectar</button>
        </div>
      </div>
      ${lista.length ? `<ol class="adm-orden adm-orden--grande" data-lista>${lista.map((e, n) => {
        const a = e.archivos || {};
        const ver = (t, txt) => (a[`${t}_ruta`] ? (api.urlArchivo(a[`${t}_ruta`]) ? `<a class="chip chip--verde" href="${esc(api.urlArchivo(a[`${t}_ruta`]))}" target="_blank" rel="noopener">${I.check}${txt}</a>` : `<span class="chip chip--verde">${I.check}${txt}</span>`) : `<span class="chip ${t === "pdf" ? "chip--rojo" : ""}">Sin ${txt}</span>`);
        return `<li>
          <span class="jur-eq__turno"><small>Turno</small>${String(n + 1).padStart(2, "0")}</span>
          <span class="adm-orden__txt"><b>${esc(e.nombre_proyecto)}</b><span>${ver("pdf", "PDF")} ${ver("ppt", "PPT")} ${a.video_ruta ? ver("video", "Video") : ""}</span></span>
          <span><button type="button" class="btn btn--mini btn--icono" data-sube="${n}" ${n === 0 ? "disabled" : ""} aria-label="Subir">↑</button>
          <button type="button" class="btn btn--mini btn--icono" data-baja="${n}" ${n === lista.length - 1 ? "disabled" : ""} aria-label="Bajar">↓</button></span>
        </li>`;
      }).join("")}</ol>` : `<div class="vacio"><b>No hay equipos en la ${esc(info.corto)}</b>${etId === "final" ? "Usa «Pasar a la Final» en Resultados." : "Regístralos en la pestaña Equipos."}</div>`}
      <p class="ayuda" style="margin-top:10px">La fecha límite para subir archivos se cambia en <b>Ajustes</b>. Los equipos suben su PDF desde su panel.</p>`;

    const ids = lista.map((e) => e.id);
    $$("[data-etapa-pres]", cuerpo).forEach((b) => (b.onclick = async () => {
      if (borrador && !(await confirmar("¿Cambiar de etapa sin guardar?", "Perderás el orden que no guardaste.", { boton: "Cambiar" }))) return;
      borrador = null; estado.etapaPres = b.dataset.etapaPres; pintar();
    }));
    const l = $("[data-lista]", cuerpo);
    if (l) l.onclick = (ev) => {
      const b = ev.target.closest("[data-sube],[data-baja]");
      if (!b) return;
      const n = Number(b.dataset.sube ?? b.dataset.baja), d = b.dataset.sube != null ? -1 : 1;
      const o = [...ids];
      [o[n], o[n + d]] = [o[n + d], o[n]];
      borrador = o; pintar();
    };
    $("[data-sortear]", cuerpo).onclick = async () => {
      if (conOrden && !(await confirmar("¿Sortear otra vez?", "Ya hay un orden guardado. El nuevo sorteo lo reemplazará cuando pulses «Guardar orden».", { boton: "Sortear" }))) return;
      const mezclar = (a) => { const r = [...a]; for (let k = r.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [r[k], r[j]] = [r[j], r[k]]; } return r; };
      // pequeña animación: el orden «baraja» unas veces antes de quedar
      for (let k = 0; k < 8; k++) { borrador = mezclar(ids); pintar(); $("[data-lista]", cuerpo)?.classList.add("adm-orden--baraja"); await new Promise((r) => setTimeout(r, 110)); }
      borrador = mezclar(ids); borrador._sorteo = true; pintar();
      aviso("Orden sorteado. Revísalo y pulsa «Guardar orden».");
    };
    $("[data-guardar-orden]", cuerpo).onclick = async () => {
      try {
        await api.orden(s.codigo, etId, ids, !!borrador?._sorteo);
        borrador = null; aviso("Orden guardado"); await recargar();
      } catch (ex) { aviso(ex.message, "error"); }
    };
    $("[data-copiar-orden]", cuerpo).onclick = async () => {
      const txt = `*ISC UTP 2027 · ${info.nombre}*\n${info.dia} · ${info.hora} · ${info.modalidad}\n\nOrden de exposición:\n${lista.map((e, n) => `${String(n + 1).padStart(2, "0")}. ${e.nombre_proyecto}`).join("\n")}`;
      try { await navigator.clipboard.writeText(txt); aviso("Orden copiado"); } catch { aviso("No se pudo copiar automáticamente.", "error"); }
    };
    $("[data-proyectar]", cuerpo).onclick = async () => {
      try {
        const p = await api.proyeccionPanel(s.codigo);
        const et = p.etapas.find((x) => x.id === etId);
        if (!et?.equipos.length) { aviso("No hay equipos para proyectar.", "error"); return; }
        abrirSala({ equipos: et.equipos, config: p.config, titulo: et.nombre });
      } catch (ex) { aviso(ex.message, "error"); }
    };
  }
  pintar();
}
