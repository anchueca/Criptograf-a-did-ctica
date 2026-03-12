/**
 * ui_breaker.js — Automatic cryptanalysis tools (Breakers).
 */
(function () {
    'use strict';

    /** Render candidate results from the breakers */
    window.renderCandidates = function (type, cands) {
        var list = e('break_candidates');
        if (!list) return;
        list.innerHTML = '';
        if (!cands || cands.length === 0) {
            list.innerHTML = '<div class="hint">No hay candidatos.</div>';
            return;
        }

        cands.forEach(function (c) {
            var row = document.createElement('div'); row.className = 'candidate-item';
            var meta = document.createElement('div'); meta.className = 'candidate-meta';

            if (type === 'caesar') {
                meta.innerText = 'Shift ' + c.shift + ' — score: ' + CE.truncate(c.score, 4);
            } else if (type === 'vigenere') {
                meta.innerText = 'Len ' + (c.len || '?') + ' — clave: ' + (c.key || '?') + ' — score: ' + CE.truncate(c.score, 4);
            } else if (type === 'mono') {
                meta.innerText = 'Sustitución por frecuencia (mejor estimación)';
            }

            var txt = document.createElement('div'); txt.className = 'candidate-plain';
            txt.innerText = c.plain.substring(0, 300);

            var actions = document.createElement('div'); actions.className = 'candidate-actions';
            var apply = document.createElement('button'); apply.className = 'candidate-btn'; apply.innerText = 'Aplicar';

            apply.addEventListener('click', function () {
                if (type === 'caesar') {
                    if (e('caesar_shift')) {
                        e('caesar_shift').value = c.shift;
                        var span = e('caesar_val');
                        if (span) span.innerText = c.shift;
                        if (e('caesar_decrypt')) e('caesar_decrypt').checked = true;
                    }
                } else if (type === 'vigenere') {
                    if (e('v_keyword')) e('v_keyword').value = c.key || '';
                    if (e('v_subtract')) e('v_subtract').checked = true;
                } else if (type === 'mono') {
                    window._monoMap = c.map || Object.create(null);
                    if (typeof renderMonoMap === 'function') renderMonoMap();
                }
                displayText(c.plain, 'output');
            });

            var copy = document.createElement('button'); copy.className = 'candidate-btn'; copy.innerText = 'Copiar';
            copy.addEventListener('click', function () {
                try {
                    navigator.clipboard.writeText(c.plain);
                } catch (err) {
                    var ta = document.createElement('textarea');
                    ta.value = c.plain;
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                }
            });

            actions.appendChild(apply);
            actions.appendChild(copy);
            row.appendChild(meta);
            row.appendChild(txt);
            row.appendChild(actions);
            list.appendChild(row);
        });
    };

    /** Setup the breaker panel logic and events */
    window.setupBreakers = function () {
        var run = e('break_run_btn');
        var maxl = e('v_maxlen');

        function updateUI() {
            var cipher = e('cipher_select') ? e('cipher_select').value : 'caesar';
            if (cipher === 'vigenere') {
                if (maxl) maxl.style.display = 'inline-block';
            } else {
                if (maxl) maxl.style.display = 'none';
            }
            var note = e('break_note');
            if (note) note.innerText = '(' + cipher + ')';
        }

        var headerSel = e('cipher_select');
        if (headerSel) headerSel.addEventListener('change', updateUI);

        updateUI();

        if (run) {
            run.addEventListener('click', function () {
                var ct = e('input') ? e('input').value : '';
                var t = e('cipher_select') ? e('cipher_select').value : 'caesar';
                var alph = getAlphabet();
                var lang = getLang();
                var expected = CE.expectedProfiles[lang] || CE.expectedProfiles['es'];

                if (t === 'caesar') {
                    var cands = CE.breakCaesarCandidates(ct, alph, expected, 8);
                    renderCandidates('caesar', cands);
                } else if (t === 'vigenere') {
                    var ml = parseInt(maxl ? maxl.value : 6, 10) || 6;
                    var cands = CE.breakVigenereCandidates(ct, alph, expected, ml);
                    renderCandidates('vigenere', cands);
                } else if (t === 'mono') {
                    var cands = CE.breakMonoCandidates(ct, alph, expected);
                    renderCandidates('mono', cands);
                }
            });
        }
        updateUI();
    };

})();
