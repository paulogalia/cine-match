# 🎬 Cine Match

Aplicação web local e mobile-first para duas pessoas escolherem filmes juntas na mesma rede Wi-Fi, combinando mecânica fluida de swipe, filas independentes e sincronização em tempo real — sem precisar de login, conta ou hospedagem na nuvem.

## Principais Recursos

- **Rede Wi-Fi local (zero hospedagem):** um computador roda o servidor em `0.0.0.0` e dois celulares acessam pelo navegador via **QR Code** ou código de 6 caracteres.
- **Filas independentes:** cada participante recebe os filmes em ordem embaralhada própria; o voto de um nunca revela antecipadamente a escolha do outro.
- **Swipe físico a 60 FPS + botões acessíveis:** arrasto com inclinação proporcional, selos dinâmicos (`GOSTEI` / `PASSAR`), retorno elástico, atalhos de teclado (`←` / `→`) e feedback tátil quando suportado.
- **Match simultâneo e sessão contínua:** animação cinematográfica sincronizada nos dois celulares quando ambos dão `LIKE`, com lista compartilhada de matches, remoção da lista de interesse (sem apagar votos originais), tela **"Decidir agora"** com confirmação mútua e histórico de sessões.
- **Integração com TMDB (`pt-BR`):** catálogo dinâmico, filtros por gênero, ano, duração, nota mínima, ordenação e idioma, cache no backend, detalhes sob demanda e disponibilidade de streaming no Brasil. Funciona também com catálogo local de 24 filmes se a chave do TMDB não estiver configurada.
- **Resiliência e persistência local:** reconexão automática após bloqueio de tela ou oscilação de Wi-Fi, idempotência contra votos duplicados e salvamento atômico em JSON (`data/sessions.json`) com recuperação após reinício do servidor.

---

## Pré-requisitos

- **Node.js** `>= 20.0.0`
- **pnpm** (`npm install -g pnpm`)
- Computador e celulares conectados na **mesma rede Wi-Fi**

---

## Instalação

```bash
# 1. Na pasta raiz do projeto, instale as dependências
pnpm install

# 2. Crie seu arquivo de configuração local a partir do modelo
cp .env.example .env
