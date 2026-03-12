/**
 * ui_stats.js — Statistics and histogram UI.
 */
(function () {
    'use strict';

    /** Display helper for counts */
    window.displayCount = function (f, id) {
        var tgt = e(id);
        if (!tgt) return;
        var alph = getAlphabet();
        var max = alph.length;
        var out = f.slice(0, max).map(function (x) { return x[1] + x[0]; }).join(' ');
        if ('value' in tgt && tgt.tagName !== 'DIV') tgt.value = out; else tgt.innerText = out;
    };

    /** Update total character length statistic */
    window.applyStatsLength = function () {
        var inp = e('input');
        if (!inp) return;
        var s = CE.sanitizedStr(inp.value, getAlphabet());
        var tgt = e('s_length');
        if (tgt) { if ('value' in tgt && tgt.tagName !== 'DIV') tgt.value = s.length; else tgt.innerText = s.length; }
    };

    /** Update letter frequency statistics */
    window.applyStatsFreq = function () {
        var s = e('input') ? e('input').value : '';
        displayCount(CE.countSubstrings(s, 1, getAlphabet()), 's_freq');
    };

    /** Update Index of Coincidence statistic */
    window.applyStatsIC = function () {
        var s = e('input') ? e('input').value : '';
        var ic = CE.indexOfCoincidence(s, getAlphabet());
        var val = isNaN(ic) ? 'n/a' : CE.truncate(ic, 5);
        var tgt = e('s_ic');
        if (tgt) { if ('value' in tgt && tgt.tagName !== 'DIV') tgt.value = val; else tgt.innerText = val; }
    };

    /** Update Friedman test (key length estimation) */
    window.applyStatsFriedman = function () {
        var s = e('input') ? e('input').value : '';
        var ft = CE.friedmanTest(s, getAlphabet());
        var val = isNaN(ft) ? 'n/a' : CE.truncate(ft, 5);
        var tgt = e('s_ft');
        if (tgt) { if ('value' in tgt && tgt.tagName !== 'DIV') tgt.value = val; else tgt.innerText = val; }
    };

    /** Draw the frequency histogram on the canvas */
    window.updateHistogram = function () {
        var canvas = e('freq_canvas');
        if (!canvas) return;
        var wClient = canvas.clientWidth || 680;
        var hClient = 220;
        canvas.width = wClient;
        canvas.height = hClient;
        var ctx = canvas.getContext('2d');
        var w = canvas.width;
        var h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = cssVar('--canvas-bg') || '#fff';
        ctx.fillRect(0, 0, w, h);

        var s = e('output') ? e('output').value : '';
        var alph = getAlphabet();

        // Check which N-gram level we are viewing
        var ngramVal = 1;
        var radioGroup = document.querySelectorAll('input[name="hist_ngram"]');
        for (var i = 0; i < radioGroup.length; i++) {
            if (radioGroup[i].checked) { ngramVal = parseInt(radioGroup[i].value, 10); break; }
        }

        var showObs = e('show_observed') ? e('show_observed').checked : true;
        var showExp = e('show_expected') ? e('show_expected').checked : true;
        var lang = getLang();

        var obsLabel = [];
        var obsPerc = [];
        var expPerc = [];
        var numOpts = 0;
        var countsArray = [];

        if (ngramVal === 1) {
            // Unigrams (Letters)
            var countsObj = CE.getLetterCounts(s, alph);
            var counts = countsObj.counts;
            var total = countsObj.total;
            var n = alph.length;
            var expected = CE.expectedProfiles[lang] || CE.expectedProfiles['es'];

            for (var i = 0; i < n; i++) {
                obsLabel.push(alph.charAt(i).toUpperCase());
                obsPerc.push(total > 0 ? (counts[i] / total * 100) : 0);
                expPerc.push(expected[i] || 0);
                countsArray.push(counts[i] || 0);
            }
            numOpts = n;
        } else {
            // N-grams (Digrams or Trigrams)
            var counts = CE.countSubstrings(s, ngramVal, alph);
            var expDict = CE.expectedNgrams[lang] || CE.expectedNgrams['es'];
            var expList = ngramVal === 2 ? expDict.digrams : expDict.trigrams;

            var mapObs = {};
            var totalObsNgrams = 0;
            for (var i = 0; i < counts.length; i++) {
                mapObs[counts[i][1]] = counts[i][0];
                totalObsNgrams += counts[i][0];
            }

            var combinedSet = new Set();
            for (var i = 0; i < Math.min(15, counts.length); i++) {
                combinedSet.add(counts[i][1]);
            }
            for (var i = 0; i < expList.length; i++) {
                combinedSet.add(expList[i]);
            }

            var merged = Array.from(combinedSet);
            merged.sort(function (a, b) {
                var cA = mapObs[a] || 0;
                var cB = mapObs[b] || 0;
                if (cB !== cA) return cB - cA;
                return a.localeCompare(b);
            });

            if (merged.length > 20) merged = merged.slice(0, 20);

            for (var i = 0; i < merged.length; i++) {
                var g = merged[i];
                obsLabel.push(g.toUpperCase());
                var c = mapObs[g] || 0;
                obsPerc.push(totalObsNgrams > 0 ? (c / totalObsNgrams * 100) : 0);
                countsArray.push(c);

                var eIdx = expList.indexOf(g);
                var eVal = 0;
                if (eIdx !== -1) {
                    if (ngramVal === 2) { eVal = Math.max(0.5, 4.0 - eIdx * 0.3); }
                    else { eVal = Math.max(0.2, 2.0 - eIdx * 0.15); }
                }
                expPerc.push(eVal);
            }
            numOpts = merged.length;
            if (numOpts === 0) numOpts = 1;
        }

        var margin = 36;
        var chartW = w - margin * 2 - 20;
        var chartH = h - margin * 2;
        var barW = chartW / numOpts * 0.7;
        if (barW > 30) barW = 30;
        var halfBW = showExp ? barW / 2 : barW;
        var gap = (chartW - barW * numOpts) / Math.max(1, numOpts - 1);

        var maxP = 0;
        for (var i = 0; i < obsPerc.length; i++) if (obsPerc[i] > maxP) maxP = obsPerc[i];
        for (var i = 0; i < expPerc.length; i++) if (expPerc[i] > maxP) maxP = expPerc[i];
        if (maxP < 5) maxP = 5;

        ctx.strokeStyle = cssVar('--canvas-grid') || '#e6eefc';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(margin, margin);
        ctx.lineTo(margin, margin + chartH);
        ctx.lineTo(margin + chartW, margin + chartH);
        ctx.stroke();

        var textColor = cssVar('--text') || '#0f172a';
        ctx.fillStyle = textColor;
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(maxP.toFixed(0) + '%', margin - 4, margin + 4);
        ctx.fillText('0%', margin - 4, margin + chartH);

        var bars = [];
        ctx.textAlign = 'center';

        for (var i = 0; i < numOpts; i++) {
            var label = obsLabel[i] || '';
            var bx = margin + i * (barW + gap);

            if (showExp) {
                var pE = expPerc[i] || 0;
                var bhE = (pE / maxP) * chartH;
                var byE = margin + chartH - bhE;
                ctx.fillStyle = cssVar('--bar-expected') || 'rgba(255,165,0,0.35)';
                ctx.fillRect(showObs ? bx + halfBW : bx, byE, halfBW, bhE);
                ctx.strokeStyle = cssVar('--bar-expected-stroke') || 'rgba(255,165,0,0.6)';
                ctx.strokeRect(showObs ? bx + halfBW : bx, byE, halfBW, bhE);
            }

            if (showObs) {
                var pO = obsPerc[i] || 0;
                var bhO = (pO / maxP) * chartH;
                var byO = margin + chartH - bhO;
                ctx.fillStyle = cssVar('--bar-observed') || '#6366f1';
                ctx.fillRect(bx, byO, halfBW, bhO);

                bars.push({ x: bx, y: byO, w: halfBW, h: bhO, letter: label, count: countsArray[i] || 0, percent: pO });
            }

            ctx.fillStyle = textColor;
            var textX = bx + barW / 2;
            if (ngramVal > 1 && numOpts > 12) {
                ctx.save();
                ctx.translate(textX, margin + chartH + 12);
                ctx.rotate(-Math.PI / 4);
                ctx.textAlign = 'right';
                ctx.fillText(label, 0, 0);
                ctx.restore();
            } else {
                ctx.fillText(label, textX, margin + chartH + 16);
            }
        }
        window._freqBars = bars;

        var legendY = 8;
        ctx.textAlign = 'left';
        if (showObs) {
            ctx.fillStyle = cssVar('--bar-observed') || '#6366f1';
            ctx.fillRect(w - 180, legendY, 12, 12);
            ctx.fillStyle = textColor;
            ctx.fillText('Observadas', w - 160, legendY + 10);
            legendY += 18;
        }
        if (showExp) {
            ctx.fillStyle = cssVar('--bar-expected-stroke') || 'rgba(255,165,0,0.6)';
            ctx.fillRect(w - 180, legendY, 12, 12);
            ctx.fillStyle = textColor;
            var lgText = 'Esperadas (' + lang.toUpperCase() + ')';
            if (ngramVal > 1) lgText = 'Comunes (' + lang.toUpperCase() + ')';
            ctx.fillText(lgText, w - 160, legendY + 10);
        }
    };

    /** Update text-based frequency hints */
    window.updateLanguageHints = function () {
        var lang = getLang();
        var hintTitle = e('lang_hint_title');
        var hintPre = e('lang_hint_pre');
        if (!hintTitle || !hintPre) return;
        var alph = CE.getAlphabetForLang(lang);
        var expected = CE.expectedProfiles[lang] || CE.expectedProfiles['es'];
        var arr = [];
        for (var i = 0; i < alph.length; i++) arr.push({ ch: alph.charAt(i), f: (expected[i] || 0) });
        arr.sort(function (a, b) { return b.f - a.f; });
        var lettersOrder = arr.map(function (x) { return x.ch; }).join(' ');
        var ngrams = CE.expectedNgrams[lang];
        var digs = (ngrams && ngrams.digrams) ? ngrams.digrams.join(' ') : '';
        var trigs = (ngrams && ngrams.trigrams) ? ngrams.trigrams.join(' ') : '';
        hintTitle.innerText = 'Frecuencias esperadas — ' + (lang === 'es' ? 'Castellano' : 'English');
        hintPre.innerText = 'Letras por frecuencia (mayor→menor):\n' + lettersOrder + '\n\nDígrafos frecuentes: ' + digs + '\nTrígramas frecuentes: ' + trigs + '\n\nConsejo: compara estas listas con las frecuencias observadas y el histograma para identificar patrones.';
    };

    /** Setup mouse events for the histogram canvas tooltip */
    window.setupHistogramEvents = function () {
        var canvas = e('freq_canvas');
        if (!canvas) return;
        var tooltip = document.querySelector('.freq-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.className = 'freq-tooltip';
            document.body.appendChild(tooltip);
        }

        canvas.addEventListener('mousemove', function (ev) {
            var rect = canvas.getBoundingClientRect();
            var x = ev.clientX - rect.left;
            var bars = window._freqBars || [];
            var found = null;
            for (var i = 0; i < bars.length; i++) {
                var b = bars[i];
                if (x >= b.x && x <= b.x + b.w) { found = b; break; }
            }
            if (found) {
                canvas.style.cursor = 'pointer';
                tooltip.style.display = 'block';
                tooltip.innerHTML = '<strong>' + found.letter.toUpperCase() + '</strong>: ' + found.count + ' (' + found.percent.toFixed(2) + '%)';
                var left = ev.clientX + 12; var top = ev.clientY + 12;
                var tw = tooltip.offsetWidth; var th = tooltip.offsetHeight;
                if (left + tw > window.innerWidth) left = ev.clientX - tw - 12;
                if (top + th > window.innerHeight) top = ev.clientY - th - 12;
                tooltip.style.left = left + 'px'; tooltip.style.top = top + 'px';
            } else {
                canvas.style.cursor = 'default';
                tooltip.style.display = 'none';
            }
        });
        canvas.addEventListener('mouseout', function () {
            var tip = document.querySelector('.freq-tooltip');
            if (tip) tip.style.display = 'none';
            canvas.style.cursor = 'default';
        });
    };

})();
