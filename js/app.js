// =========================================================
// Panel ISC UTP 2027 · arranque y portada
// =========================================================
import { api, ES_DEMO, DEMO_CODIGOS } from "./api.js?v=202611190710";
import { $, esc, I, IMG, modal, fondoAnimado } from "./ui.js?v=202611190710";
import { COMPETENCIA, ETAPAS, EJES, CRITERIOS, NIVELES, TOTAL, textoTiempos } from "./rubrica.js?v=202611190710";
import { panelAdmin } from "./admin.js?v=202611190710";
import { panelJurado } from "./jurado.js?v=202611190710";
import { panelEquipo } from "./equipo.js?v=202611190710";
import { panelProyeccion } from "./proyeccion.js?v=202611190710";

const app = $("#app");
const SESION = "isc-utp-sesion";

export const sesion = {
  leer() { try { return JSON.parse(sessionStorage.getItem(SESION)); } catch { return null; } },
  guardar(s) { try { sessionStorage.setItem(SESION, JSON.stringify(s)); } catch { /* sin almacenamiento */ } },
  borrar() { try { sessionStorage.removeItem(SESION); } catch { /* sin almacenamiento */ } },
};

export function salir() { sesion.borrar(); portada(); }

const marcaISC = (sub = "Programa Local UTP · 2027") => `
  <span class="isc-marca">
    <img class="isc-marca__icono" src="${IMG.icono}" alt="">
    <span><b>ISC UTP</b><small>${esc(sub)}</small></span>
  </span>`;
const marcaScale = () => `<span class="isc-scale"><img src="${IMG.scale}" alt="Scale · Incubadora de impacto"><small>INCUBADORA DE IMPACTO</small></span>`;
const bandaDemo = () => (ES_DEMO ? `<span class="demo-banda">MODO DE PRUEBA · nada de aquí se guarda en la nube</span>` : "");

function portada() {
  document.title = "Panel ISC UTP · Impact Startup Competition 2027";
  const [semi, final] = ETAPAS;
  app.innerHTML = `
  ${fondoAnimado(26)}
  <div class="portada">
    <header class="portada__barra">
      ${marcaISC()}
      <div class="der">
        <span class="en-vivo"><span class="punto punto--vivo"></span>EN VIVO</span>
        ${marcaScale()}
      </div>
    </header>
    <main class="escena">
      <div>
        <img class="escena__logo escena__logo--isc" src="${IMG.logo}" alt="Impact Startup Competition · UTP Jurados" style="margin:0 auto">
        <p class="escena__pre">PROGRAMA LOCAL UTP · 2027</p>
        <h1 class="escena__titulo">Panel ISC UTP</h1>
        <p class="escena__desafio">«${esc(COMPETENCIA.desafio)}»</p>
        <p class="escena__sub">Calificación del jurado, presentaciones de los equipos y proyección del pitch de la Semifinal y la Final Local en un solo lugar.</p>
        <div class="pildoras">
          <span class="pildora pildora--lila">${I.vivo}${esc(semi.corto)} · ${esc(semi.dia)} · Zoom</span>
          <span class="pildora pildora--oro">${I.copa}${esc(final.corto)} · ${esc(final.dia)} · Presencial</span>
          <span class="pildora pildora--verde">${I.bandera}${EJES.length} ejes: ${EJES.map((e) => esc(e.nombre.split(" ")[0])).join(" · ")}</span>
        </div>
        <div class="puertas">
          <button class="puerta puerta--jurado" data-rol="jurado">
            <span class="puerta__icono">${I.mazo}</span>
            <span class="puerta__nombre">Jurado</span>
            <span class="puerta__txt">Califica los pitches con la rúbrica oficial con el código que te entregó la organización.</span>
            <span class="puerta__ir">Entrar a calificar ${I.flecha}</span>
          </button>
          <button class="puerta puerta--equipo" data-rol="equipo">
            <span class="puerta__icono">${I.personas}</span>
            <span class="puerta__nombre">Equipo</span>
            <span class="puerta__txt">Sube tu PDF y tu PPT de respaldo, mira tu turno y ensaya tu pitch.</span>
            <span class="puerta__ir">Entrar a mi equipo ${I.flecha}</span>
          </button>
          <button class="puerta puerta--proyeccion" data-rol="proyeccion">
            <span class="puerta__icono">${I.pizarra}</span>
            <span class="puerta__nombre">Proyección</span>
            <span class="puerta__txt">Laptop de la sala: orden de los equipos, el PDF de cada pitch y el cronómetro (${textoTiempos()}).</span>
            <span class="puerta__ir">Abrir proyección ${I.flecha}</span>
          </button>
          <button class="puerta puerta--admin" data-rol="admin">
            <span class="puerta__icono">${I.escudo}</span>
            <span class="puerta__nombre">Admin</span>
            <span class="puerta__txt">Resultados en vivo, equipos, jurados, presentaciones y Excel. También accesos limitados.</span>
            <span class="puerta__ir">Abrir panel ${I.flecha}</span>
          </button>
        </div>
      </div>
    </main>
    <footer class="portada__pie">
      <nav class="pie-enlaces" aria-label="Enlaces de ISC UTP">
        <a class="pie-btn" href="${COMPETENCIA.instagram.url}" target="_blank" rel="noopener" aria-label="Instagram de ISC UTP (${COMPETENCIA.instagram.usuario})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.6" cy="6.4" r="1" fill="currentColor" stroke="none"/></svg>
          <span>${COMPETENCIA.instagram.usuario}</span></a>
        ${COMPETENCIA.webs.map((w) => `<a class="pie-btn" href="https://${w}" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          <span>${w.replace(/^www\./, "")}</span></a>`).join("")}
      </nav>
    </footer>
  </div>
  ${bandaDemo()}`;
  app.querySelectorAll(".puerta").forEach((b) => (b.onclick = () => pedirCodigo(b.dataset.rol)));
}

