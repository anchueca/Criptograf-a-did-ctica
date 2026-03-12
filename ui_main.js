/**
 * ui_main.js — Main UI controller and application entry point.
 */
(function () {
    'use strict';

    /** Apply Caesar cipher and display result */
    window.applyCaesar = function (encrypt) {
        var alph = getAlphabet();
        var text = e('input') ? e('input').value : '';
        var shiftEl = e('caesar_shift');
        var shift = shiftEl ? parseInt(shiftEl.value, 10) : 0;
        if (!encrypt) shift = -shift;
        var result = CE.caesarApply(text, shift, alph);
        displayText(result, 'output');
    };

    /** Apply Affine/Mono cipher (ax+b) and display result */
    window.applyMono = function (a, b) {
        var alph = getAlphabet();
        var text = e('input') ? e('input').value : '';
        var result = CE.monoAffine(text, a, b, alph);
        displayText(result, 'output');
    };

    /** Basic input/output transfers */
    window.inputToOutput = function () { displayText(e('input').value, 'output'); };
    window.outputToInput = function () { displayText(e('output').value, 'input'); };
    window.interchangeInputAndOutput = function () {
        var out = e('output').value;
        inputToOutput();
        displayText(out, 'input');
    };

    /** updateAll: The central update trigger for the whole UI */
    window.updateAll = function () {
        var cipher = e('cipher_select') ? e('cipher_select').value : 'caesar';

        if (cipher === 'mono') {
            applyMonoMappingPreview();
        } else if (cipher === 'vigenere') {
            applyVige();
        } else if (cipher === 'caesar') {
            var decrypt = e('caesar_decrypt') && e('caesar_decrypt').checked;
            applyCaesar(!decrypt);
        }

        applyStatsLength();
        applyStatsFreq();
        applyStatsIC();
        applyStatsFriedman();
        updateHistogram();

        if (typeof updateVigenereHighlight === 'function') updateVigenereHighlight();
        if (typeof updateColoredOutput === 'function') updateColoredOutput();
    };

    /** Setup event listeners for real-time updates */
    window.setupRealtime = function () {
        var input = e('input');
        var output = e('output');
        if (!input || !output) return;

        input.addEventListener('input', function () {
            autoResizeTextarea(this);
            debounce(updateAll, 150)();
        });

        input.addEventListener('click', function () {
            if (typeof updateVigenereHighlight === 'function') updateVigenereHighlight();
        });

        input.addEventListener('keyup', function (ev) {
            if (ev.key && ev.key.indexOf('Arrow') !== -1) {
                if (typeof updateVigenereHighlight === 'function') updateVigenereHighlight();
            }
        });

        var caesarShift = e('caesar_shift');
        if (caesarShift) caesarShift.addEventListener('input', debounce(updateAll, 120));

        var caesarDec = e('caesar_decrypt');
        if (caesarDec) caesarDec.addEventListener('change', updateAll);

        var vkw = e('v_keyword');
        if (vkw) vkw.addEventListener('input', debounce(updateAll, 150));

        var vadd = e('v_add');
        var vsub = e('v_subtract');
        if (vadd) vadd.addEventListener('change', updateAll);
        if (vsub) vsub.addEventListener('change', updateAll);

        var lang = e('lang_select');
        if (lang) lang.addEventListener('change', updateAll);

        var showObs = e('show_observed');
        if (showObs) showObs.addEventListener('change', updateAll);

        var showExp = e('show_expected');
        if (showExp) showExp.addEventListener('change', updateAll);

        var ngramRadios = document.querySelectorAll('input[name="hist_ngram"]');
        ngramRadios.forEach(function (r) { r.addEventListener('change', updateAll); });

        var colorChk = e('v_color_output');
        if (colorChk) colorChk.addEventListener('change', updateAll);

        var groupChk = e('v_group_output');
        if (groupChk) groupChk.addEventListener('change', updateAll);

        autoResizeTextarea(input);
        autoResizeTextarea(output);
        updateAll();
    };

    /** Setup collapsible panels */
    window.setupCollapsibles = function () {
        var headers = document.querySelectorAll('.panel-header');
        headers.forEach(function (h) {
            var wrap = h.parentElement;
            wrap.classList.remove('collapsed');
            h.addEventListener('click', function () { wrap.classList.toggle('collapsed'); });
        });
    };

    /** Show/hide panels based on selected cipher */
    window.updateCipherView = function () {
        var sel = e('cipher_select');
        var val = sel ? sel.value : 'caesar';
        var panels = document.querySelectorAll('.panel-wrap');
        panels.forEach(function (p) {
            var attr = p.getAttribute('data-cipher') || 'all';
            var types = attr.split(/\s+/);
            if (types.indexOf('all') !== -1 || types.indexOf(val) !== -1) { p.style.display = ''; }
            else { p.style.display = 'none'; }
        });
        try {
            applyStatsLength();
            applyStatsFreq();
            applyStatsIC();
            applyStatsFriedman();
            updateHistogram();
        } catch (err) { }
    };

    /** Setup the head cipher selector */
    window.setupCipherSelector = function () {
        var sel = e('cipher_select');
        if (!sel) return;
        sel.addEventListener('change', function () {
            updateCipherView();
            var input = e('input');
            if (input) input.dispatchEvent(new Event('input'));
        });
        updateCipherView();
    };

    /** Setup context help tooltips */
    window.setupContextHelp = function () {
        var box = document.getElementById('context_help');
        if (!box) return;

        function show(msg) {
            if (!msg) { box.classList.add('hidden'); box.innerText = ''; return; }
            box.classList.remove('hidden'); box.innerText = msg;
        }

        function helpFor(target) {
            if (!target || target === document.body) return '';
            var el = target.closest('[data-help]');
            return el ? el.getAttribute('data-help') : '';
        }

        var hoverTimer = null;
        var lastHelp = '';
        var main = document.getElementById('main_area') || document.body;

        main.addEventListener('mousemove', function (ev) {
            var help = helpFor(ev.target);
            if (!box.classList.contains('hidden')) {
                var mx = ev.clientX + 14;
                var my = ev.clientY + 14;
                var bw = box.offsetWidth || 300;
                var bh = box.offsetHeight || 40;
                if (mx + bw > window.innerWidth) mx = ev.clientX - bw - 14;
                if (my + bh > window.innerHeight) my = ev.clientY - bh - 14;
                box.style.left = mx + 'px';
                box.style.top = my + 'px';
            }
            if (help !== lastHelp) {
                lastHelp = help;
                if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
                if (!help) { show(''); return; }
                hoverTimer = setTimeout(function () {
                    show(help);
                    box.style.left = (ev.clientX + 14) + 'px';
                    box.style.top = (ev.clientY + 14) + 'px';
                }, 600);
            }
        });

        main.addEventListener('mouseleave', function () {
            if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
            lastHelp = '';
            show('');
        });

        main.addEventListener('focusin', function (ev) {
            var help = helpFor(ev.target);
            if (!help) return;
            show(help);
            var r = ev.target.getBoundingClientRect();
            box.style.left = Math.min(window.innerWidth - 300, r.right + 8) + 'px';
            box.style.top = Math.max(8, r.top) + 'px';
        });

        main.addEventListener('focusout', function () {
            if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
            lastHelp = '';
            show('');
        });
    };

    /** Setup dark/light theme toggle */
    window.setupThemeToggle = function () {
        var btn = e('theme_toggle');
        var icon = e('theme_icon');
        var label = e('theme_label');
        if (!btn) return;

        var saved = localStorage.getItem('ct_theme');
        if (saved) {
            document.documentElement.setAttribute('data-theme', saved);
            updateToggleUI(saved);
        }

        btn.addEventListener('click', function () {
            var current = document.documentElement.getAttribute('data-theme') || 'light';
            var next = current === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('ct_theme', next);
            updateToggleUI(next);
            if (typeof updateHistogram === 'function') updateHistogram();
        });

        function updateToggleUI(theme) {
            if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
            if (label) label.textContent = theme === 'dark' ? 'Claro' : 'Oscuro';
        }
    };

    /** Default initialization data */
    window.initToolkit = function () {
        var inp = e('input');
        if (inp && !inp.value) inp.value = 'ataquealmadrigal';
    };

    /** application bootstrapper */
    window.boot = function () {
        setupThemeToggle();
        initToolkit();

        var swapBtn = e('swap_btn');
        if (swapBtn) swapBtn.addEventListener('click', function () {
            var inp = e('input');
            var out = e('output');
            if (!inp || !out) return;
            inp.value = out.value;
            out.value = '';
            inp.dispatchEvent(new Event('input'));
        });

        setupRealtime();
        setupCollapsibles();

        if (typeof setupHistogramEvents === 'function') setupHistogramEvents();
        if (typeof setupBreakers === 'function') setupBreakers();

        setupCipherSelector();
        setupContextHelp();

        if (typeof setupMonoPanel === 'function') setupMonoPanel();
        if (typeof setupVigenereTable === 'function') setupVigenereTable();
        if (typeof setupKasiski === 'function') setupKasiski();
        if (typeof updateLanguageHints === 'function') updateLanguageHints();

        var lang = e('lang_select');
        if (lang) {
            lang.addEventListener('change', function () {
                if (typeof updateLanguageHints === 'function') updateLanguageHints();
                if (typeof updateHistogram === 'function') updateHistogram();
                if (typeof applyStatsFreq === 'function') applyStatsFreq();
                if (typeof setupVigenereTable === 'function') setupVigenereTable();
            });
        }
    };

    // Global Public API
    window.CT = {
        applyCaesar: applyCaesar,
        applyVige: function () { if (typeof applyVige === 'function') applyVige(); },
        applyMono: applyMono,
        countSubstrings: function (s, d) { return CE.countSubstrings(s, d, getAlphabet()); }
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();

})();
