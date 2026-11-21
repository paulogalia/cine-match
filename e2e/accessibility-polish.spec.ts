import { expect, test } from '@playwright/test';

test('acessibilidade: prefers-reduced-motion, teclado (←/→ e Esc) e zero erros no console', async ({
  browser,
}) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  const contextA = await browser.newContext({ reducedMotion: 'reduce' });
  const contextB = await browser.newContext({ reducedMotion: 'reduce' });

  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  pageA.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  pageA.on('pageerror', (err) => pageErrors.push(err.message));

  await pageA.goto('/');
  await expect(pageA.getByText(/API do TMDB/i)).toBeVisible();

  await pageA.getByTestId('home-create-btn').click();
  await pageA.getByTestId('create-name-input').fill('Paulo');
  await pageA.getByTestId('create-submit-btn').click();
  const roomCode = (await pageA.getByTestId('room-code-display').textContent())!.trim();

  await pageB.goto(`/?join=${roomCode}`);
  await pageB.getByTestId('join-name-input').fill('Maria');
  await pageB.getByTestId('join-submit-btn').click();

  await pageA.getByTestId('lobby-start-btn').click();
  await expect(pageA.getByTestId('active-movie-card')).toBeVisible();

  // Abre modal de filtros e fecha com a tecla Escape
  await pageA.getByTestId('voting-filters-btn').click();
  await expect(pageA.getByRole('dialog')).toBeVisible();
  await pageA.keyboard.press('Escape');
  await expect(pageA.getByRole('dialog')).toBeHidden();

  // Vota pelo teclado usando ArrowRight (LIKE) e ArrowLeft (DISLIKE)
  await pageA.keyboard.press('ArrowRight');
  await expect(pageA.getByTestId('my-votes-counter')).toContainText('1');

  await pageA.keyboard.press('ArrowLeft');
  await expect(pageA.getByTestId('my-votes-counter')).toContainText('2');

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);

  await contextA.close();
  await contextB.close();
});
