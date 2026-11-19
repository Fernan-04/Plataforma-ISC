// =========================================================
// ISC UTP 2027 · Cálculo de resultados (fuente única)
// Puntaje = promedio de los jurados (sobre 100). «No se presentó» cuenta 0.
// Desempate: 1) promedio exacto, 2) criterio de mayor peso (Equipo → Idea →
// Impacto…), 3) decisión del jurado en sala registrada por el admin.
// Walkover / descalificado: quedan fuera del ranking (al final, sin puesto).
// =========================================================
import { CRITERIOS, ORDEN_DESEMPATE, etapa as etapaDe } from "./rubrica.js?v=202611190710";

const prom = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
const EPS = 1e-9;

/**
 * @param {object} p
 * @param {string} p.etapa         'semifinal' | 'final'
 * @param {Array}  p.equipos       equipos que se presentan en la etapa [{id, nombre_proyecto, ...}]
 * @param {Array}  p.calificaciones calificaciones de la etapa [{equipo_id, jurado_id, puntajes, total, no_presento, ...}]
 * @param {Array}  p.sanciones     [{equipo_id, tipo, motivo}]
 * @param {Array}  p.desempates    [{id, equipos:[ids en orden], motivo}]
 * @returns {Array} filas ordenadas: {equipo, califs, promedio, porCriterio, puesto, empate, sancion, desempate, clasifica}
 */
export function calcularEtapa({ etapa, equipos, calificaciones, sanciones = [], desempates = [] }) {
  const clasifican = etapaDe(etapa)?.clasifican ?? 0;
  const filas = equipos.map((e) => {
    const califs = calificaciones.filter((c) => c.equipo_id === e.id);
    const totales = califs.map((c) => (c.no_presento ? 0 : Number(c.total) || 0));
    const porCriterio = {};
    for (const cr of CRITERIOS) porCriterio[cr.id] = prom(califs.map((c) => (c.no_presento ? 0 : Number(c.puntajes?.[cr.id]) || 0)));
    return {
      equipo: e,
      califs,
      promedio: prom(totales),
      porCriterio,
      sancion: sanciones.find((s) => s.equipo_id === e.id) || null,
      puesto: null, empate: false, desempate: null, clasifica: false,
    };
  });

  // Posición manual por desempate en sala: el último registro que incluya a ambos manda
  const manual = (a, b) => {
    for (let i = desempates.length - 1; i >= 0; i--) {
      const d = desempates[i];
      const ia = d.equipos.indexOf(a.equipo.id), ib = d.equipos.indexOf(b.equipo.id);
      if (ia >= 0 && ib >= 0) return { orden: ia - ib, d };
    }
    return null;
  };
  // Compara por promedio exacto y luego por criterios de mayor peso
  const automatico = (a, b) => {
    if (Math.abs(b.promedio - a.promedio) > EPS) return b.promedio - a.promedio;
    for (const id of ORDEN_DESEMPATE) {
      const d = (b.porCriterio[id] ?? 0) - (a.porCriterio[id] ?? 0);
      if (Math.abs(d) > EPS) return d;
    }
    return 0;
  };

  const enJuego = filas.filter((f) => !f.sancion && f.promedio != null);
  const fuera = filas.filter((f) => f.sancion || f.promedio == null);
  enJuego.sort((a, b) => automatico(a, b) || manual(a, b)?.orden || 0);

  // Puestos y empates sin resolver
  enJuego.forEach((f, i) => {
    const prev = enJuego[i - 1];
    if (prev && automatico(prev, f) === 0) {
      const m = manual(prev, f);
      if (m) { f.desempate = m.d; prev.desempate = m.d; f.puesto = i + 1; }
      else { f.empate = true; prev.empate = true; f.puesto = prev.puesto; }
    } else f.puesto = i + 1;
  });
  enJuego.forEach((f) => { f.clasifica = f.puesto != null && f.puesto <= clasifican; });

  fuera.sort((a, b) => (a.sancion ? 1 : 0) - (b.sancion ? 1 : 0) || String(a.equipo.nombre_proyecto).localeCompare(String(b.equipo.nombre_proyecto)));
  return [...enJuego, ...fuera];
}

// Empate que afecta a quién clasifica / gana (para avisar al admin)
export function empateCritico(filas, clasifican) {
  return filas.some((f) => f.empate && f.puesto != null && f.puesto <= clasifican);
}

export const redondear = (n) => (n == null ? null : Math.round(n));
export const unDecimal = (n) => (n == null ? "—" : (Math.round(n * 10) / 10).toLocaleString("es-PE", { maximumFractionDigits: 1 }));
