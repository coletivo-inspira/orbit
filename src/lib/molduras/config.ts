/**
 * Monetization is undecided. This is the single switch for how "Orbit+" frames behave:
 * - "simulado": shown with an Orbit+ tag and unlocked by a demo button. No payment, no backend.
 * - "conquista": everything is free; Orbit+ frames unlock through their fallback achievement.
 * - "desligado": Orbit+ frames are hidden altogether.
 * A real subscription or one-off purchase would replace "simulado" with a check from the backend.
 */
export type OrbitPlusModo = "simulado" | "conquista" | "desligado";

export const ORBIT_PLUS: { modo: OrbitPlusModo; nome: string; aviso: string } = {
  modo: "simulado",
  nome: "Orbit+",
  aviso: "Simulação do Modo Explorar: nenhuma cobrança é feita e nada sai deste aparelho.",
};
