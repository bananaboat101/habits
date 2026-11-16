const LANG_KEY = 'habits.lang';
const EN_WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const EN_MS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DE_WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const DE_MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const DE_MS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const STRINGS = {
  en: {
    weekdays: EN_WD, months: EN_MONTHS, monthsShort: EN_MS,
    dayLabel: (w, m, d) => `${w}, ${EN_MS[m - 1]} ${d}`,
    weekRange: (a, b) => {
      if (a.y !== b.y) return `${EN_MS[a.m - 1]} ${a.d}, ${a.y} – ${EN_MS[b.m - 1]} ${b.d}, ${b.y}`;
      if (a.m !== b.m) return `${EN_MS[a.m - 1]} ${a.d} – ${EN_MS[b.m - 1]} ${b.d}, ${b.y}`;
      return `${EN_MS[a.m - 1]} ${a.d}–${b.d}, ${b.y}`;
    },
    navNow: 'Now', navHistory: 'History', navSettings: 'Settings', navSections: 'Sections',
    today: 'Today', yesterday: 'Yesterday', prevDay: 'Previous day', nextDay: 'Next day',
    unconfirmedCount: (n) => (n === 1 ? '1 previous day unconfirmed' : `${n} previous days unconfirmed`),
    beforeStart: 'Before the start – this day does not count.',
    unconfirmedDay: 'Unconfirmed – this day doesn\'t count yet.',
    dayConfirmed: 'Day confirmed', confirmationRemoved: 'Confirmation removed',
    confirmDay: 'Confirm day', dayConfirmedTap: 'Day confirmed – tap to remove confirmation',
    tileAmount: (name, v, locked) => `${name}: ${v}.${locked ? ' Day confirmed.' : ' Tap: choose a value. Long press: reset.'}`,
    tileFresh: (name, locked) => `${name}: nothing entered yet.${locked ? '' : ' Tap: choose a value.'}`,
    tileToggle: (name, on) => `${name} ${on ? 'done' : 'not done'}`,
    numberRange: 'Please enter a number from 0 to 99 with up to two decimals.',
    apply: 'Apply', cancel: 'Cancel', otherValue: 'Other value', monthOverview: 'Month overview',
    modeShort: { W: 'W', M: 'M', Y: 'Y' }, modeName: { W: 'Week', M: 'Month', Y: 'Year' },
    prevPeriod: 'Previous period', nextPeriod: 'Next period',
    prevPeriodValue: (v) => `Previous period value ${v}`,
    notConfirmed: (day) => `${day}: not confirmed`,
    perDay: (month, v) => `${month}: ${v} per day`,
    chart: (name) => `Chart ${name}`,
    language: 'Language', start: 'Start', chooseDate: 'Please choose a date up to today.',
    daily: 'Daily', monthly: 'Monthly', name: 'Name', note: 'Note', targetDay: 'Target per day',
    greenBelow: 'Green below', redAbove: 'Red above', targetMonth: 'Target per month', tileColor: 'Tile color',
    colors: { Default: 'Default', Gray: 'Gray', Blue: 'Blue', Violet: 'Violet', Amber: 'Amber', Red: 'Red' },
    cannotBeEmpty: (label) => `${label} cannot be empty.`,
    decrease: (label) => `Decrease ${label}`, increase: (label) => `Increase ${label}`, tapToEnter: ', tap to enter',
    settingsFor: (name) => `Settings ${name}`, tileColorFor: (name) => `Tile color ${name}`,
    reminder: 'Reminder',
    reminderHint: 'iPhone: Shortcuts app → Automation → + → Time of Day → Run Immediately → Show Notification.\nAndroid: Clock app → Alarm → + → daily, with a label.',
    data: 'Data',
    dataHint: 'Your data is stored only on this phone. The export is a readable JSON file with one line per day.',
    exportReminder: 'Export reminder', never: 'Never', weekly: 'Weekly',
    exportData: 'Export data', importData: 'Import data', deleteAll: 'Delete all data',
    importConfirm: (file, n, m) => `Import “${file}”?\n${n} values, ${m} confirmed days.\nAll current data will be replaced.`,
    importDone: 'Import complete.', importFailed: (msg) => `Import failed: ${msg}`,
    notJson: 'The file is not a valid JSON file.', notHabits: 'The file is not a Habits export.',
    invalidDay: 'Invalid or duplicate day in the file.', invalidValue: (d) => `Invalid value on ${d}.`,
    deleteConfirm: 'Delete all entries and settings on this device? This cannot be undone.',
    deleted: 'All data deleted.',
    storageNote: 'Note: storage is not confirmed as persistent – add the app to your Home Screen and export regularly.',
    backup: 'Backup', newWeek: 'New week – export now?', newMonth: 'New month – export now?', yes: 'Yes', no: 'No',
    exportFailed: (msg) => `Export failed: ${msg}`, saving: (file) => `Saving ${file}.`,
    newVersion: 'New version available.', reload: 'Reload',
    storageError: (msg) => `Could not open storage: ${msg}`,
  },
  de: {
    weekdays: DE_WD, months: DE_MONTHS, monthsShort: DE_MS,
    dayLabel: (w, m, d) => `${w}, ${d}. ${DE_MS[m - 1]}`,
    weekRange: (a, b) => {
      if (a.y !== b.y) return `${a.d}. ${DE_MS[a.m - 1]} ${a.y} – ${b.d}. ${DE_MS[b.m - 1]} ${b.y}`;
      if (a.m !== b.m) return `${a.d}. ${DE_MS[a.m - 1]} – ${b.d}. ${DE_MS[b.m - 1]} ${b.y}`;
      return `${a.d}. – ${b.d}. ${DE_MS[b.m - 1]} ${b.y}`;
    },
    navNow: 'Aktuell', navHistory: 'Historie', navSettings: 'Einstellungen', navSections: 'Bereiche',
    today: 'Heute', yesterday: 'Gestern', prevDay: 'Vorheriger Tag', nextDay: 'Nächster Tag',
    unconfirmedCount: (n) => (n === 1 ? '1 früherer Tag unbestätigt' : `${n} frühere Tage unbestätigt`),
    beforeStart: 'Vor dem Start – dieser Tag zählt nicht.',
    unconfirmedDay: 'Unbestätigt – dieser Tag zählt noch nicht.',
    dayConfirmed: 'Tag bestätigt', confirmationRemoved: 'Bestätigung entfernt',
    confirmDay: 'Tag bestätigen', dayConfirmedTap: 'Tag bestätigt – tippen, um die Bestätigung zu entfernen',
    tileAmount: (name, v, locked) => `${name}: ${v}.${locked ? ' Tag bestätigt.' : ' Tippen: Wert wählen. Lange drücken: zurücksetzen.'}`,
    tileFresh: (name, locked) => `${name}: noch nichts eingetragen.${locked ? '' : ' Tippen: Wert wählen.'}`,
    tileToggle: (name, on) => `${name} ${on ? 'erledigt' : 'nicht erledigt'}`,
    numberRange: 'Bitte eine Zahl von 0 bis 99 mit höchstens zwei Nachkommastellen eingeben.',
    apply: 'Übernehmen', cancel: 'Abbrechen', otherValue: 'Anderer Wert', monthOverview: 'Monatsübersicht',
    modeShort: { W: 'W', M: 'M', Y: 'J' }, modeName: { W: 'Woche', M: 'Monat', Y: 'Jahr' },
    prevPeriod: 'Vorheriger Zeitraum', nextPeriod: 'Nächster Zeitraum',
    prevPeriodValue: (v) => `Wert des Vorzeitraums ${v}`,
    notConfirmed: (day) => `${day}: nicht bestätigt`,
    perDay: (month, v) => `${month}: ${v} pro Tag`,
    chart: (name) => `Diagramm ${name}`,
    language: 'Sprache', start: 'Start', chooseDate: 'Bitte ein Datum bis heute wählen.',
    daily: 'Täglich', monthly: 'Monatlich', name: 'Name', note: 'Notiz', targetDay: 'Ziel pro Tag',
    greenBelow: 'Grün unter', redAbove: 'Rot über', targetMonth: 'Ziel pro Monat', tileColor: 'Kachelfarbe',
    colors: { Default: 'Standard', Gray: 'Grau', Blue: 'Blau', Violet: 'Violett', Amber: 'Bernstein', Red: 'Rot' },
    cannotBeEmpty: (label) => `${label} darf nicht leer sein.`,
    decrease: (label) => `${label} verringern`, increase: (label) => `${label} erhöhen`, tapToEnter: ', tippen zum Eingeben',
    settingsFor: (name) => `Einstellungen ${name}`, tileColorFor: (name) => `Kachelfarbe ${name}`,
    reminder: 'Erinnerung',
    reminderHint: 'iPhone: Kurzbefehle-App → Automation → + → Tageszeit → Sofort ausführen → Mitteilung anzeigen.\nAndroid: Uhr-App → Wecker → + → täglich, mit Label.',
    data: 'Daten',
    dataHint: 'Deine Daten liegen nur auf diesem Mobiltelefon. Der Export ist eine lesbare JSON-Datei mit einer Zeile pro Tag.',
    exportReminder: 'Export-Erinnerung', never: 'Nie', weekly: 'Wöchentlich',
    exportData: 'Daten exportieren', importData: 'Daten importieren', deleteAll: 'Alle Daten löschen',
    importConfirm: (file, n, m) => `„${file}“ importieren?\n${n} Werte, ${m} bestätigte Tage.\nAlle aktuellen Daten werden ersetzt.`,
    importDone: 'Import abgeschlossen.', importFailed: (msg) => `Import fehlgeschlagen: ${msg}`,
    notJson: 'Die Datei ist keine gültige JSON-Datei.', notHabits: 'Die Datei ist kein Habits-Export.',
    invalidDay: 'Ungültiger oder doppelter Tag in der Datei.', invalidValue: (d) => `Ungültiger Wert am ${d}.`,
    deleteConfirm: 'Alle Einträge und Einstellungen auf diesem Gerät löschen? Das kann nicht rückgängig gemacht werden.',
    deleted: 'Alle Daten gelöscht.',
    storageNote: 'Hinweis: Der Speicher ist nicht als dauerhaft bestätigt – App zum Home-Bildschirm hinzufügen und regelmäßig exportieren.',
    backup: 'Sicherung', newWeek: 'Neue Woche – jetzt exportieren?', newMonth: 'Neuer Monat – jetzt exportieren?', yes: 'Ja', no: 'Nein',
    exportFailed: (msg) => `Export fehlgeschlagen: ${msg}`, saving: (file) => `${file} wird gespeichert.`,
    newVersion: 'Neue Version verfügbar.', reload: 'Neu laden',
    storageError: (msg) => `Speicher konnte nicht geöffnet werden: ${msg}`,
  },
};
export const LANGS = [{ code: 'en', name: 'English' }, { code: 'de', name: 'Deutsch' }];
export const DEFAULT_LANG = 'en';
function readLang() {
  try {
    const v = globalThis.localStorage && globalThis.localStorage.getItem(LANG_KEY);
    return STRINGS[v] ? v : DEFAULT_LANG;
  } catch { return DEFAULT_LANG; }
}
let lang = readLang();
export function getLang() { return lang; }
export function setLang(code) {
  if (!STRINGS[code]) return;
  lang = code;
  try { globalThis.localStorage.setItem(LANG_KEY, code); } catch {  }
}
export function t(key, ...args) {
  const v = key in STRINGS[lang] ? STRINGS[lang][key] : STRINGS.en[key];
  return typeof v === 'function' ? v(...args) : v;
}
export { STRINGS };
