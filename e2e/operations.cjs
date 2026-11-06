/*
 * Playwright smoke test — Milestone 4 runtime, governance, observability, audit and learning.
 * Follows the insurance demonstration journey end to end, then exercises pause/resume,
 * cancel, failure + retry, request-information, rejection, operations filters, traceability,
 * learning acceptance → draft blueprint → validation → publication, persistence and
 * responsive screenshots.
 * Requires the `playwright` package and a Chromium browser (not a project dependency).
 *   npm run build && npx vite preview --port 4173 &
 *   node e2e/operations.cjs [screenshot-dir]
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
  const shot = (n) => page.screenshot({ path: `${dir}/m4-${n}.png` });
  const T = 20000;
  const claims = page.locator('section[aria-label="Claims Intelligence"]');
  const ops = page.locator('section[aria-label="Operations"]');
  const learning = page.locator('section[aria-label="Learning"]');
  const status = (scope) => scope.locator('[aria-label^="Status: "]').first();
  const waitStatus = (scope, label) => scope.locator(`[aria-label="Status: ${label}"]`).first().waitFor({ timeout: T });
  const launch = async (name) => {
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(150);
    await page.keyboard.type(name);
    await page.waitForTimeout(150);
    await page.keyboard.press('Enter');
  };
  const submitPreset = async (preset) => {
    await claims.getByRole('button', { name: 'Submit a claim' }).first().click();
    await claims.getByRole('button', { name: new RegExp(`^${preset}`) }).click();
    await claims.getByRole('button', { name: 'Submit and start execution' }).click();
    await claims.getByRole('tablist').first().waitFor({ timeout: T });
    return (await claims.locator('h3').first().innerText()).split('\n')[0].trim();
  };

  await page.goto(BASE);
  await page.waitForTimeout(400);

  // ── Seeded, engine-generated history is visible in Operations
  await page.getByRole('button', { name: /^Operations, application/ }).click();
  await ops.waitFor({ timeout: T });
  await ops.getByText('Needs your attention').waitFor({ timeout: T });
  check('operations overview shows seeded failure', (await ops.innerText()).includes('CLM-24-1994 failed'));
  check('no mock or prototype tags', !/Simulated runtime|Mock data|Prototype/.test(await ops.innerText()));
  await shot('01-operations-overview');
  await page.getByRole('button', { name: 'Close Operations' }).click();

  // ── Step 1: submit a high-value claim in Claims Intelligence
  await page.getByRole('button', { name: /^Insurance, folder/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: /^Claims Intelligence, application/ }).click();
  await claims.waitFor({ timeout: T });
  const claimId = await submitPreset('High-value motor claim');
  check('execution created for the claim', /^CLM-24-\d+$/.test(claimId));
  check('execution starts queued or running', /Queued|Running/.test(await status(claims).getAttribute('aria-label')));
  await claims.getByRole('button', { name: /^Step 2: Extract documents — Running/ }).waitFor({ timeout: T });
  check('steps progress visibly (not instantaneous)', (await claims.getByRole('button', { name: /^Step 9: Draft correspondence — Waiting/ }).count()) === 1);
  await shot('02-running');

  // ── Steps 2–5: documents, coverage, fraud investigation, then pause for approval
  await waitStatus(claims, 'Waiting for approval');
  await claims.getByRole('button', { name: /^Step 2: Extract documents — Completed/ }).click();
  const extract = await claims.getByRole('region', { name: 'Step details: Extract documents' }).innerText();
  check('extraction shows output and evidence', extract.includes('What it produced') && extract.includes('Read repair-estimate.pdf'));
  await claims.getByRole('button', { name: /^Step 3: Validate coverage — Completed/ }).click();
  check('coverage result shown', (await claims.getByRole('region', { name: 'Step details: Validate coverage' }).innerText()).includes('Cover confirmed after a manual policy lookup'));
  await claims.getByRole('button', { name: /^Step 5: Prepare investigation — Completed/ }).click();
  const inv = await claims.getByRole('region', { name: 'Step details: Prepare investigation' }).innerText();
  check('fraud investigation: why, input, result, evidence', inv.includes('Fraud Investigation Worker') && inv.includes('High-risk claim with indicators') && inv.includes('Investigation case file prepared') && inv.includes('Third party left the scene'));
  check('next-step explanation shown', inv.includes('runs next'));
  check('approval step is waiting', (await claims.getByRole('button', { name: /Approve exceptions — Awaiting approval/ }).count()) === 1);
  await shot('03-waiting-approval');

  // ── Step 5: centralized approval queue
  await claims.getByRole('button', { name: 'Review approval' }).click();
  await ops.waitFor({ timeout: T });
  const approval = await ops.innerText();
  check('approval shows business context and reasons', approval.includes('Business context') && approval.includes('£10,000 approval threshold') && approval.includes('high risk'));
  check('recommendation shown', approval.includes('Recommendation') && approval.includes('Approve the claim'));
  check('recommendation cites policy', approval.includes('R-INS-HIGH-VALUE'));
  await shot('04-approval-detail');
  await ops.getByRole('button', { name: 'Approval queue' }).click();
  check('queue lists the pending approval', (await ops.getByRole('list', { name: 'Approvals' }).innerText()).includes(claimId));
  await ops.getByRole('list', { name: 'Approvals' }).getByRole('button', { name: /High-value claim/ }).first().click();
  await ops.getByRole('group', { name: 'Decision' }).getByRole('button', { name: 'Approve' }).click();
  check('approval recorded', (await ops.innerText()).includes('Approved'));

  // ── Steps 6–7: resume, correspondence, outcome
  await ops.getByRole('button', { name: /^EXE-\d+$/ }).first().click();
  await waitStatus(ops, 'Completed');
  await ops.getByRole('button', { name: /Draft correspondence — Completed/ }).click();
  check('correspondence generated', (await ops.getByRole('region', { name: 'Step details: Draft correspondence' }).innerText()).includes('Settlement letter drafted'));
  await ops.getByRole('tab', { name: 'Outcome' }).click();
  const outcome = await ops.getByRole('region', { name: /Business outcome/ }).innerText();
  check('business outcome: claim approved by a person', outcome.includes('Claim approved') && outcome.includes('Approved by You'));
  check('outcome shows evidence and intervention', outcome.includes('Supporting evidence') && outcome.includes('High-value claim: approved by You'));
  await ops.getByRole('tab', { name: /Audit trail/ }).click();
  const audit = await ops.getByRole('list', { name: 'Execution audit trail' }).innerText();
  check('audit records state transitions', ['Transaction submitted', 'Execution queued', 'Execution started', 'Approval requested', 'Approval granted', 'Execution resumed', 'Execution completed', 'Outcome: Claim approved'].every((a) => audit.includes(a)));
  await ops.getByRole('list', { name: 'Execution audit trail' }).getByRole('button', { name: /Approval granted/ }).click();
  const auditDetail = await ops.getByRole('list', { name: 'Execution audit trail' }).innerText();
  check('audit event detail with state change, immutable', auditDetail.includes('pending → approved') && auditDetail.includes('cannot be edited or deleted'));
  check('no edit/delete controls on audit', (await ops.getByRole('button', { name: /delete|edit/i }).count()) === 0);
  await shot('05-outcome-audit');

  // Traceability: execution → resource → back; approval link from audit
  await ops.getByRole('tab', { name: 'Timeline' }).click();
  await ops.getByRole('button', { name: /Prepare investigation — Completed/ }).click();
  await ops.getByRole('button', { name: /Fraud Investigation Worker 0\.1\.0/ }).click();
  const res = await ops.innerText();
  check('resource observability: owner, apps, invocations', res.includes('AI Workers Platform') && res.includes('Applications using it') && res.includes(claimId));
  await shot('06-resource');

  // ── Step 8: learning captured; Step 9: proposal
  await page.getByRole('button', { name: 'Close Operations' }).click();
  await launch('Learning');
  await learning.waitFor({ timeout: T });
  await learning.getByText('Requires review').waitFor({ timeout: T });
  const lt = await learning.innerText();
  check('learning overview: recurring pattern and single observation distinguished', lt.includes('Recurring: 2 observations') && lt.includes('Single observation — not a pattern yet'));
  check('proposal requires review', lt.includes('Request missing policy information earlier'));
  await learning.getByRole('button', { name: /Missing information at “Validate coverage”/ }).click();
  const theme = await learning.innerText();
  check('theme separates observed evidence from interpretation', theme.includes('Observed') && theme.includes('Interpretation (proposed, not established)'));
  await learning.getByRole('button', { name: /Request missing policy information earlier/ }).click();
  await shot('07-proposal');
  // Step 10: accept → draft version, before/after, pending, validate (not published)
  await learning.getByRole('button', { name: 'Accept — create a draft version' }).click();
  const change = learning.getByRole('region', { name: 'Before and after' });
  check('accepting creates draft v0.4.1 with the added step', (await learning.innerText()).includes('draft v0.4.1') && (await change.locator('[data-change="added"]').innerText()).includes('Check policy information'));
  check('changes pending, not active', (await learning.innerText()).includes('Changes pending — not active until published'));
  check('publish requires validation', await learning.getByRole('button', { name: 'Publish v0.4.1' }).isDisabled());
  await learning.getByRole('button', { name: 'Run validation' }).click();
  check('validation runs on the draft', /\d of 8 checks passed/.test(await learning.getByRole('list', { name: 'Validation results' }).innerText()));
  await shot('08-blueprint-change');

  // Published app is not silently modified: registry shows changes pending, runtime still v0.4.0
  await page.getByRole('navigation', { name: 'Dock' }).getByRole('button', { name: 'System Explorer' }).click();
  const explorer = page.locator('section[aria-label="System Explorer"]');
  await explorer.getByRole('button', { name: 'Applications' }).click();
  await explorer.getByLabel('Search applications').fill('claims intelligence');
  check('registry: changes pending on Claims Intelligence', (await explorer.getByRole('list', { name: 'Applications' }).innerText()).includes('Changes pending'));
  await page.getByRole('button', { name: 'Close System Explorer' }).click();
  check('published version unchanged before publish', (await claims.innerText()).includes('Runs blueprint v0.4.0'));

  // Publish explicitly, then a future execution runs on v0.4.1 with the new step
  await learning.getByRole('button', { name: 'Publish v0.4.1' }).click();
  check('publication recorded in traceability', (await learning.getByRole('region', { name: 'Improvement traceability' }).innerText()).includes('v0.4.1 is live'));
  await page.getByRole('navigation', { name: 'Dock' }).getByRole('button', { name: /^Claims Intelligence/ }).click();
  const routineId = await submitPreset('Routine windscreen claim');
  check('new execution runs on v0.4.1', (await claims.innerText()).includes('blueprint v0.4.1'));
  check('new execution includes the improvement step', (await claims.getByRole('button', { name: /^Step 2: Check policy information/ }).count()) === 1);

  // ── Runtime controls: pause / resume, then completion without approval
  await claims.getByRole('button', { name: 'Pause' }).click();
  await waitStatus(claims, 'Paused');
  await page.waitForTimeout(2500);
  check('paused execution does not advance', (await status(claims).getAttribute('aria-label')) === 'Status: Paused');
  await claims.getByRole('button', { name: 'Resume' }).click();
  await waitStatus(claims, 'Completed');
  check('routine claim decided automatically', (await claims.innerText()).includes('Claim processed'));
  check('trace shows the future execution', (await learning.getByRole('region', { name: 'Improvement traceability' }).innerText()).includes('ran on v0.4.1'));

  // ── Cancel
  await submitPreset('Routine windscreen claim');
  await claims.getByRole('button', { name: 'Cancel' }).click();
  await page.getByRole('alertdialog').getByLabel('Reason for cancelling (optional)').fill('Duplicate submission');
  await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel execution' }).click();
  await page.getByRole('alertdialog').waitFor({ state: 'hidden', timeout: T });
  await waitStatus(claims, 'Cancelled');
  const cancelled = await claims.getByRole('list', { name: 'Execution timeline' }).getByRole('button').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  check('cancel stops remaining steps', cancelled.some((l) => /— Skipped$/.test(l)) && !cancelled.some((l) => /— (Running|Waiting)$/.test(l)));

  // ── Failure + retry
  const failId = await submitPreset('Unreadable document');
  await waitStatus(claims, 'Failed');
  const failure = await claims.getByRole('alert').innerText();
  check('failure explains what, where, impact, next action, retry', ['What failed', 'Where', 'Impact', 'Suggested next action', 'Retry'].every((x) => failure.includes(x)));
  await shot('09-failure');
  await claims.getByRole('button', { name: 'Retry step' }).click();
  await waitStatus(claims, 'Completed');
  check('retry recovers the execution', (await claims.getByRole('tab', { name: /Audit trail/ }).count()) === 1 && (await claims.innerText()).includes('Claim processed'));

  // Non-retryable failure
  await submitPreset('Lapsed policy');
  await waitStatus(claims, 'Failed');
  check('lapsed policy failure has no retry', (await claims.getByRole('button', { name: 'Retry step' }).count()) === 0 && (await claims.getByRole('alert').innerText()).includes('Not available'));

  // ── Request information, simulated response, rejection with required comment
  const rejectId = await submitPreset('High-value motor claim');
  await waitStatus(claims, 'Waiting for approval');
  await claims.getByRole('button', { name: 'Review approval' }).click();
  await ops.getByRole('button', { name: 'Request more information' }).click();
  await ops.getByRole('button', { name: 'Send request' }).click();
  check('information request requires a comment', (await ops.getByRole('alert').innerText()).includes('Say what information is needed'));
  await ops.getByLabel('What information is needed? (required)').fill('Please send the policy schedule.');
  await ops.getByRole('button', { name: 'Send request' }).click();
  check('approval now waiting for information; execution still waiting', (await ops.innerText()).includes('Information requested'));
  await ops.getByRole('button', { name: 'Simulate the response' }).click();
  check('simulated response returns approval to pending', (await ops.innerText()).includes('Information provided'));
  await ops.getByRole('button', { name: 'Reject' }).click();
  await ops.getByLabel('Reason for rejecting (required)').fill('Damage inconsistent with the incident description.');
  await ops.getByRole('button', { name: 'Reject', exact: true }).click();
  await ops.getByRole('button', { name: /^EXE-\d+$/ }).first().click();
  await waitStatus(ops, 'Completed');
  await ops.getByRole('tab', { name: 'Outcome' }).click();
  check('rejection leads to a declined outcome with the reason', (await ops.innerText()).includes('Claim rejected') && (await ops.innerText()).includes('Damage inconsistent'));

  // ── Operations: search, filter, event stream filters, navigation
  await ops.getByRole('button', { name: 'Executions' }).first().click();
  await ops.getByRole('button', { name: /All executions/ }).click().catch(() => {});
  await ops.getByLabel('Search executions').fill(failId);
  check('execution search', (await ops.getByRole('list', { name: 'All executions' }).getByRole('listitem').count()) === 1);
  await ops.getByLabel('Search executions').fill('');
  await ops.getByLabel('Execution status').selectOption('failed');
  const failedRows = await ops.getByRole('list', { name: 'All executions' }).innerText();
  check('status filter', failedRows.includes('CLM-24-1994') && !failedRows.includes(claimId));
  await ops.getByLabel('Execution status').selectOption('all');
  await ops.getByLabel('Sort executions').selectOption('status');
  await ops.getByRole('list', { name: 'All executions' }).getByRole('button', { name: new RegExp(`^${rejectId}`) }).click();
  await ops.getByRole('button', { name: 'Claims Intelligence' }).first().click();
  check('navigate execution → application', (await ops.innerText()).includes('running blueprint v0.4.1'));
  await ops.getByRole('tab', { name: 'Outcomes' }).click();
  check('application outcomes are derived counts', (await ops.innerText()).includes('Business decisions') && (await ops.innerText()).includes('Claim rejected'));
  await ops.getByRole('tab', { name: 'Governance' }).click();
  const gov = await ops.innerText();
  check('governance view: rules, sensitive steps, audit', ['When a person must approve', 'Sensitive steps', 'Audit requirements', 'High-value claim'].every((x) => gov.includes(x)));
  await ops.getByRole('button', { name: 'Detailed policy configuration' }).click();
  check('detailed policy configuration expands', (await ops.innerText()).includes('R-INS-FRAUD'));
  await ops.getByRole('button', { name: 'Activity' }).first().click();
  const before = await ops.getByRole('list', { name: 'Activity stream' }).getByRole('listitem').count();
  await ops.getByLabel('Event type').selectOption('approval');
  const after = await ops.getByRole('list', { name: 'Activity stream' }).getByRole('listitem').count();
  check('event type filter changes the stream', after > 0 && after < before);
  await ops.getByLabel('Event type').selectOption('learning');
  check('learning events in the stream', (await ops.getByRole('list', { name: 'Activity stream' }).innerText()).includes('Improvement proposed'));
  await ops.getByLabel('Event type').selectOption('all');
  await ops.getByLabel('Date range').selectOption('older');
  check('date range filter (seeded history only)', !(await ops.getByRole('list', { name: 'Activity stream' }).innerText()).includes(claimId));
  await ops.getByLabel('Date range').selectOption('any');
  await ops.getByRole('button', { name: 'Audit' }).first().click();
  await ops.getByLabel('Search audit records').fill(rejectId);
  check('audit search', (await ops.getByRole('list', { name: 'Audit records' }).getByRole('listitem').count()) > 3);
  await shot('10-activity');

  // ── A Studio-published (generated) banking app runs on the same runtime
  {
    const fixture = require('fs').readFileSync(require('path').join(__dirname, 'fixtures/banking-generated-app.json'), 'utf8');
    await page.evaluate((json) => localStorage.setItem('enterprise-ai-os:generated-apps:v1', json), fixture);
    await page.reload();
    await page.waitForTimeout(500);
    await launch('SME Lending Desk');
    const bank = page.locator('section[aria-label="SME Lending Desk"]');
    await bank.waitFor({ timeout: T });
    await bank.getByRole('button', { name: 'Transactions' }).click();
    await bank.getByRole('button', { name: 'Submit a loan application' }).click();
    await bank.getByRole('button', { name: /^High-value loan/ }).click();
    await bank.getByRole('button', { name: 'Submit and start execution' }).click();
    await bank.locator('[aria-label="Status: Waiting for approval"]').waitFor({ timeout: T });
    check('generated app: banking approval triggered by configuration', (await bank.innerText()).includes('High-value loan'));
    await bank.getByRole('button', { name: 'Review approval' }).click();
    await ops.getByRole('group', { name: 'Decision' }).getByRole('button', { name: 'Approve' }).click();
    await bank.locator('[aria-label="Status: Completed"]').waitFor({ timeout: T });
    await page.getByRole('button', { name: 'Close Operations' }).click();
    await bank.getByRole('tab', { name: 'Outcome' }).click();
    check('generated app: loan approved outcome', (await bank.innerText()).includes('Loan approved'));
    await shot('10b-generated-banking');
    await page.getByRole('button', { name: 'Close SME Lending Desk' }).click();
  }

  // ── Persistence
  await page.reload();
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: /^Operations, application/ }).click();
  await ops.getByRole('button', { name: 'Executions' }).first().click();
  const persisted = await ops.getByRole('list', { name: 'All executions' }).innerText();
  check('executions persist across reload', [claimId, routineId, failId, rejectId].every((id) => persisted.includes(id)));
  await ops.getByRole('button', { name: 'Approvals' }).first().click();
  await ops.getByRole('button', { name: /^Approved/ }).click();
  check('approval decisions persist', (await ops.getByRole('list', { name: 'Approvals' }).innerText()).includes(claimId));
  await page.getByRole('button', { name: 'Close Operations' }).click();
  await launch('Learning');
  await learning.getByRole('button', { name: 'Proposals' }).first().click();
  check('proposal decision persists', (await learning.innerText()).includes('Accepted'));

  // ── Responsive screenshots
  for (const [w, h] of [[1280, 800], [1024, 768], [390, 844]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(BASE);
    await page.waitForTimeout(400);
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(150);
    await page.keyboard.type('Operations');
    await page.waitForTimeout(150);
    await page.keyboard.press('Enter');
    await ops.waitFor({ timeout: T });
    await page.waitForTimeout(300);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(`no horizontal overflow at ${w}px`, overflow <= 0);
    await ops.getByRole('button', { name: 'Executions' }).first().click();
    await ops.getByRole('list', { name: 'All executions' }).getByRole('button').first().click();
    await shot(`11-execution-${w}`);
  }

  console.log(fails ? `FAILS ${fails}` : 'FAILS 0');
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
  process.exit(fails || errors.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
