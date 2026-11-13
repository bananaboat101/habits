import { SLOTS, isDay, maxFor, sanitizeSettings, sanitizePrefs } from './logic.js';
export const FORMAT = 3;
const READABLE = [2, 3];
export function exportFileName(today) { return `Habits-${today}.json`; }
const toUnits = (slot, v) => (slot === 'h1' ? v / 100 : v);
export function buildExport({ days, checks, settings, prefs }, exportedAt, appVersion) {
  const byDay = new Map();
  const row = (d) => {
    if (!byDay.has(d)) byDay.set(d, { date: d, h1: null, h2: 0, h3: 0, done: false });
    return byDay.get(d);
  };
  for (const x of days) row(x.day)[x.slot] = toUnits(x.slot, x.value);
  for (const d of checks) row(d).done = true;
  const habits = {};
  for (const s of SLOTS) {
    const h = settings.habits[s];
    habits[s] = { name: h.shortName, note: h.note, target: toUnits(s, h.target) };
    if (s === 'h1') Object.assign(habits[s], { greenBelow: toUnits(s, h.lo), redAbove: toUnits(s, h.hi) });
  }
  return {
    app: 'Habits', format: FORMAT, appVersion, exportedAt,
    settings: { startDate: settings.startDay, habits },
    preferences: prefs,
    days: [...byDay.values()].sort((a, b) => (a.date < b.date ? -1 : 1)),
  };
}
const fromUnits = (slot, x) => {
  if (typeof x !== 'number' || !Number.isFinite(x) || x < 0) return null;
  const v = slot === 'h1' ? Math.round(x * 100) : x;
  return Number.isInteger(v) && v <= maxFor(slot) ? v : null;
};
export function parseImport(text, today) {
  let o;
  try { o = JSON.parse(text); } catch { throw new Error('The file is not a valid JSON file.'); }
  if (!o || o.app !== 'Habits' || !READABLE.includes(o.format) || !Array.isArray(o.days) || !o.settings) {
    throw new Error('The file is not a Habits export.');
  }
  const days = [];
  const checks = [];
  const seen = new Set();
  for (const r of o.days) {
    if (!r || !isDay(r.date) || seen.has(r.date)) throw new Error('Invalid or duplicate day in the file.');
    seen.add(r.date);
    for (const s of SLOTS) {
      const raw = r[s];
      if (s === 'h1' && o.format >= 3 && (raw === null || raw === undefined)) continue;
      const v = fromUnits(s, raw ?? 0);
      if (v === null || (s !== 'h1' && v > 1)) throw new Error(`Invalid value on ${r.date}.`);
      const keep = s === 'h1' && o.format >= 3 ? true : v > 0;
      if (keep) days.push({ slot: s, day: r.date, value: v });
    }
    if (r.done === true) checks.push(r.date);
  }
  const hs = (o.settings && o.settings.habits) || {};
  const habits = {};
  for (const s of SLOTS) {
    const h = hs[s] || {};
    habits[s] = { shortName: h.name, note: h.note, target: fromUnits(s, h.target), lo: fromUnits(s, h.greenBelow), hi: fromUnits(s, h.redAbove) };
  }
  const settings = sanitizeSettings({ startDay: o.settings.startDate, habits }, today);
  return { days, checks, settings, prefs: sanitizePrefs(o.preferences) };
}
