import * as db from './db.js';
import {
  SLOTS, buildMap, todayStr, dayValue, sanitizeSettings, sanitizePrefs, defaultSettings, maxFor,
} from './logic.js';
export const state = {
  checks: [],
  prefs: sanitizePrefs(null),
  settings: defaultSettings(todayStr()),
  map: new Map(),
};
export const TILE_COLORS = [
  { name: 'Default', value: '#111113' },
  { name: 'Gray', value: '#1E1E22' },
  { name: 'Blue', value: '#0E1A2E' },
  { name: 'Violet', value: '#1D1530' },
  { name: 'Amber', value: '#2A1F0B' },
  { name: 'Red', value: '#2B1213' },
];
export function tileColor(slot) {
  const c = state.prefs.colors[slot];
  return TILE_COLORS.some((t) => t.value === c) ? c : TILE_COLORS[0].value;
}
export function habit(slot) { return state.settings.habits[slot]; }
const listeners = new Set();
export function subscribe(fn) { listeners.add(fn); }
function changed() {
  state.map.checks = new Set(state.checks.map((c) => c.day));
  state.map.checkSince = state.settings.startDay;
  for (const fn of listeners) fn();
}
const nowIso = () => new Date().toISOString();
const withKey = (d) => ({ key: `${d.slot}|${d.day}`, slot: d.slot, day: d.day, value: d.value });
export async function init() {
  const data = await db.loadAll();
  const today = todayStr();
  state.prefs = sanitizePrefs(data.prefs);
  state.checks = data.checks;
  state.settings = sanitizeSettings(data.settings, today);
  if (!data.settings) await db.setMeta('settings', state.settings);
  state.map = buildMap(data.days);
  changed();
}
export function allDays() {
  return [...state.map].map(([k, value]) => {
    const [slot, day] = k.split('|');
    return { slot, day, value };
  });
}
export async function setDayValue(slot, day, value) {
  const v = Math.max(0, Math.min(slot === 'h1' ? maxFor(slot) : 1, Math.round(value)));
  const key = `${slot}|${day}`;
  if (v === dayValue(state.map, slot, day) && (slot !== 'h1' || state.map.has(key))) return false;
  const keep = v || slot === 'h1';
  if (keep) state.map.set(key, v); else state.map.delete(key);
  if (keep) await db.put('days', withKey({ slot, day, value: v })); else await db.del('days', key);
  changed();
  return true;
}
export async function clearDayValue(slot, day) {
  const key = `${slot}|${day}`;
  if (!state.map.has(key)) return false;
  state.map.delete(key);
  await db.del('days', key);
  changed();
  return true;
}
export function isDayChecked(day) { return state.checks.some((c) => c.day === day); }
export async function toggleCheck(day) {
  if (isDayChecked(day)) {
    state.checks = state.checks.filter((c) => c.day !== day);
    await db.del('checks', day);
  } else {
    const c = { day, createdAt: nowIso() };
    state.checks.push(c);
    await db.put('checks', c);
  }
  changed();
}
export async function setPrefs(patch) {
  state.prefs = sanitizePrefs({ ...state.prefs, ...patch, colors: { ...state.prefs.colors, ...(patch.colors || {}) } });
  await db.setMeta('prefs', state.prefs);
  changed();
}
async function saveSettings(next) {
  state.settings = sanitizeSettings(next, todayStr());
  await db.setMeta('settings', state.settings);
  changed();
}
export function setHabit(slot, patch) {
  const s = state.settings;
  return saveSettings({ ...s, habits: { ...s.habits, [slot]: { ...s.habits[slot], ...patch } } });
}
export function setStartDay(day) { return saveSettings({ ...state.settings, startDay: day }); }
export async function replaceAll({ days, checks, settings, prefs }) {
  const today = todayStr();
  const s = sanitizeSettings(settings, today);
  const p = sanitizePrefs(prefs);
  const cs = checks.map((day) => ({ day, createdAt: nowIso() }));
  const ds = days.map(withKey);
  await db.replaceAll({ days: ds, checks: cs, settings: s, prefs: p });
  Object.assign(state, { checks: cs, settings: s, prefs: p, map: buildMap(ds) });
  changed();
}
export const clearAll = () => replaceAll({ days: [], checks: [], settings: null, prefs: null });
export { SLOTS };
