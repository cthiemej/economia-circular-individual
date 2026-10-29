export function writeErrorMessage(error: { code?: string; message?: string }, canEdit = true) {
  if (!canEdit) return "No tienes permiso para guardar";
  if (error.code === "42501" || /row.level.security|permission denied|etapa.*cerrada/i.test(error.message ?? "")) return "Esta etapa ya no se puede editar";
  if (/fetch|network|connection/i.test(error.message ?? "")) return "No se pudo conectar. Intenta guardar nuevamente.";
  return "No se pudo guardar. Revisa los datos e intenta nuevamente.";
}
