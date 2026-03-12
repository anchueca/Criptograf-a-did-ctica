/**
 * ui_mono.js — Monoalphabetic substitution UI.
 */
(function () {
    'use strict';

    /** Get the current internal monoalphabetic mapping */
    window.getMonoMapping = function () { return window._monoMap || Object.create(null); };

    /** Apply the current mono mapping to the input and show in output */
    window.applyMonoMappingPreview = function () {
        var sel = e('cipher_select');
        if (sel && sel.value !== 'mono') return;
        var map = getMonoMapping();
        var ct = e('input') ? e('input').value : '';
        var preview = CE.applyMonoMapping(ct, map, getAlphabet());
        displayText(preview, 'output');
    };

    /** Set a specific letter mapping and refresh UI */
    window.setMonoMapping = function (from, to) {
        window._monoMap = window._monoMap || Object.create(null);
        var f = from.toLowerCase();
        var t = to ? to.toLowerCase() : null;

        // If 't' is already used by another letter, clear that other letter's mapping
        if (t) {
            for (var key in window._monoMap) {
                if (window._monoMap[key] === t && key !== f) {
                    delete window._monoMap[key];
                }
            }
        }

        if (!t) delete window._monoMap[f];
        else window._monoMap[f] = t;

        renderMonoMap();
        applyMonoMappingPreview();

        if (typeof updateAll === 'function') updateAll();
    };

    /** Render the interactive grid of 26 letters for substitution */
    window.renderMonoMap = function () {
        var container = e('mono_map');
        if (!container) return;
        container.innerHTML = '';
        var alph = getAlphabet();
        var map = getMonoMapping();
        
        // Count reversed map to know what letters are already chosen
        var chosen = Object.create(null);
        for (var k in map) { if (map[k]) chosen[map[k]] = true; }

        var info = CE.getLetterCounts(e('input') ? e('input').value : '', alph);
        var counts = info.counts;
        var total = info.total || 0;

        for (var i = 0; i < alph.length; i++) {
            var ch = alph.charAt(i);
            var item = document.createElement('div'); item.className = 'mono-item';
            var src = document.createElement('div'); src.className = 'mono-source'; src.innerText = ch.toUpperCase();
            var current = document.createElement('div'); current.className = 'mono-current'; current.innerText = (map[ch] || '*').toUpperCase();

            var cnt = counts[i] || 0;
            var pct = total > 0 ? (cnt / total * 100) : 0;
            var stat = document.createElement('div'); stat.className = 'mono-stat'; stat.innerText = cnt + ' (' + pct.toFixed(1) + '%)';

            var sel = document.createElement('select'); sel.className = 'mono-select'; sel.setAttribute('data-src', ch);
            var optStar = document.createElement('option'); optStar.value = ''; optStar.innerText = '*'; sel.appendChild(optStar);

            for (var j = 0; j < alph.length; j++) {
                var tgt = alph.charAt(j);
                // Allow current choice or any unchosen choice
                if (!chosen[tgt] || map[ch] === tgt) {
                    var o = document.createElement('option'); o.value = tgt; o.innerText = tgt.toUpperCase(); sel.appendChild(o);
                }
            }

            sel.value = map[ch] || '';
            sel.addEventListener('change', (function (from) {
                return function () {
                    var val = this.value || null;
                    setMonoMapping(from, val);
                };
            })(ch));

            item.appendChild(src); item.appendChild(current); item.appendChild(sel); item.appendChild(stat);
            container.appendChild(item);
        }
    };

    /** Initialize the mono panel events */
    window.setupMonoPanel = function () {
        window._monoMap = window._monoMap || Object.create(null);
        renderMonoMap();
        var clearBtn = e('mono_clear');
        if (clearBtn) clearBtn.addEventListener('click', function () {
            window._monoMap = Object.create(null);
            renderMonoMap();
            applyMonoMappingPreview();
            if (typeof updateAll === 'function') updateAll();
        });

        var lang = e('lang_select');
        if (lang) lang.addEventListener('change', function () {
            window._monoMap = Object.create(null);
            renderMonoMap();
            applyMonoMappingPreview();
            if (typeof updateAll === 'function') updateAll();
        });
    };

})();
