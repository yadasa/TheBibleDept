export function readingDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function readingStreak(days: string[], today = new Date()) {
  const completed = new Set(days), cursor = new Date(today);
  if (!completed.has(readingDay(cursor))) cursor.setDate(cursor.getDate()-1);
  let streak = 0;
  while (completed.has(readingDay(cursor))) { streak++; cursor.setDate(cursor.getDate()-1); }
  return streak;
}
