/*
 * Playwright smoke test — Milestone 2 Healthcare and Banking scenarios through validation
 * Requires the `playwright` package and a Chromium browser (not a project dependency).
 * Run against a production preview:
 *   npm run build && npx vite preview --port 4173 &
 *   node e2e/studio-domains.cjs [screenshot-dir]
 * Each run starts with empty browser storage. Exits after printing PASS/FAIL lines.
 */
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  let fails = 0;
  const check = (n, c) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n); };
  const studio = page.locator('section[aria-label^="Application Studio"]').last();
  const T = 15000;
  await page.goto(process.env.BASE_URL || 'http://localhost:4173');
  for (const [label, expectIssue] of [['Prior authorization', 'Healthcare domain pack is available with conditions'], ['SME lending', 'KYC Checker is available with conditions']]) {
    await page.keyboard.press('Control+k');
    await page.keyboard.type('create application');
    await page.keyboard.press('Enter');
    await studio.getByRole('button', { name: new RegExp('^' + label) }).waitFor({ timeout: T });
    await studio.getByRole('button', { name: new RegExp('^' + label) }).click();
    await studio.getByRole('button', { name: 'Start discovery' }).click();
    await studio.getByRole('button', { name: /Confirm understanding/ }).click({ timeout: T });
    await studio.getByRole('button', { name: 'Confirm requirements' }).click();
    await studio.getByRole('tablist', { name: 'Solution approaches' }).waitFor({ timeout: T });
    check(label + ': three approaches', await studio.getByRole('tab').count() === 3);
    await studio.getByRole('button', { name: 'Select this approach' }).click();
    await studio.getByRole('button', { name: /^Use .* find resources$/ }).click();
    await studio.getByRole('button', { name: /Select all available/ }).click({ timeout: T });
    // The guided path visits each outstanding need in turn.
    for (let i = 0; i < 12 && !(await studio.getByRole('button', { name: 'Generate blueprint' }).isEnabled()); i++) {
      if (await studio.getByRole('button', { name: 'Confirm and select' }).count()) {
        await studio.getByRole('button', { name: 'Confirm and select' }).click();
      } else if (await studio.getByRole('button', { name: 'Approve and compose worker' }).count()) {
        await studio.getByRole('button', { name: 'Approve and compose worker' }).click();
        if (label === 'Prior authorization') {
          await studio.getByRole('alert').waitFor({ timeout: T });
          check(label + ': first composition fails with a reason', (await studio.getByRole('alert').innerText()).includes('validation cases failed'));
          await studio.getByRole('button', { name: 'Attach sample criteria and retry' }).click();
        }
        await studio.getByRole('list', { name: 'Worker composition' }).waitFor({ state: 'hidden', timeout: T });
      } else if (await studio.getByRole('button', { name: 'Resolve' }).count()) {
        await studio.getByRole('button', { name: 'Resolve' }).first().click();
      } else if (await studio.getByRole('button', { name: 'Review configuration' }).count()) {
        await studio.getByRole('button', { name: 'Review configuration' }).first().click();
      }
      await page.waitForTimeout(150);
    }
    await studio.getByRole('button', { name: 'Generate blueprint' }).click({ timeout: T });
    await page.waitForTimeout(200);
    await studio.getByRole('button', { name: 'Continue to publish' }).click({ timeout: T });
    await studio.getByRole('list', { name: 'Decisions before publishing' }).waitFor({ timeout: T });
    const t = await studio.innerText();
    check(label + ': conditional resource flagged', t.includes(expectIssue));
    check(label + ': approver blocked', t.includes('Nobody is assigned to approve'));
    await studio.getByRole('tab').first().isVisible().catch(() => {});
    await page.screenshot({ path: `e2e/screenshots/b-${label.replace(/\s/g, '-')}.png` });
  }
  // Multitasking: the second "create application" opened a new window; the first draft kept its own.
  check('each draft keeps its own Studio window', (await page.locator('section[aria-label^="Application Studio"]').count()) === 2);
  check('second window is named', (await page.locator('section[aria-label="Application Studio 2"]').count()) === 1);
  await page.getByRole('navigation', { name: 'Dock' }).getByRole('button', { name: /^Application Studio/ }).hover();
  await page.getByRole('button', { name: /^Show Application Studio — / }).first().waitFor({ timeout: 3000 }).catch(() => {});
  check('dock previews both Studio windows', (await page.getByRole('button', { name: /^Show Application Studio — / }).count()) === 2);
  await page.mouse.move(700, 700);
  // Edit in Studio from a published app: publish quickly is long; instead check All projects lists 2 drafts
  await studio.getByRole('button', { name: 'All projects' }).click();
  check('two drafts listed', await studio.getByRole('button', { name: 'Open', exact: true }).count() === 2);
  console.log('FAILS', fails, 'ERRORS', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('CRASH', e.message); process.exit(1); });
