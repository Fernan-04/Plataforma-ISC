// =========================================================
// ISC UTP 2027 · FUENTE ÚNICA de la competencia y la rúbrica
// Sale de las bases oficiales (secciones VI y VII), no del Excel.
// Si cambias un puntaje aquí, hay que cambiarlo también en la
// tabla isc_criterios de la base; si no, la base rechaza el voto.
// =========================================================

export const COMPETENCIA = {
  nombre: "ISC UTP 2027",
  programa: "Impact Startup Competition 2027 · Programa Local UTP",
  desafio: "Amazonía Viva: Innovación para Conservar, Prosperar y Transformar",
  premio: "Beca completa para el Impact Bootcamp Internacional",
  webs: ["www.impactstartupcompetition.com", "www.scaleup4.com"],
  instagram: { usuario: "@iscutp", url: "https://www.instagram.com/iscutp/" },
};

// Ejes del desafío: cada proyecto se alinea con al menos uno
export const EJES = [
  { id: "bioeconomia", n: "01", nombre: "Bioeconomía" },
  { id: "biodiversidad", n: "02", nombre: "Biodiversidad" },
  { id: "comunidades", n: "03", nombre: "Comunidades Amazónicas" },
];

// Etapas (hora de Perú). Los minutos los puede cambiar el admin.
export const ETAPAS = [
  { id: "semifinal", nombre: "Semifinal Local", corto: "Semifinal", fecha: "2026-11-25", dia: "Miércoles 25/11", hora: "7:00 – 9:15 p. m.", modalidad: "Virtual (Zoom)", clasifican: 3, jurados: 4 },
  { id: "final", nombre: "Final Local UTP", corto: "Final", fecha: "2026-11-28", dia: "Sábado 28/11", hora: "9:30 a. m. – 12:30 p. m.", modalidad: "Presencial", clasifican: 1, jurados: 4 },
];

// Tiempo por equipo. Decisión de Andy (18/11/2026): las preguntas del jurado NO tienen
// límite de tiempo (preguntas: null). El admin puede cambiar los minutos en Ajustes.
export const TIEMPOS = { pitch: 5, preguntas: null, cambio: 1 };
export const textoTiempos = (t = TIEMPOS) =>
  `${t.pitch} min de pitch + ${t.preguntas ? `${t.preguntas} min de preguntas` : "preguntas sin límite"}`;

// Fecha límite para que los equipos suban su PDF: martes 24/11/2026, 11:59 p. m. (Perú)
export const FECHA_LIMITE = "2026-11-24T23:59:00-05:00";

// Reglas de los equipos
export const EQUIPO_REGLAS = { min: 2, max: 5, maxExternos: 1, maxEgresados: 1 };

// Revisa la lista completa de integrantes. Devuelve el error en texto, o null si está bien.
// (La base de datos hace la misma revisión: esto solo avisa antes de guardar.)
export function validarIntegrantes(lista) {
  const R = EQUIPO_REGLAS;
  const n = lista.length;
  if (n < R.min || n > R.max) return `El equipo debe tener de ${R.min} a ${R.max} integrantes (ahora tiene ${n}).`;
  if (lista.some((i) => !String(i.nombres || "").trim() || !String(i.apellidos || "").trim())) return "Cada integrante necesita nombres y apellidos.";
  if (lista.filter((i) => i.tipo === "externo").length > R.maxExternos) return "Máximo 1 integrante externo a UTP por equipo.";
  if (lista.filter((i) => i.tipo === "egresado").length > R.maxEgresados) return "Máximo 1 egresado por equipo.";
  if (lista.filter((i) => i.es_lider).length !== 1) return "Marca a una persona como líder del equipo.";
  return null;
}
export const TIPOS_INTEGRANTE = [
  { id: "utp", nombre: "Estudiante UTP" },
  { id: "externo", nombre: "Externo a UTP" },
  { id: "egresado", nombre: "Egresado" },
];

export const NIVELES = ["Excelente", "Muy bueno", "Bueno", "Regular", "Deficiente"];
const pasos = (max) => [1, 0.8, 0.6, 0.4, 0.2].map((f) => Math.round(max * f));

