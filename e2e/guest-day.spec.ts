import { expect, test } from '@playwright/test';

test('a guest picks three things, ticks them all and wins the day', async ({ page }) => {
  await page.goto('/');

  const sheet = page.getByRole('dialog', {
    name: 'What 3 things will make you feel productive today?',
  });
  await expect(sheet).toBeVisible();
  const go = sheet.getByRole('button', { name: 'Let’s go' });
  await expect(go).toBeDisabled();

  await sheet.getByLabel('Priority 1').fill('Ship the onboarding copy');
  await sheet.getByLabel('Priority 2').fill('Walk for 30 minutes');
  await sheet.getByLabel('Priority 3').fill('Call grandma');
  await go.click();
  await expect(sheet).toBeHidden();

  const main = page.getByRole('main');
  const progress = (n: number) => main.getByText(`${n} of 3 done`, { exact: true });
  await expect(progress(0)).toBeVisible();
  const boxes = page.getByRole('checkbox');
  await expect(boxes).toHaveCount(3);

  await boxes.nth(0).click();
  await expect(boxes.nth(0)).toHaveAttribute('aria-checked', 'true');
  await expect(progress(1)).toBeVisible();

  await boxes.nth(1).press('Space');
  await expect(progress(2)).toBeVisible();
  await boxes.nth(2).click();

  const won = page.getByRole('dialog', { name: 'Day won!' });
  await expect(won).toBeVisible();
  await expect(won.getByText('Three promises made. Three promises kept.')).toBeVisible();
  await expect(won.getByText('1-day streak')).toBeVisible();
  await expect(won.getByRole('button', { name: 'Keep blooming' })).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(won).toBeHidden();
  await expect(page.getByText('1-day streak').first()).toBeAttached();

  // Survives a reload: data lives in IndexedDB.
  await page.reload();
  await expect(progress(3)).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
