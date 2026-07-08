'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { boot } = require('./helpers');

// Defaults the page boots with (frozen today = Tue 2026-07-07):
// salary $150k, under 50, 2026 limits ($24,500 / $72,000), match 50% up to 6% of pay,
// true-up unsure, no bonus, all YTD $0, bi-weekly anchored to Fri Jul 3 -> 12 checks left.

test('pay schedules', async t => {
  await t.test('bi-weekly default: 12 checks left, gross = salary/26', () => {
    const { $, rowVal } = boot();
    assert.match($('schedFeedback').textContent, /12 paychecks left in 2026/);
    assert.ok(Math.abs(rowVal('Gross pay per check') - 150000 / 26) < 0.01);
  });

  await t.test('semi-monthly 15th + last: 12 checks left, gross = salary/24', () => {
    const { $, click, rowVal } = boot();
    click('#schedSeg button[data-sched="semimonthly"]');
    assert.match($('schedFeedback').textContent, /12 paychecks left/);
    assert.equal(rowVal('Gross pay per check'), 150000 / 24);
  });

  await t.test('semi-monthly rejects identical pay days', () => {
    const { $, click, set } = boot();
    click('#schedSeg button[data-sched="semimonthly"]');
    set('smDayB', '15');
    assert.match($('schedFeedback').textContent, /must differ/);
  });

  await t.test('monthly last day: 6 checks left, gross = salary/12', () => {
    const { $, click, rowVal, rowNote } = boot();
    click('#schedSeg button[data-sched="monthly"]');
    assert.match($('schedFeedback').textContent, /6 paychecks left in 2026 · next on Jul 31/);
    assert.equal(rowVal('Gross pay per check'), 12500);
    assert.match(rowNote('Gross pay per check'), /÷ 12/);
  });

  await t.test('monthly on the 1st: July already paid, 5 checks left', () => {
    const { $, click, set } = boot();
    click('#schedSeg button[data-sched="monthly"]');
    set('moDay', '1');
    assert.match($('schedFeedback').textContent, /5 paychecks left in 2026 · next on Aug 1/);
  });

  await t.test('monthly fields shown only for monthly schedule', () => {
    const { $, click } = boot();
    click('#schedSeg button[data-sched="monthly"]');
    assert.equal($('monthlyFields').style.display, '');
    assert.equal($('biweeklyFields').style.display, 'none');
    click('#schedSeg button[data-sched="biweekly"]');
    assert.equal($('monthlyFields').style.display, 'none');
  });

  await t.test('27-pay-date year is flagged', () => {
    const { $, set } = boot();
    set('baseDate', '2026-01-01'); // Jan 1 + 26 * 14d = Dec 31 -> 27 dates in 2026
    assert.match($('answerBody').textContent, /27 pay dates/);
  });
});

test('employer match', async t => {
  await t.test('percent match: 50% up to 6% of pay across 12 checks', () => {
    const { rowVal } = boot();
    // 0.5 * 6% * $5,769.23 * 12 checks = $2,076.92
    assert.ok(Math.abs(rowVal('Match from remaining checks') - 2077) <= 1);
  });

  await t.test('after-tax space = 415(c) limit - deferrals - match', () => {
    const { rowVal } = boot();
    const expected = 72000 - 24500 - 2076.92;
    assert.ok(Math.abs(rowVal('Total possible after-tax') - expected) <= 1);
  });

  await t.test('dollar-cap match honors YTD match already received', () => {
    const { set, rowVal } = boot();
    set('matchType', 'dollar'); // 50% up to $12,250
    set('ytdMatch', '12000');
    // only $250 of cap left regardless of contributions
    assert.ok(Math.abs(rowVal('Estimated total match') - 12250) <= 1);
  });
});

test('after-tax contributions matched (atMatched)', async t => {
  await t.test('field hidden for no-match plans, shown otherwise', () => {
    const { $, set } = boot();
    assert.equal($('atMatchedField').style.display, '');
    set('matchType', 'none');
    assert.equal($('atMatchedField').style.display, 'none');
    set('matchType', 'tiered');
    assert.equal($('atMatchedField').style.display, '');
  });

  await t.test('off (default): maxed deferrals earn no further match', () => {
    const { set, rowVal } = boot();
    set('ytdDeferral', '24500');
    assert.equal(rowVal('Match from remaining checks'), 0);
    assert.equal(rowVal('Total possible after-tax'), 47500);
  });

  await t.test('on: after-tax earns the percent match, shrinking its own space', () => {
    const { set, rowVal, rowNote } = boot();
    set('ytdDeferral', '24500');
    set('atMatched', 'yes');
    assert.ok(Math.abs(rowVal('Match from remaining checks') - 2077) <= 1);
    assert.ok(Math.abs(rowVal('Total possible after-tax') - 45423) <= 1);
    assert.ok(Math.abs(rowVal('Total (vs 415(c)') - 72000) <= 2);
    assert.match(rowNote('Match from remaining checks'), /after-tax contributions count too/);
  });

  await t.test('on: dollar-cap match converges to the fixed point', () => {
    const { set, rowVal } = boot();
    set('ytdDeferral', '24500');
    set('matchType', 'dollar'); // 50% up to $12,250
    set('atMatched', 'yes');
    // match M = min(50% of after-tax, 12250); after-tax = 47500 - M -> M = 12250, at = 35250
    assert.ok(Math.abs(rowVal('Estimated total match') - 12250) <= 1);
    assert.ok(Math.abs(rowVal('Total possible after-tax') - 35250) <= 2);
    assert.ok(Math.abs(rowVal('Total (vs 415(c)') - 72000) <= 2);
  });

  await t.test('on + true-up: annual formula counts after-tax contributions', () => {
    const { set, rowVal } = boot();
    set('ytdDeferral', '24500');
    set('trueup', 'yes');
    set('atMatched', 'yes');
    // annual: 50% * min(contribs, 6% * 150k) = $4,500; ~$2,077 collected per check
    assert.ok(Math.abs(rowVal('Estimated total match') - 4500) <= 2);
    assert.ok(Math.abs(rowVal('Estimated year-end true-up') - 2423) <= 2);
    assert.ok(Math.abs(rowVal('Total (vs 415(c)') - 72000) <= 2);
  });
});