const ROLES = {
  jurado: { titulo: "Acceso de jurado", icono: "mazo", fondo: "linear-gradient(135deg,#FF7A2F,#FF9A55)", btn: "btn--naranja", boton: "Jurado" },
  equipo: { titulo: "Acceso de equipo", icono: "personas", fondo: "linear-gradient(135deg,#2BD98C,#0E8A5F)", btn: "btn--naranja", boton: "Equipo" },
  proyeccion: { titulo: "Acceso de proyección", icono: "pizarra", fondo: "linear-gradient(135deg,#38D3F5,#16A34A)", btn: "btn--naranja", boton: "Proyección" },
  admin: { titulo: "Acceso de administrador", icono: "escudo", fondo: "linear-gradient(135deg,#5619E1,#38D3F5)", btn: "btn--primario", boton: "Admin" },
  coordinador: { boton: "Admin" },
};

function pedirCodigo(rol) {
  const esAdmin = rol === "admin";
  const R = ROLES[rol];
  const m = modal(`
    <div style="text-align:center">
      <div class="puerta__icono" style="margin:0 auto 12px;background:${R.fondo}">${I[R.icono]}</div>
      <h2>${R.titulo}</h2>
      <p style="margin:0;color:var(--niebla)">${esAdmin ? "Escribe tu código de administrador o de acceso limitado." : "Escribe el código que te entregó la organización."}</p>
      ${ES_DEMO ? `<p class="ayuda" style="margin-top:8px">Modo de prueba: usa <b>${DEMO_CODIGOS[rol]}</b></p>` : ""}
    </div>
    <form>
      <label class="sr" for="cod">Código</label>
      <div class="codigo-caja">
        <input id="cod" class="codigo-input ${esAdmin ? "codigo-input--oculto" : ""}" ${esAdmin ? 'type="password"' : ""} autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="24" autofocus>
        ${esAdmin ? `<button type="button" class="codigo-ver" data-ver aria-label="Mostrar el código" title="Mostrar / ocultar">👁</button>` : ""}
      </div>
      ${esAdmin ? `<p class="ayuda" style="text-align:center;margin:6px 0 0">Tu código se ve como puntitos para que nadie lo lea si compartes pantalla.</p>` : ""}
      <p class="error" aria-live="polite"></p>
      <div class="modal__acciones" style="justify-content:stretch">
        <button type="button" class="btn" data-cancelar style="flex:1">Cancelar</button>
        <button class="btn ${R.btn}" style="flex:2">Entrar ${I.flecha}</button>
      </div>
    </form>`);
  const form = m.el.querySelector("form");
  const inp = m.el.querySelector("#cod");
  const err = m.el.querySelector(".error");
  m.el.querySelector("[data-cancelar]").onclick = () => m.cerrar();
  // Mostrar u ocultar el código del admin (por defecto, oculto)
  const ver = m.el.querySelector("[data-ver]");
  if (ver) ver.onclick = () => { const oculto = inp.type === "password"; inp.type = oculto ? "text" : "password"; ver.textContent = oculto ? "🙈" : "👁"; ver.setAttribute("aria-label", oculto ? "Ocultar el código" : "Mostrar el código"); inp.focus(); };
  form.onsubmit = async (e) => {
    e.preventDefault();
    const codigo = inp.value.trim();
    if (!codigo) { inp.focus(); return; }
    const btn = form.querySelector("button:not([data-cancelar])");
    btn.disabled = true; err.textContent = "";
    try {
      const r = await api.entrar(codigo);
      // Los accesos limitados entran por la puerta Admin o Proyección
      const valido = r && (r.rol === rol || (["admin", "proyeccion"].includes(rol) && r.rol === "coordinador"));
      if (!valido) {
        const nombre = { admin: "administrador", jurado: "jurado", equipo: "equipo", proyeccion: "proyección", coordinador: "acceso limitado" }[r?.rol];
        err.textContent = r ? `Ese código es de ${nombre}. Usa el botón ${ROLES[r.rol]?.boton || ""}.` : "Código incorrecto. Revisa e inténtalo otra vez.";
        inp.classList.remove("temblor"); void inp.offsetWidth; inp.classList.add("temblor"); inp.select();
        return;
      }
      sesion.guardar({ rol: r.rol, codigo, puerta: rol, nombre: r.nombre });
      m.cerrar();
      abrir();
    } catch (ex) {
      err.textContent = ex.message || "No se pudo conectar. Revisa tu internet.";
    } finally { btn.disabled = false; }
  };
}

