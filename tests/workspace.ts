import type { Locator, Page } from '@playwright/test';

export async function chooseAppearance(page: Page, value: string) {
  const menu = page.getByRole('button', { name:'Open navigation',exact:true });
  const drawer = page.getByRole('dialog', { name:'Workspace navigation',exact:true });
  if (await menu.isVisible() && !await drawer.isVisible()) await menu.click();
  await page.getByRole('button', { name:value === 'system' ? 'Use system appearance' : value === 'light' ? 'Light theme' : 'Dark theme',exact:true }).click();
  if (await drawer.isVisible()) await page.getByRole('button', { name:'Close navigation',exact:true }).click();
}

export async function navigateWorkspace(page: Page, name: string) {
  const menu = page.getByRole('button', { name: 'Open navigation', exact: true });
  if (await menu.isVisible() && !await page.getByRole('dialog', { name: 'Workspace navigation', exact: true }).isVisible()) await menu.click();
  await page.getByRole('button', { name, exact: true }).click();
}
export async function editReportDetails(scope: Page | Locator) {
  const disclosure = scope.locator('.report-details-disclosure:visible').first();
  if (await disclosure.count() && await disclosure.getAttribute('open') === null) await disclosure.locator('summary').click();
}
