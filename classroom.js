// Classroom defaults and seat identifiers.
export const templateTables = () => [{ id: 't1', name: 'Table 1', x: 81, y: 68, count: 2 }, { id: 't2', name: 'Table 2', x: 81, y: 42, count: 2 }, { id: 't3', name: 'Table 3', x: 27, y: 68, count: 3 }, { id: 't4', name: 'Table 4', x: 27, y: 42, count: 3 }, { id: 't5', name: 'Table 5', x: 32, y: 17, count: 4 }];
export const emptyClass = () => ({ names: [], rules: [], tables: [], seats: {}, previous: {}, locks: {}, fixtures: { screen: { x: 32, y: 90 }, desk: { x: 80, y: 81 } } });
export const defaults = () => ({ active: 'Class 1', classes: { 'Class 1': emptyClass() }, avoidRepeat: true, lastView: 'teacher' });

export const seatIds = c => c.tables.flatMap(t => Array.from({ length: t.count }, (_, i) => t.id + ':' + i));