// 5 criterios, total 100. Niveles de 100 % a 20 % del peso (todos enteros).
// «Preguntas guía»: vienen del Excel «Rúbrica – UTP Lima», solo como ayuda.
export const CRITERIOS = [
  {
    id: "c1", nombre: "Equipo", max: 30,
    que: "Cohesión, habilidades complementarias y compromiso.",
    niveles: [
      "Presenta a cada integrante, su rol y su aporte; explica claramente por qué son el equipo indicado; muestra lo que ya hicieron y cuánto tiempo dedican; todos responden con solvencia.",
      "Roles claros y complementarios; buen compromiso; casi todos dominan el proyecto.",
      "Roles presentados, pero el aporte o el compromiso se explican a medias; las respuestas dependen de una o dos personas.",
      "No queda claro quién hace qué ni por qué son el equipo indicado.",
      "No presenta al equipo o no conoce su propio proyecto.",
    ],
    guia: [
      "¿El equipo tiene las habilidades técnicas y de negocio necesarias para ejecutar el proyecto?",
      "¿Existe una complementariedad clara entre los miembros del equipo?",
      "¿El equipo tiene experiencia previa relevante para abordar el desafío propuesto?",
      "¿Cómo maneja el equipo la toma de decisiones y los conflictos?",
      "¿El equipo muestra compromiso y dedicación a largo plazo?",
    ],
  },
  {
    id: "c2", nombre: "Idea", max: 25,
    que: "Innovación y alineación con los ODS.",
    niveles: [
      "Problema y solución claros y breves; diferencial claro frente a lo que ya existe; ODS bien justificado.",
      "Idea clara e innovadora; ODS indicado con una justificación razonable.",
      "Idea entendible, pero con poco diferencial o un ODS mencionado sin justificar.",
      "Problema o solución confusos; parecido a lo que ya existe.",
      "No se entiende el problema ni la solución.",
    ],
    guia: [
      "¿El problema que resuelven es relevante para el mercado objetivo?",
      "¿Han realizado un análisis competitivo para posicionar su producto?",
      "¿Está alineado con alguno de los ODS de la ONU?",
    ],
  },
  {
    id: "c3", nombre: "Impacto y Desafío 2027", max: 20,
    que: "Cambio positivo en la sociedad o el ambiente y alineación con un eje de Amazonía Viva.",
    niveles: [
      "Eje del desafío claro; quiénes se benefician, cuántos y qué cambia; al menos un indicador de impacto medible.",
      "Eje y beneficiarios claros; indicador poco preciso.",
      "Menciona el eje y el impacto, pero sin cifras ni indicador.",
      "Relación débil con la Amazonía o impacto genérico.",
      "No se alinea con el desafío.",
    ],
    guia: [
      "¿Cómo se alinea el proyecto con las verticales del desafío Amazonía Viva?",
      "¿El proyecto contribuye a conservar la biodiversidad, regenerar ecosistemas amazónicos o fortalecer su resiliencia?",
      "¿Involucra y beneficia de forma justa a comunidades indígenas y locales amazónicas?",
      "¿El impacto es medible y escalable? ¿Tiene mecanismos para medirlo (hectáreas conservadas, carbono, ingresos…)?",
      "¿El equipo ha considerado los efectos a largo plazo de su solución?",
    ],
  },
  {
    id: "c4", nombre: "Evidencia de Experimentación", max: 15,
    que: "Validación inicial con entrevistas, pruebas de concepto o investigación de mercado.",
    niveles: [
      "Datos reales (entrevistas, encuestas, prototipo) con números; explica qué aprendió y qué cambió gracias a la validación.",
      "Validación real con números, pero poco aprendizaje explicado.",
      "Alguna validación, sin cifras o muy pequeña.",
      "Solo supuestos o investigación de escritorio.",
      "No presenta evidencia.",
    ],
    guia: [
      "¿El proyecto ha realizado pruebas o validaciones tempranas (pilotos, prototipos, etc.)?",
      "¿Han recibido retroalimentación de usuarios o clientes potenciales?",
      "¿Existen métricas de éxito iniciales que respalden el proyecto?",
      "¿Tienen evidencia de demanda, ventas iniciales o tracción?",
    ],
  },
  {
    id: "c5", nombre: "Viabilidad", max: 10,
    que: "Capacidad de implementar a corto plazo con los recursos disponibles.",
    niveles: [
      "Recursos, costos aproximados y aliados claros; próximos pasos para los siguientes meses; modelo de ingresos o de sostenibilidad.",
      "Plan y recursos claros; sostenibilidad poco desarrollada.",
      "Próximos pasos generales, sin costos ni aliados.",
      "No explica cómo empezaría.",
      "No es viable o no lo aborda.",
    ],
    guia: [
      "¿El equipo ha identificado un mercado claro para su producto o servicio?",
      "¿El mercado está dispuesto a pagar por la solución propuesta?",
      "¿El modelo de negocio genera valor económico sostenible a partir del bosque en pie y la biodiversidad?",
    ],
  },
].map((c) => ({ ...c, puntos: pasos(c.max) }));

export const TOTAL = CRITERIOS.reduce((s, c) => s + c.max, 0); // 100
export const criterio = (id) => CRITERIOS.find((c) => c.id === id);
export const etapa = (id) => ETAPAS.find((e) => e.id === id);
export const eje = (id) => EJES.find((e) => e.id === id);

// Orden para el desempate: criterio de mayor peso primero (Equipo, Idea, Impacto…)
export const ORDEN_DESEMPATE = [...CRITERIOS].sort((a, b) => b.max - a.max).map((c) => c.id);
