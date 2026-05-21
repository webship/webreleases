'use strict';

const { execSync } = require('child_process');
const { Given, When, Then } = require('@cucumber/cucumber');
const { friendly } = require('webship-js/tests/step-definitions/webship');

/**
 * Run a step body and rethrow any failure as a tester-friendly error.
 *
 * @param {Function} body  - async function performing the step.
 * @param {string} message - human-readable description for failures.
 */
async function attempt(body, message) {
  try {
    await body();
  } catch (err) {
    throw friendly(message, err);
  }
}

/**
 * Log in as Drupal admin using credentials from env vars.
 *
 * Uses DRUPAL_ADMIN_USERNAME (default: 'admin') and
 * DRUPAL_ADMIN_PASSWORD (default: 'admin' for CI).
 *
 * Example: Given I am logged in as admin
 */
Given('I am logged in as admin', async function () {
  const username = process.env.DRUPAL_ADMIN_USERNAME || 'admin';
  const password = process.env.DRUPAL_ADMIN_PASSWORD || 'admin';
  await this.page.goto(`${this.parameters.launchUrl}/user/login`);
  await this.page.getByLabel('Username').fill(username);
  await this.page.getByLabel('Password').fill(password);
  await this.page.locator('input[value="Log in"]').click();
  await this.page.waitForLoadState('networkidle');
});

/**
 * Seed a product and a number of releases linked to it.
 *
 * Creates the content directly through the Drupal entity API so the
 * releases-listing tests have deterministic, high-volume data without
 * driving dozens of node forms in the browser.
 *
 * The drush executable is taken from the WEBRELEASES_DRUSH env var so the
 * step works both locally (DDEV) and in CI; it defaults to "drush".
 *
 * Example #1: Given the product "Alpha" has 12 releases
 * Example #2: Given the product "Bravo" has 20 releases
 * Example #3: Given the product "Charlie" has 10 releases
 */
Given(/^the product "([^"]*)" has (\d+) releases?$/, function (product, count) {
  const drush = process.env.WEBRELEASES_DRUSH || 'drush';
  const php = [
    '$s=\\Drupal::entityTypeManager()->getStorage("node");',
    `$p=$s->create(["type"=>"product","title"=>"${product}","status"=>1]);$p->save();`,
    `for($i=1;$i<=${count};$i++){`,
    `$r=$s->create(["type"=>"release","title"=>"${product} release ".$i,`,
    '"field_product"=>$p->id(),"status"=>1]);$r->save();}',
    'echo "seeded";',
  ].join('');
  execSync(`${drush} php:eval '${php}'`, { stdio: 'pipe', shell: '/bin/bash' });
});

/**
 * Assert that a form field with the given label is visible on the page.
 *
 * Example #1: Then I should see a "Title" field
 * Example #2: Then I should see a "Product" field
 * Example #3: Then I should see a "Release tag" field
 * Example #4: Then I should see a "Username" field
 * Example #5: Then I should see a "Password" field
 */
Then(/^(?:I |we )?should see a "([^"]*)" field$/, async function (label) {
  await attempt(async () => {
    const locator = this.page.getByLabel(label, { exact: false }).first();
    await locator.waitFor({ state: 'visible', timeout: 10000 });
  }, `Expected to find a field labeled "${label}"`);
});

/**
 * Assert that a form field with the given label (with article "an") is visible.
 *
 * Example #1: Then I should see an "Image" field
 * Example #2: Then I should see an "Author" field
 * Example #3: Then I should see an "Options" field
 * Example #4: And I should see an "Image" field
 * Example #5: And I should see an "Author" field
 */
Then(/^(?:I |we )?should see an "([^"]*)" field$/, async function (label) {
  await attempt(async () => {
    const locator = this.page.getByLabel(label, { exact: false }).first();
    await locator.waitFor({ state: 'visible', timeout: 10000 });
  }, `Expected to find a field labeled "${label}"`);
});

/**
 * Assert that a button with the given text is visible on the page.
 *
 * Example #1: Then I should see the button "Save"
 * Example #2: Then I should see the button "Log in"
 * Example #3: Then I should see the button "Delete"
 * Example #4: Then I should see the button "Preview"
 * Example #5: Then I should see the button "Submit"
 */
Then(/^(?:I |we )?should see the button "([^"]*)"$/, async function (text) {
  await attempt(async () => {
    const locator = this.page.getByRole('button', { name: text, exact: false }).first();
    await locator.waitFor({ state: 'visible', timeout: 10000 });
  }, `Expected to find a button with text "${text}"`);
});

/**
 * Select a value from a Drupal entity-reference autocomplete field.
 *
 * Types the value into the field labeled <label>, waits for the jQuery UI
 * suggestions menu, and picks the first match with the keyboard so Drupal
 * stores the "Title (id)" value the reference field needs. Fails loudly if
 * the field is not resolved to a "... (id)" value.
 *
 * Example #1: When I select "Webship" from the "Product" autocomplete
 * Example #2: When I select "Alpha" from the "Product" autocomplete
 * Example #3: And I select "Drupal" from the "Product" autocomplete
 */
When(/^(?:I |we )?select "([^"]*)" from the "([^"]*)" autocomplete$/, async function (value, label) {
  await attempt(async () => {
    const field = this.page.getByLabel(label, { exact: false }).first();
    await field.waitFor({ state: 'visible', timeout: 10000 });
    await field.click();
    await field.fill('');
    await field.pressSequentially(value, { delay: 80 });
    await this.page
      .locator('ul.ui-autocomplete li.ui-menu-item')
      .filter({ hasText: value })
      .first()
      .waitFor({ state: 'visible', timeout: 10000 });
    await field.press('ArrowDown');
    await field.press('Enter');
    const resolved = await field.inputValue();
    if (!/\(\d+\)\s*$/.test(resolved)) {
      throw new Error(`autocomplete did not resolve to an entity, value is "${resolved}"`);
    }
  }, `Expected to select "${value}" from the "${label}" autocomplete`);
});
