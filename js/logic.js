export const SLOTS = ['h1', 'h2', 'h3'];
export const SLOT_DEF = {
  h1: { kind: 'daily', defaults: { shortName: 'H1', note: '', target: 100, lo: 75, hi: 125 } },
  h2: { kind: 'monthly', defaults: { shortName: 'H2', note: '', target: 10 } },
  h3: { kind: 'monthly', defaults: { shortName: 'H3', note: '', target: 15 } },
};
export const AMOUNT_STEP = 25;
export const NOTE_MAX = 30;
export const AMOUNT_MAX = 9999;
export const MONTH_MAX = 31;
export const STATUS_LABEL = {
  exceeded: 'Exceeded', reached: 'Reached', missed: 'Missed', open: 'Open', skipped: 'Skipped',
};
const pad = (n) => String(n).padStart(2, '0');
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
export const isDay = (d) => typeof d === 'string' && DAY_RE.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`));
export function dayFromDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function todayStr(now = new Date()) { return dayFromDate(now); }
function toUTC(day) {
  const [y, m, d] = day.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}
function fromUTC(ms) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
export function addDays(day, n) { return fromUTC(toUTC(day) + n * 86400000); }
export function diffDays(a, b) { return Math.round((toUTC(b) - toUTC(a)) / 86400000); }
export function weekdayIdx(day) { return (new Date(toUTC(day)).getUTCDay() + 6) % 7; }
export function weekStart(day) { return addDays(day, -weekdayIdx(day)); }
export function daysInMonth(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
export function monthStart(y, m) { return `${y}-${pad(m)}-01`; }
export function monthEnd(y, m) { return `${y}-${pad(m)}-${pad(daysInMonth(y, m))}`; }
export function dayRange(start, end) {
  const out = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}
export function isoWeek(day) {
  const th = addDays(weekStart(day), 3);
  const y = Number(th.slice(0, 4));
  return Math.floor(diffDays(`${y}-01-01`, th) / 7) + 1;
}
const maxDay = (a, b) => (a > b ? a : b);
const minDay = (a, b) => (a < b ? a : b);
export function fmtH(h, exact = false) {
  const neg = h < 0;
  let a = Math.abs(Math.round(h));
  if (!exact) a = Math.round(a / 10) * 10;
  let s = String(Math.floor(a / 100));
  const frac = a % 100;
  if (frac) s += `.${pad(frac).replace(/0$/, '')}`;
  return (neg ? '−' : '') + s;
}
export function fmtVal(slot, v) { return slot === 'h1' ? fmtH(v) : String(Math.round(v)); }
export function parseH(text) {
  const t = String(text).trim().replace(',', '.');
  if (!/^\d{1,2}(\.\d{1,2})?$/.test(t)) return null;
  return Math.round(Number(t) * 100);
}
export function defaultSettings(today) {
  return { startDay: today, habits: Object.fromEntries(SLOTS.map((s) => [s, { ...SLOT_DEF[s].defaults }])) };
}
export const maxFor = (slot) => (slot === 'h1' ? AMOUNT_MAX : MONTH_MAX);
export function sanitizeSettings(s, today) {
  const out = defaultSettings(today);
  if (!s || typeof s !== 'object') return out;
  if (isDay(s.startDay)) out.startDay = s.startDay;
  for (const slot of SLOTS) {
    const h = s.habits && s.habits[slot];
    if (!h || typeof h !== 'object') continue;
    const o = out.habits[slot];
    if (typeof h.shortName === 'string' && h.shortName.trim()) o.shortName = h.shortName.trim().toUpperCase().slice(0, 3);
    if (typeof h.note === 'string') o.note = h.note.replace(/\s+/g, ' ').trim().slice(0, NOTE_MAX);
    const ok = (x) => Number.isInteger(x) && x >= 0 && x <= maxFor(slot);
    if (slot === 'h1') {
      if (ok(h.target) && ok(h.lo) && ok(h.hi) && h.lo <= h.target && h.target <= h.hi) {
        o.target = h.target; o.lo = h.lo; o.hi = h.hi;
      }
    } else if (ok(h.target)) o.target = h.target;
  }
  return out;
}
const COLOR_RE = /^#[0-9A-Fa-f]{6}$/;
export const BACKUP_MODES = ['never', 'weekly', 'monthly'];
export function backupPeriodKey(mode, today) {
  if (mode === 'weekly') return weekStart(today);
  if (mode === 'monthly') return today.slice(0, 7);
  return null;
}
export function backupDue(prefs, today) {
  const key = backupPeriodKey(prefs.backupReminder, today);
  return key !== null && prefs.backupAsked !== key;
}
export function sanitizePrefs(p) {
  const out = { colors: {}, statsMode: 'W', backupReminder: 'never', backupAsked: null };
  if (!p || typeof p !== 'object') return out;
  const mode = p.statsMode === 'J' ? 'Y' : p.statsMode;
  if (['W', 'M', 'Y'].includes(mode)) out.statsMode = mode;
  if (BACKUP_MODES.includes(p.backupReminder)) out.backupReminder = p.backupReminder;
  if (typeof p.backupAsked === 'string' && /^\d{4}-\d{2}(-\d{2})?$/.test(p.backupAsked)) out.backupAsked = p.backupAsked;
  if (p.colors && typeof p.colors === 'object') {
    for (const s of SLOTS) if (typeof p.colors[s] === 'string' && COLOR_RE.test(p.colors[s])) out.colors[s] = p.colors[s];
  }
  return out;
}
export function buildMap(days, checks = [], checkSince = null) {
  const m = new Map();
  for (const d of days) if (d.value || d.slot === 'h1') m.set(`${d.slot}|${d.day}`, d.value);
  m.checks = new Set(checks);
  m.checkSince = checkSince;
  return m;
}
export function dayValue(map, slot, day) { return map.get(`${slot}|${day}`) || 0; }
export function hasEntry(map, slot, day) { return map.has(`${slot}|${day}`); }
export function sumRange(map, slot, start, end) {
  let s = 0;
  for (let d = start; d <= end; d = addDays(d, 1)) s += dayValue(map, slot, d);
  return s;
}
export function countIn(map, cfg, slot, start, end, today) {
  if (end < cfg.startDay) return 0;
  let s = 0;
  for (let d = maxDay(start, cfg.startDay); d <= end && d <= today; d = addDays(d, 1)) {
    if (isChecked(map, d)) s += dayValue(map, slot, d);
  }
  return s;
}
export function isChecked(map, day) { return !!(map.checks && map.checks.has(day)); }
export function dayFinished(map, day, today) { return day < today || isChecked(map, day); }
export function isSkipped(map, day, today) {
  return !!map.checkSince && day >= map.checkSince && day < today && !isChecked(map, day);
}
export function unconfirmedDays(map, cfg, today) {
  let n = 0;
  for (let d = cfg.startDay; d < today; d = addDays(d, 1)) if (!isChecked(map, d)) n++;
  return n;
}
export function firstUnconfirmedDay(map, cfg, today) {
  for (let d = cfg.startDay; d < today; d = addDays(d, 1)) if (!isChecked(map, d)) return d;
  return null;
}
export function amountStatus(value, lo, hi, finished) {
  if (value > hi) return 'missed';
  if (!finished) return 'open';
  return value < lo ? 'exceeded' : 'reached';
}
export function countStatus(value, target, finished) {
  if (value > target) return 'exceeded';
  if (value === target) return 'reached';
  return finished ? 'missed' : 'open';
}
export const isSuccess = (s) => s === 'exceeded' || s === 'reached';
export function dayStatus(map, cfg, slot, day, today) {
  if (day < cfg.startDay) return 'before';
  if (day > today) return 'future';
  if (!dayFinished(map, day, today)) return 'open';
  if (isSkipped(map, day, today)) return 'skipped';
  if (slot === 'h1') {
    const h = cfg.habits.h1;
    return amountStatus(dayValue(map, slot, day), h.lo, h.hi, true);
  }
  return dayValue(map, slot, day) > 0 ? 'done' : 'none';
}
export function monthTarget(cfg, slot, y, m) {
  const s = monthStart(y, m), e = monthEnd(y, m);
  if (e < cfg.startDay) return null;
  const from = maxDay(s, cfg.startDay);
  const f = (diffDays(from, e) + 1) / daysInMonth(y, m);
  return Math.round(cfg.habits[slot].target * f);
}
export function avgDays(map, cfg, start, end, today) {
  const out = [];
  for (let d = maxDay(start, cfg.startDay); d <= end && d <= today; d = addDays(d, 1)) {
    if (!dayFinished(map, d, today) || isSkipped(map, d, today)) continue;
    out.push(d);
  }
  return out;
}
export function amountAvg(map, cfg, start, end, today) {
  const days = avgDays(map, cfg, start, end, today);
  if (!days.length) return null;
  let s = 0;
  for (const d of days) s += dayValue(map, 'h1', d);
  return s / days.length;
}
export function rangeFor(mode, offset, today) {
  if (mode === 'W') {
    const s = addDays(weekStart(today), offset * 7);
    return { mode, start: s, end: addDays(s, 6) };
  }
  const y0 = Number(today.slice(0, 4));
  if (mode === 'M') {
    const idx = y0 * 12 + (Number(today.slice(5, 7)) - 1) + offset;
    const y = Math.floor(idx / 12), m = (idx % 12) + 1;
    return { mode, start: monthStart(y, m), end: monthEnd(y, m), y, m };
  }
  const y = y0 + offset;
  return { mode, start: `${y}-01-01`, end: `${y}-12-31`, y };
}
export function headline(map, cfg, slot, range, today) {
  const finished = range.end < today;
  if (slot === 'h1') {
    const h = cfg.habits.h1;
    const v = amountAvg(map, cfg, range.start, range.end, today);
    return { kind: 'avg', value: v, target: h.target, status: v === null ? 'open' : amountStatus(v, h.lo, h.hi, finished) };
  }
  const value = countIn(map, cfg, slot, range.start, range.end, today);
  let t = null;
  if (range.mode === 'M') t = monthTarget(cfg, slot, range.y, range.m);
  else if (range.mode === 'Y') {
    for (let m = 1; m <= 12; m++) {
      const mt = monthTarget(cfg, slot, range.y, m);
      if (mt !== null) t = (t || 0) + mt;
    }
  }
  return { kind: 'sum', value, target: t, status: t === null ? null : countStatus(value, t, finished) };
}
export function goalRate(map, cfg, slot, range, today) {
  let n = 0, ok = 0;
  if (slot === 'h1') {
    const h = cfg.habits.h1;
    for (let d = maxDay(range.start, cfg.startDay); d <= minDay(range.end, today); d = addDays(d, 1)) {
      if (!dayFinished(map, d, today) || isSkipped(map, d, today)) continue;
      n++;
      if (isSuccess(amountStatus(dayValue(map, slot, d), h.lo, h.hi, true))) ok++;
    }
  } else {
    if (range.mode === 'W') return null;
    const months = range.mode === 'M' ? [range.m] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    for (const m of months) {
      if (monthEnd(range.y, m) >= today) continue;
      const t = monthTarget(cfg, slot, range.y, m);
      if (t === null) continue;
      n++;
      if (countIn(map, cfg, slot, monthStart(range.y, m), monthEnd(range.y, m), today) >= t) ok++;
    }
  }
  return n === 0 ? null : Math.round((ok / n) * 100);
}
export function currentStreak(map, cfg, slot, today) {
  let count = 0;
  if (slot === 'h1') {
    const h = cfg.habits.h1;
    for (let d = today; d >= cfg.startDay; d = addDays(d, -1)) {
      if (isSkipped(map, d, today)) continue;
      const fin = dayFinished(map, d, today);
      const st = amountStatus(dayValue(map, slot, d), h.lo, h.hi, fin);
      if (!fin) { if (isSuccess(st)) count++; continue; }
      if (isSuccess(st)) count++; else break;
    }
    return count;
  }
  let y = Number(today.slice(0, 4)), m = Number(today.slice(5, 7));
  let first = true;
  for (;;) {
    const t = monthTarget(cfg, slot, y, m);
    if (t === null) break;
    const ok = countIn(map, cfg, slot, monthStart(y, m), monthEnd(y, m), today) >= t;
    const fin = monthEnd(y, m) < today;
    if (first && !fin) { if (ok) count++; } else if (ok) count++; else break;
    first = false;
    m -= 1;
    if (m === 0) { m = 12; y -= 1; }
  }
  return count;
}
export function bars(map, cfg, slot, range, today) {
  const h = cfg.habits[slot];
  const amt = slot === 'h1';
  const out = [];
  if (range.mode !== 'Y') {
    for (const d of dayRange(range.start, range.end)) {
      out.push({
        key: d, day: d, value: dayValue(map, slot, d), status: dayStatus(map, cfg, slot, d, today),
        future: d > today, before: d < cfg.startDay, target: amt ? h.target : null,
      });
    }
    return out;
  }
  for (let m = 1; m <= 12; m++) {
    const s = monthStart(range.y, m), e = monthEnd(range.y, m);
    const base = { key: s, month: m, future: s > today, before: e < cfg.startDay };
    if (amt) {
      const v = amountAvg(map, cfg, s, e, today);
      out.push({ ...base, value: v === null ? 0 : v, avg: true, empty: v === null, target: h.target,
        status: v === null ? null : amountStatus(v, h.lo, h.hi, e < today) });
    } else {
      const t = monthTarget(cfg, slot, range.y, m);
      const v = countIn(map, cfg, slot, s, e, today);
      out.push({ ...base, value: v, target: t, status: t === null ? null : countStatus(v, t, e < today) });
    }
  }
  return out;
}
export function monthStrip(map, cfg, slot, y, m, today) {
  return dayRange(monthStart(y, m), monthEnd(y, m)).map((d) => ({ day: d, status: dayStatus(map, cfg, slot, d, today) }));
}
