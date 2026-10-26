// Storage compatibility. Keep keys unchanged to preserve existing users' data.
import { templateTables, seatIds } from './classroom.js';

export const STORE = 'smart-seating-chart-v2';
export const OLD = 'smart-seating-chart-v1';
export const TEMPLATE_STORE = 'smart-seating-templates-v17';

export function normalize(obj) { if (!obj || !obj.classes || typeof obj.classes !== 'object' || !Object.keys(obj.classes).length)
        throw Error('Invalid backup'); for (const [key, c] of Object.entries(obj.classes)) {
        if (!c || !Array.isArray(c.names) || !Array.isArray(c.rules))
            throw Error('Invalid class ' + key);
        c.names = [...new Set(c.names.map(String))].slice(0, 250);
        if (!Array.isArray(c.tables)) {
            c.tables = templateTables();
            let old = Array.isArray(c.seats) ? c.seats : [];
            c.seats = Object.fromEntries(seatIds(c).map((id, i) => [id, old[i] || '']));
            c.previous = {};
        }
        c.tables = c.tables.filter(t => t && typeof t.id === 'string' && Number.isInteger(t.count) && t.count >= 1 && t.count <= 12).slice(0, 35).map(t => ({ ...t, x: Math.max(10, Math.min(90, Number(t.x) || 50)), y: Math.max(10, Math.min(90, Number(t.y) || 50)) }));
        if (!c.seats || Array.isArray(c.seats))
            c.seats = {};
        if (!c.previous || Array.isArray(c.previous))
            c.previous = {};
        if (!c.locks || typeof c.locks !== 'object' || Array.isArray(c.locks))
            c.locks = {};
        if (!c.fixtures || typeof c.fixtures !== 'object')
            c.fixtures = {};
        for (const [k, xy] of Object.entries({ screen: { x: 32, y: 90 }, desk: { x: 80, y: 81 } })) {
            let f = c.fixtures[k];
            if (!f || !Number.isFinite(+f.x) || !Number.isFinite(+f.y))
                c.fixtures[k] = { ...xy };
            else
                c.fixtures[k] = { x: Math.max(8, Math.min(92, +f.x)), y: Math.max(8, Math.min(92, +f.y)) };
        }
        c.rules = c.rules.filter(r => r && ['table', 'far'].includes(r.type));
    } if (!obj.classes[obj.active])
        obj.active = Object.keys(obj.classes)[0]; obj.lastView = obj.lastView === 'display' ? 'display' : 'teacher'; return obj; }

export function loadState() {
  try {
    return normalize(JSON.parse(localStorage.getItem(STORE)) || JSON.parse(localStorage.getItem(OLD)) || defaults());
  } catch {
    return defaults();
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORE, JSON.stringify(state));
  } catch (error) {
    console.warn('Local storage unavailable', error);
  }
}
