// Smart Seating Chart V18 — readable, modular JavaScript
// Behavior preserved; formatted for source review.

// Smart Seating Chart V18 — application logic
// Extracted without changing behavior from the working single-file version.
import { templateTables, emptyClass, defaults, seatIds as ids } from './classroom.js';
import { STORE, TEMPLATE_STORE, normalize, loadState, saveState } from './storage.js';
import { permute, generate } from './seating.js';
import { builtIn12, blankTemplate } from './templates.js';

(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const clean = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    let state = loadState();
    const current = () => state.classes[state.active], capacity = c => ids(c).length;
    let view = new URLSearchParams(location.search).get('view');
    view = view === 'display' ? 'display' : view === 'teacher' ? 'teacher' : state.lastView;
    let selected = null, selectedSeat = null, spinning = false;
    function persist() { saveState(state); }
    function setView(next) { view = next; state.lastView = next; persist(); $('adminPage').classList.toggle('hidden', next === 'display'); $('displayPage').classList.toggle('hidden', next !== 'display'); try {
        history.replaceState(null, '', location.pathname + (next === 'display' ? '?view=display' : ''));
    }
    catch (e) {
        console.warn('URL update unavailable', e);
    } draw(); }
    function roomHTML(c, arr, editing) { let parts = []; for (const t of c.tables) {
        let width = Math.min(68, Math.max(13, t.count * 10.2));
        parts.push(`<div class="table-block ${editing ? 'editable' : ''} ${selected === t.id && editing ? 'selected' : ''}" data-table="${clean(t.id)}" style="left:${t.x}%;top:${t.y}%;width:${width}%;height:12%;grid-template-columns:repeat(${t.count},minmax(0,1fr))">${editing ? `<span class="table-label">${clean(t.name)}</span><button type="button" class="table-delete" data-delete="${clean(t.id)}" title="Delete table" aria-label="Delete table">×</button>` : ''}${Array.from({ length: t.count }, (_, i) => { let id = t.id + ':' + i, n = arr[id] || '', locked = c.locks[id]; return `<div class="seat ${n ? '' : 'empty'} ${locked ? 'locked' : ''}" ${editing ? `data-seat="${clean(id)}" title="Click to assign a fixed student"` : ''}><span class="num">${i + 1}</span><span class="name">${clean(n || '—')}</span>${locked && editing ? '<span class="lockmark">🔒</span>' : ''}</div>`; }).join('')}</div>`);
    } for (const [key, cls, label] of [['desk', 'teacherdesk', 'Teacher Desk'], ['screen', 'screen', 'SCREEN']]) {
        const f = c.fixtures[key];
        parts.push(`<div class="${cls} fixture ${editing ? 'editable' : ''}" ${editing ? `data-fixture="${key}" title="Drag to move"` : ''} style="left:${f.x}%;top:${f.y}%;right:auto;bottom:auto;transform:translate(-50%,-50%)">${label}</div>`);
    } return parts.join(''); }
    function draw() { const c = current(); if (!c)
        return; $('adminRoom').classList.add('editing'); $('adminRoom').innerHTML = roomHTML(c, c.seats, true); $('displayRoom').innerHTML = roomHTML(c, c.seats, false); $('boardTitle').textContent = state.active + ' Seating Chart'; $('displayTitle').textContent = state.active + ' · Today’s Seating Chart'; $('boardInfo').textContent = capacity(c) + ' seats · ' + c.tables.length + ' tables · front at bottom'; bindDrag(); renderSelectedEditor(); renderSeatPicker(); }
    function renderRules() {
        const c = current(), list = $('ruleList');
        if (!c.rules.length) {
            list.innerHTML = '<p class="hint">No rules for this class. All seats are eligible for random assignment.</p>';
            return;
        }
        const options = c.names.map(n => `<option value="${clean(n)}">${clean(n)}</option>`).join('');
        list.innerHTML = c.rules.map((r, i) => `<div class="rule-entry" data-rule-row="${i}"><div class="rule-entry-head"><strong>Rule ${i + 1}</strong><button type="button" class="danger" data-rule-remove="${i}" aria-label="Delete rule ${i + 1}">✕ Delete</button></div><div class="field"><label>Student A</label><select data-rule-a="${i}">${options}</select></div><div class="field"><label>Student B</label><select data-rule-b="${i}">${options}</select></div><div class="field"><label>Rule</label><select data-rule-type="${i}"><option value="table">Must sit at different tables</option><option value="far">Keep as far apart as possible</option></select></div></div>`).join('');
        c.rules.forEach((r, i) => { const row = list.querySelector(`[data-rule-row="${i}"]`); row.querySelector('[data-rule-a]').value = r.a; row.querySelector('[data-rule-b]').value = r.b; row.querySelector('[data-rule-type]').value = r.type; });
        list.querySelectorAll('[data-rule-row]').forEach(row => {
            const i = Number(row.dataset.ruleRow);
            row.querySelectorAll('select').forEach(el => el.addEventListener('change', () => {
                const a = row.querySelector('[data-rule-a]').value, b = row.querySelector('[data-rule-b]').value, type = row.querySelector('[data-rule-type]').value;
                if (a === b) {
                    alert('Choose two different students.');
                    renderRules();
                    return;
                }
                if (c.rules.some((r, j) => j !== i && r.type === type && ((r.a === a && r.b === b) || (r.a === b && r.b === a)))) {
                    alert('This rule already exists.');
                    renderRules();
                    return;
                }
                c.rules[i] = { a, b, type };
                persist();
            }));
            row.querySelector('[data-rule-remove]').addEventListener('click', () => { c.rules.splice(i, 1); persist(); renderRules(); });
        });
    }
    function renderSelectedEditor() { const c = current(), t = c.tables.find(t => t.id === selected), box = $('selectedTableEditor'); if (!t) {
        box.classList.add('hidden');
        box.innerHTML = '';
        return;
    } box.classList.remove('hidden'); box.innerHTML = `<strong>Selected table</strong><label>Name<input id="selectedName" value="${clean(t.name)}" maxlength="40"></label><label>Seats<input id="selectedCount" type="number" min="1" max="12" value="${t.count}"></label><button id="updateSelected">Save changes</button><button class="danger" id="deleteSelected">Delete table</button><button class="secondary" id="deselectTable">Done</button>`; $('updateSelected').onclick = () => { const n = Number($('selectedCount').value); if (!Number.isInteger(n) || n < 1 || n > 12)
        return alert('Choose 1–12 seats.'); t.count = n; t.name = $('selectedName').value.trim().slice(0, 40) || t.name; cleanup(c); persist(); renderAdmin(); }; $('deleteSelected').onclick = () => deleteTable(t.id); $('deselectTable').onclick = () => { selected = null; draw(); }; }
    function renderSeatPicker() { const c = current(), box = $('seatPicker'); if (!selectedSeat || !ids(c).includes(selectedSeat)) {
        selectedSeat = null;
        box.classList.add('hidden');
        box.innerHTML = '';
        return;
    } let t = c.tables.find(t => selectedSeat.startsWith(t.id + ':')); let index = Number(selectedSeat.split(':').pop()) + 1; box.classList.remove('hidden'); box.innerHTML = `<strong>📌 Fixed seat · ${clean(t.name)} · Seat ${index}</strong><label>Assign student<select id="fixedStudent"><option value="">No fixed student</option>${c.names.map(n => `<option value="${clean(n)}" ${c.locks[selectedSeat] === n ? 'selected' : ''}>${clean(n)}</option>`).join('')}</select></label><button id="saveFixed">Save fixed seat</button><button class="secondary" id="removeFixed">Remove lock</button><button class="secondary" id="closeFixed">Done</button>`; $('saveFixed').onclick = () => { let n = $('fixedStudent').value; if (n) {
        for (let [id, name] of Object.entries(c.locks))
            if (name === n)
                delete c.locks[id];
        c.locks[selectedSeat] = n;
        for (let [id, name] of Object.entries(c.seats))
            if (name === n && id !== selectedSeat)
                delete c.seats[id];
        c.seats[selectedSeat] = n;
    }
    else
        delete c.locks[selectedSeat]; persist(); draw(); }; $('removeFixed').onclick = () => { delete c.locks[selectedSeat]; persist(); draw(); }; $('closeFixed').onclick = () => { selectedSeat = null; renderSeatPicker(); }; }
    function cleanup(c) { let valid = new Set(ids(c)); for (let key of Object.keys(c.locks))
        if (!valid.has(key))
            delete c.locks[key]; for (let key of Object.keys(c.seats))
        if (!valid.has(key))
            delete c.seats[key]; for (let key of Object.keys(c.previous))
        if (!valid.has(key))
            delete c.previous[key]; }
    function renderAdmin() { let c = current(); $('resetConfirm').classList.add('hidden'); $('classSelect').innerHTML = Object.keys(state.classes).map(k => `<option value="${clean(k)}">${clean(k)}</option>`).join(''); $('classSelect').value = state.active; $('names').value = c.names.join('\n'); $('count').textContent = c.names.length + ' students / ' + capacity(c) + ' seats'; $('avoidRepeat').checked = state.avoidRepeat !== false; renderRules(); draw(); }
    function showStudentMessage(message, success = false) { const el = $('studentSaveMessage'); el.textContent = message; el.classList.remove('hidden'); el.classList.toggle('success', success); }
    function saveNames() {
        let c = current();
        let names = [...new Set($('names').value.split(/[\n,，]+/).map(s => s.trim()).filter(Boolean))];
        if (!names.length) {
            showStudentMessage('Please enter at least one student name before saving.');
            return false;
        }
        const seats = capacity(c);
        if (!seats) {
            showStudentMessage('Please add tables first. Your classroom has no seats yet. Use “Add Table” or “Classroom Template” in the Seating Chart, then save your student list.');
            return false;
        }
        if (names.length > seats) {
            const missing = names.length - seats;
            showStudentMessage(`Not enough seats: you have ${names.length} students but only ${seats} seats. Please add ${missing} more ${missing === 1 ? 'seat' : 'seats'} before saving.`);
            return false;
        }
        c.names = names;
        c.rules = c.rules.filter(r => names.includes(r.a) && names.includes(r.b));
        for (let [id, n] of Object.entries(c.locks))
            if (!names.includes(n))
                delete c.locks[id];
        for (let id of Object.keys(c.seats))
            if (!names.includes(c.seats[id]))
                c.seats[id] = '';
        persist();
        renderAdmin();
        showStudentMessage(`Student list saved! ${names.length} ${names.length === 1 ? 'student' : 'students'} · ${seats} available seats.`, true);
        return true;
    }
    function shuffle() { if (spinning)
        return; let c = current(); if (!c.names.length) {
        alert('Add students in Teacher Mode first.');
        return;
    } if (c.names.length > capacity(c)) {
        alert('Not enough seats.');
        return;
    } let result = generate(c, state.avoidRepeat); if (!result) {
        alert('No valid seating arrangement found. Try adding tables or relaxing mandatory rules.');
        return;
    } spinning = true; $('shuffleAdmin').disabled = $('shuffleDisplay').disabled = true; let rounds = 0; let interval = setInterval(() => { let names = permute(c.names), seatIds = permute(ids(c)), temp = {}; names.forEach((name, i) => temp[seatIds[i]] = name); for (const [id, n] of Object.entries(c.locks)) {
        for (const k of Object.keys(temp))
            if (temp[k] === n)
                delete temp[k];
        temp[id] = n;
    } $('adminRoom').innerHTML = roomHTML(c, temp, false); $('displayRoom').innerHTML = roomHTML(c, temp, false); if (++rounds >= 16) {
        clearInterval(interval);
        c.previous = { ...c.seats };
        c.seats = result;
        persist();
        draw();
        $('adminStatus').textContent = 'Seats shuffled! ' + c.names.length + ' students assigned.';
        $('displayStatus').textContent = 'Your seats are ready!';
        spinning = false;
        $('shuffleAdmin').disabled = $('shuffleDisplay').disabled = false;
    } }, 90); }
    function deleteTable(id) {
        const c = current(), idx = c.tables.findIndex(t => t.id === id);
        if (idx < 0)
            return;
        const removed = c.tables[idx];
        c.tables.splice(idx, 1);
        if (selected === id)
            selected = null;
        if (selectedSeat?.startsWith(id + ':'))
            selectedSeat = null;
        cleanup(c);
        persist();
        renderAdmin();
        $('adminStatus').innerHTML = `Deleted ${clean(removed.name)}. <button type="button" class="secondary" id="undoTableDelete">Undo</button>`;
        $('undoTableDelete').addEventListener('click', () => { c.tables.splice(Math.min(idx, c.tables.length), 0, removed); persist(); renderAdmin(); $('adminStatus').textContent = 'Table restored.'; });
    }
    function bindDrag() { const room = $('adminRoom'); room.querySelectorAll('[data-delete]').forEach(btn => { btn.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); }); btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); deleteTable(btn.dataset.delete); }); }); room.querySelectorAll('[data-seat]').forEach(el => { el.onpointerdown = e => e.stopPropagation(); el.onclick = e => { e.stopPropagation(); selectedSeat = el.dataset.seat; selected = el.closest('[data-table]')?.dataset.table || null; renderSelectedEditor(); renderSeatPicker(); }; }); const draggable = [...room.querySelectorAll('[data-table]'), ...room.querySelectorAll('[data-fixture]')]; for (const el of draggable) {
        el.onpointerdown = e => { if (e.target.closest('button') || e.target.closest('[data-seat]'))
            return; if (e.button !== 0)
            return; e.preventDefault(); let c = current(), t = el.dataset.table ? c.tables.find(t => t.id === el.dataset.table) : c.fixtures[el.dataset.fixture]; if (!t)
            return; if (el.dataset.table) {
            selected = t.id;
            renderSelectedEditor();
        } const rect = room.getBoundingClientRect(), startX = e.clientX, startY = e.clientY, initialX = t.x, initialY = t.y; el.setPointerCapture(e.pointerId); el.onpointermove = ev => { t.x = Math.round(Math.max(8, Math.min(92, initialX + (ev.clientX - startX) / rect.width * 100))); t.y = Math.round(Math.max(8, Math.min(92, initialY + (ev.clientY - startY) / rect.height * 100))); el.style.left = t.x + '%'; el.style.top = t.y + '%'; }; el.onpointerup = () => { el.onpointermove = null; el.onpointerup = null; persist(); draw(); }; el.onpointercancel = () => { el.onpointermove = null; el.onpointerup = null; persist(); draw(); }; };
    } }
    let classAction = null;
    function openClassEditor(action) { classAction = action; $('classEditor').classList.remove('hidden'); $('classEditorLabel').textContent = action === 'add' ? 'New class name' : action === 'rename' ? 'Rename class' : 'Delete class'; $('classNameInput').value = action === 'add' ? '' : state.active; $('classNameInput').disabled = action === 'delete'; $('saveClassEdit').textContent = action === 'delete' ? 'Delete class' : 'Save'; $('saveClassEdit').className = action === 'delete' ? 'danger' : ''; $('classEditHint').textContent = action === 'delete' ? 'This will permanently delete this class from local storage. Export a backup first if needed.' : ''; $('classNameInput').focus(); }
    function closeClassEditor() { classAction = null; $('classEditor').classList.add('hidden'); }
    $('classSelect').onchange = e => { state.active = e.target.value; selected = null; selectedSeat = null; closeClassEditor(); persist(); renderAdmin(); };
    $('addClass').onclick = () => openClassEditor('add');
    $('renameClass').onclick = () => openClassEditor('rename');
    $('deleteClass').onclick = () => openClassEditor('delete');
    $('cancelClassEdit').onclick = closeClassEditor;
    $('classNameInput').onkeydown = e => { if (e.key === 'Enter')
        $('saveClassEdit').click(); if (e.key === 'Escape')
        closeClassEditor(); };
    $('saveClassEdit').onclick = () => { if (!classAction)
        return; let action = classAction, name = $('classNameInput').value.trim().slice(0, 50), old = state.active; if (action === 'delete') {
        if (Object.keys(state.classes).length === 1) {
            $('classEditHint').textContent = 'You must keep at least one class.';
            return;
        }
        delete state.classes[old];
        state.active = Object.keys(state.classes)[0];
    }
    else {
        if (!name) {
            $('classEditHint').textContent = 'Please enter a class name.';
            return;
        }
        if (state.classes[name] && (action === 'add' || name !== old)) {
            $('classEditHint').textContent = 'A class with this name already exists.';
            return;
        }
        if (action === 'add') {
            state.classes[name] = emptyClass();
        }
        else if (name !== old) {
            const renamed = {};
            for (const [key, value] of Object.entries(state.classes))
                renamed[key === old ? name : key] = value;
            state.classes = renamed;
        }
        state.active = name;
    } selected = null; selectedSeat = null; closeClassEditor(); persist(); renderAdmin(); };
    // Developer-only layout export. Enable with the subtle teacher-only toggle.
    // The export deliberately excludes students, seating assignments, rules, and locks.
    // Local developer template library, independent of class data.
    let templates;
    try {
        const saved = JSON.parse(localStorage.getItem(TEMPLATE_STORE));
        templates = Array.isArray(saved) && saved.length ? saved : Array.from({ length: 12 }, (_, i) => i === 11 ? builtIn12 : blankTemplate(i + 1));
    }
    catch {
        templates = Array.from({ length: 12 }, (_, i) => i === 11 ? builtIn12 : blankTemplate(i + 1));
    }
    function saveTemplates() { try {
        localStorage.setItem(TEMPLATE_STORE, JSON.stringify(templates));
    }
    catch (e) {
        $('developerStatus').textContent = 'Could not save templates locally: ' + e.message;
    } }
    function safeTemplate(t) { return { id: t.id, name: t.name, version: t.version || 1, tables: t.tables.map(x => ({ ...x })), fixtures: { screen: { ...t.fixtures.screen }, desk: { ...t.fixtures.desk } } }; }
    let developerMode = false, activeTemplate = 'classroom-12';
    function renderTemplateLists() {
        $('templateChoices').innerHTML = templates.filter(t => t.tables.length).map(t => `<button type="button" class="secondary" data-apply-template="${clean(t.id)}">${clean(t.name)} · ${t.tables.reduce((n, x) => n + x.count, 0)} seats</button>`).join('') || '<p class="hint">No templates configured yet.</p>';
        $('templateChoices').querySelectorAll('[data-apply-template]').forEach(b => b.onclick = () => applyTemplate(b.dataset.applyTemplate));
        $('developerTemplateList').innerHTML = templates.map(t => `<button type="button" class="${t.id === activeTemplate ? 'chosen ' : ''}${t.tables.length ? '' : 'unconfigured'}" data-edit-template="${clean(t.id)}">${clean(t.name)}<br><small>${t.tables.length ? t.tables.length + ' tables · ' + t.tables.reduce((n, x) => n + x.count, 0) + ' seats' : 'Not configured'}</small></button>`).join('');
        $('developerTemplateList').querySelectorAll('[data-edit-template]').forEach(b => b.onclick = () => { activeTemplate = b.dataset.editTemplate; renderTemplateLists(); $('developerStatus').textContent = 'Selected ' + templates.find(t => t.id === activeTemplate).name + '. Click Load Template to Chart to edit its saved layout.'; });
        const active = templates.find(t => t.id === activeTemplate);
        $('developerTemplateName').value = active?.name || '';
    }
    function applyTemplate(id) { const t = templates.find(t => t.id === id); if (!t || !t.tables.length)
        return; const c = current(); if ((c.tables.length || Object.keys(c.locks).length || Object.values(c.seats).some(Boolean)) && !confirm('Replace the current classroom layout with ' + t.name + '? Existing seat assignments and fixed seats will be cleared. Student names and rules will be kept.'))
        return; c.tables = t.tables.map(x => ({ ...x })); c.fixtures = { screen: { ...t.fixtures.screen }, desk: { ...t.fixtures.desk } }; c.seats = {}; c.previous = {}; c.locks = {}; selected = null; selectedSeat = null; $('templatePicker').classList.add('hidden'); persist(); renderAdmin(); $('adminStatus').textContent = t.name + ' applied.'; }
    // Developer tools are hidden for everyday classroom use. Open with ?developer=1 to reveal the toggle.
    if (new URLSearchParams(window.location.search).get('developer') === '1') {
        $('developerToggle').classList.remove('hidden');
    }
    $('developerToggle').onclick = () => { developerMode = !developerMode; $('templateManager').classList.toggle('hidden', !developerMode); $('exportTemplate').classList.toggle('hidden', !developerMode); $('developerToggle').setAttribute('aria-pressed', String(developerMode)); $('developerToggle').textContent = developerMode ? 'Hide Developer Mode' : 'Developer Mode · Templates'; renderTemplateLists(); };
    $('saveDeveloperTemplate').onclick = () => { const t = templates.find(t => t.id === activeTemplate), c = current(); if (!t)
        return; if (!c.tables.length) {
        $('developerStatus').textContent = 'Add at least one table to the Seating Chart before saving a template.';
        return;
    } const name = $('developerTemplateName').value.trim(); if (!name) {
        $('developerStatus').textContent = 'Enter a template name first.';
        return;
    } if (t.tables.length && !confirm('Overwrite ' + t.name + ' with the current Seating Chart layout?'))
        return; t.name = name; t.tables = c.tables.map(x => ({ ...x })); t.fixtures = { screen: { ...c.fixtures.screen }, desk: { ...c.fixtures.desk } }; saveTemplates(); renderTemplateLists(); $('developerStatus').textContent = 'Saved ' + name + ' locally · ' + t.tables.length + ' tables. Export all templates for backup.'; };
    $('loadDeveloperTemplate').onclick = () => { const t = templates.find(t => t.id === activeTemplate); if (!t)
        return; if (!t.tables.length) {
        $('developerStatus').textContent = 'This template is empty. Add tables on the Seating Chart, then click Save Current Layout.';
        return;
    } applyTemplate(t.id); $('developerStatus').textContent = 'Loaded ' + t.name + ' to the current class. Edit the layout above and click Save Current Layout.'; };
    function downloadJson(data, filename) { const blob = new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' }); const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    $('exportAllTemplates').onclick = () => { downloadJson({ version: 1, templates: templates.map(safeTemplate) }, 'classroom-templates.json'); $('developerStatus').textContent = 'Exported all 12 templates. Keep this file as a backup.'; };
    $('exportTemplate').onclick = () => { const c = current(); if (!c.tables.length) {
        $('adminStatus').textContent = 'Add a table before exporting.';
        return;
    } downloadJson({ id: 'custom-template', name: state.active, tables: c.tables, fixtures: c.fixtures }, 'classroom-template.json'); };
    $('chooseTemplate').onclick = () => { renderTemplateLists(); $('templatePicker').classList.toggle('hidden'); };
    $('cancelTemplate').onclick = () => { $('templatePicker').classList.add('hidden'); };
    renderTemplateLists();
    $('resetTables').onclick = () => {
        const c = current();
        if (!c.tables.length) {
            $('resetConfirm').classList.add('hidden');
            $('adminStatus').textContent = 'There are no tables to reset. Add a table or choose a classroom template.';
            return;
        }
        $('resetConfirm').classList.remove('hidden');
        $('resetConfirm').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };
    $('cancelReset').onclick = () => { $('resetConfirm').classList.add('hidden'); };
    $('confirmReset').onclick = () => {
        const c = current();
        c.tables = [];
        c.seats = {};
        c.previous = {};
        c.locks = {};
        selected = null;
        selectedSeat = null;
        $('resetConfirm').classList.add('hidden');
        $('templatePicker').classList.add('hidden');
        persist();
        renderAdmin();
        $('adminStatus').textContent = 'All tables have been removed. Add a table or choose a classroom template to begin again.';
    };
    $('saveNames').onclick = saveNames;
    $('addTable').onclick = () => { let c = current(), count = Number($('tableSize').value); if (!Number.isInteger(count) || count < 1 || count > 12)
        return alert('Choose 1–12 seats.'); if (c.tables.length >= 35)
        return alert('Maximum 35 tables.'); let name = $('tableName').value.trim() || 'Table ' + (c.tables.length + 1); let id = 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); c.tables.push({ id, name: name.slice(0, 40), count, x: 50, y: 50 }); selected = id; $('tableName').value = ''; persist(); renderAdmin(); };
    $('addRule').onclick = () => { let c = current(); let raw = [...new Set($('names').value.split(/[\n,，]+/).map(s => s.trim()).filter(Boolean))]; if (raw.length > capacity(c)) {
        alert('Add more seats before adding rules.');
        return;
    } if (raw.join('\u0000') !== c.names.join('\u0000')) {
        c.names = raw;
        c.rules = c.rules.filter(r => raw.includes(r.a) && raw.includes(r.b));
        for (const [id, n] of Object.entries(c.locks))
            if (!raw.includes(n))
                delete c.locks[id];
    } if (c.names.length < 2) {
        alert('Please add at least two students first.');
        renderAdmin();
        return;
    } let a = c.names[0], b = c.names[1]; let candidate = null; for (const x of c.names) {
        for (const y of c.names) {
            if (x !== y && !c.rules.some(r => r.type === 'table' && ((r.a === x && r.b === y) || (r.a === y && r.b === x)))) {
                candidate = { a: x, b: y, type: 'table' };
                break;
            }
        }
        if (candidate)
            break;
    } if (!candidate) {
        alert('All different-table pairs already exist. You can edit existing rules.');
        return;
    } c.rules.push(candidate); persist(); renderAdmin(); const rows = $('ruleList').querySelectorAll('[data-rule-row]'); rows[rows.length - 1]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); };
    $('avoidRepeat').onchange = e => { state.avoidRepeat = e.target.checked; persist(); };
    $('shuffleAdmin').onclick = () => { if (saveNames())
        shuffle(); };
    $('shuffleDisplay').onclick = shuffle;
    $('clearSeats').onclick = () => { current().seats = {}; persist(); draw(); };
    $('openDisplay').onclick = () => { if (!saveNames())
        return; selected = null; selectedSeat = null; setView('display'); };
    $('teacherMode').onclick = () => setView('teacher');
    $('exportBtn').onclick = () => { if (!saveNames())
        return; let blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'smart-seating-backup.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
    $('importFile').onchange = async (e) => { let file = e.target.files[0]; if (!file)
        return; try {
        state = normalize(JSON.parse(await file.text()));
        persist();
        renderAdmin();
    }
    catch (err) {
        alert('Import failed: ' + err.message);
    } e.target.value = ''; };
    // Dismiss contextual editors when clicking outside the chart/table controls.
    // Do not dismiss while interacting with either editor or the board toolbar.
    document.addEventListener('pointerdown', e => {
        if (view !== 'teacher' || (!selected && !selectedSeat))
            return;
        if (e.target.closest('#adminRoom, #selectedTableEditor, #seatPicker, .layout-toolbar'))
            return;
        selected = null;
        selectedSeat = null;
        renderSelectedEditor();
        renderSeatPicker();
        $('adminRoom').querySelectorAll('.table-block.selected').forEach(el => el.classList.remove('selected'));
    });
    // Clicking empty space inside the room also dismisses both editors.
    $('adminRoom').addEventListener('click', e => {
        if (e.target !== $('adminRoom'))
            return;
        selected = null;
        selectedSeat = null;
        draw();
    });
    window.addEventListener('storage', e => { if (e.key === STORE && e.newValue) {
        try {
            state = normalize(JSON.parse(e.newValue));
            renderAdmin();
        }
        catch { }
    } });
    renderAdmin();
    setView(view);
})();
