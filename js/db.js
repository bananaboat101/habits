const DB_NAME = 'habits';
const DB_VERSION = 4;
const OLD_STORES = ['entries', 'versions'];
let dbp = null;
function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const s of OLD_STORES) if (db.objectStoreNames.contains(s)) db.deleteObjectStore(s);
      if (!db.objectStoreNames.contains('days')) db.createObjectStore('days', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
      if (!db.objectStoreNames.contains('checks')) db.createObjectStore('checks', { keyPath: 'day' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}
function done(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('aborted'));
  });
}
function req2p(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
export async function loadAll() {
  const db = await open();
  const tx = db.transaction(['days', 'meta', 'checks']);
  const [days, settings, prefs, checks] = await Promise.all([
    req2p(tx.objectStore('days').getAll()),
    req2p(tx.objectStore('meta').get('settings')),
    req2p(tx.objectStore('meta').get('prefs')),
    req2p(tx.objectStore('checks').getAll()),
  ]);
  return { days, settings: settings || null, prefs: prefs || null, checks };
}
export async function put(store, obj) {
  const db = await open();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).put(obj);
  return done(tx);
}
export async function del(store, key) {
  const db = await open();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).delete(key);
  return done(tx);
}
export async function setMeta(key, value) {
  const db = await open();
  const tx = db.transaction('meta', 'readwrite');
  tx.objectStore('meta').put(value, key);
  return done(tx);
}
export async function replaceAll({ days, checks, settings, prefs }) {
  const db = await open();
  const tx = db.transaction(['days', 'meta', 'checks'], 'readwrite');
  const ds = tx.objectStore('days'), ms = tx.objectStore('meta'), cs = tx.objectStore('checks');
  ds.clear(); cs.clear(); ms.clear();
  for (const d of days) ds.put(d);
  for (const c of checks) cs.put(c);
  ms.put(settings, 'settings');
  ms.put(prefs, 'prefs');
  return done(tx);
}
