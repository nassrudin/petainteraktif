const dashboardDateFormat = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

export function formatDashboardDate(value?: string): string {
  if (!value) return 'Belum tersedia';
  // Earlier records stored UTC ISO timestamps with the T/Z removed.
  const timestamp = Date.parse(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
  return Number.isFinite(timestamp) ? `${dashboardDateFormat.format(timestamp)} WIB` : 'Tanggal tidak tersedia';
}
