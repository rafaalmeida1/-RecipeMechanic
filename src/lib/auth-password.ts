/** Valida senha de utilizador: mínimo 8 caracteres, máx. 128. */
export function isValidUserPassword(
  s: string,
): { ok: true } | { ok: false; error: string } {
  if (s.length < 8) {
    return { ok: false, error: "A senha deve ter pelo menos 8 caracteres." };
  }
  if (s.length > 128) {
    return { ok: false, error: "A senha é demasiado longa." };
  }
  return { ok: true };
}
