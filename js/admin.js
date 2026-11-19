// =========================================================
// Panel ISC UTP 2027 · Administrador
// Pestañas: Equipos (con integrantes), Jurados, Rúbrica y Ajustes.
// Todo lo que se guarda pasa por la base, que vuelve a revisar
// el código del admin y las reglas (2 a 5 integrantes, etc.).
// =========================================================
import { api, ES_DEMO, demoDatos } from "./api.js?v=202611190633";
import { $, esc, I, avatar, aviso, modal, confirmar, fondoAnimado } from "./ui.js?v=202611190633";
import { ETAPAS, EJES, TIPOS_INTEGRANTE, EQUIPO_REGLAS, validarIntegrantes, textoTiempos, eje as ejeDe } from "./rubrica.js?v=202611190633";
import { pestanaResultados, pestanaPresentaciones } from "./admin-etapas.js?v=202611190633";

const PESTANAS = [
  { id: "equipos", nombre: "Equipos", icono: "personas" },
  { id: "jurados", nombre: "Jurados", icono: "mazo" },
  { id: "presentaciones", nombre: "Presentaciones", icono: "pizarra" },
  { id: "resultados", nombre: "Resultados", icono: "tabla" },
  { id: "rubrica", nombre: "Rúbrica", icono: "libro" },
  { id: "ajustes", nombre: "Ajustes", icono: "llave" },
];
const CLAVE_PEST = "isc-utp-admin-pestana";
const ZONA = "America/Lima";

