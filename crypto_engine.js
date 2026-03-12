/**
 * CryptoEngine — llogic for the Cryptographer's Toolkit.
 */
var CryptoEngine = (function () {
  'use strict';

  var DEFAULT_ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

  // ── Alphabet helpers ──────────────────────────────────────────────

  function getAlphabetForLang(lang) {
    if (lang === 'es') return 'abcdefghijklmnñopqrstuvwxyz';
    return DEFAULT_ALPHABET;
  }

  // ── Math helpers ──────────────────────────────────────────────────

  function mod(a, b) {
    if (b <= 0) return NaN;
    var c = a % b;
    if (c < 0) c += b;
    return c;
  }

  function truncate(x, ndig) {
    var p = Math.pow(10, ndig || 3);
    return Math.floor(x * p) / p;
  }

  // ── String helpers ────────────────────────────────────────────────

  function sanitizedStr(s, alphabet) {
    if (!s) return '';
    s = s.toLowerCase();
    var allowed = alphabet || DEFAULT_ALPHABET;
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i);
      if (allowed.indexOf(ch) !== -1) out += ch;
    }
    return out;
  }

  // ── Cipher functions ──────────────────────────────────────────────

  /** Caesar: shift each letter by `shift` positions. Positive = encrypt. */
  function caesarApply(text, shift, alphabet) {
    var alph = alphabet || DEFAULT_ALPHABET;
    var t = sanitizedStr(text, alph);
    var n = alph.length;
    var s = '';
    for (var i = 0; i < t.length; i++) {
      var idx = alph.indexOf(t.charAt(i));
      if (idx === -1) s += t.charAt(i);
      else s += alph.charAt(mod(idx + shift, n));
    }
    return s;
  }

  /** Affine / mono: a*x + b mod n */
  function monoAffine(text, a, b, alphabet) {
    a = (typeof a === 'number') ? a : 1;
    b = (typeof b === 'number') ? b : 0;
    var alph = alphabet || DEFAULT_ALPHABET;
    var t = sanitizedStr(text, alph);
    var n = alph.length;
    var s = '';
    for (var i = 0; i < t.length; i++) {
      var idx = alph.indexOf(t.charAt(i));
      if (idx < 0 || idx >= n) s += t.charAt(i);
      else s += alph.charAt(mod(a * idx + b, n));
    }
    return s;
  }

  /** Vigenère: add=true → encrypt (sum), add=false → decrypt (subtract). */
  function vigenereApply(text, keyword, add, alphabet) {
    var alph = alphabet || DEFAULT_ALPHABET;
    var t = sanitizedStr(text, alph);
    var kw = sanitizedStr(keyword, alph);
    if (!kw) return t;
    var k = kw.repeat(Math.ceil(t.length / kw.length)).substring(0, t.length);
    var n = alph.length;
    var s = '';
    for (var i = 0; i < t.length; i++) {
      var x = alph.indexOf(t.charAt(i));
      var y = alph.indexOf(k.charAt(i));
      if (x < 0 || y < 0) { s += t.charAt(i); continue; }
      var r = add ? x + y : x - y;
      s += alph.charAt(mod(r, n));
    }
    return s;
  }

  /** Apply a letter→letter mapping object. Unmapped letters become '*'. */
  function applyMonoMapping(text, map, alphabet) {
    var alph = alphabet || DEFAULT_ALPHABET;
    var s = sanitizedStr(text, alph);
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i);
      if (map && map[ch]) out += map[ch];
      else out += '*';
    }
    return out;
  }

  // ── Analysis / statistics ─────────────────────────────────────────

  function countSubstrings(s, d, alphabet) {
    var alph = alphabet || DEFAULT_ALPHABET;
    s = sanitizedStr(s, alph);
    var map = Object.create(null);
    for (var i = 0; i <= s.length - d; i++) {
      var sub = s.substring(i, i + d);
      map[sub] = (map[sub] || 0) + 1;
    }
    var arr = [];
    for (var k in map) arr.push([map[k], k]);
    arr.sort(function (a, b) { return b[0] - a[0]; });
    return arr;
  }

  function getLetterCounts(s, alphabet) {
    var alph = alphabet || DEFAULT_ALPHABET;
    s = sanitizedStr(s, alph);
    var counts = new Array(alph.length).fill(0);
    for (var i = 0; i < s.length; i++) {
      var idx = alph.indexOf(s.charAt(i));
      if (idx >= 0 && idx < alph.length) counts[idx]++;
    }
    var total = counts.reduce(function (a, b) { return a + b; }, 0);
    return { counts: counts, total: total };
  }

  function getLetterFrequencies(s, alphabet) {
    var alph = alphabet || DEFAULT_ALPHABET;
    var info = getLetterCounts(s, alph);
    if (info.total === 0) return info.counts.map(function () { return 0; });
    return info.counts.map(function (c) { return c / info.total * 100; });
  }

  function indexOfCoincidence(s, alphabet) {
    var alph = alphabet || DEFAULT_ALPHABET;
    var info = getLetterCounts(s, alph);
    var n = info.total;
    if (n < 2) return NaN;
    var sum = 0;
    for (var i = 0; i < info.counts.length; i++) {
      sum += info.counts[i] * (info.counts[i] - 1);
    }
    return sum / (n * (n - 1));
  }

  function friedmanTest(s, alphabet) {
    var alph = alphabet || DEFAULT_ALPHABET;
    var ic = indexOfCoincidence(s, alph);
    if (isNaN(ic)) return NaN;
    var n = sanitizedStr(s, alph).length;
    var ft = (0.027 * n) / ((n - 1) * ic - 0.038 * n + 0.065);
    return isFinite(ft) ? ft : NaN;
  }

  function chiSquared(obsPerc, expPerc) {
    var eps = 1e-6;
    var n = Math.max(obsPerc.length, expPerc.length);
    var s = 0;
    for (var i = 0; i < n; i++) {
      var o = obsPerc[i] || 0;
      var ex = expPerc[i] || eps;
      var d = o - ex;
      s += d * d / ex;
    }
    return s;
  }

  // ── Breaking ciphers ──────────────────────────────────────────────

  function breakCaesarCandidates(ciphertext, alphabet, expected, topN) {
    var alph = alphabet || DEFAULT_ALPHABET;
    var n = alph.length;
    var info = getLetterCounts(ciphertext, alph);
    var counts = info.counts;
    var total = info.total;
    if (total === 0) return [];
    var obsPerc = counts.map(function (c) { return c / total * 100; });

    // normalize expected
    if (!expected || expected.length !== n) {
      var tmp = new Array(n).fill(0);
      for (var ii = 0; ii < n; ii++) tmp[ii] = (expected && expected[ii]) ? expected[ii] : 0;
      expected = tmp;
    }

    var cand = [];
    var ct = sanitizedStr(ciphertext, alph);
    for (var s = 0; s < n; s++) {
      var dec = new Array(n);
      for (var p = 0; p < n; p++) dec[p] = obsPerc[(p + s) % n] || 0;
      var score = chiSquared(dec, expected);
      var plain = '';
      for (var i = 0; i < ct.length; i++) {
        var j = alph.indexOf(ct.charAt(i));
        plain += alph.charAt(mod(j - s, n));
      }
      cand.push({ shift: s, score: score, plain: plain });
    }
    cand.sort(function (a, b) { return a.score - b.score; });
    return cand.slice(0, topN || 5);
  }

  function decryptVigenere(ciphertext, key, alphabet) {
    var alph = alphabet || DEFAULT_ALPHABET;
    var n = alph.length;
    var ct = sanitizedStr(ciphertext, alph);
    var k = sanitizedStr(key, alph);
    if (!k) return ct;
    var full = k.repeat(Math.ceil(ct.length / k.length)).substring(0, ct.length);
    var out = '';
    for (var i = 0; i < ct.length; i++) {
      var x = alph.indexOf(ct.charAt(i));
      var y = alph.indexOf(full.charAt(i));
      out += alph.charAt(mod(x - y, n));
    }
    return out;
  }

  function breakVigenereCandidates(ciphertext, alphabet, expected, maxLen) {
    var alph = alphabet || DEFAULT_ALPHABET;
    var n = alph.length;
    var ct = sanitizedStr(ciphertext, alph);
    var best = [];
    if (ct.length === 0) return best;
    maxLen = Math.max(1, Math.min(maxLen || 10, Math.floor(ct.length / 1)));

    // normalize expected
    if (!expected || expected.length !== n) {
      var tmp = new Array(n).fill(0);
      for (var ii = 0; ii < n; ii++) tmp[ii] = (expected && expected[ii]) ? expected[ii] : 0;
      expected = tmp;
    }

    for (var L = 1; L <= maxLen; L++) {
      var keyChars = [];
      for (var col = 0; col < L; col++) {
        var seq = '';
        for (var i = col; i < ct.length; i += L) seq += ct.charAt(i);
        var info = getLetterCounts(seq, alph);
        var counts = info.counts;
        var tot = info.total;
        var seqPerc = (tot > 0) ? counts.map(function (c) { return c / tot * 100; }) : new Array(n).fill(0);
        var bestShift = 0;
        var bestScore = Infinity;
        for (var s = 0; s < n; s++) {
          var dec = new Array(n);
          for (var p = 0; p < n; p++) dec[p] = seqPerc[(p + s) % n] || 0;
          var sc = chiSquared(dec, expected);
          if (sc < bestScore) { bestScore = sc; bestShift = s; }
        }
        keyChars.push(alph.charAt(bestShift));
      }
      var key = keyChars.join('');
      var plain = decryptVigenere(ct, key, alph);
      var pInfo = getLetterCounts(plain, alph);
      var pTot = pInfo.total;
      var pPerc = (pTot > 0) ? pInfo.counts.map(function (c) { return c / pTot * 100; }) : new Array(n).fill(0);
      var overall = chiSquared(pPerc, expected);
      best.push({ len: L, key: key, score: overall, plain: plain });
    }
    best.sort(function (a, b) { return a.score - b.score; });
    return best.slice(0, 5);
  }

  /** breakMonoCandidates: propose a mapping based on simple frequency ranking. */
  function breakMonoCandidates(ciphertext, alphabet, expected) {
    var alph = alphabet || DEFAULT_ALPHABET;
    var ct = sanitizedStr(ciphertext, alph);
    if (ct.length === 0) return [];

    var n = alph.length;
    var info = getLetterCounts(ct, alph);
    var counts = info.counts;

    // Create array of [letter, count] and sort by count desc
    var ctSorted = [];
    for (var i = 0; i < n; i++) {
      ctSorted.push({ letter: alph.charAt(i), count: counts[i] });
    }
    ctSorted.sort(function (a, b) { return b.count - a.count; });

    // Get expected frequencies and sort by value desc
    var expSorted = [];
    if (!expected || expected.length !== n) {
      // Fallback to equal distribution if no expected provided (not ideal but safe)
      expected = new Array(n).fill(1);
    }
    for (var i = 0; i < n; i++) {
      expSorted.push({ letter: alph.charAt(i), freq: expected[i] || 0 });
    }
    expSorted.sort(function (a, b) { return b.freq - a.freq; });

    // Map by rank
    var map = Object.create(null);
    for (var i = 0; i < n; i++) {
      map[ctSorted[i].letter] = expSorted[i].letter;
    }

    var plain = applyMonoMapping(ct, map, alph);
    return [{ score: 0, map: map, plain: plain }];
  }

  /** Kasiski Examination: find repeated trigrams+, calculate distances and factors. */
  function kasiskiAnalysis(text, alphabet) {
    var alph = alphabet || DEFAULT_ALPHABET;
    var ct = sanitizedStr(text, alph);
    if (ct.length < 6) return { repeats: [], factors: [] };

    var repeats = Object.create(null);
    // Search for repeats of length 3 to 5
    for (var len = 3; len <= 5; len++) {
      for (var i = 0; i <= ct.length - len; i++) {
        var sub = ct.substring(i, i + len);
        if (!repeats[sub]) repeats[sub] = [];
        repeats[sub].push(i);
      }
    }

    var resultRepeats = [];
    var allDistances = [];
    for (var sub in repeats) {
      if (repeats[sub].length > 1) {
        var pos = repeats[sub];
        var dists = [];
        for (var k = 1; k < pos.length; k++) {
          var d = pos[k] - pos[k - 1];
          dists.push(d);
          allDistances.push(d);
        }
        resultRepeats.push({ seq: sub, count: pos.length, positions: pos, distances: dists });
      }
    }

    // Sort repeats by length (desc) then count (desc)
    resultRepeats.sort(function (a, b) {
      return (b.seq.length - a.seq.length) || (b.count - a.count);
    });

    // Factorize distances
    var factorCounts = Object.create(null);
    for (var i = 0; i < allDistances.length; i++) {
      var d = allDistances[i];
      // Only check factors 2-20 as they are typical key lengths
      for (var f = 2; f <= 20 && f <= d; f++) {
        if (d % f === 0) {
          factorCounts[f] = (factorCounts[f] || 0) + 1;
        }
      }
    }

    var factors = [];
    for (var f in factorCounts) {
      factors.push({ factor: parseInt(f, 10), count: factorCounts[f] });
    }
    factors.sort(function (a, b) { return b.count - a.count; });

    return {
      repeats: resultRepeats.slice(0, 10),
      factors: factors.slice(0, 8)
    };
  }

  // ── Static data ───────────────────────────────────────────────────

  var expectedProfiles = {
    en: [8.167, 1.492, 2.782, 4.253, 12.702, 2.228, 2.015, 6.094, 6.966, 0.153, 0.772, 4.025, 2.406, 6.749, 7.507, 1.929, 0.095, 5.987, 6.327, 9.056, 2.758, 0.978, 2.360, 0.150, 1.974, 0.074],
    es: [12.525, 1.492, 4.019, 5.010, 13.682, 0.692, 1.768, 0.703, 6.247, 0.493, 0.011, 5.243, 3.157, 6.712, 0.31, 8.683, 2.510, 0.877, 6.871, 7.977, 4.632, 3.927, 1.138, 0.017, 0.215, 1.008, 0.467]
  };

  var expectedNgrams = {
    en: {
      digrams: ['th', 'he', 'in', 'er', 'an', 're', 'ed', 'on', 'at', 'en'],
      trigrams: ['the', 'ing', 'and', 'her', 'ere', 'ent', 'tha', 'nth', 'tio', 'for']
    },
    es: {
      digrams: ['de', 'la', 'en', 'el', 'es', 'os', 'as', 'er', 'ar', 'ci'],
      trigrams: ['que', 'ent', 'los', 'con', 'est', 'ado', 'por', 'par', 'ión', 'era']
    }
  };

  // ── Public API ────────────────────────────────────────────────────

  return {
    DEFAULT_ALPHABET: DEFAULT_ALPHABET,
    getAlphabetForLang: getAlphabetForLang,
    mod: mod,
    truncate: truncate,
    sanitizedStr: sanitizedStr,
    caesarApply: caesarApply,
    monoAffine: monoAffine,
    vigenereApply: vigenereApply,
    applyMonoMapping: applyMonoMapping,
    countSubstrings: countSubstrings,
    getLetterCounts: getLetterCounts,
    getLetterFrequencies: getLetterFrequencies,
    indexOfCoincidence: indexOfCoincidence,
    friedmanTest: friedmanTest,
    chiSquared: chiSquared,
    breakCaesarCandidates: breakCaesarCandidates,
    decryptVigenere: decryptVigenere,
    breakVigenereCandidates: breakVigenereCandidates,
    breakMonoCandidates: breakMonoCandidates,
    kasiskiAnalysis: kasiskiAnalysis,
    expectedProfiles: expectedProfiles,
    expectedNgrams: expectedNgrams
  };
})();
