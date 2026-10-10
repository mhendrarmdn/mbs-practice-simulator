export function exportGame(state) {
  const payload = {
    ...state,
    exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `mbs-${String(state.teamName || 'team').toLowerCase()}-r${state.currentRound}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function importGame(file) {
  if (!file) throw new Error('Tidak ada file yang dipilih.');
  const parsed = JSON.parse(await file.text());
  if (!Array.isArray(parsed.companies) || typeof parsed.currentRound !== 'number' || !parsed.draft) {
    throw new Error('Format save game tidak valid.');
  }
  return parsed;
}
