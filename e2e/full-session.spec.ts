import fs from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

async function getCurrentCardTmdbId(page: Page): Promise<string> {
  const card = page.getByTestId('active-movie-card');
  await expect(card).toBeVisible();
  const id = await card.getAttribute('data-tmdb-id');
  if (!id) throw new Error('Card ativo sem data-tmdb-id');
  return id;
}

test.beforeEach(async () => {
  await fs.rm(path.resolve('data/e2e-sessions.json'), { force: true }).catch(() => undefined);
});

test('fluxo completo: criação, entrada via QR link, votação, match simultâneo, continuação e escolha final', async ({
  browser,
}) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();

  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  // 1. Host cria sessão
  await pageA.goto('/');
  await expect(pageA.getByTestId('connection-badge')).toContainText('Rede local ativa');
  await pageA.getByTestId('home-create-btn').click();
  await pageA.getByTestId('create-name-input').fill('Paulo');
  await pageA.getByTestId('create-submit-btn').click();

  const roomCode = (await pageA.getByTestId('room-code-display').textContent())!.trim();
  expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);

  // 2. Guest entra pelo link que vai no QR Code (/?join=CODE)
  await pageB.goto(`/?join=${roomCode}`);
  await expect(pageB.getByTestId('join-code-input')).toHaveValue(roomCode);
  await pageB.getByTestId('join-name-input').fill('Maria');
  await pageB.getByTestId('join-submit-btn').click();

  // 3. Lobby sincronizado nos dois celulares
  await expect(pageA.getByTestId('lobby-ready-banner')).toBeVisible();
  await expect(pageB.getByTestId('guest-waiting-host')).toBeVisible();

  await pageA.getByTestId('lobby-start-btn').click();
  await expect(pageA.getByTestId('active-movie-card')).toBeVisible();
  await expect(pageB.getByTestId('active-movie-card')).toBeVisible();

  // 4. Votação: A curte o 1º filme da sua fila; B desliza até encontrar o mesmo filme e curte
  const targetMovieId = await getCurrentCardTmdbId(pageA);
  await pageA.getByTestId('vote-like-btn').click();
  await expect(pageA.getByTestId('my-votes-counter')).toContainText('1');

  let matched = false;
  for (let step = 0; step < 15; step++) {
    const currentId = await getCurrentCardTmdbId(pageB);
    if (currentId === targetMovieId) {
      await pageB.getByTestId('vote-like-btn').click();
      matched = true;
      break;
    }
    await pageB.getByTestId('vote-dislike-btn').click();
    await expect(
      pageB.locator(`[data-testid="active-movie-card"][data-tmdb-id="${currentId}"]`),
    ).toHaveCount(0);
  }
  expect(matched).toBe(true);

  // 5. Match simultâneo nos dois aparelhos
  await expect(pageA.getByTestId('match-celebration-overlay')).toBeVisible();
  await expect(pageB.getByTestId('match-celebration-overlay')).toBeVisible();

  // 6. Continuação da sessão sem encerrar
  await pageA.getByTestId('match-continue-btn').click();
  await pageB.getByTestId('match-continue-btn').click();
  await expect(pageA.getByTestId('matches-count-badge')).toHaveText('1');
  await expect(pageB.getByTestId('matches-count-badge')).toHaveText('1');

  // 7. Decidir agora + escolha final sincronizada
  await pageA.getByTestId('decide-now-btn').click();
  await pageA.getByTestId('confirm-enter-deciding-btn').click();

  await expect(pageA.getByTestId('decision-screen')).toBeVisible();
  await expect(pageB.getByTestId('decision-screen')).toBeVisible();

  await pageA.getByTestId(`propose-movie-${targetMovieId}`).click();
  await expect(pageB.getByTestId('decision-proposal-banner')).toBeVisible();
  await pageB.getByTestId('confirm-proposal-btn').click();

  // 8. Tela final do Filme da Noite sincronizada em ambos
  await expect(pageA.getByTestId('final-chosen-screen')).toBeVisible();
  await expect(pageB.getByTestId('final-chosen-screen')).toBeVisible();

  await contextA.close();
  await contextB.close();
});

test('entrada por código manual, queda de Wi-Fi (offline/online) e reconexão após reload', async ({
  browser,
}) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();

  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  // Host cria sala
  await pageA.goto('/');
  await pageA.getByTestId('home-create-btn').click();
  await pageA.getByTestId('create-name-input').fill('Ana');
  await pageA.getByTestId('create-submit-btn').click();
  const roomCode = (await pageA.getByTestId('room-code-display').textContent())!.trim();

  // Guest entra digitando o código manualmente
  await pageB.goto('/');
  await pageB.getByTestId('home-join-btn').click();
  await pageB.getByTestId('join-code-input').fill(roomCode);
  await pageB.getByTestId('join-name-input').fill('Bruno');
  await pageB.getByTestId('join-submit-btn').click();

  await pageA.getByTestId('lobby-start-btn').click();
  await expect(pageB.getByTestId('active-movie-card')).toBeVisible();

  // Bruno registra 1 voto antes da queda de rede
  await pageB.getByTestId('vote-dislike-btn').click();
  await expect(pageB.getByTestId('my-votes-counter')).toContainText('1');

  // Simula perda de Wi-Fi no celular de Bruno
  await contextB.setOffline(true);
  await expect(pageB.getByTestId('voting-offline-banner')).toBeVisible();
  await expect(pageB.getByTestId('vote-like-btn')).toBeDisabled();
  await expect(pageB.getByTestId('vote-dislike-btn')).toBeDisabled();

  // Restaura Wi-Fi -> deve reconectar e reabilitar votação
  await contextB.setOffline(false);
  await expect(pageB.getByTestId('voting-offline-banner')).toBeHidden({ timeout: 10_000 });
  await expect(pageB.getByTestId('vote-like-btn')).toBeEnabled();

  // Simula suspensão/reload completo da aba -> deve recuperar sessão e votos intactos
  await pageB.reload();
  await expect(pageB.getByTestId('active-movie-card')).toBeVisible({ timeout: 10_000 });
  await expect(pageB.getByTestId('my-votes-counter')).toContainText('1');

  await contextA.close();
  await contextB.close();
});
