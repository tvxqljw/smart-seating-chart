// Official template defaults. Developer edits are stored separately in localStorage.
import { templateTables } from './classroom.js';

export const builtIn12 = { id: 'classroom-12', name: 'Classroom 12', version: 1, tables: templateTables(), fixtures: { screen: { x: 32, y: 90 }, desk: { x: 80, y: 81 } } };
export const blankTemplate = i => ({ id: 'classroom-' + i, name: 'Classroom ' + i, version: 1, tables: [], fixtures: { screen: { x: 32, y: 90 }, desk: { x: 80, y: 81 } } });
