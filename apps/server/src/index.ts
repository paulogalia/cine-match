import qrcode from 'qrcode-terminal';
import { loadEnv } from './config/env';
import { getLocalNetworkInfo } from './config/network';
import { createApp } from './app';

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const { httpServer, roomManager, catalogProvider } = createApp({
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
    dataFilePath: env.DATA_FILE_PATH,
    tmdbApiKey: env.TMDB_API_KEY,
    catalogMode: env.CATALOG_MODE,
  });

  await roomManager.init();
  roomManager.startExpirationJob();

  const shutdown = async () => {
    roomManager.stopExpirationJob();
    await roomManager.flushPersistence();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());

  httpServer.listen(env.PORT, '0.0.0.0', () => {
    const displayPort = env.NODE_ENV === 'development' ? 5173 : env.PORT;
    const networkInfo = getLocalNetworkInfo(displayPort);

    console.log('\n==================================================');
    console.log('  CINE MATCH — Servidor Local Ativo');
    console.log('==================================================');
    console.log(`  Ambiente : ${env.NODE_ENV}`);
    console.log(`  Catálogo : ${catalogProvider.source === 'tmdb' ? 'TMDB API (pt-BR)' : 'Catálogo local (24 filmes)'}`);
    console.log(`  API/WS   : http://0.0.0.0:${env.PORT}`);
    console.log(`  Local    : http://localhost:${displayPort}`);

    if (networkInfo.candidates.length > 0) {
      console.log('\n  Endereços detectados na rede Wi-Fi:');
      for (const candidate of networkInfo.candidates) {
        const badge = candidate.recommended ? ' [RECOMENDADO]' : '';
        console.log(`   - ${candidate.url} (${candidate.interfaceName})${badge}`);
      }

      console.log('\n  Escaneie com o celular na mesma rede Wi-Fi:\n');
      qrcode.generate(networkInfo.primaryUrl, { small: true });
    } else {
      console.log('\n  [AVISO] Nenhuma interface IPv4 de rede local detectada.');
    }

    if (catalogProvider.source !== 'tmdb') {
      console.log('  [DICA] Adicione TMDB_API_KEY no arquivo .env para usar o catálogo completo do TMDB.');
    }
    console.log('==================================================\n');
  });
}

void bootstrap();
