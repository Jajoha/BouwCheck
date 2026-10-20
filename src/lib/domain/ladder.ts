/** Pure rekenregels voor prijzen en founding members (testbaar, geen I/O). */

/** Vanaf hoeveel projecten per jaar is Pro goedkoper dan losse projectpassen? */
export function proBreakEvenProjects(projectpas: number, proMonthly: number): number {
  return Math.floor((proMonthly * 12) / projectpas) + 1;
}

/** Jaarkosten bij `projects` projecten: losse projectpassen tegenover Pro. */
export function yearlyCosts(projects: number, projectpas: number, proMonthly: number) {
  return { projectpassen: projects * projectpas, pro: proMonthly * 12 };
}

/** Founding members stromen per kwartaal in: de eerste dag van het volgende kwartaal (JJJJ-MM-DD). */
export function nextIntakeDate(todayIso: string): string {
  const [y, m] = todayIso.split("-").map(Number);
  const nextQuarterMonth = Math.floor((m - 1) / 3) * 3 + 4; // 4, 7, 10 of 13
  return nextQuarterMonth > 12 ? `${y + 1}-01-01` : `${y}-${String(nextQuarterMonth).padStart(2, "0")}-01`;
}

/** Vrije plekken in een regio; nooit negatief. */
export function freeSeats(capacity: number, taken: number): number {
  return Math.max(0, capacity - taken);
}
