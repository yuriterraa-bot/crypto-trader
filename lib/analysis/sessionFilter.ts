export function getCurrentSession() {
  const now = new Date();
  const utcHour = now.getUTCHours();

  let session = 'UNKNOWN';
  let nextSession = '';
  let confidenceMultiplier = 1.0;

  // Ásia: 00:00 - 08:00 UTC (menor volatilidade)
  // Londres: 07:00 - 16:00 UTC (alta volatilidade)
  // Nova York: 13:00 - 22:00 UTC (alta volatilidade)
  // Overlap Londres+NY: 13:00 - 16:00 UTC (máxima volatilidade)

  if (utcHour >= 13 && utcHour < 16) {
    session = 'OVERLAP_LONDON_NY';
    nextSession = 'NEW_YORK';
    confidenceMultiplier = 1.2;
  } else if (utcHour >= 16 && utcHour < 22) {
    session = 'NEW_YORK';
    nextSession = 'ASIA';
    confidenceMultiplier = 1.0;
  } else if (utcHour >= 7 && utcHour < 13) {
    session = 'LONDON';
    nextSession = 'OVERLAP_LONDON_NY';
    confidenceMultiplier = 1.0;
  } else if ((utcHour >= 0 && utcHour < 7) || utcHour >= 22) {
    session = 'ASIA';
    nextSession = 'LONDON';
    confidenceMultiplier = 0.7; // Reduce confidence in Asia session for breakouts
  }

  return {
    session,
    nextSession,
    confidenceMultiplier
  };
}
