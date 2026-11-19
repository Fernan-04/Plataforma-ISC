// =========================================================
// Conexión a la base de datos.
// Publicado usa Supabase. En modo de prueba (?demo en la dirección)
// usa datos de ejemplo guardados solo en este navegador.
// =========================================================
import { SUPABASE_URL, SUPABASE_KEY } from "./config.js?v=202611190650";
import { validarIntegrantes, FECHA_LIMITE, TIEMPOS, ETAPAS, CRITERIOS } from "./rubrica.js?v=202611190650";

const DEMO = typeof window !== "undefined" && window.__ISC_DEMO__ === true;
export const ES_DEMO = DEMO;

// ---------------- Real (Supabase) ----------------
let cliente = null;
async function rpc(fn, args) {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("El panel aún no está conectado a la base de datos. Por ahora puedes probarlo en modo de prueba.");
  if (!cliente) cliente = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  const { data, error } = await cliente.rpc(fn, args);
  if (error) throw new Error(error.message || "No se pudo conectar con la base de datos");
  return data;
}

const BUCKET = "isc-archivos";
const MIME_EXT = { pdf: "application/pdf", ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation", mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm" };
// Nombre seguro para la ruta (sin tildes ni espacios raros)
const nombreSeguro = (n) => String(n || "archivo").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(-80) || "archivo";
const tipoMime = (f) => f.type || MIME_EXT[String(f.name).split(".").pop().toLowerCase()] || "application/octet-stream";

// Dirección pública de un archivo (las rutas llevan un identificador imposible de adivinar)
const urlReal = (ruta) => (ruta ? `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${ruta.split("/").map(encodeURIComponent).join("/")}` : null);

const real = {
  entrar: (codigo) => rpc("isc_entrar", { p_codigo: codigo }),
  // Admin (todas piden el código del admin; la base lo revisa)
  adminResumen: (c) => rpc("isc_admin_resumen", { p_codigo: c }),
  guardarJurado: (c, datos) => rpc("isc_admin_guardar_jurado", { p_codigo: c, p_datos: datos }),
  borrarJurado: (c, id, motivo) => rpc("isc_admin_borrar_jurado", { p_codigo: c, p_id: id, p_motivo: motivo || null }),
  guardarEquipo: (c, datos) => rpc("isc_admin_guardar_equipo", { p_codigo: c, p_datos: datos }),
  borrarEquipo: (c, id, motivo) => rpc("isc_admin_borrar_equipo", { p_codigo: c, p_id: id, p_motivo: motivo || null }),
  codigoNuevo: (c, tipo, id) => rpc("isc_admin_codigo_nuevo", { p_codigo: c, p_tipo: tipo, p_id: id || null }),
  adminConfig: (c, cambios) => rpc("isc_admin_config", { p_codigo: c, p_cambios: cambios }),
  adminEtapa: (c, etapa, abierta) => rpc("isc_admin_etapa", { p_codigo: c, p_etapa: etapa, p_abierta: abierta }),
  eliminarResultados: (c, etapa, confirmacion) => rpc("isc_admin_eliminar_resultados", { p_codigo: c, p_etapa: etapa, p_confirmacion: confirmacion }),
  borrarTodo: (c, confirmacion) => rpc("isc_admin_borrar_todo", { p_codigo: c, p_confirmacion: confirmacion }),
  cambiarCodigo: (c, nuevo) => rpc("isc_admin_cambiar_codigo", { p_codigo: c, p_nuevo: nuevo }),
  // Jurado
  juradoPanel: (c) => rpc("isc_jurado_panel", { p_codigo: c }),
  calificar: (c, k) => rpc("isc_jurado_calificar", {
    p_codigo: c, p_etapa: k.etapa, p_equipo: k.equipo_id, p_puntajes: k.puntajes,
    p_justificaciones: k.justificaciones, p_comentario: k.comentario, p_no_presento: !!k.no_presento,
  }),
  // Equipo
  equipoPanel: (c) => rpc("isc_equipo_panel", { p_codigo: c }),
  async subirArchivo(c, tipo, archivo) {
    const token = await rpc("isc_equipo_pedir_subida", { p_codigo: c, p_tipo: tipo });
    const ruta = `${token}/${nombreSeguro(archivo.name)}`;
    const { error } = await cliente.storage.from(BUCKET).upload(ruta, archivo, { contentType: tipoMime(archivo), upsert: false });
    if (error) throw new Error(/size|large|exceed/i.test(error.message) ? "El archivo pesa más de 50 MB." : /mime|type/i.test(error.message) ? "Ese tipo de archivo no está permitido." : `No se pudo subir: ${error.message}`);
    return rpc("isc_equipo_guardar_archivo", { p_codigo: c, p_tipo: tipo, p_ruta: ruta, p_nombre: archivo.name });
  },
  quitarArchivo: (c, tipo) => rpc("isc_equipo_quitar_archivo", { p_codigo: c, p_tipo: tipo }),
  urlArchivo: urlReal,
  // Resultados y orden (admin)
  adminResultados: (c) => rpc("isc_admin_resultados", { p_codigo: c }),
  sancion: (c, etapa, equipo, tipo, motivo) => rpc("isc_admin_sancion", { p_codigo: c, p_etapa: etapa, p_equipo: equipo, p_tipo: tipo || null, p_motivo: motivo || null }),
  desempate: (c, etapa, equipos, motivo) => rpc("isc_admin_desempate", { p_codigo: c, p_etapa: etapa, p_equipos: equipos, p_motivo: motivo }),
  quitarDesempate: (c, id) => rpc("isc_admin_quitar_desempate", { p_codigo: c, p_id: id }),
  pasarFinal: (c, equipos) => rpc("isc_admin_pasar_final", { p_codigo: c, p_equipos: equipos }),
  publicar: (c, etapa, publicar, ranking) => rpc("isc_admin_publicar", { p_codigo: c, p_etapa: etapa, p_publicar: publicar, p_ranking: ranking || null }),
  orden: (c, etapa, equipos, sorteo) => rpc("isc_admin_orden", { p_codigo: c, p_etapa: etapa, p_equipos: equipos, p_sorteo: !!sorteo }),
  // Proyección
  proyeccionPanel: (c) => rpc("isc_proyeccion_panel", { p_codigo: c }),
};

