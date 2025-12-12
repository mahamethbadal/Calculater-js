// script.js
// Vanilla JS calculator with light/dark toggle and improved evaluation behavior:
// - Do NOT attempt to evaluate while the expression is incomplete (e.g. ends with + - * / . or open '(').
// - Only evaluate on complete expressions or when the user presses '='.

(function () {
    const calcEl = document.getElementById('calculator');
    const expressionEl = document.getElementById('expression');
    const resultEl = document.getElementById('result');
    const themeToggle = document.getElementById('themeToggle');

    // state
    let expr = '';

    // helper: whether expression is "complete" (safe to attempt eval)
    // complete if it ends with a digit or a closing parenthesis
    function isCompleteExpression(s) {
        return /[0-9)]$/.test(s.trim());
    }

    // helper: update UI
    function updateDisplay() {
        expressionEl.textContent = expr || '';
        if (!expr) {
            resultEl.textContent = '0';
            return;
        }
        if (isCompleteExpression(expr)) {
            // attempt to evaluate and show result (or Error)
            const out = tryEval(expr);
            resultEl.textContent = out;
        } else {
            // expression incomplete: leave result unchanged (do nothing)
            // For clarity keep the previous displayed value (do not show Error)
            // If you prefer to show blank instead, uncomment the next line:
            // resultEl.textContent = '';
        }
    }

    // sanitize and evaluate expression
    function tryEval(input) {
        if (!input) return '0';
        // replace unicode multiply/divide with JS ops
        let safe = input.replace(/×/g, '*').replace(/÷/g, '/');

        // Map calculator function names to Math.* equivalents
        const funcMap = {
            'sin': 'Math.sin',
            'cos': 'Math.cos',
            'tan': 'Math.tan',
            'log': 'Math.log10',
            'ln': 'Math.log',
            'sqrt': 'Math.sqrt'
        };

        // replace func occurrences, e.g. sin( => Math.sin(
        safe = safe.replace(/\b(sin|cos|tan|log|ln|sqrt)\s*\(/g, (m, p1) => {
            return funcMap[p1] + '(';
        });

        // handle percent: "50%" => (50/100)
        safe = safe.replace(/(\d+(\.\d+)?)%/g, '($1/100)');

        // disallow suspicious characters
        if (/[^0-9+\-*/().,%\sA-Za-z]/.test(safe)) return 'Error';

        // Security guard: block certain keywords
        const blocked = ['constructor', 'prototype', 'window', 'document', 'eval', 'Function', 'require'];
        const lower = safe.toLowerCase();
        for (const b of blocked) if (lower.includes(b)) return 'Error';

        // Replace decimal commas if any
        safe = safe.replace(/,/g, '');

        // convert degrees toggle (we will apply if deg mode is on)
        if (degMode) {
            // convert Math.sin/cos/tan parameters to radians for simple cases
            // this simple pass wraps direct single-argument calls; complex nested expressions may still work via standard Math usage
            safe = safe.replace(/Math\.(sin|cos|tan)\s*\(([^()]+)\)/g, (m, p1, p2) => {
                return `Math.${p1}(((${p2})*Math.PI/180))`;
            });
        }

        try {
            // Evaluate using Function in a sandboxed string (still not for untrusted servers)
            // eslint-disable-next-line no-new-func
            const value = Function('"use strict";return (' + safe + ')')();
            if (value === Infinity || value === -Infinity || Number.isNaN(value)) return 'Error';
            return formatNumber(value);
        } catch (e) {
            return 'Error';
        }
    }

    // format number with commas for thousands
    function formatNumber(v) {
        if (typeof v !== 'number') return v;
        if (Math.round(v) === v) {
            return v.toLocaleString();
        } else {
            // keep up to 8 decimal places but trim trailing zeros
            return parseFloat(v.toFixed(8)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }
    }

    // attach button listeners
    document.querySelectorAll('.pad .btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const v = btn.getAttribute('data-value');
            const act = btn.getAttribute('data-action');
            const fn = btn.getAttribute('data-func');

            if (act === 'clear') {
                expr = '';
            } else if (act === 'back') {
                expr = expr.slice(0, -1);
            } else if (act === 'equals') {
                // Always try to evaluate when user explicitly requests "="
                if (!expr) {
                    resultEl.textContent = '0';
                } else {
                    const res = tryEval(expr);
                    if (res !== 'Error') {
                        // set expression to numeric result (no commas) so you can continue calculations
                        expr = String(res).replace(/,/g, '');
                        resultEl.textContent = res;
                    } else {
                        // show Error and clear expression (or keep it; here we clear)
                        resultEl.textContent = 'Error';
                        expr = '';
                    }
                }
            } else if (act === 'neg') {
                expr = toggleNeg(expr);
            } else if (fn) {
                expr += fn + '(';
            } else if (v) {
                expr += v;
            }
            updateDisplay();
        });
    });

    // keyboard support
    window.addEventListener('keydown', (ev) => {
        const key = ev.key;
        if (key >= '0' && key <= '9') { expr += key; updateDisplay(); return; }
        if (['+', '-', '*', '/', '(', ')', '.'].includes(key)) { expr += key; updateDisplay(); return; }
        if (key === 'Enter' || key === '=') { ev.preventDefault(); document.querySelector('[data-action="equals"]').click(); return; }
        if (key === 'Backspace') { expr = expr.slice(0, -1); updateDisplay(); return; }
        if (key.toLowerCase() === 'c') { expr = ''; updateDisplay(); return; }
    });

    // negative toggle helper
    function toggleNeg(s) {
        if (!s) return '-';
        const match = s.match(/(\-?\d+(\.\d+)?|\))$/);
        if (!match) return s + '-';
        const token = match[0];
        if (token.endsWith(')')) return s + '-';
        const start = s.slice(0, match.index);
        const num = token;
        if (num.startsWith('-')) return start + num.slice(1);
        return start + '-' + num;
    }

    // degree mode toggle (default radians)
    let degMode = false;
    document.querySelectorAll('[data-func="deg"]').forEach(b => {
        b.addEventListener('click', () => {
            degMode = !degMode;
            b.classList.toggle('active', degMode);
            b.textContent = degMode ? 'deg·' : 'deg';
            // update the displayed result if expression is currently complete
            updateDisplay();
        });
    });

    // theme toggle
    themeToggle.addEventListener('change', (e) => {
        const dark = e.target.checked;
        calcEl.setAttribute('data-theme', dark ? 'dark' : 'light');
    });

    // initial render
    updateDisplay();
})();
