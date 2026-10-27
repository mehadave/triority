import { expect, test } from '@playwright/test';

test('back up, wipe the device, then restore from the file', async ({ page }) => {
  await page.goto('/');
  const sheet = page.getByRole('dialog', {
    name: 'What 3 things will make you feel productive today?',
  });
  await sheet.getByLabel('Priority 1').fill('Water the plants');
  await sheet.getByLabel('Priority 2').fill('Stretch');
  await sheet.getByLabel('Priority 3').fill('Read ten pages');
  await sheet.getByRole('button', { name: 'Let’s go' }).click();
  await page.getByRole('checkbox', { name: 'Stretch' }).click();

  await page.getByRole('link', { name: 'Extras' }).click();
  await expect(page.getByText('No backup yet.')).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Back up now' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^triority-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const file = await download.path();
  await expect(page.getByText(/Last backup:/)).toBeVisible();

  await page.getByRole('button', { name: 'Delete all my data' }).click();
  await page
    .getByRole('dialog', { name: 'Delete everything?' })
    .getByRole('button', { name: 'Delete' })
    .click();
  await expect(page.getByText('No backup yet.')).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles(file);
  const restore = page.getByRole('dialog', { name: 'Restore backup?' });
  await expect(restore.getByText(/^1 day, from/)).toBeVisible();
  await restore.getByRole('button', { name: 'Replace everything' }).click();
  await expect(restore).toBeHidden();

  await page.getByRole('link', { name: 'Tasks' }).click();
  await expect(page.getByRole('checkbox')).toHaveCount(3);
  await expect(page.getByRole('checkbox', { name: 'Stretch' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await expect(page.getByRole('main').getByText('1 of 3 done', { exact: true })).toBeVisible();
});

test('a file that is not a backup is refused without changing anything', async ({ page }) => {
  await page.goto('/extras');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'notes.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"hello":"world"}'),
  });
  await expect(page.getByRole('alert')).toHaveText('That file isn’t a Triority backup.');
  await expect(page.getByRole('dialog', { name: 'Restore backup?' })).toHaveCount(0);
});