// ---------- utilidades ----------
const fechaLarga = (iso) => (iso ? new Date(iso).toLocaleString("es-PE", { timeZone: ZONA, weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" }) : "Sin fecha");
const fechaCorta = (iso) => (iso ? new Date(iso).toLocaleString("es-PE", { timeZone: ZONA, weekday: "short", day: "2-digit", month: "2-digit", hour: "numeric", minute: "2-digit" }) : "—");
// ISO → "AAAA-MM-DDTHH:MM" en hora de Perú (para <input type="datetime-local">)
const aInputLima = (iso) => (iso ? new Date(iso).toLocaleString("sv-SE", { timeZone: ZONA }).replace(" ", "T").slice(0, 16) : "");
const desdeInputLima = (v) => (v ? `${v}:00-05:00` : "");
const urlPanel = () => `${location.origin}${location.pathname}`;
const nombreCompleto = (i) => `${i.nombres || ""} ${i.apellidos || ""}`.trim();
const tipoNombre = (id) => TIPOS_INTEGRANTE.find((t) => t.id === id)?.nombre || id;

async function copiar(texto, msg = "Copiado") {
  try { await navigator.clipboard.writeText(texto); aviso(msg); }
  catch { aviso(`No se pudo copiar automáticamente. Cópialo a mano: ${texto}`, "error"); }
}

function jsDeEtapa(datos, etapaId) { return datos.jurados.filter((j) => (j.etapas || []).includes(etapaId)); }

// =========================================================
export function panelAdmin(app, s, h) {
  let datos = null;
  let pest = (() => { try { return sessionStorage.getItem(CLAVE_PEST) || "equipos"; } catch { return "equipos"; } })();
  if (!PESTANAS.some((p) => p.id === pest)) pest = "equipos";

  document.title = "Panel del administrador · ISC UTP";
  app.innerHTML = `
  ${fondoAnimado(10)}
  <header class="barra">
    ${h.marcaISC("Panel del administrador")}
    <div class="der">
      <button class="btn btn--mini" data-recargar title="Actualizar">${I.girar}<span>Actualizar</span></button>
      <button class="btn btn--mini" data-salir>${I.salir}<span>Salir</span></button>
    </div>
  </header>
  <main class="contenedor adm">
    <div class="adm-hola">
      <h1>Hola, ${esc(s.nombre || "Administrador")}</h1>
      <p>Registra los equipos y los jurados. Cada uno recibe su <b>código</b> para entrar al panel.</p>
    </div>
    <div class="kpis" data-kpis></div>
    <nav class="pestanas" role="tablist" data-pestanas></nav>
    <section data-cuerpo aria-live="polite"><p class="vacio">Cargando…</p></section>
  </main>
  ${h.bandaDemo()}`;

  const cuerpo = $("[data-cuerpo]", app);
  $("[data-salir]", app).onclick = h.salir;
  $("[data-recargar]", app).onclick = () => cargar(true);

  async function cargar(conAviso = false) {
    try {
      datos = await api.adminResumen(s.codigo);
      pintar();
      if (conAviso) aviso("Datos actualizados");
    } catch (ex) {
      cuerpo.innerHTML = `<div class="vacio"><b>No se pudieron cargar los datos</b>${esc(ex.message)}
        <div style="margin-top:14px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
          <button class="btn" data-reintentar>${I.girar}Reintentar</button>
          <button class="btn" data-salir2>${I.salir}Salir</button></div></div>`;
      $("[data-reintentar]", cuerpo).onclick = () => cargar();
      $("[data-salir2]", cuerpo).onclick = h.salir;
    }
  }

  // ---------- Encabezado: números y pestañas ----------
  function pintarKpis() {
    const nInt = datos.equipos.reduce((t, e) => t + (e.integrantes?.length || 0), 0);
    const kpiEtapa = (et) => {
      const n = jsDeEtapa(datos, et.id).length;
      const falta = Math.max(0, et.jurados - n);
      return `<div class="kpi ${falta ? "kpi--alerta" : ""}"><b>${n}<small> / ${et.jurados}</small></b>
        <span>Jurados · ${esc(et.corto)}${falta ? ` · faltan ${falta}` : " · completo"}</span></div>`;
    };
    $("[data-kpis]", app).innerHTML = `
      <div class="kpi"><b>${datos.equipos.length}</b><span>Equipos · ${nInt} integrantes</span></div>
      ${ETAPAS.map(kpiEtapa).join("")}
      <div class="kpi"><b class="kpi__txt">${esc(fechaCorta(datos.config.fecha_limite_archivos))}</b><span>Fecha límite para subir el PDF</span></div>`;
  }

  function pintarPestanas() {
    const n = { equipos: datos.equipos.length, jurados: datos.jurados.length };
    const nav = $("[data-pestanas]", app);
    nav.innerHTML = PESTANAS.map((p) => `<button class="pestana" role="tab" aria-selected="${p.id === pest}" data-pest="${p.id}">
      ${I[p.icono]}${p.nombre}${n[p.id] != null ? `<span class="n">${n[p.id]}</span>` : ""}</button>`).join("");
    nav.querySelectorAll("[data-pest]").forEach((b) => (b.onclick = () => {
      pest = b.dataset.pest;
      try { sessionStorage.setItem(CLAVE_PEST, pest); } catch { /* sin almacenamiento */ }
      pintar();
    }));
  }

  const estado = {};
  function pintar() {
    pintarKpis();
    pintarPestanas();
    estado.pestana = pest;
    if (pest === "equipos") pintarEquipos();
    else if (pest === "jurados") pintarJurados();
    else if (pest === "resultados") pestanaResultados(cuerpo, s, estado);
    else if (pest === "presentaciones") pestanaPresentaciones(cuerpo, s, estado, datos, () => cargar());
    else if (pest === "rubrica") cuerpo.innerHTML = h.htmlRubrica();
    else pintarAjustes();
  }

  // =========================================================
  // EQUIPOS
  // =========================================================
  function pintarEquipos() {
    const bloq = datos.config.integrantes_bloqueados;
    const tarjetas = datos.equipos.map((e, n) => {
      const ints = e.integrantes || [];
      const lider = ints.find((i) => i.es_lider);
      const ext = ints.filter((i) => i.tipo === "externo").length;
      const egr = ints.filter((i) => i.tipo === "egresado").length;
      return `<article class="jurado adm-eq">
        <div class="jurado__cab">
          <span class="avatar adm-eq__n">${String(n + 1).padStart(2, "0")}</span>
          <div style="min-width:0"><h4>${esc(e.nombre_proyecto)}</h4>
            <p>${esc(ejeDe(e.eje)?.nombre || "Sin eje")}${e.ods ? ` · ${esc(e.ods)}` : ""}</p></div>
        </div>
        <div class="jurado__chips">
          <span class="chip ${ints.length >= EQUIPO_REGLAS.min ? "chip--verde" : "chip--rojo"}">${I.personas}${ints.length} integrantes</span>
          ${ext ? `<span class="chip chip--celeste">1 externo</span>` : ""}
          ${egr ? `<span class="chip chip--celeste">1 egresado</span>` : ""}
          ${e.calificaciones ? `<span class="chip chip--ambar">${e.calificaciones} calificación(es)</span>` : ""}
        </div>
        <ul class="adm-eq__ints">${ints.map((i) => `<li>${i.es_lider ? `<b title="Líder">★ ${esc(nombreCompleto(i))}</b>` : esc(nombreCompleto(i))}
          ${i.tipo !== "utp" ? `<small>${esc(tipoNombre(i.tipo))}</small>` : ""}</li>`).join("")}</ul>
        ${lider?.correo || lider?.celular ? `<p class="ayuda">Líder: ${esc([lider.correo, lider.celular].filter(Boolean).join(" · "))}</p>` : ""}
        <div class="jurado__codigo"><code>${esc(e.codigo)}</code>
          <button class="btn btn--mini btn--icono" data-acc="copiar" data-txt="${esc(e.codigo)}" aria-label="Copiar código" title="Copiar código">${I.copiar}</button></div>
        <div class="jurado__acc">
          <button class="btn btn--mini" data-acc="editar-equipo" data-id="${e.id}">${I.lapiz}Editar</button>
          <button class="btn btn--mini" data-acc="invitar-equipo" data-id="${e.id}">${I.copiar}Mensaje</button>
          <button class="btn btn--mini" data-acc="codigo-equipo" data-id="${e.id}" title="Generar otro código">${I.girar}Código</button>
          <button class="btn btn--mini btn--peligro" data-acc="borrar-equipo" data-id="${e.id}" ${bloq ? "disabled" : ""} aria-label="Borrar equipo">${I.basura}</button>
        </div>
      </article>`;
    }).join("");

    cuerpo.innerHTML = `
      <div class="herramientas">
        <button class="btn btn--naranja" data-acc="nuevo-equipo" ${bloq ? "disabled" : ""}>${I.mas}Nuevo equipo</button>
        <div class="der">
          <button class="interruptor ${bloq ? "interruptor--cerrado" : "interruptor--abierto"}" data-acc="bloqueo"
            title="${bloq ? "Pulsa para permitir cambios de integrantes" : "Pulsa para fijar la composición (desde la Semifinal)"}">
            ${bloq ? I.candado : I.abierto}${bloq ? "Integrantes bloqueados" : "Integrantes editables"}</button>
        </div>
      </div>
      <p class="nota">Reglas: de ${EQUIPO_REGLAS.min} a ${EQUIPO_REGLAS.max} integrantes, máximo ${EQUIPO_REGLAS.maxExternos} externo a UTP y ${EQUIPO_REGLAS.maxEgresados} egresado, y un líder.
        ${bloq ? "<b>La composición está bloqueada</b>: puedes cambiar el nombre, el eje y el ODS, pero no los integrantes." : "Desde la Semifinal, bloquea los integrantes con el botón de la derecha."}</p>
      ${datos.equipos.length ? `<div class="jurados">${tarjetas}</div>`
        : `<div class="vacio"><b>Aún no hay equipos</b>Pulsa «Nuevo equipo» para registrar el primero.</div>`}`;
  }

  function filaIntegrante(i = {}, n = 1, bloq = false) {
    const dis = bloq ? "disabled" : "";
    return `<div class="adm-int" data-int data-id="${esc(i.id || "")}">
      <div class="adm-int__cab">
        <b>Integrante <span data-num>${n}</span></b>
        <label class="adm-lider"><input type="radio" name="lider" ${i.es_lider ? "checked" : ""} ${dis}> Líder</label>
        ${bloq ? "" : `<button type="button" class="btn btn--mini btn--icono" data-quitar aria-label="Quitar integrante" title="Quitar">${I.basura}</button>`}
      </div>
      <div class="adm-int__campos">
        <label class="campo"><span>Nombres *</span><input name="nombres" value="${esc(i.nombres || "")}" maxlength="80" autocomplete="off" ${dis}></label>
        <label class="campo"><span>Apellidos *</span><input name="apellidos" value="${esc(i.apellidos || "")}" maxlength="80" autocomplete="off" ${dis}></label>
        <label class="campo"><span>Correo</span><input name="correo" type="email" value="${esc(i.correo || "")}" maxlength="120" autocomplete="off" ${dis}></label>
        <label class="campo"><span>Celular</span><input name="celular" type="tel" value="${esc(i.celular || "")}" maxlength="20" autocomplete="off" ${dis}></label>
        <label class="campo"><span>Tipo</span><select name="tipo" ${dis}>${TIPOS_INTEGRANTE.map((t) => `<option value="${t.id}" ${t.id === (i.tipo || "utp") ? "selected" : ""}>${esc(t.nombre)}</option>`).join("")}</select></label>
      </div>
    </div>`;
  }

  function formEquipo(e = null) {
    const bloq = datos.config.integrantes_bloqueados;
    const ints = e ? e.integrantes || [] : [{ es_lider: true }, {}];
    const m = modal(`
      <h2>${e ? "Editar equipo" : "Nuevo equipo"}</h2>
      ${e ? `<p class="ayuda">Código: <b>${esc(e.codigo)}</b></p>` : `<p class="ayuda">El código del equipo se crea solo al guardar.</p>`}
      <form class="form" novalidate>
        <label class="campo"><span>Nombre del proyecto *</span><input name="nombre_proyecto" value="${esc(e?.nombre_proyecto || "")}" maxlength="120" autofocus></label>
        <div class="adm-2col">
          <label class="campo"><span>Eje del desafío *</span><select name="eje">
            <option value="">Elige un eje…</option>
            ${EJES.map((x) => `<option value="${x.id}" ${x.id === e?.eje ? "selected" : ""}>${x.n} · ${esc(x.nombre)}</option>`).join("")}</select></label>
          <label class="campo"><span>ODS</span><input name="ods" value="${esc(e?.ods || "")}" maxlength="120" placeholder="Ej.: ODS 15 · Vida de ecosistemas terrestres"></label>
        </div>
        <div class="adm-ints-cab">
          <h3>Integrantes</h3>
          <span class="chip" data-cuenta></span>
        </div>
        ${bloq ? `<p class="nota" style="margin:0">La composición está <b>bloqueada</b>: los integrantes no se pueden cambiar. Desbloquéala en la pestaña Equipos si es necesario.</p>` : ""}
        <div class="adm-ints" data-ints>${ints.map((i, n) => filaIntegrante(i, n + 1, bloq)).join("")}</div>
        ${bloq ? "" : `<button type="button" class="btn" data-agregar>${I.mas}Agregar integrante</button>`}
        <p class="error" aria-live="polite"></p>
        <div class="modal__acciones">
          <button type="button" class="btn" data-cancelar>Cancelar</button>
          <button class="btn btn--naranja" data-guardar>${I.check}Guardar equipo</button>
        </div>
      </form>`, { ancho: true });
    m.el.classList.add("adm-modal-eq");
    const form = $("form", m.el);
    const lista = $("[data-ints]", m.el);
    const err = $(".error", m.el);

    const leer = () => [...lista.querySelectorAll("[data-int]")].map((f) => ({
      id: f.dataset.id || null,
      nombres: f.querySelector('[name="nombres"]').value.trim(),
      apellidos: f.querySelector('[name="apellidos"]').value.trim(),
      correo: f.querySelector('[name="correo"]').value.trim(),
      celular: f.querySelector('[name="celular"]').value.trim(),
      tipo: f.querySelector('[name="tipo"]').value,
      es_lider: f.querySelector('[name="lider"]').checked,
    }));
    const actualizar = () => {
      const l = leer();
      lista.querySelectorAll("[data-num]").forEach((x, n) => (x.textContent = n + 1));
      const ext = l.filter((i) => i.tipo === "externo").length;
      const egr = l.filter((i) => i.tipo === "egresado").length;
      const ok = l.length >= EQUIPO_REGLAS.min && l.length <= EQUIPO_REGLAS.max && ext <= 1 && egr <= 1;
      const cuenta = $("[data-cuenta]", m.el);
      cuenta.className = `chip ${ok ? "chip--verde" : "chip--ambar"}`;
      cuenta.textContent = `${l.length} de ${EQUIPO_REGLAS.max} · ${ext} externo · ${egr} egresado`;
      const agregar = $("[data-agregar]", m.el);
      if (agregar) agregar.disabled = l.length >= EQUIPO_REGLAS.max;
    };
    lista.addEventListener("input", actualizar);
    lista.addEventListener("change", actualizar);
    lista.addEventListener("click", (ev) => {
      const q = ev.target.closest("[data-quitar]");
      if (!q) return;
      const fila = q.closest("[data-int]");
      const eraLider = fila.querySelector('[name="lider"]').checked;
      fila.remove();
      if (eraLider) { const r = lista.querySelector('[name="lider"]'); if (r) r.checked = true; }
      actualizar();
    });
    const agregar = $("[data-agregar]", m.el);
    if (agregar) agregar.onclick = () => {
      const n = lista.querySelectorAll("[data-int]").length;
      if (n >= EQUIPO_REGLAS.max) return;
      lista.insertAdjacentHTML("beforeend", filaIntegrante({ es_lider: n === 0 }, n + 1));
      lista.lastElementChild.querySelector('[name="nombres"]').focus();
      actualizar();
    };
    actualizar();
    $("[data-cancelar]", m.el).onclick = () => m.cerrar();

    form.onsubmit = async (ev) => {
      ev.preventDefault();
      err.textContent = "";
      const d = {
        id: e?.id || null,
        nombre_proyecto: form.elements.nombre_proyecto.value.trim(),
        eje: form.elements.eje.value,
        ods: form.elements.ods.value.trim(),
        integrantes: leer(),
      };
      if (!d.nombre_proyecto) { err.textContent = "Escribe el nombre del proyecto."; form.elements.nombre_proyecto.focus(); return; }
      if (!d.eje) { err.textContent = "Elige el eje del desafío."; form.elements.eje.focus(); return; }
      if (!bloq) { const v = validarIntegrantes(d.integrantes); if (v) { err.textContent = v; return; } }
      const btn = $("[data-guardar]", m.el);
      btn.disabled = true;
      try {
        const r = await api.guardarEquipo(s.codigo, d);
        m.cerrar();
        aviso(e ? "Equipo actualizado" : `Equipo creado · código ${r.codigo}`);
        await cargar();
      } catch (ex) { err.textContent = ex.message; }
      finally { btn.disabled = false; }
    };
  }

  // =========================================================
  // JURADOS
  // =========================================================
  function pintarJurados() {
    const chips = ETAPAS.map((et) => {
      const n = jsDeEtapa(datos, et.id).length;
      const cls = n === et.jurados ? "chip--verde" : n > et.jurados ? "chip--ambar" : "chip--rojo";
      return `<span class="chip ${cls}">${esc(et.corto)}: ${n} de ${et.jurados}</span>`;
    }).join("");
    const tarjeta = (j) => `<article class="jurado">
      <div class="jurado__cab">${avatar(j.nombre, j.foto_url)}
        <div style="min-width:0"><h4>${esc(j.nombre)}</h4>${j.descripcion ? `<p>${esc(j.descripcion)}</p>` : ""}</div></div>
      <div class="jurado__chips">
        ${ETAPAS.filter((et) => (j.etapas || []).includes(et.id)).map((et) => `<span class="chip ${et.id === "final" ? "chip--ambar" : "chip--celeste"}">${esc(et.corto)} · ${esc(et.dia)}</span>`).join("")}
        ${j.calificaciones ? `<span class="chip chip--verde">${j.calificaciones} calificación(es)</span>` : ""}
        ${j.linkedin ? `<a class="chip" href="${esc(j.linkedin)}" target="_blank" rel="noopener">LinkedIn</a>` : ""}
      </div>
      <div class="jurado__codigo"><code>${esc(j.codigo)}</code>
        <button class="btn btn--mini btn--icono" data-acc="copiar" data-txt="${esc(j.codigo)}" aria-label="Copiar código" title="Copiar código">${I.copiar}</button></div>
      <div class="jurado__acc">
        <button class="btn btn--mini" data-acc="editar-jurado" data-id="${j.id}">${I.lapiz}Editar</button>
        <button class="btn btn--mini" data-acc="invitar-jurado" data-id="${j.id}">${I.copiar}Mensaje</button>
        <button class="btn btn--mini" data-acc="codigo-jurado" data-id="${j.id}" title="Generar otro código">${I.girar}Código</button>
        <button class="btn btn--mini btn--peligro" data-acc="borrar-jurado" data-id="${j.id}" aria-label="Borrar jurado">${I.basura}</button>
      </div>
    </article>`;

    const grupos = ETAPAS.map((et) => {
      const lista = jsDeEtapa(datos, et.id);
      return `<h2 class="seccion-titulo">${esc(et.nombre)} · ${esc(et.dia)} <small class="adm-sub">${lista.length} de ${et.jurados} jurados</small></h2>
        ${lista.length ? `<div class="jurados">${lista.map(tarjeta).join("")}</div>`
          : `<div class="vacio"><b>Sin jurados para la ${esc(et.corto)}</b>Pulsa «Nuevo jurado» y marca la ${esc(et.corto)}.</div>`}`;
    }).join("");

    cuerpo.innerHTML = `
      <div class="herramientas">
        <button class="btn btn--naranja" data-acc="nuevo-jurado">${I.mas}Nuevo jurado</button>
        <div class="der">${chips}</div>
      </div>
      <p class="nota">Se esperan <b>4 jurados en la Semifinal y 4 en la Final</b>. Si alguien califica en las dos etapas, márcalo en ambas: aparecerá en los dos grupos.</p>
      ${datos.jurados.length ? grupos : `<div class="vacio"><b>Aún no hay jurados</b>Pulsa «Nuevo jurado» para registrar el primero.</div>`}`;
  }

  function formJurado(j = null) {
    const m = modal(`
      <h2>${j ? "Editar jurado" : "Nuevo jurado"}</h2>
      ${j ? `<p class="ayuda">Código: <b>${esc(j.codigo)}</b></p>` : `<p class="ayuda">El código del jurado se crea solo al guardar.</p>`}
      <form class="form" novalidate>
        <label class="campo"><span>Nombre completo *</span><input name="nombre" value="${esc(j?.nombre || "")}" maxlength="120" autofocus></label>
        <div class="campo"><span>¿En qué etapa califica? *</span>
          <div class="checks">${ETAPAS.map((et) => {
            const n = jsDeEtapa(datos, et.id).filter((x) => x.id !== j?.id).length;
            const marcado = j ? (j.etapas || []).includes(et.id) : false;
            return `<label class="check"><input type="checkbox" name="etapas" value="${et.id}" ${marcado ? "checked" : ""}>
              <span>${esc(et.nombre)}<small>${esc(et.dia)} · ya tiene ${n} de ${et.jurados}</small></span></label>`;
          }).join("")}</div></div>
        <label class="campo"><span>Descripción (opcional)</span><textarea name="descripcion" maxlength="400" placeholder="Cargo, empresa o experiencia. La verán sus colegas.">${esc(j?.descripcion || "")}</textarea></label>
        <div class="adm-2col">
          <label class="campo"><span>Foto (enlace, opcional)</span><input name="foto_url" type="url" value="${esc(j?.foto_url || "")}" placeholder="https://…"></label>
          <label class="campo"><span>LinkedIn (opcional)</span><input name="linkedin" type="url" value="${esc(j?.linkedin || "")}" placeholder="https://www.linkedin.com/in/…"></label>
        </div>
        <p class="error" aria-live="polite"></p>
        <div class="modal__acciones">
          <button type="button" class="btn" data-cancelar>Cancelar</button>
          <button class="btn btn--naranja" data-guardar>${I.check}Guardar jurado</button>
        </div>
      </form>`, { ancho: true });
    const form = $("form", m.el);
    const err = $(".error", m.el);
    $("[data-cancelar]", m.el).onclick = () => m.cerrar();
    form.onsubmit = async (ev) => {
      ev.preventDefault();
      err.textContent = "";
      const d = {
        id: j?.id || null,
        nombre: form.elements.nombre.value.trim(),
        etapas: [...form.querySelectorAll('[name="etapas"]:checked')].map((x) => x.value),
        descripcion: form.elements.descripcion.value.trim(),
        foto_url: form.elements.foto_url.value.trim(),
        linkedin: form.elements.linkedin.value.trim(),
      };
      if (!d.nombre) { err.textContent = "Escribe el nombre del jurado."; form.elements.nombre.focus(); return; }
      if (!d.etapas.length) { err.textContent = "Elige en qué etapa califica (Semifinal, Final o ambas)."; return; }
      for (const u of [d.foto_url, d.linkedin]) {
        if (u && !/^https?:\/\//i.test(u)) { err.textContent = "Los enlaces deben empezar con https://"; return; }
      }
      const btn = $("[data-guardar]", m.el);
      btn.disabled = true;
      try {
        const r = await api.guardarJurado(s.codigo, d);
        m.cerrar();
        aviso(j ? "Jurado actualizado" : `Jurado creado · código ${r.codigo}`);
        const llenos = ETAPAS.filter((et) => d.etapas.includes(et.id) && jsDeEtapa(datos, et.id).filter((x) => x.id !== j?.id).length >= et.jurados);
        if (llenos.length) aviso(`Ojo: la ${llenos.map((x) => x.corto).join(" y la ")} ya tenía ${llenos[0].jurados} jurados.`, "error");
        await cargar();
      } catch (ex) { err.textContent = ex.message; }
      finally { btn.disabled = false; }
    };
  }

  // =========================================================
  // AJUSTES
  // =========================================================
  function pintarAjustes() {
    const c = datos.config;
    cuerpo.innerHTML = `
      <div class="adm-ajustes">
        <section class="tarjeta adm-caja">
          <h2>${I.mazo}Calificación del jurado</h2>
          <p class="ayuda">Ábrela al empezar cada etapa y ciérrala al terminar. Con la etapa cerrada, los jurados solo pueden ver.</p>
          ${(datos.etapas || []).map((et) => `<div class="adm-etapa">
            <span><b>${esc(et.nombre)}</b><small>${et.calificaciones || 0} calificación(es) guardada(s)</small></span>
            <button class="interruptor ${et.abierta ? "interruptor--abierto" : "interruptor--cerrado"}" data-acc="etapa" data-id="${et.id}">
              ${et.abierta ? I.abierto : I.candado}${et.abierta ? "Abierta" : "Cerrada"}</button></div>`).join("")}
        </section>

        <section class="tarjeta adm-caja">
          <h2>${I.pizarra}Código de proyección</h2>
          <p class="ayuda">Para la laptop de la sala (o quien comparta pantalla en el Zoom de la Semifinal). Entra por la puerta «Proyección».</p>
          <div class="jurado__codigo"><code>${esc(c.codigo_proyeccion || "—")}</code>
            <button class="btn btn--mini btn--icono" data-acc="copiar" data-txt="${esc(c.codigo_proyeccion || "")}" aria-label="Copiar código">${I.copiar}</button></div>
          <button class="btn btn--mini" data-acc="codigo-proyeccion">${I.girar}Generar otro código</button>
        </section>

        <section class="tarjeta adm-caja">
          <h2>${I.reloj}Tiempos por equipo</h2>
          <p class="ayuda">Ahora: <b data-tiempos>${esc(textoTiempos({ pitch: c.min_pitch, preguntas: c.min_preguntas }))}</b> · ${c.min_cambio} min de cambio.</p>
          <form class="form" data-form-tiempos>
            <div class="adm-3col">
              <label class="campo"><span>Pitch (min)</span><input name="min_pitch" type="number" min="1" max="30" value="${c.min_pitch}"></label>
              <label class="campo"><span>Preguntas (min)</span><input name="min_preguntas" type="number" min="1" max="30" value="${c.min_preguntas ?? ""}" ${c.min_preguntas == null ? "disabled" : ""} placeholder="Sin límite"></label>
              <label class="campo"><span>Cambio (min)</span><input name="min_cambio" type="number" min="0" max="10" value="${c.min_cambio}"></label>
            </div>
            <label class="check"><input type="checkbox" name="sin_limite" ${c.min_preguntas == null ? "checked" : ""}><span>Preguntas sin límite de tiempo<small>El cronómetro de preguntas contará hacia arriba, sin alarma.</small></span></label>
            <div><button class="btn btn--naranja">${I.check}Guardar tiempos</button></div>
          </form>
        </section>

        <section class="tarjeta adm-caja">
          <h2>${I.candado}Fecha límite para subir el PDF</h2>
          <p class="ayuda">Ahora: <b>${esc(fechaLarga(c.fecha_limite_archivos))}</b> (hora de Perú).</p>
          <form class="form" data-form-fecha>
            <label class="campo"><span>Nueva fecha y hora (Perú)</span><input name="fecha" type="datetime-local" value="${aInputLima(c.fecha_limite_archivos)}"></label>
            <div><button class="btn btn--naranja">${I.check}Guardar fecha</button></div>
          </form>
        </section>

        <section class="tarjeta adm-caja adm-peligro">
          <h2>${I.basura}Limpieza de datos de prueba</h2>
          <p class="ayuda">Úsalo después de los ensayos. Se guarda una copia en el historial de borrados. No toca tu código de admin ni estos ajustes.</p>
          <div class="adm-etapa">
            <span><b>Eliminar resultados</b><small>Borra las calificaciones. Equipos y jurados se quedan.</small></span>
            <select class="select adm-sel" data-etapa-borrar aria-label="Etapa">
              <option value="todas">Todas</option>${ETAPAS.map((et) => `<option value="${et.id}">${esc(et.corto)}</option>`).join("")}
            </select>
          </div>
          <button class="btn btn--peligro" data-acc="eliminar-resultados">${I.basura}Eliminar resultados</button>
          <div class="adm-etapa">
            <span><b>Borrar todo</b><small>Equipos, integrantes, jurados y resultados. La base queda limpia para el evento.</small></span>
          </div>
          <button class="btn btn--peligro" data-acc="borrar-todo">${I.alerta}Borrar todo</button>
        </section>

        ${ES_DEMO ? `<section class="tarjeta adm-caja">
          <h2>${I.girar}Datos de prueba</h2>
          <p class="ayuda">Solo en modo de prueba: vuelve a los equipos y jurados de ejemplo.</p>
          <button class="btn btn--peligro" data-acc="reiniciar-demo">${I.girar}Reiniciar datos de prueba</button>
        </section>` : ""}
      </div>`;

    const ft = $("[data-form-tiempos]", cuerpo);
    ft.elements.sin_limite.onchange = () => { ft.elements.min_preguntas.disabled = ft.elements.sin_limite.checked; if (!ft.elements.sin_limite.checked && !ft.elements.min_preguntas.value) ft.elements.min_preguntas.value = 4; };
    ft.onsubmit = async (ev) => {
      ev.preventDefault();
      const p = Number(ft.elements.min_pitch.value), q = ft.elements.sin_limite.checked ? null : Number(ft.elements.min_preguntas.value), cb = Number(ft.elements.min_cambio.value);
      if (!(p >= 1 && p <= 30) || (q != null && !(q >= 1 && q <= 30)) || !(cb >= 0 && cb <= 10)) { aviso("Revisa los minutos: pitch y preguntas de 1 a 30, cambio de 0 a 10.", "error"); return; }
      try { await api.adminConfig(s.codigo, { min_pitch: p, min_preguntas: q, min_cambio: cb }); aviso("Tiempos guardados"); await cargar(); }
      catch (ex) { aviso(ex.message, "error"); }
    };
    const ff = $("[data-form-fecha]", cuerpo);
    ff.onsubmit = async (ev) => {
      ev.preventDefault();
      if (!ff.elements.fecha.value) { aviso("Elige la fecha y la hora.", "error"); return; }
      try { await api.adminConfig(s.codigo, { fecha_limite_archivos: desdeInputLima(ff.elements.fecha.value) }); aviso("Fecha límite guardada"); await cargar(); }
      catch (ex) { aviso(ex.message, "error"); }
    };
  }

  // =========================================================
  // Acciones comunes (copiar, borrar, nuevo código…)
  // =========================================================
  function pedirBorrado(titulo, texto) {
    return new Promise((res) => {
      const m = modal(`<h2>${esc(titulo)}</h2><p style="color:var(--niebla);margin:0">${texto}</p>
        <form class="form">
          <label class="campo"><span>Motivo (opcional)</span><input name="motivo" maxlength="200" placeholder="Ej.: se retiró de la competencia"></label>
          <div class="modal__acciones"><button type="button" class="btn" data-no>Cancelar</button>
            <button class="btn btn--peligro">${I.basura}Borrar</button></div>
        </form>`, { alCerrar: () => res(null) });
      $("[data-no]", m.el).onclick = () => m.cerrar();
      $("form", m.el).onsubmit = (ev) => { ev.preventDefault(); const v = $("[name=motivo]", m.el).value.trim(); res({ motivo: v }); m.cerrar(); };
    });
  }

  const busca = (lista, id) => lista.find((x) => x.id === id);

  // Pide escribir una palabra exacta para confirmar algo que borra mucho
  function pedirPalabra(titulo, texto, palabra, boton) {
    return new Promise((res) => {
      const m = modal(`<h2>${esc(titulo)}</h2><p style="color:var(--niebla);margin:0">${texto}</p>
        <form class="form">
          <label class="campo"><span>Escribe <b>${esc(palabra)}</b> para confirmar</span>
            <input name="palabra" autocomplete="off" autocapitalize="characters" spellcheck="false" autofocus></label>
          <p class="error" aria-live="polite"></p>
          <div class="modal__acciones"><button type="button" class="btn" data-no>Cancelar</button>
            <button class="btn btn--peligro">${I.basura}${esc(boton)}</button></div>
        </form>`, { alCerrar: () => res(null) });
      $("[data-no]", m.el).onclick = () => m.cerrar();
      $("form", m.el).onsubmit = (ev) => {
        ev.preventDefault();
        const v = $("[name=palabra]", m.el).value.trim().replace(/\s+/g, " ").toUpperCase();
        if (v !== palabra) { $(".error", m.el).textContent = `Escribe exactamente ${palabra}.`; return; }
        res(v); m.cerrar();
      };
    });
  }

  cuerpo.addEventListener("click", async (ev) => {
    const b = ev.target.closest("[data-acc]");
    if (!b || b.disabled) return;
    const id = b.dataset.id;
    const acc = b.dataset.acc;
    try {
      if (acc === "copiar") return copiar(b.dataset.txt, `Código copiado: ${b.dataset.txt}`);
      if (acc === "nuevo-equipo") return formEquipo();
      if (acc === "editar-equipo") return formEquipo(busca(datos.equipos, id));
      if (acc === "nuevo-jurado") return formJurado();
      if (acc === "editar-jurado") return formJurado(busca(datos.jurados, id));

      if (acc === "invitar-jurado") {
        const j = busca(datos.jurados, id);
        const etapas = ETAPAS.filter((et) => (j.etapas || []).includes(et.id)).map((et) => `${et.nombre} (${et.dia}, ${et.hora})`).join(" y ");
        return copiar(`Hola, ${j.nombre}. Gracias por ser jurado de la ISC UTP 2027 · Programa Local UTP.\n\nCalificarás en: ${etapas}.\n\n1. Entra a ${urlPanel()}\n2. Pulsa «Jurado»\n3. Escribe tu código: ${j.codigo}\n\nEl código es personal, no lo compartas.`, "Mensaje para el jurado copiado");
      }
      if (acc === "invitar-equipo") {
        const e = busca(datos.equipos, id);
        const lider = (e.integrantes || []).find((i) => i.es_lider);
        return copiar(`Hola${lider ? `, ${lider.nombres}` : ""}. Este es el acceso del equipo «${e.nombre_proyecto}» al Panel ISC UTP 2027.\n\n1. Entra a ${urlPanel()}\n2. Pulsa «Equipo»\n3. Escribe el código: ${e.codigo}\n\nAhí subirán su PDF hasta el ${fechaLarga(datos.config.fecha_limite_archivos)} (hora de Perú).`, "Mensaje para el equipo copiado");
      }

      if (acc === "etapa") {
        const et = datos.etapas.find((x) => x.id === id);
        const abrir = !et.abierta;
        const ok = await confirmar(abrir ? `¿Abrir la calificación de la ${et.nombre}?` : `¿Cerrar la calificación de la ${et.nombre}?`,
          abrir ? "Los jurados de esta etapa podrán guardar y corregir sus calificaciones." : "Los jurados ya no podrán guardar ni corregir calificaciones de esta etapa (solo verlas).",
          { boton: abrir ? "Abrir" : "Cerrar" });
        if (!ok) return;
        await api.adminEtapa(s.codigo, id, abrir);
        aviso(abrir ? `${et.nombre}: calificación abierta` : `${et.nombre}: calificación cerrada`);
        return cargar();
      }

      if (acc === "bloqueo") {
        const bloq = datos.config.integrantes_bloqueados;
        const ok = await confirmar(bloq ? "¿Desbloquear integrantes?" : "¿Bloquear integrantes?",
          bloq ? "Se podrán volver a agregar, quitar o cambiar integrantes y crear equipos nuevos." : "Desde ahora nadie podrá agregar, quitar ni cambiar integrantes, ni crear o borrar equipos. Según las bases, la composición queda fija desde la Semifinal.",
          { boton: bloq ? "Desbloquear" : "Bloquear" });
        if (!ok) return;
        await api.adminConfig(s.codigo, { integrantes_bloqueados: !bloq });
        aviso(bloq ? "Integrantes desbloqueados" : "Integrantes bloqueados");
        return cargar();
      }

      if (acc === "codigo-jurado" || acc === "codigo-equipo" || acc === "codigo-proyeccion") {
        const tipo = acc.split("-")[1];
        const x = tipo === "jurado" ? busca(datos.jurados, id) : tipo === "equipo" ? busca(datos.equipos, id) : null;
        const actual = x ? x.codigo : datos.config.codigo_proyeccion;
        const ok = await confirmar("¿Generar un código nuevo?", `El código actual <b>${esc(actual)}</b> dejará de funcionar al instante. Tendrás que enviar el nuevo.`, { boton: "Generar código nuevo" });
        if (!ok) return;
        const nuevo = await api.codigoNuevo(s.codigo, tipo, id);
        aviso(`Código nuevo: ${nuevo}`);
        return cargar();
      }

      if (acc === "borrar-jurado" || acc === "borrar-equipo") {
        const esJ = acc === "borrar-jurado";
        const x = busca(esJ ? datos.jurados : datos.equipos, id);
        const nombre = esJ ? x.nombre : x.nombre_proyecto;
        const r = await pedirBorrado(`¿Borrar ${esJ ? "al jurado" : "el equipo"} «${nombre}»?`,
          `Su código <b>${esc(x.codigo)}</b> dejará de funcionar. Queda una copia en el historial de borrados.${esJ ? "" : " También se quitan sus integrantes."}`);
        if (!r) return;
        await (esJ ? api.borrarJurado(s.codigo, id, r.motivo) : api.borrarEquipo(s.codigo, id, r.motivo));
        aviso(esJ ? "Jurado borrado" : "Equipo borrado");
        return cargar();
      }

      if (acc === "eliminar-resultados") {
        const etapa = $("[data-etapa-borrar]", cuerpo).value;
        const nombre = etapa === "todas" ? "todas las etapas" : `la ${ETAPAS.find((x) => x.id === etapa).corto}`;
        const n = etapa === "todas" ? (datos.etapas || []).reduce((t, x) => t + (x.calificaciones || 0), 0) : (datos.etapas || []).find((x) => x.id === etapa)?.calificaciones || 0;
        const p = await pedirPalabra(`¿Eliminar los resultados de ${nombre}?`,
          `Se borrarán <b>${n} calificación(es)</b>, con sus sanciones y desempates. Los equipos y jurados se quedan. Queda una copia en el historial.`, "BORRAR", "Eliminar resultados");
        if (!p) return;
        const r = await api.eliminarResultados(s.codigo, etapa, p);
        aviso(`Listo: ${r.calificaciones} calificación(es) eliminada(s)`);
        return cargar();
      }

      if (acc === "borrar-todo") {
        const p = await pedirPalabra("¿Borrar TODO?",
          `Se borrarán <b>${datos.equipos.length} equipo(s)</b> con sus integrantes, <b>${datos.jurados.length} jurado(s)</b> y todas las calificaciones. Sus códigos dejarán de funcionar y las dos etapas quedarán cerradas.<br><br>Úsalo solo para limpiar datos de prueba. Queda una copia en el historial.`, "BORRAR TODO", "Borrar todo");
        if (!p) return;
        const r = await api.borrarTodo(s.codigo, p);
        aviso(`Base limpia: ${r.equipos} equipo(s), ${r.jurados} jurado(s) y ${r.calificaciones} calificación(es) borrados`);
        return cargar();
      }

      if (acc === "reiniciar-demo") {
        const ok = await confirmar("¿Reiniciar los datos de prueba?", "Se borra todo lo que hiciste en el modo de prueba de este navegador. No afecta a la base real.", { boton: "Reiniciar", peligro: true });
        if (!ok) return;
        demoDatos.reiniciar();
        aviso("Datos de prueba reiniciados");
        return cargar();
      }
    } catch (ex) {
      aviso(ex.message || "No se pudo completar la acción", "error");
    }
  });

  cargar();
}