// ---------------- Modo de prueba (localStorage) ----------------
const CLAVE = "isc-utp-demo-v2";
const ADMIN_DEMO = "ADMIN1";
export const DEMO_CODIGOS = { admin: "ADMIN1", jurado: "JUR001, JUR002 o JUR003", equipo: "EQ0001", proyeccion: "PROY01" };

const pausa = (ms = 180) => new Promise((r) => setTimeout(r, ms));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`);
const ahora = () => new Date().toISOString();
const copia = (o) => JSON.parse(JSON.stringify(o));

function semilla() {
  const t = ahora();
  const j = (codigo, nombre, etapas, descripcion) => ({ id: uid(), nombre, codigo, etapas, descripcion, foto_url: null, linkedin: null, creado: t });
  return {
    config: {
      codigo_proyeccion: "PROY01", min_pitch: TIEMPOS.pitch, min_preguntas: TIEMPOS.preguntas, min_cambio: TIEMPOS.cambio,
      fecha_limite_archivos: FECHA_LIMITE, subida_abierta: true, integrantes_bloqueados: false,
    },
    jurados: [
      j("JUR001", "Jurado de prueba 1", ["semifinal"], "Especialista en emprendimiento de impacto."),
      j("JUR002", "Jurado de prueba 2", ["semifinal"], "Inversionista ángel."),
      j("JUR003", "Jurado de prueba 3", ["final"], "Experta en bioeconomía amazónica."),
    ],
    equipos: [{
      id: uid(), nombre_proyecto: "Equipo de prueba", eje: "biodiversidad", ods: "ODS 15 · Vida de ecosistemas terrestres",
      codigo: "EQ0001", etapa_alcanzada: "semifinal", orden_semifinal: null, orden_final: null, creado: t,
      integrantes: [
        { id: uid(), nombres: "Ana", apellidos: "Quispe Rojas", correo: "ana@utp.edu.pe", celular: "999111222", tipo: "utp", es_lider: true },
        { id: uid(), nombres: "Luis", apellidos: "Huamán Torres", correo: "", celular: "", tipo: "utp", es_lider: false },
        { id: uid(), nombres: "María", apellidos: "Shapiama", correo: "", celular: "", tipo: "externo", es_lider: false },
      ],
    }],
    etapas: ETAPAS.map((e) => ({ id: e.id, abierta: e.id === "semifinal" })),
    calificaciones: [],
    sanciones: [],
    desempates: [],
    presentaciones: {},
    borrados: [],
  };
}
// Archivos del modo de prueba: solo en la memoria de esta pestaña (se pierden al recargar)
const archivosDemo = new Map();

export const demoDatos = {
  leer() {
    let d;
    try { d = JSON.parse(localStorage.getItem(CLAVE)); } catch { d = null; }
    // Primera vez: se crean los datos de ejemplo y se guardan, para que los ids no cambien entre lecturas
    if (!d) { d = semilla(); this.guardar(d); }
    if (!d.etapas) d.etapas = ETAPAS.map((e) => ({ id: e.id, abierta: e.id === "semifinal" }));
    d.sanciones ||= []; d.desempates ||= []; d.presentaciones ||= {};
    return d;
  },
  guardar(d) { try { localStorage.setItem(CLAVE, JSON.stringify(d)); } catch { /* sin almacenamiento */ } },
  reiniciar() { try { localStorage.removeItem(CLAVE); } catch { /* sin almacenamiento */ } },
};

const LETRAS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function codigoDemo(d, prefijo) {
  const usados = new Set([...d.jurados.map((x) => x.codigo), ...d.equipos.map((x) => x.codigo), d.config.codigo_proyeccion, ADMIN_DEMO]);
  let c;
  do { c = prefijo + Array.from({ length: 6 }, () => LETRAS[Math.floor(Math.random() * LETRAS.length)]).join(""); } while (usados.has(c));
  return c;
}
function exigirAdmin(c) {
  if (String(c).trim().toUpperCase() !== ADMIN_DEMO) throw new Error("Tu código de administrador no es válido. Sal y vuelve a entrar.");
}
function equipoDemo(d, c) {
  const e = d.equipos.find((x) => x.codigo === String(c).trim().toUpperCase());
  if (!e) throw new Error("Tu código de equipo no es válido. Sal y vuelve a entrar.");
  return e;
}
const subidaDemo = (d) => d.config.subida_abierta && (!d.config.fecha_limite_archivos || Date.now() <= new Date(d.config.fecha_limite_archivos).getTime());
function juradoDemo(d, c) {
  const j = d.jurados.find((x) => x.codigo === String(c).trim().toUpperCase());
  if (!j) throw new Error("Tu código de jurado no es válido. Sal y vuelve a entrar.");
  return j;
}
const califDe = (d, campo, id) => d.calificaciones.filter((x) => x[campo] === id).length;
const conConteo = (d) => ({
  config: d.config,
  etapas: ETAPAS.map((e) => ({ id: e.id, nombre: e.nombre, abierta: !!d.etapas.find((x) => x.id === e.id)?.abierta, calificaciones: d.calificaciones.filter((c) => c.etapa === e.id).length })),
  jurados: d.jurados.map((j) => ({ ...j, calificaciones: califDe(d, "jurado_id", j.id) })),
  equipos: d.equipos.map((e) => ({ ...e, calificaciones: califDe(d, "equipo_id", e.id), archivos: d.presentaciones[e.id] || {} })),
});

const demo = {
  async entrar(codigo) {
    await pausa();
    const cod = String(codigo).trim().toUpperCase();
    const d = demoDatos.leer();
    if (cod === ADMIN_DEMO) return { rol: "admin", nombre: "Administrador de prueba" };
    const j = d.jurados.find((x) => x.codigo === cod);
    if (j) return { rol: "jurado", nombre: j.nombre };
    const e = d.equipos.find((x) => x.codigo === cod);
    if (e) return { rol: "equipo", nombre: e.nombre_proyecto };
    if (d.config.codigo_proyeccion === cod) return { rol: "proyeccion", nombre: "Proyección" };
    return null;
  },

  async adminResumen(c) { await pausa(); exigirAdmin(c); return copia(conConteo(demoDatos.leer())); },

  async guardarJurado(c, datos) {
    await pausa(); exigirAdmin(c);
    const d = demoDatos.leer();
    const nombre = String(datos.nombre || "").trim();
    const etapas = [...new Set(datos.etapas || [])];
    if (!nombre) throw new Error("Escribe el nombre del jurado.");
    if (!etapas.length) throw new Error("Elige en qué etapa califica (Semifinal, Final o ambas).");
    const campos = { nombre, etapas, descripcion: datos.descripcion?.trim() || null, foto_url: datos.foto_url?.trim() || null, linkedin: datos.linkedin?.trim() || null };
    let j;
    if (!datos.id) {
      j = { id: uid(), codigo: codigoDemo(d, "JUR"), creado: ahora(), ...campos };
      d.jurados.push(j);
    } else {
      j = d.jurados.find((x) => x.id === datos.id);
      if (!j) throw new Error("Ese jurado ya no existe. Actualiza la página.");
      Object.assign(j, campos);
    }
    demoDatos.guardar(d);
    return copia(j);
  },

  async borrarJurado(c, id, motivo) {
    await pausa(); exigirAdmin(c);
    const d = demoDatos.leer();
    const n = califDe(d, "jurado_id", id);
    if (n) throw new Error(`No se puede borrar: este jurado ya tiene ${n} calificación(es) guardada(s).`);
    d.borrados.push({ tabla: "isc_jurados", datos: d.jurados.find((x) => x.id === id), motivo, creado: ahora() });
    d.jurados = d.jurados.filter((x) => x.id !== id);
    demoDatos.guardar(d);
  },

  async guardarEquipo(c, datos) {
    await pausa(); exigirAdmin(c);
    const d = demoDatos.leer();
    const nombre = String(datos.nombre_proyecto || "").trim();
    if (!nombre) throw new Error("Escribe el nombre del proyecto.");
    if (!["bioeconomia", "biodiversidad", "comunidades"].includes(datos.eje)) throw new Error("Elige el eje del desafío.");
    const bloq = d.config.integrantes_bloqueados;
    if (bloq && !datos.id) throw new Error("La composición está bloqueada: no se pueden crear equipos nuevos. Desbloquéala primero.");
    const ints = (datos.integrantes || []).map((i) => ({
      id: i.id || uid(), nombres: String(i.nombres || "").trim(), apellidos: String(i.apellidos || "").trim(),
      correo: i.correo?.trim() || "", celular: i.celular?.trim() || "", tipo: i.tipo || "utp", es_lider: !!i.es_lider,
    }));
    if (!bloq) { const err = validarIntegrantes(ints); if (err) throw new Error(err); }
    let e;
    if (!datos.id) {
      e = { id: uid(), codigo: codigoDemo(d, "EQ"), etapa_alcanzada: "semifinal", orden_semifinal: null, orden_final: null, creado: ahora(), integrantes: [] };
      d.equipos.push(e);
    } else {
      e = d.equipos.find((x) => x.id === datos.id);
      if (!e) throw new Error("Ese equipo ya no existe. Actualiza la página.");
    }
    Object.assign(e, { nombre_proyecto: nombre, eje: datos.eje, ods: datos.ods?.trim() || null });
    if (!bloq) e.integrantes = ints;
    demoDatos.guardar(d);
    return copia(e);
  },

  async borrarEquipo(c, id, motivo) {
    await pausa(); exigirAdmin(c);
    const d = demoDatos.leer();
    const n = califDe(d, "equipo_id", id);
    if (n) throw new Error(`No se puede borrar: este equipo ya tiene ${n} calificación(es) guardada(s).`);
    if (d.config.integrantes_bloqueados) throw new Error("La composición de los equipos está bloqueada desde la Semifinal.");
    d.borrados.push({ tabla: "isc_equipos", datos: d.equipos.find((x) => x.id === id), motivo, creado: ahora() });
    d.equipos = d.equipos.filter((x) => x.id !== id);
    demoDatos.guardar(d);
  },

  async codigoNuevo(c, tipo, id) {
    await pausa(); exigirAdmin(c);
    const d = demoDatos.leer();
    let cod;
    if (tipo === "proyeccion") {
      cod = codigoDemo(d, "PROY");
      d.config.codigo_proyeccion = cod;
    } else {
      const lista = tipo === "jurado" ? d.jurados : d.equipos;
      const x = lista.find((y) => y.id === id);
      if (!x) throw new Error("No se encontró a quién cambiarle el código.");
      cod = codigoDemo(d, tipo === "jurado" ? "JUR" : "EQ");
      x.codigo = cod;
    }
    demoDatos.guardar(d);
    return cod;
  },

  async adminEtapa(c, etapa, abierta) {
    await pausa(); exigirAdmin(c);
    const d = demoDatos.leer();
    const et = d.etapas.find((x) => x.id === etapa);
    if (!et) throw new Error("Etapa no válida.");
    et.abierta = !!abierta;
    demoDatos.guardar(d);
  },

  async cambiarCodigo(c, nuevo) {
    await pausa(); exigirAdmin(c);
    if (String(nuevo || "").trim().length < 8) throw new Error("El código nuevo debe tener al menos 8 caracteres.");
    return { demo: true };
  },

  async eliminarResultados(c, etapa, confirmacion) {
    await pausa(); exigirAdmin(c);
    if (String(confirmacion).trim().toUpperCase() !== "BORRAR") throw new Error("Escribe BORRAR para confirmar.");
    const d = demoDatos.leer();
    const sale = d.calificaciones.filter((x) => etapa === "todas" || x.etapa === etapa);
    if (sale.length) d.borrados.push({ tabla: "isc_calificaciones", datos: sale, motivo: `Eliminar resultados (${etapa})`, creado: ahora() });
    d.calificaciones = d.calificaciones.filter((x) => !(etapa === "todas" || x.etapa === etapa));
    d.sanciones = d.sanciones.filter((x) => !(etapa === "todas" || x.etapa === etapa));
    d.desempates = d.desempates.filter((x) => !(etapa === "todas" || x.etapa === etapa));
    d.etapas.forEach((e) => { if (etapa === "todas" || e.id === etapa) { e.resultados_publicados = false; e.ranking = null; } });
    demoDatos.guardar(d);
    return { calificaciones: sale.length, sanciones: 0, desempates: 0 };
  },

  async borrarTodo(c, confirmacion) {
    await pausa(); exigirAdmin(c);
    if (String(confirmacion).trim().replace(/\s+/g, " ").toUpperCase() !== "BORRAR TODO") throw new Error("Escribe BORRAR TODO para confirmar.");
    const d = demoDatos.leer();
    if (d.config.integrantes_bloqueados) throw new Error("Los integrantes están bloqueados. Desbloquéalos en la pestaña Equipos y vuelve a intentarlo.");
    const r = { equipos: d.equipos.length, jurados: d.jurados.length, calificaciones: d.calificaciones.length };
    d.borrados.push({ tabla: "todo", datos: { equipos: d.equipos, jurados: d.jurados, calificaciones: d.calificaciones }, motivo: "Borrar todo", creado: ahora() });
    d.equipos = []; d.jurados = []; d.calificaciones = []; d.sanciones = []; d.desempates = []; d.presentaciones = {};
    d.etapas.forEach((e) => { e.abierta = false; e.resultados_publicados = false; e.ranking = null; });
    demoDatos.guardar(d);
    return r;
  },

  async juradoPanel(c) {
    await pausa();
    const d = demoDatos.leer();
    const j = juradoDemo(d, c);
    const enEtapa = (e, et) => et === "semifinal" || e.etapa_alcanzada === "final";
    const orden = (e, et) => (et === "final" ? e.orden_final : e.orden_semifinal);
    return copia({
      jurado: { id: j.id, nombre: j.nombre, etapas: j.etapas, descripcion: j.descripcion, foto_url: j.foto_url, linkedin: j.linkedin },
      etapas: ETAPAS.filter((et) => j.etapas.includes(et.id)).map((et) => ({
        id: et.id, nombre: et.nombre, fecha: et.fecha, abierta: !!d.etapas.find((x) => x.id === et.id)?.abierta,
        equipos: d.equipos.filter((e) => enEtapa(e, et.id))
          .sort((a, b) => (orden(a, et.id) ?? 1e9) - (orden(b, et.id) ?? 1e9) || String(a.creado).localeCompare(String(b.creado)))
          .map((e) => ({ id: e.id, nombre_proyecto: e.nombre_proyecto, eje: e.eje, ods: e.ods, orden: orden(e, et.id), archivos: d.presentaciones[e.id] || {},
            integrantes: (e.integrantes || []).map((i) => ({ nombre: `${i.nombres} ${i.apellidos}`, tipo: i.tipo, es_lider: i.es_lider })) })),
      })),
      calificaciones: d.calificaciones.filter((x) => x.jurado_id === j.id),
      colegas: d.jurados.filter((o) => o.id !== j.id && o.etapas.some((e) => j.etapas.includes(e)))
        .map((o) => ({ nombre: o.nombre, etapas: o.etapas, descripcion: o.descripcion, foto_url: o.foto_url, linkedin: o.linkedin })),
    });
  },

  async calificar(c, k) {
    await pausa();
    const d = demoDatos.leer();
    const j = juradoDemo(d, c);
    if (!j.etapas.includes(k.etapa)) throw new Error("No estás asignado a esta etapa.");
    if (!d.etapas.find((x) => x.id === k.etapa)?.abierta) throw new Error("La calificación de esta etapa está cerrada. Pide a la organización que la abra.");
    const eq = d.equipos.find((e) => e.id === k.equipo_id);
    if (!eq || (k.etapa === "final" && eq.etapa_alcanzada !== "final")) throw new Error("Este equipo no se presenta en esta etapa.");
    let total = 0;
    let puntajes = {};
    if (!k.no_presento) {
      if (!String(k.comentario || "").trim()) throw new Error("Escribe un comentario general para el equipo.");
      for (const cr of CRITERIOS) {
        const v = k.puntajes?.[cr.id];
        if (v == null) throw new Error(`Falta calificar el criterio «${cr.nombre}».`);
        if (!cr.puntos.includes(v)) throw new Error(`Puntaje ${v} no válido para «${cr.nombre}».`);
        if (!String(k.justificaciones?.[cr.id] || "").trim()) throw new Error(`Falta la justificación del criterio «${cr.nombre}».`);
        total += v;
      }
      puntajes = { ...k.puntajes };
    }
    const fila = { etapa: k.etapa, equipo_id: k.equipo_id, jurado_id: j.id, puntajes, justificaciones: k.justificaciones || {},
      comentario: String(k.comentario || "").trim() || null, no_presento: !!k.no_presento, total, actualizado: ahora() };
    d.calificaciones = d.calificaciones.filter((x) => !(x.etapa === k.etapa && x.equipo_id === k.equipo_id && x.jurado_id === j.id));
    d.calificaciones.push(fila);
    demoDatos.guardar(d);
    const { jurado_id, ...sin } = fila;
    return copia(sin);
  },

  // ----- Equipo -----
  async equipoPanel(c) {
    await pausa();
    const d = demoDatos.leer();
    const e = equipoDemo(d, c);
    const enEtapa = (et) => et === "semifinal" || e.etapa_alcanzada === "final";
    return copia({
      equipo: { id: e.id, nombre_proyecto: e.nombre_proyecto, eje: e.eje, ods: e.ods, etapa_alcanzada: e.etapa_alcanzada, orden_semifinal: e.orden_semifinal, orden_final: e.orden_final },
      integrantes: (e.integrantes || []).map(({ nombres, apellidos, tipo, es_lider }) => ({ nombres, apellidos, tipo, es_lider })),
      total_equipos: d.equipos.length,
      config: { fecha_limite_archivos: d.config.fecha_limite_archivos, subida_abierta: d.config.subida_abierta, subida_permitida: subidaDemo(d),
        min_pitch: d.config.min_pitch, min_preguntas: d.config.min_preguntas, min_cambio: d.config.min_cambio },
      archivos: d.presentaciones[e.id] || {},
      resultados: d.etapas.filter((et) => et.resultados_publicados && enEtapa(et.id)).map((et) => {
        const r = (et.ranking || []).find((x) => x.equipo_id === e.id);
        return {
          etapa: et.id, nombre: ETAPAS.find((x) => x.id === et.id).nombre, puesto: r?.puesto ?? null, promedio: r?.promedio ?? null,
          clasifico: et.id === "semifinal" ? e.etapa_alcanzada === "final" : null,
          sancion: d.sanciones.find((x) => x.etapa === et.id && x.equipo_id === e.id) || null,
          calificaciones: d.calificaciones.filter((x) => x.etapa === et.id && x.equipo_id === e.id)
            .map(({ puntajes, justificaciones, comentario, no_presento, total }) => ({ puntajes, justificaciones, comentario, no_presento, total })),
        };
      }),
    });
  },
  async subirArchivo(c, tipo, archivo) {
    await pausa(400);
    const d = demoDatos.leer();
    const e = equipoDemo(d, c);
    if (!["pdf", "ppt", "video"].includes(tipo)) throw new Error("Tipo de archivo no válido.");
    if (!subidaDemo(d)) throw new Error("El plazo para subir archivos está cerrado. Escribe a la organización.");
    if (archivo.size > 50 * 1024 * 1024) throw new Error("El archivo pesa más de 50 MB.");
    const ruta = `${uid()}/${archivo.name}`;
    try { archivosDemo.set(ruta, URL.createObjectURL(archivo)); } catch { archivosDemo.set(ruta, null); }
    const p = (d.presentaciones[e.id] ||= {});
    p[`${tipo}_ruta`] = ruta; p[`${tipo}_nombre`] = archivo.name; p.actualizado = ahora();
    demoDatos.guardar(d);
    return copia(p);
  },
  async quitarArchivo(c, tipo) {
    await pausa();
    const d = demoDatos.leer();
    const e = equipoDemo(d, c);
    if (!subidaDemo(d)) throw new Error("El plazo para subir archivos está cerrado. Escribe a la organización.");
    const p = (d.presentaciones[e.id] ||= {});
    p[`${tipo}_ruta`] = null; p[`${tipo}_nombre`] = null; p.actualizado = ahora();
    demoDatos.guardar(d);
    return copia(p);
  },
  urlArchivo: (ruta) => (ruta ? archivosDemo.get(ruta) || null : null),

  // ----- Resultados y orden (admin) -----
  async adminResultados(c) {
    await pausa(); exigirAdmin(c);
    const d = demoDatos.leer();
    return copia({
      etapas: ETAPAS.map((e) => { const x = d.etapas.find((y) => y.id === e.id) || {}; return { id: e.id, nombre: e.nombre, abierta: !!x.abierta, resultados_publicados: !!x.resultados_publicados, ranking: x.ranking || null }; }),
      equipos: d.equipos.map((e) => ({ id: e.id, nombre_proyecto: e.nombre_proyecto, eje: e.eje, etapa_alcanzada: e.etapa_alcanzada, orden_semifinal: e.orden_semifinal, orden_final: e.orden_final, integrantes: (e.integrantes || []).map((i) => `${i.nombres} ${i.apellidos}`) })),
      jurados: d.jurados.map((j) => ({ id: j.id, nombre: j.nombre, etapas: j.etapas })),
      calificaciones: d.calificaciones,
      sanciones: d.sanciones,
      desempates: d.desempates,
    });
  },
  async sancion(c, etapa, equipo, tipo, motivo) {
    await pausa(); exigirAdmin(c);
    const d = demoDatos.leer();
    d.sanciones = d.sanciones.filter((x) => !(x.etapa === etapa && x.equipo_id === equipo));
    if (tipo) {
      if (!["walkover", "descalificado"].includes(tipo)) throw new Error("Sanción no válida.");
      if (!String(motivo || "").trim()) throw new Error("Escribe el motivo de la sanción.");
      d.sanciones.push({ etapa, equipo_id: equipo, tipo, motivo: String(motivo).trim() });
    }
    demoDatos.guardar(d);
  },
  async desempate(c, etapa, equipos, motivo) {
    await pausa(); exigirAdmin(c);
    if ((equipos || []).length < 2) throw new Error("Un desempate necesita al menos 2 equipos.");
    if (!String(motivo || "").trim()) throw new Error("Escribe el motivo del desempate.");
    const d = demoDatos.leer();
    d.desempates.push({ id: uid(), etapa, equipos, motivo: String(motivo).trim(), creado: ahora() });
    demoDatos.guardar(d);
  },
  async quitarDesempate(c, id) {
    await pausa(); exigirAdmin(c);
    const d = demoDatos.leer();
    d.desempates = d.desempates.filter((x) => x.id !== id);
    demoDatos.guardar(d);
  },
  async pasarFinal(c, equipos) {
    await pausa(); exigirAdmin(c);
    const d = demoDatos.leer();
    if (d.calificaciones.some((x) => x.etapa === "final")) throw new Error("La Final ya tiene calificaciones: no se pueden cambiar los clasificados. Elimina primero los resultados de la Final si es una prueba.");
    d.equipos.forEach((e) => { const si = equipos.includes(e.id); e.etapa_alcanzada = si ? "final" : "semifinal"; if (!si) e.orden_final = null; });
    demoDatos.guardar(d);
  },
  async publicar(c, etapa, publicar, ranking) {
    await pausa(); exigirAdmin(c);
    const d = demoDatos.leer();
    const et = d.etapas.find((x) => x.id === etapa);
    if (!et) throw new Error("Etapa no válida.");
    et.resultados_publicados = !!publicar;
    if (publicar) et.ranking = ranking || null;
    demoDatos.guardar(d);
  },
  async orden(c, etapa, equipos) {
    await pausa(); exigirAdmin(c);
    const d = demoDatos.leer();
    const campo = etapa === "final" ? "orden_final" : "orden_semifinal";
    d.equipos.forEach((e) => { const i = equipos.indexOf(e.id); e[campo] = i >= 0 ? i + 1 : null; });
    demoDatos.guardar(d);
  },

  // ----- Proyección -----
  async proyeccionPanel(c) {
    await pausa();
    const d = demoDatos.leer();
    const cod = String(c).trim().toUpperCase();
    if (cod !== ADMIN_DEMO && cod !== d.config.codigo_proyeccion) throw new Error("Tu código de proyección no es válido. Sal y vuelve a entrar.");
    const orden = (e, et) => (et === "final" ? e.orden_final : e.orden_semifinal);
    return copia({
      config: { min_pitch: d.config.min_pitch, min_preguntas: d.config.min_preguntas, min_cambio: d.config.min_cambio },
      etapas: ETAPAS.map((et) => ({
        id: et.id, nombre: et.nombre,
        equipos: d.equipos.filter((e) => et.id === "semifinal" || e.etapa_alcanzada === "final")
          .sort((a, b) => (orden(a, et.id) ?? 1e9) - (orden(b, et.id) ?? 1e9) || String(a.creado).localeCompare(String(b.creado)))
          .map((e) => ({ id: e.id, nombre_proyecto: e.nombre_proyecto, eje: e.eje, orden: orden(e, et.id), archivos: d.presentaciones[e.id] || {},
            integrantes: (e.integrantes || []).map((i) => ({ nombre: `${i.nombres} ${i.apellidos}`, es_lider: i.es_lider })) })),
      })),
    });
  },

  async adminConfig(c, cambios) {
    await pausa(); exigirAdmin(c);
    const d = demoDatos.leer();
    Object.assign(d.config, cambios);
    demoDatos.guardar(d);
    return copia(d.config);
  },
};

export const api = DEMO ? demo : real;
