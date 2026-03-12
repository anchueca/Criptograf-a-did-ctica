/**
 * ui_core.js — Foundational helpers and utilities.
 */
(function () {
    'use strict';

    window.CE = CryptoEngine; // Global alias for the engine

    /** DOM shortcut */
    window.e = function (id) { return document.getElementById(id); };

    /** Read alphabet based on selected language */
    window.getAlphabet = function () {
        var lang = (e('lang_select') && e('lang_select').value) ? e('lang_select').value : 'es';
        return CE.getAlphabetForLang(lang);
    };

    /** Get current language code */
    window.getLang = function () {
        return (e('lang_select') && e('lang_select').value) ? e('lang_select').value : 'es';
    };

    /** Read a CSS custom property from :root (theme-aware). */
    window.cssVar = function (name) {
        return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    };

    /** Auto-resize a textarea to fit its content */
    window.autoResizeTextarea = function (el) {
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = (el.scrollHeight) + 'px';
    };

    /** Sanitize and display text in a target element */
    window.displayText = function (t, id) {
        var tgt = e(id);
        if (!tgt) return;
        tgt.value = CE.sanitizedStr(t, getAlphabet());
        autoResizeTextarea(tgt);
    };

    /** Debounce helper to limit execution frequency */
    window.debounce = function (fn, t) {
        var timer;
        return function () {
            var ctx = this, args = arguments;
            clearTimeout(timer);
            timer = setTimeout(function () { fn.apply(ctx, args); }, t);
        };
    };

})();
