import { expect, test } from '@playwright/test';

const VIEWPORTS = [
  { name: 'smartphone-estreito', width: 360, height: 640 },
  { name: 'smartphone-convencional', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
] as const;

for (const vp of VIEWPORTS) {
  test(`layout sem cortes ou overflow em ${vp.name} (${vp.width}x${vp.height})`, async ({
    browser,
  }) => {
    const contextA = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    });
    const contextB = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    // 1. Verifica Home sem overflow horizontal
    await pageA.goto('/');
    await expect(pageA.getByTestId('home-create-btn')).toBeVisible();
    const homeOverflow = await pageA.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    );
    expect(homeOverflow).toBe(true);

    // 2. Cria sala, entra no segundo contexto e inicia votação
    await pageA.getByTestId('home-create-btn').click();
    await pageA.getByTestId('create-name-input').fill('Paulo');
    await pageA.getByTestId('create-submit-btn').click();
    const roomCode = (await pageA.getByTestId('room-code-display').textContent())!.trim();

    await pageB.goto(`/?join=${roomCode}`);
    await pageB.getByTestId('join-name-input').fill('Maria');
    await pageB.getByTestId('join-submit-btn').click();

    await pageA.getByTestId('lobby-start-btn').click();
    await expect(pageA.getByTestId('active-movie-card')).toBeVisible();

    // 3. Verifica tela de votação: zero overflow horizontal + card e botões dentro da tela
    const votingOverflow = await pageA.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    );
    expect(votingOverflow).toBe(true);

    const cardBox = await pageA.getByTestId('active-movie-card').boundingBox();
    const likeBox = await pageA.getByTestId('vote-like-btn').boundingBox();
    const dislikeBox = await pageA.getByTestId('vote-dislike-btn').boundingBox();

    expect(cardBox).not.toBeNull();
    expect(likeBox).not.toBeNull();
    expect(dislikeBox).not.toBeNull();

    // Card precisa ter altura real legível
    expect(cardBox!.height).toBeGreaterThanOrEqual(250);
    expect(cardBox!.width).toBeGreaterThanOrEqual(280);

    // Botões de votação não podem sair para fora da viewport visível
    expect(likeBox!.y + likeBox!.height).toBeLessThanOrEqual(vp.height + 2);
    expect(dislikeBox!.y + dislikeBox!.height).toBeLessThanOrEqual(vp.height + 2);
    expect(likeBox!.x + likeBox!.width).toBeLessThanOrEqual(vp.width + 2);
    expect(dislikeBox!.x).toBeGreaterThanOrEqual(0);

    await contextA.close();
    await contextB.close();
  });
}
