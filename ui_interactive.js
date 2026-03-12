/**
 * ui_interactive.js — Interactive visualization and manual substitution logic.
 */
(function () {
    'use strict';

    var container, toggle, standardIo, interactiveView;

    /** Setup listeners and views */
    window.setupInteractive = function () {
        container = document.getElementById('interactive_container');
        toggle = document.getElementById('interactive_toggle');
        standardIo = document.getElementById('standard_io');
        interactiveView = document.getElementById('interactive_view');

        if (!toggle || !container) return;

        toggle.addEventListener('change', function () {
            if (this.checked) {
                if (standardIo) standardIo.classList.add('hidden');
                if (interactiveView) interactiveView.classList.remove('hidden');
                renderInteractive();
            } else {
                if (standardIo) standardIo.classList.remove('hidden');
                if (interactiveView) interactiveView.classList.add('hidden');
            }
        });
    };

    var lastFocusedAbsIdx = null;

    /** Render the interactive view based on current input and cipher */
    window.renderInteractive = function () {
        if (!toggle || !toggle.checked) return;

        var text = document.getElementById('input').value;
        var outputText = document.getElementById('output').value;
        var alph = getAlphabet();
        var cipher = document.getElementById('cipher_select').value;
        
        // Vigenere specific options
        var wantsColor = document.getElementById('v_color_output') && document.getElementById('v_color_output').checked;
        var wantsGroup = document.getElementById('v_group_output') && document.getElementById('v_group_output').checked;
        var kwStr = document.getElementById('v_keyword') ? document.getElementById('v_keyword').value : '';
        var kw = CE.sanitizedStr(kwStr, alph);
        var colors = [];
        if (cipher === 'vigenere' && wantsColor && kw.length > 0) {
            for (var cIdx = 0; cIdx < kw.length; cIdx++) {
                var hue = Math.floor((cIdx * 360) / kw.length);
                colors.push('hsl(' + hue + ', 65%, 45%)');
            }
        }

        // Save current focus if it's one of our characters
        var active = document.activeElement;
        if (active && active.dataset && active.dataset.absIdx !== undefined) {
            lastFocusedAbsIdx = parseInt(active.dataset.absIdx);
        }

        container.innerHTML = '';
        
        if (!text) {
            container.innerHTML = '<div class="hint">Escribe algo en la entrada para empezar.</div>';
            return;
        }

        var elementToFocus = null;
        var cleanPos = 0;
        
        var currentLineEl = document.createElement('div');
        currentLineEl.className = 'interactive-line';
        container.appendChild(currentLineEl);

        for (var i = 0; i < text.length; i++) {
            var char = text[i];
            
            if (char === '\n') {
                currentLineEl = document.createElement('div');
                currentLineEl.className = 'interactive-line';
                container.appendChild(currentLineEl);
                continue;
            }

            var charPair = document.createElement('div');
            charPair.className = 'char-pair';
            if (char === ' ') charPair.classList.add('char-space');
            
            var origEl = document.createElement('span');
            origEl.className = 'char-original';
            origEl.textContent = char === ' ' ? '\u00A0' : char;
            
            var procEl = document.createElement('div');
            procEl.className = 'char-processed';
            
            var outChar = outputText.charAt(i) || '_';
            var charUpper = char.toUpperCase();
            var alphUpper = alph.toUpperCase();
            
            if (alphUpper.indexOf(charUpper) !== -1) {
                var currentCleanPos = cleanPos;
                cleanPos++;
                
                procEl.tabIndex = 0;
                procEl.dataset.char = charUpper;
                procEl.dataset.absIdx = i;
                procEl.dataset.cleanPos = currentCleanPos;
                
                // Apply Vigenere specific styling
                if (cipher === 'vigenere' && kw.length > 0) {
                    if (wantsColor) {
                        procEl.style.backgroundColor = colors[currentCleanPos % kw.length];
                        procEl.style.color = '#fff';
                        procEl.style.borderBottom = 'none';
                        procEl.style.borderRadius = '4px';
                    }
                    if (wantsGroup && (currentCleanPos % kw.length === kw.length - 1)) {
                        charPair.style.marginRight = '8px';
                    }
                }

                if (outChar === '*' || outChar === '_' || outChar === '') {
                    procEl.classList.add('empty');
                    procEl.textContent = '_';
                } else {
                    procEl.textContent = outChar;
                }

                if (lastFocusedAbsIdx === i) {
                    elementToFocus = procEl;
                }

                procEl.addEventListener('click', function() {
                    lastFocusedAbsIdx = parseInt(this.dataset.absIdx);
                    this.focus();
                });

                procEl.addEventListener('keydown', function(e) {
                    var key = e.key;
                    if (key.length === 1 && /[a-zA-ZñÑáéíóúÁÉÍÓÚüÜ]/.test(key)) {
                        handleManualSubstitution(this.dataset.char, key.toUpperCase(), parseInt(this.dataset.cleanPos));
                        e.preventDefault();
                    }
                });
            } else {
                procEl.classList.add('non-interactive');
                if (char === ' ') procEl.textContent = '\u00A0';
                else procEl.textContent = outChar;
            }

            charPair.appendChild(origEl);
            charPair.appendChild(procEl);
            currentLineEl.appendChild(charPair);
        }

        if (elementToFocus) {
            elementToFocus.focus();
        }
    };

    /** Calculate and apply the change based on user input */
    function handleManualSubstitution(origChar, newChar, cleanPos) {
        var cipher = document.getElementById('cipher_select').value;
        var alph = getAlphabet().toUpperCase();
        var origIdx = alph.indexOf(origChar.toUpperCase());
        var newIdx = alph.indexOf(newChar.toUpperCase());

        if (origIdx === -1 || newIdx === -1) return;

        if (cipher === 'caesar') {
            var shift = (newIdx - origIdx + alph.length) % alph.length;
            var shiftEl = document.getElementById('caesar_shift');
            var valEl = document.getElementById('caesar_val');
            if (shiftEl) {
                shiftEl.value = shift;
                if (valEl) valEl.innerText = shift;
                updateAll();
            }
        } 
        else if (cipher === 'vigenere') {
            var keywordEl = document.getElementById('v_keyword');
            var keyword = keywordEl ? keywordEl.value : '';
            var keySizeEl = document.getElementById('v_key_size');
            var keyLen = keySizeEl ? parseInt(keySizeEl.value, 10) : (keyword.length || 1);
            
            var keyPos = cleanPos % keyLen;
            
            var shift = (newIdx - origIdx + alph.length) % alph.length;
            var newKeyChar = alph[shift];
            
            var keyArray = keyword.toUpperCase().split('');
            // Ensure we have enough characters for the position
            while (keyArray.length < keyLen) keyArray.push(alph[0]);
            
            if (keyPos < keyArray.length) {
                keyArray[keyPos] = newKeyChar;
            }
            
            if (keywordEl) {
                keywordEl.value = keyArray.join('');
                // If the key was empty or short, we might need to update the key size input or just let applyVige handle it
                updateAll();
            }
        }
        else if (cipher === 'mono') {
            if (typeof window.setMonoMapping === 'function') {
                window.setMonoMapping(origChar.toLowerCase(), newChar.toLowerCase());
                // setMonoMapping now calls updateAll already
            }
        }
    }

})();
