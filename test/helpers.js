'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// Every test runs against a frozen "today" so paycheck counts are deterministic.
// 2026-07-07 is a Tuesday: the default bi-weekly base date resolves to Fri Jul 3,
// leaving 12 bi-weekly / 12 semi-monthly / 6 monthly (last-day) checks in the year.
const FIXED_TODAY = '2026-07-07T12:00:00';

// Boots the real page in jsdom and returns handles for driving it like a user.
function boot() {
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    url: 'http://localhost/',
    pretendToBeVisual: true,
    beforeParse(window) {
      const RealDate = window.Date;
      const fixed = new RealDate(FIXED_TODAY).getTime();
      window.Date = class extends RealDate {
        constructor(...args) {
          if (args.length === 0) super(fixed);
          else super(...args);
        }
        static now() { return fixed; }
      };
    },
  });
  const { window } = dom;
  const $ = id => window.document.getElementById(id);

  // Set a field the way a user would, firing the change handler the app listens to.
  const set = (id, value) => {
    const el = $(id);
    el.value = String(value);
    el.dispatchEvent(new window.Event('change', { bubbles: true }));
  };
  const click = selector => window.document.querySelector(selector).click();
  const num = s => Number(String(s).replace(/[^0-9.-]/g, ''));

  const breakdownRow = label =>
    [...$('breakdown').querySelectorAll('tr')]
      .find(r => r.cells.length === 2 && r.cells[0].textContent.startsWith(label));
  // Value cell of a "See the full math" row, as a number ($5,769.23 -> 5769.23).
  const rowVal = label => {
    const tr = breakdownRow(label);
    return tr ? num(tr.cells[1].textContent) : null;
  };
  // Label cell text of a breakdown row, which includes the small note under it.
  const rowNote = label => {
    const tr = breakdownRow(label);
    return tr ? tr.cells[0].textContent : '';
  };

  return { window, document: window.document, $, set, click, num, rowVal, rowNote };
}

module.exports = { boot, FIXED_TODAY };
