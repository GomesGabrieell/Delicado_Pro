const monthFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'long', year: 'numeric', timeZone: 'UTC',
});
const dayFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'full', timeZone: 'UTC',
});
const shortMonthFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'short', timeZone: 'UTC',
});

export function today() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function shiftMonth(date: Date, offset: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1));
}

export function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function monthLabel(date: Date) {
  const label = monthFormatter.format(date);
  return label[0].toLocaleUpperCase('pt-BR') + label.slice(1);
}

export function fullDayLabel(date: Date) {
  return dayFormatter.format(date);
}

export function shortDayLabel(date: Date, compact: boolean) {
  const day = date.getUTCDate();
  return day === 1 && !compact ? `${day} ${shortMonthFormatter.format(date)}` : String(day);
}

export function calendarWeeks(month: Date) {
  const first = shiftMonth(month, 0);
  const daysInMonth = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const daysBeforeMonth = first.getUTCDay();
  const weeks: Date[][] = [];

  for (let index = 0; index < daysBeforeMonth + daysInMonth; index += 7) {
    weeks.push(Array.from({ length: 7 }, (_, weekday) =>
      new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1 - daysBeforeMonth + index + weekday))));
  }
  return weeks;
}