// ---------- Paneles (base del proyecto: se completan en los siguientes pasos) ----------
const PLAN = {
  jurado: { titulo: "Panel del jurado", pendiente: ["Saludo con foto y anillo de avance", "Tarjetas por etapa: Semifinal · 25/11 y Final · 28/11", "Lista de equipos en orden de exposición", "Calificación por niveles con justificación obligatoria y comentario para el equipo", "Botones «Ver PDF» y «Bajar PPT»", "Colegas con su LinkedIn"] },
  equipo: { titulo: "Panel del equipo", pendiente: ["Tu equipo, tu turno y la cuenta regresiva a la fecha límite", "Subir PDF (se proyecta), PPT de respaldo y video opcional (máx. 50 MB)", "Nombre del proyecto y líder", "«Ensayar mi pitch» con vista previa y «Prueba tu clicker»"] },
  proyeccion: { titulo: "Panel de proyección", pendiente: ["Orden oficial y sorteo animado", "Portada de cada turno", `PDF del equipo en pantalla con cronómetro: ${textoTiempos()}`, "Control con el puntero (clicker)"] },
  admin: { titulo: "Panel del administrador", pendiente: ["En vivo", "Resultados por etapa, desempates, «Pasar a la Final» y reporte por equipo", "Jurados con códigos", "Equipos con integrantes y validaciones", "Presentaciones, fecha límite, sorteo y ZIP", "Accesos limitados, Excel y «Eliminar resultados»"] },
};

function htmlRubrica() {
  return `<section class="tarjeta rub">
    <h2>Rúbrica oficial · ${TOTAL} pts</h2>
    <p class="ayuda">Sale de las bases (secciones VI y VII). El jurado elige un nivel por criterio y escribe una justificación corta.</p>
    ${CRITERIOS.map((c) => `<div class="rub-c">
      <div class="rub-c__cab"><b>${esc(c.nombre)} · ${c.max} pts</b><span>${esc(c.que)}</span></div>
      <div class="rub-niveles">${c.niveles.map((d, i) => `<div class="rub-nivel"><b>${NIVELES[i]}<span>${c.puntos[i]}</span></b>${esc(d)}</div>`).join("")}</div>
      <details class="rub-guia"><summary>Preguntas guía</summary><ul>${c.guia.map((g) => `<li>${esc(g)}</li>`).join("")}</ul></details>
    </div>`).join("")}
  </section>`;
}

function panelEnObra(s) {
  const P = PLAN[s.rol] || PLAN.admin;
  document.title = `${P.titulo} · ISC UTP`;
  app.innerHTML = `
  ${fondoAnimado(12)}
  <header class="barra">
    ${marcaISC(P.titulo)}
    <div class="der">
      <button class="btn btn--mini" data-salir>${I.salir}<span>Salir</span></button>
    </div>
  </header>
  <main class="contenedor obra">
    <section class="tarjeta obra__hero">
      <span class="chip chip--ambar">${I.reloj}En construcción</span>
      <h1>${esc(P.titulo)}</h1>
      <p>Hola${s.nombre ? `, <b>${esc(s.nombre)}</b>` : ""}. Esta sección se está construyendo. Pronto tendrá:</p>
      <ul class="obra__lista">${P.pendiente.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
    </section>
    ${s.rol === "jurado" || s.rol === "admin" ? htmlRubrica() : ""}
  </main>
  ${bandaDemo()}`;
  app.querySelector("[data-salir]").onclick = salir;
}

function abrir() {
  const s = sesion.leer();
  if (s?.rol === "admin") return panelAdmin(app, s, { marcaISC, bandaDemo, salir, htmlRubrica });
  if (s?.rol === "jurado") return panelJurado(app, s, { marcaISC, bandaDemo, salir });
  if (s?.rol === "equipo") return panelEquipo(app, s, { marcaISC, bandaDemo, salir });
  if (s?.rol === "proyeccion") return panelProyeccion(app, s, { marcaISC, bandaDemo, salir });
  if (s?.rol) return panelEnObra(s);
  portada();
}

abrir();