test('catch-up contributions', async t => {
  await t.test('age 50+: deferral limit +$8,000, ceiling excluded from 415(c)', () => {
    const { $, set, rowVal } = boot();
    set('ageBracket', '50plus');
    assert.equal(rowVal('Remaining room'), 24500 + 8000);
    assert.equal($('catchupExplainer').style.display, '');
    assert.match($('catchupExplainer').textContent, /\$80,000/);
  });

  await t.test('age 60-63: enhanced $11,250 catch-up', () => {
    const { set, rowVal } = boot();
    set('ageBracket', '60to63');
    assert.equal(rowVal('Remaining room'), 24500 + 11250);
  });
});

test('IRS limit presets', () => {
  const { $, click, rowNote } = boot();
  click('#yearPresets button[data-year="2025"]');
  assert.equal($('limDeferral').value, '23500');
  assert.equal($('limTotal').value, '70000');
  assert.match(rowNote('Remaining room'), /limit \$23,500/);
});

test('strategies', async t => {
  await t.test('front-load locked until timing is safe, then produces a dated plan', () => {
    const { $, set, click } = boot();
    assert.equal($('strategyRow').style.display, 'none'); // trueup: unsure
    set('trueup', 'yes');
    assert.equal($('strategyRow').style.display, '');
    click('#strategySeg button[data-strategy="frontload"]');
    assert.equal($('answerTitle').textContent, 'Your front-loading game plan');
    assert.match($('answerBody').textContent, /pre-tax\/Roth to 50%/); // default max election
    assert.ok($('answerBody').querySelectorAll('.sched-step').length >= 2);
  });

  await t.test('dollar-cap match is timing-proof, unlocking front-load directly', () => {
    const { $, set } = boot();
    set('matchType', 'dollar');
    assert.equal($('strategyRow').style.display, '');
  });
});

test('bonus handling', async t => {
  await t.test('bonus lands on the first check of its month', () => {
    const { $, set } = boot();
    set('hasBonus', 'yes');
    set('bonusAmount', '10000');
    set('bonusMonth', '11'); // December
    assert.match($('answerBody').textContent, /\$10,000 bonus/);
  });

  await t.test('bonus in a past month is ignored, with a warning', () => {
    const { $, set } = boot();
    set('hasBonus', 'yes');
    set('bonusAmount', '10000');
    set('bonusMonth', '0'); // January - already paid out
    assert.match($('answerBody').textContent, /bonus was ignored/);
  });
});

test('alerts', async t => {
  await t.test('YTD deferrals over the limit trigger a critical alert', () => {
    const { $, set } = boot();
    set('ytdDeferral', '30000');
    assert.match($('answerBody').textContent, /Over the deferral limit/);
  });

  await t.test('maxing both limits mid-year can be unachievable', () => {
    const { $ } = boot();
    // defaults: $69,500 of room across ~$69,231 of remaining pay -> > 100% of pay
    assert.match($('answerBody').textContent, /Not achievable/);
  });
});

test('state persists to localStorage', () => {
  const { window, click, set } = boot();
  click('#schedSeg button[data-sched="monthly"]');
  set('atMatched', 'yes');
  const saved = JSON.parse(window.localStorage.getItem('mbr-calc-v1'));
  assert.equal(saved.sched, 'monthly');
  assert.equal(saved.moDay, 'last');
  assert.equal(saved.atMatched, 'yes');
});

test('match shortfall explainer', async t => {
  // Reproduces a real report: $4M salary (comp-capped at $360k), tiered match,
  // no true-up, light YTD contributions -> half the year's match already forfeited.
  await t.test('missed per-paycheck match shows as an unrecoverable past gap', () => {
    const { $, set } = boot();
    set('matchType', 'tiered');
    set('salary', '4000000');
    set('trueup', 'no');
    set('ytdDeferral', '3000');
    set('ytdMatch', '1000');
    set('ytdAfterTax', '3000');
    const box = $('matchBox').textContent;
    assert.match(box, /Worth up to \$14,400/);
    assert.match(box, /on track to collect \$7,646/);
    assert.match(box, /\$6,754 sat in paychecks already paid/);
  });

  await t.test('a true-up recovers the past, so no gap line appears', () => {
    const { $, set } = boot();
    set('matchType', 'tiered');
    set('salary', '4000000');
    set('trueup', 'yes');
    set('ytdDeferral', '3000');
    set('ytdMatch', '1000');
    assert.doesNotMatch($('matchBox').textContent, /sat in paychecks/);
  });
});
