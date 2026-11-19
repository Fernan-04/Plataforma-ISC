// Conexión a Supabase (proyecto solo de ISC UTP, tablas isc_*).
// La clave "anon" es pública por diseño: las tablas están cerradas y
// todo pasa por funciones que validan el código de cada persona.
// Clave "publishable" (pública). NUNCA poner aquí la service_role / secret.
export const SUPABASE_URL = "https://lxjigvlwudgsinbmmqmx.supabase.co";
export const SUPABASE_KEY = "sb_publishable_j0zD_jn2hKt9SJPRwdez6w_m9IA_Q-k";

// Cada cuántos segundos se actualiza el panel de admin en vivo
export const SEGUNDOS_REFRESCO = 4;
