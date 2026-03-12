/**
 * ui_vigenere.js — Vigenère cipher UI and Kasiski analysis.
 */
(function () {
    'use strict';

    /** Apply Vigenère cipher and display result */
    window.applyVige = function () {
        var alph = getAlphabet();
        var text = e('input') ? e('input').value : '';
        var keyword = e('v_keyword') ? e('v_keyword').value : '';
        var add = !!(e('v_add') && e('v_add').checked);
        var result = CE.vigenereApply(text, keyword, add, alph);
        displayText(result, 'output');
    };

    /** Generate the interactive Vigenère table (Tabula Recta) */
    window.setupVigenereTable = function () {
        var container = e('vigenere_table_container');
        if (!container) return;
        var alph = getAlphabet();
        var numOpts = alph.length;

        var html = '<table class="vig-table"><thead><tr><th class="corner-cell">+</th>';
        for (var i = 0; i < numOpts; i++) {
            html += '<th class="header-col" data-col="' + i + '">' + alph.charAt(i).toUpperCase() + '</th>';
        }
        html += '</tr></thead><tbody>';

        for (var row = 0; row < numOpts; row++) {
            html += '<tr>';
            html += '<th class="header-row" data-row="' + row + '">' + alph.charAt(row).toUpperCase() + '</th>';
            for (var col = 0; col < numOpts; col++) {
                var shift = (row + col) % numOpts;
                var ch = alph.charAt(shift).toUpperCase();
                html += '<td data-row="' + row + '" data-col="' + col + '">' + ch + '</td>';
            }
            html += '</tr>';
        }
        html += '</tbody></table>';
        container.innerHTML = html;

        var table = container.querySelector('.vig-table');
        var cells = table.querySelectorAll('td');

        function clearHighlights() {
            var active = table.querySelectorAll('.active-col, .active-row, .active-cell, .active-hdr, .active-cross');
            active.forEach(function (el) {
                el.classList.remove('active-col', 'active-row', 'active-cell', 'active-hdr', 'active-cross');
            });
        }

        table.addEventListener('mouseleave', function () {
            clearHighlights();
            if (typeof updateVigenereHighlight === 'function') updateVigenereHighlight();
        });

        cells.forEach(function (cell) {
            cell.addEventListener('mouseenter', function () {
                clearHighlights();
                var r = this.getAttribute('data-row');
                var c = this.getAttribute('data-col');
                this.classList.add('active-cell');

                var hCol = table.querySelector('th.header-col[data-col="' + c + '"]');
                var hRow = table.querySelector('th.header-row[data-row="' + r + '"]');
                if (hCol) hCol.classList.add('active-hdr');
                if (hRow) hRow.classList.add('active-hdr');

                var crossCells = table.querySelectorAll('td[data-row="' + r + '"], td[data-col="' + c + '"]');
                crossCells.forEach(function (cc) {
                    if (cc !== cell) cc.classList.add('active-cross');
                });
            });
        });
    };

    /** Highlight the current character in the Vigenère table based on cursor position */
    window.updateVigenereHighlight = function () {
        var container = e('vigenere_table_container');
        if (!container) return;
        var table = container.querySelector('.vig-table');
        if (!table) return;
        var cipher = e('cipher_select') ? e('cipher_select').value : 'caesar';
        if (cipher !== 'vigenere') return;

        var active = table.querySelectorAll('.active-col, .active-row, .active-cell, .active-hdr, .active-cross');
        active.forEach(function (el) {
            el.classList.remove('active-col', 'active-row', 'active-cell', 'active-hdr', 'active-cross');
        });

        var input = e('input');
        if (!input) return;
        var text = input.value;
        if (!text) return;

        var keywordStr = e('v_keyword') ? e('v_keyword').value : '';
        if (!keywordStr) return;

        var add = !!(e('v_add') && e('v_add').checked);
        var alph = getAlphabet();

        var caret = input.selectionStart || 0;
        var charIdxInRaw = Math.max(0, caret > 0 ? caret - 1 : 0);
        if (charIdxInRaw >= text.length) charIdxInRaw = text.length - 1;

        var prefix = text.substring(0, charIdxInRaw + 1);
        var sanPrefix = CE.sanitizedStr(prefix, alph);
        var kwSan = CE.sanitizedStr(keywordStr, alph);
        if (sanPrefix.length === 0 || kwSan.length === 0) return;

        var ptChar = sanPrefix.charAt(sanPrefix.length - 1);
        var kwChar = kwSan.charAt((sanPrefix.length - 1) % kwSan.length);

        var c = alph.indexOf(ptChar);
        var r = alph.indexOf(kwChar);

        if (c === -1 || r === -1) return;

        var actualRow = r;
        var actualCol = c;
        if (!add) {
            actualRow = r;
            actualCol = CE.mod(c - r, alph.length);
        }

        var cell = table.querySelector('td[data-row="' + actualRow + '"][data-col="' + actualCol + '"]');
        if (cell) {
            cell.classList.add('active-cell');
            var hCol = table.querySelector('th.header-col[data-col="' + actualCol + '"]');
            var hRow = table.querySelector('th.header-row[data-row="' + actualRow + '"]');
            if (hCol) hCol.classList.add('active-hdr');
            if (hRow) hRow.classList.add('active-hdr');

            var crossCells = table.querySelectorAll('td[data-row="' + actualRow + '"], td[data-col="' + actualCol + '"]');
            crossCells.forEach(function (cc) {
                if (cc !== cell) cc.classList.add('active-cross');
            });
        }
    };

    /** Update colored/grouped visualization for Vigenère output */
    window.updateColoredOutput = function () {
        var cipher = e('cipher_select') ? e('cipher_select').value : 'caesar';
        var isVig = (cipher === 'vigenere');
        var colorChk = e('v_color_output');
        var groupChk = e('v_group_output');
        var wantsColor = colorChk && colorChk.checked;
        var wantsGroup = groupChk && groupChk.checked;

        var outputTa = e('output');
        var colorBox = e('v_colored_output');
        var legendBox = e('v_key_legend');

        if (!outputTa || !colorBox) return;

        if (!isVig || (!wantsColor && !wantsGroup)) {
            outputTa.style.display = '';
            colorBox.classList.add('hidden');
            if (legendBox) legendBox.classList.add('hidden');
            autoResizeTextarea(outputTa);
            return;
        }

        outputTa.style.display = 'none';
        colorBox.classList.remove('hidden');

        var alph = getAlphabet();
        var ct = outputTa.value;
        var kwStr = e('v_keyword') ? e('v_keyword').value : '';
        var kw = CE.sanitizedStr(kwStr, alph);

        if (kw.length === 0) {
            colorBox.innerText = ct;
            if (legendBox) legendBox.classList.add('hidden');
            return;
        }

        var colors = [];
        if (wantsColor) {
            for (var i = 0; i < kw.length; i++) {
                var hue = Math.floor((i * 360) / kw.length);
                colors.push('hsl(' + hue + ', 65%, 45%)');
            }
            if (legendBox) {
                legendBox.classList.remove('hidden');
                var legHtml = '';
                for (var j = 0; j < kw.length; j++) {
                    legHtml += '<span class="key-badge" style="background-color: ' + colors[j] + ';">' + kw.charAt(j).toUpperCase() + '</span>';
                }
                legendBox.innerHTML = legHtml;
            }
        } else {
            if (legendBox) legendBox.classList.add('hidden');
        }

        var html = '';
        var letterIdx = 0;

        for (var k = 0; k < ct.length; k++) {
            var ch = ct.charAt(k);
            if (alph.indexOf(ch) !== -1 || alph.indexOf(ch.toLowerCase()) !== -1) {
                var classes = [];
                var styleAttr = '';

                if (wantsColor) {
                    classes.push('vig-colored');
                    styleAttr = ' style="background-color: ' + colors[letterIdx % kw.length] + ';"';
                }

                if (wantsGroup && (letterIdx % kw.length === kw.length - 1)) {
                    classes.push('vig-group-end');
                }

                var classAttr = classes.length > 0 ? ' class="' + classes.join(' ') + '"' : '';
                html += '<span' + classAttr + styleAttr + '>' + ch + '</span>';
                letterIdx++;
            } else {
                html += ch;
            }
        }

        colorBox.innerHTML = html;
        colorBox.style.minHeight = Math.max(80, outputTa.scrollHeight || 0) + 'px';
    };

    /** Setup Kasiski analysis trigger */
    window.setupKasiski = function () {
        var btn = e('kasiski_run_btn');
        if (!btn) return;
        btn.addEventListener('click', function () {
            var text = e('input') ? e('input').value : '';
            var alph = getAlphabet();
            var results = CE.kasiskiAnalysis(text, alph);
            renderKasiski(results);
        });
    };

    /** Display Kasiski analysis results */
    window.renderKasiski = function (res) {
        var area = e('kasiski_results');
        if (!area) return;
        if (res.repeats.length === 0) {
            area.innerHTML = '<div class="hint">No se encontraron patrones repetidos suficientes (mínimo 3 caracteres).</div>';
            return;
        }
        var html = '<div style="margin-bottom:12px;"><strong>Patrones encontrados:</strong>' +
            '<table style="width:100%; margin-top:8px; border-collapse:collapse; font-size:12px;">' +
            '<thead style="border-bottom:1px solid var(--border-light);"><tr>' +
            '<th style="text-align:left; padding-bottom:4px;">Secuencia</th>' +
            '<th style="text-align:right; padding-bottom:4px;">Repeticiones</th>' +
            '<th style="text-align:right; padding-bottom:4px;">Distancias</th>' +
            '</tr></thead><tbody>';

        res.repeats.forEach(function (r) {
            html += '<tr style="border-bottom: 1px solid var(--bg-subtle);">' +
                '<td style="font-family:monospace; color:var(--accent); padding:4px 0;">' + r.seq.toUpperCase() + '</td>' +
                '<td style="text-align:right; padding:4px 0;">' + r.count + '</td>' +
                '<td style="text-align:right; color:var(--muted); padding:4px 0;">' + r.distances.slice(0, 3).join(', ') + (r.distances.length > 3 ? '...' : '') + '</td>' +
                '</tr>';
        });
        html += '</tbody></table></div>';

        if (res.factors.length > 0) {
            html += '<div><strong>Longitudes probables de clave:</strong>' +
                '<div class="key-badge-container" style="margin-top:6px;">';
            res.factors.forEach(function (f) {
                html += '<span class="key-badge" style="background:var(--accent-soft); color:var(--accent); border:1px solid var(--accent);">' +
                    f.factor + ' <small style="opacity:0.7;margin-left:4px;">(' + f.count + ')</small></span>';
            });
            html += '</div><p class="hint" style="margin-top:8px; font-size:11px;">Los números indican cuántas veces ese factor divide a las distancias encontradas.</p></div>';
        }
        area.innerHTML = html;
    };

})();
