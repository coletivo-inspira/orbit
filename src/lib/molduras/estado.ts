import { getMoldura, isMolduraId, MOLDURA_PADRAO, MOLDURAS_INICIAIS, type MolduraId } from "./catalogo";
import { molduraVisivel, novasDesbloqueadas, type ContextoConquistas } from "./conquistas";
import { ORBIT_PLUS, type OrbitPlusModo } from "./config";

export interface EstadoMolduras {
  ativa: MolduraId;
  desbloqueadas: MolduraId[];
}

export const ESTADO_MOLDURAS_INICIAL: EstadoMolduras = { ativa: MOLDURA_PADRAO, desbloqueadas: MOLDURAS_INICIAIS };

/**
 * Validates frames restored from storage: known ids only, once each, starter frames always kept,
 * and the active one must be unlocked. Orbit+ entries are dropped when Orbit+ is switched off.
 * This is a demo: a real Orbit+ entitlement must be checked by the backend, never trusted from storage.
 */
export function sanitizarMolduras(raw: unknown, modo: OrbitPlusModo = ORBIT_PLUS.modo): EstadoMolduras | null {
  if (typeof raw !== "object" || raw === null) return null;
  const data = raw as Record<string, unknown>;
  const guardadas = Array.isArray(data.desbloqueadas) ? data.desbloqueadas.filter(isMolduraId) : [];
  const desbloqueadas = [...new Set([...MOLDURAS_INICIAIS, ...guardadas])].filter((id) =>
    molduraVisivel(getMoldura(id), modo),
  );
  const ativa = isMolduraId(data.ativa) && desbloqueadas.includes(data.ativa) ? data.ativa : MOLDURA_PADRAO;
  return { ativa, desbloqueadas };
}

/** Adds every frame the current activity has earned; returns the same object when nothing changed. */
export function aplicarConquistas(
  molduras: EstadoMolduras,
  ctx: Omit<ContextoConquistas, "desbloqueadas">,
  modo: OrbitPlusModo = ORBIT_PLUS.modo,
): EstadoMolduras {
  const novas = novasDesbloqueadas({ ...ctx, desbloqueadas: molduras.desbloqueadas }, modo);
  return novas.length ? { ...molduras, desbloqueadas: [...molduras.desbloqueadas, ...novas] } : molduras;
}
