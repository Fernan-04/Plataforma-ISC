// =========================================================
// Panel ISC UTP 2027 · Jurado
// Inicio: saludo con anillo de avance, equipos por etapa en orden de
// exposición y colegas. Calificar: un nivel por criterio + justificación,
// comentario general para el equipo, o «No se presentó».
// La base vuelve a revisar todo (niveles válidos, etapa abierta, etc.).
// =========================================================
import { api } from "./api.js?v=202611190703";
import { $, $$, esc, I, avatar, aviso, confirmar, fondoAnimado, lanzarConfeti } from "./ui.js?v=202611190703";
import { ETAPAS, CRITERIOS, NIVELES, TOTAL, TIPOS_INTEGRANTE, eje as ejeDe, etapa as etapaDe } from "./rubrica.js?v=202611190703";

const CLAVE_ETAPA = "isc-utp-jurado-etapa";
const LINKEDIN = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.61 0 4.28 2.38 4.28 5.47v6.27zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/></svg>`;
const tipoCorto = (id) => (id === "utp" ? "" : TIPOS_INTEGRANTE.find((t) => t.id === id)?.nombre || id);
const turno = (e, n) => String(e.orden ?? n + 1).padStart(2, "0");

export function panelJurado(app, s, h) {
  let datos = null;
  let etapaSel = null;
  let sucio = false; // cambios sin guardar en la pantalla de calificar

  const calDe = (etapa, equipoId) => datos.calificaciones.find((c) => c.etapa === etapa && c.equipo_id === equipoId);
  const etapaDatos = (id) => datos.etapas.find((e) => e.id === id);

  function marco(contenido) {
    app.innerHTML = `
    ${fondoAnimado(10)}
    <header class="barra">
      ${h.marcaISC("Panel del jurado")}
      <div class="der">
        <button class="btn btn--mini" data-recargar title="Actualizar">${I.girar}<span>Actualizar</span></button>
        <button class="btn btn--mini" data-salir>${I.salir}<span>Salir</span></button>
      </div>
    </header>
    <main class="contenedor jur-entra" data-main>${contenido}</main>
    ${h.bandaDemo()}`;
    $("[data-salir]", app).onclick = async () => {
      if (sucio && !(await confirmar("¿Salir sin guardar?", "Tienes cambios sin guardar en esta calificación.", { boton: "Salir sin guardar", peligro: true }))) return;
      sucio = false; h.salir();
    };
    $("[data-recargar]", app).onclick = async () => {
      if (sucio && !(await confirmar("¿Actualizar sin guardar?", "Perderás los cambios que no guardaste.", { boton: "Actualizar", peligro: true }))) return;
      sucio = false; cargar(true);
    };
  }

  async function cargar(conAviso = false) {
    if (!datos) marco(`<p class="vacio">Cargando…</p>`);
    try {
      datos = await api.juradoPanel(s.codigo);
      const guardada = (() => { try { return sessionStorage.getItem(CLAVE_ETAPA); } catch { return null; } })();
      const ids = datos.etapas.map((e) => e.id);
      etapaSel = ids.includes(etapaSel) ? etapaSel : ids.includes(guardada) ? guardada
        : (datos.etapas.find((e) => e.abierta)?.id || ids[0] || null);
      inicio();
      if (conAviso) aviso("Datos actualizados");
    } catch (ex) {
      marco(`<div class="vacio"><b>No se pudieron cargar tus datos</b>${esc(ex.message)}
        <div style="margin-top:14px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
          <button class="btn" data-reintentar>${I.girar}Reintentar</button></div></div>`);
      $("[data-reintentar]", app).onclick = () => cargar();
    }
  }

  // =========================================================
  // INICIO
  // =========================================================
  function inicio() {
    sucio = false;
    const j = datos.jurado;
    document.title = "Panel del jurado · ISC UTP";
    const total = datos.etapas.reduce((t, e) => t + e.equipos.length, 0);
    const hechos = datos.etapas.reduce((t, e) => t + e.equipos.filter((q) => calDe(e.id, q.id)).length, 0);
    const pct = total ? Math.round((hechos / total) * 100) : 0;
    const et = etapaDatos(etapaSel);

    const pestanas = datos.etapas.length > 1 ? `<nav class="pestanas" role="tablist">${datos.etapas.map((e) => {
      const n = e.equipos.filter((q) => calDe(e.id, q.id)).length;
      const info = etapaDe(e.id);
      return `<button class="pestana" role="tab" aria-selected="${e.id === etapaSel}" data-etapa="${e.id}">
        ${e.id === "final" ? I.copa : I.vivo}${esc(info?.corto || e.nombre)} · ${esc(info?.dia || "")}<span class="n">${n}/${e.equipos.length}</span></button>`;
    }).join("")}</nav>` : "";

    const lista = !et ? `<div class="vacio"><b>No tienes etapas asignadas</b>Escribe a la organización.</div>`
      : !et.equipos.length ? `<div class="vacio"><b>Aún no hay equipos en la ${esc(etapaDe(et.id)?.corto || et.nombre)}</b>${et.id === "final" ? "Aparecerán cuando se definan los 3 clasificados de la Semifinal." : "La organización los está registrando."}</div>`
      : `<div class="jur-eqs">${et.equipos.map((e, n) => {
          const c = calDe(et.id, e.id);
          const estado = !c ? `<span class="chip chip--ambar">${I.reloj}Pendiente</span>`
            : c.no_presento ? `<span class="chip chip--rojo">No se presentó · 0</span>`
            : `<span class="chip chip--verde">${I.check}${c.total} pts</span>`;
          return `<button class="jur-eq ${c ? "jur-eq--listo" : ""}" data-equipo="${e.id}" style="--i:${n}">
            <span class="jur-eq__turno"><small>Turno</small>${turno(e, n)}</span>
            <span class="jur-eq__txt"><b>${esc(e.nombre_proyecto)}</b><small>${esc(ejeDe(e.eje)?.nombre || "")}${e.ods ? ` · ${esc(e.ods)}` : ""}</small></span>
            ${estado}
            <span class="jur-eq__ir">${c ? "Revisar" : "Calificar"} ${I.flecha}</span>
          </button>`;
        }).join("")}</div>`;

    const colegas = datos.colegas.filter((o) => !etapaSel || (o.etapas || []).includes(etapaSel));
    marco(`
      <section class="tarjeta bienvenida jur-hero">
        <div class="jur-hero__aura"></div>
        <div class="jur-hero__foto">${avatar(j.nombre, j.foto_url)}</div>
        <div class="jur-hero__txt">
          <span class="jur-hero__sobre">Jurado · ISC UTP 2027</span>
          <h1>Hola, ${esc(j.nombre)}</h1>
          <p>Califica cada pitch con la rúbrica oficial (${TOTAL} pts): un nivel por criterio y una justificación corta.</p>
          <div class="jur-hero__chips">${datos.etapas.map((e) => `<span class="chip ${e.abierta ? "chip--verde" : ""}">${esc(etapaDe(e.id)?.corto || e.nombre)} · ${esc(etapaDe(e.id)?.dia || "")} · ${e.abierta ? "abierta" : "cerrada"}</span>`).join("")}</div>
        </div>
        <div class="jur-anillo" style="--p:${pct}"><b>${hechos}<small>/${total}</small></b><span>equipos<br>calificados</span></div>
      </section>
      <div class="jur-isc">
        <div class="jur-isc__main">
          ${pestanas}
          ${et && !et.abierta ? `<div class="cerrado">${I.candado}<span>La calificación de la <b>${esc(etapaDe(et.id)?.corto || et.nombre)}</b> aún está cerrada. Puedes revisar los equipos y la rúbrica; la organización la abrirá al empezar.</span></div>` : ""}
          ${et ? `<h2 class="seccion-titulo" style="margin-top:4px">${esc(et.nombre)} · orden de exposición</h2>` : ""}
          ${lista}
        </div>
        <aside class="tarjeta jur-colegas">
          <h3>${I.personas}Tus colegas ${et ? `<small>${esc(etapaDe(et.id)?.corto || "")}</small>` : ""}</h3>
          ${colegas.length ? `<div class="colegas-lado__lista">${colegas.map((o) => `<div class="colega-mini">
              ${avatar(o.nombre, o.foto_url)}
              <span class="colega-mini__txt"><b>${esc(o.nombre)}</b>${o.descripcion ? `<small>${esc(o.descripcion)}</small>` : ""}</span>
              ${o.linkedin ? `<a class="colega-mini__in" href="${esc(o.linkedin)}" target="_blank" rel="noopener" aria-label="LinkedIn de ${esc(o.nombre)}">${LINKEDIN}</a>` : "<span></span>"}
            </div>`).join("")}</div>` : `<p class="ayuda">Aún no hay otros jurados registrados en esta etapa.</p>`}
        </aside>
      </div>`);

    $$("[data-etapa]", app).forEach((b) => (b.onclick = () => {
      etapaSel = b.dataset.etapa;
      try { sessionStorage.setItem(CLAVE_ETAPA, etapaSel); } catch { /* sin almacenamiento */ }
      inicio();
    }));
    $$("[data-equipo]", app).forEach((b) => (b.onclick = () => calificar(etapaSel, b.dataset.equipo)));
  }

  // =========================================================
  // CALIFICAR
  // =========================================================
  function calificar(etapaId, equipoId) {
    const et = etapaDatos(etapaId);
    const n = et.equipos.findIndex((e) => e.id === equipoId);
    const e = et.equipos[n];
    const previa = calDe(etapaId, equipoId);
    const soloLeer = !et.abierta;
    const elegidos = { ...(previa?.puntajes || {}) };
    const dis = soloLeer ? "disabled" : "";
    document.title = `${e.nombre_proyecto} · Calificar · ISC UTP`;

    marco(`
      <button class="volver" data-volver>${I.atras}Volver a la lista</button>
      <section class="tarjeta jur-cal-cab">
        <span class="jur-hero__sobre">Turno ${turno(e, n)} · ${esc(et.nombre)}</span>
        <h1>${esc(e.nombre_proyecto)}</h1>
        <p>${esc(ejeDe(e.eje)?.nombre || "")}${e.ods ? ` · ${esc(e.ods)}` : ""}</p>
        <div class="jur-hero__chips">${e.integrantes.map((i) => `<span class="chip ${i.es_lider ? "chip--ambar" : ""}">${i.es_lider ? "★ " : ""}${esc(i.nombre)}${tipoCorto(i.tipo) ? ` · ${esc(tipoCorto(i.tipo))}` : ""}</span>`).join("")}</div>
        <div class="jur-archivos">${(() => {
          const a = e.archivos || {};
          const url = (t) => (a[`${t}_ruta`] ? api.urlArchivo(a[`${t}_ruta`]) : null);
          const b = [];
          if (url("pdf")) b.push(`<a class="btn btn--mini btn--naranja" href="${esc(url("pdf"))}" target="_blank" rel="noopener">${I.pizarra}Ver PDF</a>`);
          if (url("ppt")) b.push(`<a class="btn btn--mini" href="${esc(url("ppt"))}" target="_blank" rel="noopener">${I.descargar}Bajar PPT</a>`);
          if (url("video")) b.push(`<a class="btn btn--mini" href="${esc(url("video"))}" target="_blank" rel="noopener">${I.camara}Ver video</a>`);
          return b.length ? b.join("") : `<span class="ayuda">${I.info} El equipo aún no subió su presentación.</span>`;
        })()}</div>
      </section>
      ${soloLeer ? `<div class="cerrado">${I.candado}<span>La calificación de esta etapa está cerrada: solo puedes ver${previa ? " lo que guardaste" : ""}.</span></div>` : ""}
      ${previa ? `<p class="nota">Ya calificaste a este equipo${previa.no_presento ? " como «No se presentó»" : ` con <b>${previa.total} pts</b>`}. ${soloLeer ? "" : "Puedes corregir y volver a guardar."}</p>` : ""}
      <form data-form novalidate>
        <label class="check jur-np"><input type="checkbox" name="no_presento" ${previa?.no_presento ? "checked" : ""} ${dis}>
          <span><b>El equipo no se presentó</b><small>Walkover: su puntaje será 0 y no hace falta calificar los criterios.</small></span></label>
        <div data-criterios>
          ${CRITERIOS.map((c, ci) => `
          <section class="criterio criterio--niveles" data-criterio="${c.id}">
            <div class="criterio__cab">
              <div>
                <h4>${ci + 1}. ${esc(c.nombre)} <small class="adm-sub">${c.max} pts</small></h4>
                <p class="criterio__desc">${esc(c.que)}</p>
                <details class="rub-guia"><summary>Preguntas guía</summary><ul>${c.guia.map((g) => `<li>${esc(g)}</li>`).join("")}</ul></details>
              </div>
              <div class="criterio__valor" data-valor>—<small> / ${c.max}</small></div>
            </div>
            <div class="jur-cal-der">
              <div class="niveles" role="radiogroup" aria-label="${esc(c.nombre)}">
                ${c.niveles.map((d, i) => `<button type="button" class="nivel nivel--${i}" role="radio" data-pts="${c.puntos[i]}" aria-pressed="${elegidos[c.id] === c.puntos[i]}" aria-checked="${elegidos[c.id] === c.puntos[i]}" ${dis}>
                  <span class="nivel__nombre">${NIVELES[i]}</span><span class="nivel__desc">${esc(d)}</span><span class="nivel__pts">${c.puntos[i]}</span></button>`).join("")}
              </div>
              <label class="campo"><span>Justificación *</span>
                <textarea name="just_${c.id}" rows="2" maxlength="600" placeholder="¿Por qué este nivel? (una o dos frases)" ${dis}>${esc(previa?.justificaciones?.[c.id] || "")}</textarea></label>
            </div>
          </section>`).join("")}
        </div>
        <label class="campo jur-comentario"><span>Comentario general para el equipo *</span>
          <textarea name="comentario" rows="4" maxlength="1500" placeholder="Fortalezas, qué mejorar y recomendaciones. El equipo lo verá en su panel." ${dis}>${esc(previa?.comentario || "")}</textarea></label>
        <div class="enviar">
          <div class="enviar__total" data-total>0<small> / ${TOTAL}</small></div>
          <div class="enviar__info"><div class="progreso"><i data-barra style="width:0%"></i></div><span data-falta></span></div>
          ${soloLeer ? "" : `<button class="btn btn--naranja" data-guardar>${I.check}Guardar calificación</button>`}
        </div>
        <p class="error" aria-live="polite" style="text-align:center"></p>
      </form>`);

    const form = $("[data-form]", app);
    const err = $(".error", form);
    const np = form.elements.no_presento;

    function refrescar() {
      const noPres = np.checked;
      $("[data-criterios]", form).hidden = noPres;
      let total = 0, listos = 0;
      for (const c of CRITERIOS) {
        const caja = $(`[data-criterio="${c.id}"]`, form);
        const v = elegidos[c.id];
        const just = form.elements[`just_${c.id}`].value.trim();
        $("[data-valor]", caja).innerHTML = `${v ?? "—"}<small> / ${c.max}</small>`;
        $("[data-valor]", caja).classList.toggle("vacio-v", v == null);
        const ok = v != null && !!just;
        caja.classList.toggle("criterio--listo", ok);
        if (v != null) total += v;
        if (ok) listos++;
      }
      const comentarioOk = !!form.elements.comentario.value.trim();
      if (noPres) {
        $("[data-total]", form).innerHTML = `0<small> / ${TOTAL}</small>`;
        $("[data-barra]", form).style.width = "100%";
        $("[data-falta]", form).textContent = "No se presentó: puntaje 0.";
      } else {
        $("[data-total]", form).innerHTML = `${total}<small> / ${TOTAL}</small>`;
        $("[data-barra]", form).style.width = `${Math.round(((listos + (comentarioOk ? 1 : 0)) / (CRITERIOS.length + 1)) * 100)}%`;
        const falta = CRITERIOS.length - listos;
        $("[data-falta]", form).textContent = falta || !comentarioOk
          ? `Falta: ${[falta ? `${falta} criterio(s) con nivel y justificación` : "", comentarioOk ? "" : "el comentario general"].filter(Boolean).join(" y ")}.`
          : "Todo listo para guardar.";
      }
    }

    form.addEventListener("click", (ev) => {
      const b = ev.target.closest(".nivel");
      if (!b || b.disabled) return;
      const caja = b.closest("[data-criterio]");
      elegidos[caja.dataset.criterio] = Number(b.dataset.pts);
      $$(".nivel", caja).forEach((x) => { const si = x === b; x.setAttribute("aria-pressed", si); x.setAttribute("aria-checked", si); });
      sucio = true;
      refrescar();
    });
    form.addEventListener("input", () => { sucio = true; refrescar(); });
    form.addEventListener("change", () => { sucio = true; refrescar(); });

    $("[data-volver]", app).onclick = async () => {
      if (sucio && !(await confirmar("¿Volver sin guardar?", "Tienes cambios sin guardar en esta calificación.", { boton: "Volver sin guardar", peligro: true }))) return;
      inicio();
      window.scrollTo?.(0, 0);
    };

    form.onsubmit = async (ev) => {
      ev.preventDefault();
      if (soloLeer) return;
      err.textContent = "";
      const noPres = np.checked;
      const justificaciones = {};
      for (const c of CRITERIOS) justificaciones[c.id] = form.elements[`just_${c.id}`].value.trim();
      const comentario = form.elements.comentario.value.trim();
      if (!noPres) {
        const sinNivel = CRITERIOS.find((c) => elegidos[c.id] == null);
        if (sinNivel) { err.textContent = `Elige un nivel para «${sinNivel.nombre}».`; $(`[data-criterio="${sinNivel.id}"]`, form).scrollIntoView?.({ behavior: "smooth", block: "center" }); return; }
        const sinJust = CRITERIOS.find((c) => !justificaciones[c.id]);
        if (sinJust) { err.textContent = `Escribe la justificación de «${sinJust.nombre}».`; form.elements[`just_${sinJust.id}`].focus(); return; }
        if (!comentario) { err.textContent = "Escribe el comentario general para el equipo."; form.elements.comentario.focus(); return; }
      } else if (!previa?.no_presento) {
        const ok = await confirmar("¿Marcar «No se presentó»?", `«${esc(e.nombre_proyecto)}» quedará con <b>0 puntos</b> en tu calificación.`, { boton: "Sí, no se presentó", peligro: true });
        if (!ok) return;
      }
      const btn = $("[data-guardar]", form);
      btn.disabled = true;
      try {
        const r = await api.calificar(s.codigo, {
          etapa: etapaId, equipo_id: equipoId, no_presento: noPres, comentario,
          puntajes: noPres ? {} : Object.fromEntries(CRITERIOS.map((c) => [c.id, elegidos[c.id]])),
          justificaciones: noPres ? {} : justificaciones,
        });
        datos.calificaciones = datos.calificaciones.filter((x) => !(x.etapa === etapaId && x.equipo_id === equipoId)).concat(r);
        sucio = false;
        aviso(noPres ? "Guardado: no se presentó" : `Calificación guardada · ${r.total} pts`);
        const pend = et.equipos.filter((q) => !calDe(etapaId, q.id)).length;
        if (!pend) { lanzarConfeti(); aviso(`¡Listo! Calificaste a todos los equipos de la ${etapaDe(etapaId)?.corto || "etapa"}.`); }
        inicio();
        window.scrollTo?.(0, 0);
      } catch (ex) {
        err.textContent = ex.message;
      } finally { btn.disabled = false; }
    };

    refrescar();
    window.scrollTo?.(0, 0);
  }

  cargar();
}
