/*
 * Playwright smoke test — Milestone 3 frontend evolution (on the liquid-glass design):
 * collapsed AI Architect guidance, "why is X required?" answers before and after composition,
 * resource versions in the catalogue, field-level highlighted version comparison with an
 * honest local-only rollback, registry sort by status, and no horizontal overflow at
 * 1440 / 1280 / 1024 / 390 px.
 * Requires the `playwright` package and a Chromium browser (not a project dependency).
 *   npm run build && npx vite preview --port 4173 &
 *   node e2e/evolution.cjs [screenshot-dir]
 */
const { chromium } = require('playwright');
const dir = process.argv[2] || 'e2e/screenshots'; require('fs').mkdirSync(dir, { recursive: true });
const BASE = process.env.BASE_URL || 'http://localhost:4173';
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  let fails = 0;
  const check = (name, cond) => { if (!cond) fails++; console.log((cond ? 'PASS ' : 'FAIL ') + name); };
  const shot = (n) => page.screenshot({ path: `${dir}/ev-${n}.png` });
  const studio = page.locator('section[aria-label="Application Studio"]');
  const panel = studio.getByRole('complementary', { name: 'AI Architect' });
  const T = 15000;
  const text = () => studio.innerText();
  const ask = async (q) => {
    await panel.getByLabel('Ask the AI Architect').fill(q);
    await panel.getByRole('button', { name: 'Send' }).click();
    return panel.innerText();
  };

  await page.goto(BASE);
  await page.getByRole('button', { name: 'Create Application, opens Application Studio' }).click();
  await studio.waitFor({ timeout: T });

  // ── Discover → Define → Architect
  await studio.getByLabel('What should the application help your teams achieve?').fill('I want to automate insurance claims processing, screen for fraud and reduce manual intervention.');
  await studio.getByRole('button', { name: 'Start discovery' }).click();
  await studio.getByRole('region', { name: 'Summary of understanding' }).waitFor({ timeout: T });
  const guidanceToggle = panel.getByRole('button', { name: 'What the OS is doing' });
  check('architect guidance collapsed by default', (await guidanceToggle.getAttribute('aria-expanded')) === 'false');
  check('collapsed guidance still shows what is needed', (await panel.innerText()).includes('Needs from you ·'));
  await guidanceToggle.click();
  const expanded = await panel.innerText();
  check('guidance expands to doing / why / next', /Doing\n/.test(expanded) && /Why\n/.test(expanded) && /Next\n/.test(expanded) && (await guidanceToggle.getAttribute('aria-expanded')) === 'true');
  await guidanceToggle.click();
  check('studio header does not repeat the window title inside a project', !(await studio.locator('header', { has: page.getByRole('button', { name: 'All projects' }) }).innerText()).includes('Application Studio'));
  await studio.getByRole('group', { name: 'Who should approve settlements that need a human decision?' }).getByRole('button', { name: 'Claims managers' }).click();
  await studio.getByRole('button', { name: /Confirm understanding/ }).click();
  await studio.getByRole('button', { name: 'Confirm requirements' }).click();
  await studio.getByRole('tablist', { name: 'Solution approaches' }).waitFor({ timeout: T });

  const whyArchitect = await ask('Why is Fraud investigation required?');
  check('why-required answer is specific, not the recommendation', whyArchitect.includes('Fraud investigation is required because') && whyArchitect.includes('Prepare investigation'));
  check('why-required answer suggests a simulated worker', whyArchitect.includes('Fraud Investigation Worker') && whyArchitect.includes('(simulated)'));
  await studio.getByRole('tab', { name: /Assisted Claims Processing/ }).click();
  await studio.getByRole('button', { name: 'Select this approach' }).click();
  const notUsed = await ask('Why is Fraud investigation needed?');
  check('why-required respects the selected approach', notUsed.includes('“Assisted Claims Processing” does not use Fraud investigation'));
  await studio.getByRole('tab', { name: /AI-Driven Claims Automation/ }).click();
  await studio.getByRole('button', { name: 'Select this approach' }).click();
  await studio.getByRole('button', { name: /Use AI-Driven Claims Automation/ }).click();

  // ── Compose: suggested questions, catalogue version, composition
  await studio.getByRole('list', { name: 'Capability coverage' }).waitFor({ timeout: T });
  check('compose suggests the why-required question', await panel.getByRole('button', { name: 'Why is Fraud investigation required?' }).isVisible());
  await panel.getByRole('button', { name: 'Why is Fraud investigation required?' }).click();
  check('compose answer explains rejection consequence', (await panel.innerText()).includes('If you would rather not add it'));
  await studio.getByRole('button', { name: 'Resource catalogue' }).click();
  check('catalogue rows show version and owning platform', (await text()).includes('Intake Agent · Agent · v1.8.0') && (await text()).includes('Agent Control Plane'));
  await studio.getByRole('button', { name: 'Coverage', exact: true }).click();
  await studio.getByRole('button', { name: /Select all available/ }).click();
  const reviews = studio.getByRole('button', { name: 'Review configuration' });
  while (await reviews.count()) {
    await reviews.first().click();
    await studio.getByRole('button', { name: 'Confirm and select' }).click();
  }
  await studio.getByRole('button', { name: 'Approve and compose worker' }).click();
  await studio.getByText(/composed for this application/).first().waitFor({ timeout: T });
  const afterCompose = await ask('Why is the Fraud Investigation worker needed?');
  check('after composition the answer says it was simulated', afterCompose.includes('nothing was created on the AI Workers Platform'));
  check('after composition no rejection advice', !afterCompose.split('Why is the Fraud Investigation worker needed?').pop().includes('If you would rather not add it'));
  await shot('01-compose-architect');
  await studio.getByRole('button', { name: 'Generate blueprint' }).click();

  // ── Blueprint: field-level highlighted comparison, local-only rollback
  await studio.getByRole('list', { name: 'Blueprint sections' }).waitFor({ timeout: T });
  const sections = studio.getByRole('navigation', { name: 'Blueprint sections' });
  await sections.getByRole('button', { name: 'Data model' }).click();
  await studio.getByLabel('New field').fill('Investigation notes');
  await studio.getByRole('button', { name: 'Add field' }).click();
  await sections.getByRole('button', { name: 'Version history' }).click();
  await studio.getByRole('button', { name: 'Compare versions' }).click();
  const region = studio.getByRole('region', { name: 'Compare versions' });
  check('added field highlighted as an addition', (await region.locator('[data-change="added"]').count()) === 1 && (await region.locator('[data-change="added"]').innerText()).includes('Investigation notes'));
  await shot('02-compare-highlight');
  await studio.getByRole('button', { name: 'Restore v0.1.0' }).click();
  const dialog = page.getByRole('alertdialog');
  check('rollback states it only changes local prototype state', (await dialog.innerText()).includes('local state in your browser'));
  await dialog.getByRole('button', { name: 'Restore as new draft' }).click();
  await studio.getByLabel('Base version').selectOption('0.1.1');
  await studio.getByLabel('Target version').selectOption('0.1.2');
  const removed = region.locator('[data-change="removed"]');
  await removed.first().waitFor({ timeout: T }).catch(() => {});
  check('removed field highlighted as a removal', (await removed.count()) >= 1 && (await removed.allInnerTexts()).some((t) => t.includes('Investigation notes')));

  // ── Registry sort by status
  await studio.getByRole('button', { name: 'Back to desktop' }).last().click();
  await page.getByRole('navigation', { name: 'Dock' }).getByRole('button', { name: 'System Explorer' }).click();
  const explorer = page.locator('section[aria-label="System Explorer"]');
  await explorer.getByRole('button', { name: 'Applications' }).click();
  await explorer.getByLabel('Sort by').selectOption('status');
  const rows = await explorer.getByRole('list', { name: 'Applications' }).getByRole('listitem').allInnerTexts();
  const firstPublished = rows.findIndex((r) => r.includes('Published'));
  const lastDraftish = rows.map((r, i) => (/Validating|Designing|Draft|Ready/.test(r) ? i : -1)).filter((i) => i >= 0).pop();
  check('registry sorts drafts in progress before published apps', lastDraftish !== undefined && firstPublished > lastDraftish);
  await explorer.getByRole('button', { name: 'Claims Processing Hub — details' }).click().catch(() => {});
  await page.getByRole('button', { name: 'Close System Explorer' }).click();

  // ── Responsive: no horizontal overflow, Studio usable
  for (const [w, h] of [[1440, 900], [1280, 800], [1024, 768], [390, 844]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(BASE);
    await page.waitForTimeout(400);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(`no horizontal page overflow at ${w}px`, overflow <= 0);
    await shot(`03-desktop-${w}`);
    // Launcher, not the dock: on phones the dock shows only running apps by design.
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(200);
    await page.keyboard.type('Application Studio');
    await page.waitForTimeout(200);
    await page.keyboard.press('Enter');
    await studio.waitFor({ timeout: T });
    await page.waitForTimeout(300);
    const box = await studio.boundingBox();
    check(`studio fits the viewport at ${w}px`, box.x >= 0 && box.x + box.width <= w + 1);
    await shot(`04-studio-${w}`);
  }

  console.log(fails ? `FAILS ${fails}` : 'FAILS 0');
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
  process.exit(fails || errors.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
