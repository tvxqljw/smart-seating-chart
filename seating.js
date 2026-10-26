// Pure seating algorithm: no DOM and no browser storage.
import { seatIds } from './classroom.js';

    function permute(arr) { arr = [...arr]; for (let i = arr.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    } return arr; }
    function scoreArrangement(c, arr, avoidRepeat) { let positions = {}; for (let t of c.tables)
        for (let i = 0; i < t.count; i++) {
            let name = arr[t.id + ':' + i];
            if (name)
                positions[name] = { table: t, x: t.x + (i - (t.count - 1) / 2) * 8, y: t.y };
        } let score = 0; for (let r of c.rules) {
        let a = positions[r.a], b = positions[r.b];
        if (!a || !b)
            continue;
        if (r.type === 'table' && a.table.id === b.table.id)
            return -Infinity;
        if (r.type === 'far') {
            let d = Math.hypot((a.x - b.x) * 1.1, (a.y - b.y) * 1.3);
            score += d * .35;
            if (a.table.id === b.table.id)
                score -= 30;
        }
    } if (avoidRepeat !== false)
        for (let id of Object.keys(arr))
            if (arr[id] && arr[id] === c.previous[id])
                score -= 2; return score; }
    function generate(c, avoidRepeat) { let seatIds = seatIds(c), locks = Object.entries(c.locks).filter(([id, n]) => seatIds.includes(id) && c.names.includes(n)), fixedNames = new Set(locks.map(([id, n]) => n)); if (fixedNames.size !== locks.length)
        return null; let remainingSeats = seatIds.filter(id => !c.locks[id]), remainingNames = c.names.filter(n => !fixedNames.has(n)); if (remainingNames.length > remainingSeats.length)
        return null; let best = null, bestScore = -Infinity; let n = Math.min(22000, Math.max(5500, seatIds.length * 700)); for (let i = 0; i < n; i++) {
        let shuffled = permute(remainingSeats), names = permute(remainingNames), arr = Object.fromEntries(locks);
        names.forEach((name, j) => arr[shuffled[j]] = name);
        let score = scoreArrangement(c, arr, avoidRepeat);
        if (Number.isFinite(score)) {
            score += Math.random() * 2;
            if (score > bestScore) {
                bestScore = score;
                best = arr;
            }
        }
    } return best; }

export { permute, scoreArrangement, generate };
