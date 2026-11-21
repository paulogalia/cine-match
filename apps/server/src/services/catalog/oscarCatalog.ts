import {
  OSCAR_CATEGORIES,
  type FilterCriteria,
  type MovieSummary,
  type OscarCategory,
} from '@cine-match/shared';
import type { CatalogPageResult, CatalogProvider } from './catalogProvider';

export interface OscarEntry {
  tmdbId: number;
  ceremonyYear: number;
  wonCategories: OscarCategory[];
  nominatedCategories: OscarCategory[];
  fallback: MovieSummary;
}

function makeFallback(
  tmdbId: number,
  title: string,
  originalTitle: string,
  releaseYear: number,
  voteAverage: number,
  genreIds: number[],
  originalLanguage: string,
  runtime: number,
  overview: string,
  posterPath: string | null = null,
): MovieSummary {
  return {
    tmdbId,
    title,
    originalTitle,
    overview,
    posterPath,
    backdropPath: null,
    voteAverage,
    voteCount: 5000,
    releaseYear,
    genreIds,
    originalLanguage,
    runtime,
  };
}

export const OSCAR_CATALOG: OscarEntry[] = [
  // ===== 2026 (98º Oscar) =====
  {
    tmdbId: 1054867,
    ceremonyYear: 2026,
    wonCategories: ['best_picture', 'best_director', 'screenplay', 'acting'],
    nominatedCategories: ['best_picture', 'best_director', 'screenplay', 'acting'],
    fallback: makeFallback(
      1054867,
      'Uma Batalha Após a Outra',
      'One Battle After Another',
      2025,
      8.1,
      [18, 53, 35],
      'en',
      161,
      'Dirigido por Paul Thomas Anderson, acompanha um ex-revolucionário em uma jornada urgente quando o passado volta a ameaçar sua família.',
    ),
  },
  {
    tmdbId: 1233413,
    ceremonyYear: 2026,
    wonCategories: ['acting', 'screenplay'],
    nominatedCategories: ['best_picture', 'best_director', 'screenplay', 'acting'],
    fallback: makeFallback(
      1233413,
      'Pecadores',
      'Sinners',
      2025,
      7.9,
      [27, 28, 53],
      'en',
      137,
      'Dois irmãos gêmeos retornam à cidade natal para recomeçar, mas descobrem um mal sobrenatural ainda maior à espera deles.',
    ),
  },
  {
    tmdbId: 1124566,
    ceremonyYear: 2026,
    wonCategories: ['international_feature'],
    nominatedCategories: ['best_picture', 'best_director', 'international_feature', 'screenplay', 'acting'],
    fallback: makeFallback(
      1124566,
      'Valor Sentimental',
      'Sentimental Value',
      2025,
      8.0,
      [18, 35],
      'no',
      133,
      'Duas irmãs precisam lidar com o retorno inesperado do pai, um cineasta carismático, na casa da família em Oslo.',
    ),
  },
  {
    tmdbId: 1220564,
    ceremonyYear: 2026,
    wonCategories: [],
    nominatedCategories: ['best_picture', 'international_feature', 'acting'],
    fallback: makeFallback(
      1220564,
      'O Agente Secreto',
      'O Agente Secreto',
      2025,
      8.0,
      [53, 18, 80],
      'pt',
      158,
      'No Brasil de 1977, um especialista em tecnologia foge de um passado misterioso e tenta reencontrar o filho no Recife durante o Carnaval.',
    ),
  },

  // ===== 2025 (97º Oscar) =====
  {
    tmdbId: 1000837,
    ceremonyYear: 2025,
    wonCategories: ['international_feature'],
    nominatedCategories: ['best_picture', 'international_feature', 'acting'],
    fallback: makeFallback(
      1000837,
      'Ainda Estou Aqui',
      'Ainda Estou Aqui',
      2024,
      8.2,
      [18, 36],
      'pt',
      135,
      'No Rio de Janeiro dos anos 1970, Eunice Paiva precisa se reinventar e lutar pela verdade após o desaparecimento do marido durante a ditadura.',
    ),
  },
  {
    tmdbId: 1064213,
    ceremonyYear: 2025,
    wonCategories: ['best_picture', 'best_director', 'screenplay', 'acting'],
    nominatedCategories: ['best_picture', 'best_director', 'screenplay', 'acting'],
    fallback: makeFallback(
      1064213,
      'Anora',
      'Anora',
      2024,
      7.6,
      [35, 18, 10749],
      'en',
      139,
      'Uma jovem do Brooklyn se casa impulsivamente com o filho de um oligarca russo, desencadeando uma perseguição caótica por Nova York.',
    ),
  },
  {
    tmdbId: 823219,
    ceremonyYear: 2025,
    wonCategories: ['animated_feature'],
    nominatedCategories: ['animated_feature', 'international_feature'],
    fallback: makeFallback(
      823219,
      'Flow',
      'Straume',
      2024,
      8.3,
      [16, 12, 14, 10751],
      'lv',
      85,
      'Um gato solitário precisa aprender a conviver com outros animais em um pequeno barco após uma grande inundação cobrir o mundo.',
    ),
  },
  {
    tmdbId: 974576,
    ceremonyYear: 2025,
    wonCategories: ['screenplay'],
    nominatedCategories: ['best_picture', 'screenplay', 'acting'],
    fallback: makeFallback(
      974576,
      'Conclave',
      'Conclave',
      2024,
      7.4,
      [18, 53, 9648],
      'en',
      120,
      'Encarregado de conduzir a eleição secreta do novo Papa, um cardeal descobre segredos capazes de abalar os alicerces da Igreja.',
    ),
  },
  {
    tmdbId: 549509,
    ceremonyYear: 2025,
    wonCategories: ['acting'],
    nominatedCategories: ['best_picture', 'best_director', 'screenplay', 'acting'],
    fallback: makeFallback(
      549509,
      'O Brutalista',
      'The Brutalist',
      2024,
      7.7,
      [18],
      'en',
      215,
      'Um arquiteto visionário foge da Europa pós-guerra para reconstruir sua vida e sua obra nos Estados Unidos.',
    ),
  },

  // ===== 2024 (96º Oscar) =====
  {
    tmdbId: 872585,
    ceremonyYear: 2024,
    wonCategories: ['best_picture', 'best_director', 'acting'],
    nominatedCategories: ['best_picture', 'best_director', 'screenplay', 'acting'],
    fallback: makeFallback(
      872585,
      'Oppenheimer',
      'Oppenheimer',
      2023,
      8.1,
      [18, 36],
      'en',
      181,
      'A trajetória do físico J. Robert Oppenheimer à frente do Projeto Manhattan durante a Segunda Guerra Mundial.',
      '/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    ),
  },
  {
    tmdbId: 792307,
    ceremonyYear: 2024,
    wonCategories: ['acting'],
    nominatedCategories: ['best_picture', 'best_director', 'screenplay', 'acting'],
    fallback: makeFallback(
      792307,
      'Pobres Criaturas',
      'Poor Things',
      2023,
      7.8,
      [878, 10749, 35],
      'en',
      141,
      'Trazida de volta à vida por um cientista excêntrico, Bella Baxter parte em uma odisseia de descoberta e liberdade pelos continentes.',
    ),
  },
  {
    tmdbId: 915935,
    ceremonyYear: 2024,
    wonCategories: ['screenplay'],
    nominatedCategories: ['best_picture', 'best_director', 'screenplay', 'acting'],
    fallback: makeFallback(
      915935,
      'Anatomia de uma Queda',
      'Anatomie d\'une chute',
      2023,
      7.7,
      [53, 9648, 80, 18],
      'fr',
      151,
      'Após a morte suspeita do marido nos Alpes franceses, uma escritora enfrenta um julgamento que disseca cada detalhe do casamento.',
    ),
  },
  {
    tmdbId: 467244,
    ceremonyYear: 2024,
    wonCategories: ['international_feature'],
    nominatedCategories: ['best_picture', 'best_director', 'international_feature', 'screenplay'],
    fallback: makeFallback(
      467244,
      'Zona de Interesse',
      'The Zone of Interest',
      2023,
      7.4,
      [18, 36, 10752],
      'de',
      105,
      'O comandante de Auschwitz e sua esposa tentam construir uma vida doméstica idílica em uma casa com jardim ao lado do muro do campo.',
    ),
  },
  {
    tmdbId: 508883,
    ceremonyYear: 2024,
    wonCategories: ['animated_feature'],
    nominatedCategories: ['animated_feature'],
    fallback: makeFallback(
      508883,
      'O Menino e a Garça',
      'Kimitachi wa Do Ikiru ka',
      2023,
      7.5,
      [16, 12, 14],
      'ja',
      124,
      'Após perder a mãe durante a guerra, um garoto segue uma garça misteriosa até uma torre abandonada que liga o mundo dos vivos e dos mortos.',
    ),
  },
  {
    tmdbId: 666277,
    ceremonyYear: 2024,
    wonCategories: [],
    nominatedCategories: ['best_picture', 'screenplay'],
    fallback: makeFallback(
      666277,
      'Vidas Passadas',
      'Past Lives',
      2023,
      7.8,
      [18, 10749],
      'en',
      106,
      'Dois amigos de infância de Seul se reencontram duas décadas depois em Nova York, confrontando escolhas e destino.',
      '/k3waqVXSnvCZWfJYNtdamTgTtTA.jpg',
    ),
  },

  // ===== 2020–2023 =====
  {
    tmdbId: 545611,
    ceremonyYear: 2023,
    wonCategories: ['best_picture', 'best_director', 'screenplay', 'acting'],
    nominatedCategories: ['best_picture', 'best_director', 'screenplay', 'acting'],
    fallback: makeFallback(
      545611,
      'Tudo em Todo o Lugar ao Mesmo Tempo',
      'Everything Everywhere All at Once',
      2022,
      7.8,
      [28, 12, 878],
      'en',
      139,
      'Uma imigrante chinesa precisa conectar versões de si mesma em universos paralelos para salvar sua família e o multiverso.',
      '/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg',
    ),
  },
  {
    tmdbId: 49046,
    ceremonyYear: 2023,
    wonCategories: ['international_feature'],
    nominatedCategories: ['best_picture', 'international_feature', 'screenplay'],
    fallback: makeFallback(
      49046,
      'Nada de Novo no Front',
      'Im Westen nichts Neues',
      2022,
      7.8,
      [10752, 18],
      'de',
      147,
      'Um jovem soldado alemão descobre o horror brutal das trincheiras na Primeira Guerra Mundial.',
    ),
  },
  {
    tmdbId: 776503,
    ceremonyYear: 2022,
    wonCategories: ['best_picture', 'screenplay', 'acting'],
    nominatedCategories: ['best_picture', 'screenplay', 'acting'],
    fallback: makeFallback(
      776503,
      'No Ritmo do Coração',
      'CODA',
      2021,
      8.0,
      [18, 10402, 10749],
      'en',
      111,
      'Única pessoa ouvinte em uma família surda, Ruby se divide entre ajudar o negócio dos pais e perseguir seu sonho na música.',
    ),
  },
  {
    tmdbId: 758866,
    ceremonyYear: 2022,
    wonCategories: ['international_feature'],
    nominatedCategories: ['best_picture', 'best_director', 'international_feature', 'screenplay'],
    fallback: makeFallback(
      758866,
      'Drive My Car',
      'Doraibu mai kā',
      2021,
      7.5,
      [18],
      'ja',
      179,
      'Um diretor de teatro em luto desenvolve um vínculo silencioso e transformador com a jovem motorista designada para seu carro em Hiroshima.',
    ),
  },
  {
    tmdbId: 581734,
    ceremonyYear: 2021,
    wonCategories: ['best_picture', 'best_director', 'acting'],
    nominatedCategories: ['best_picture', 'best_director', 'screenplay', 'acting'],
    fallback: makeFallback(
      581734,
      'Nomadland',
      'Nomadland',
      2020,
      7.3,
      [18],
      'en',
      108,
      'Após perder tudo na recessão, uma mulher transforma sua van em casa e percorre o oeste americano como nômade moderna.',
    ),
  },
  {
    tmdbId: 580175,
    ceremonyYear: 2021,
    wonCategories: ['international_feature'],
    nominatedCategories: ['best_director', 'international_feature'],
    fallback: makeFallback(
      580175,
      'Druk: Mais Uma Rodada',
      'Druk',
      2020,
      7.6,
      [35, 18],
      'da',
      117,
      'Quatro professores dinamarqueses testam a teoria de que manter um leve nível constante de álcool no sangue melhora a criatividade e a vida.',
    ),
  },
  {
    tmdbId: 508442,
    ceremonyYear: 2021,
    wonCategories: ['animated_feature'],
    nominatedCategories: ['animated_feature'],
    fallback: makeFallback(
      508442,
      'Soul',
      'Soul',
      2020,
      8.1,
      [16, 10751, 35, 14, 10402],
      'en',
      101,
      'Um professor de música apaixonado por jazz sofre um acidente no dia da sua grande chance e tenta reencontrar o sentido de viver.',
    ),
  },
  {
    tmdbId: 496243,
    ceremonyYear: 2020,
    wonCategories: ['best_picture', 'best_director', 'international_feature', 'screenplay'],
    nominatedCategories: ['best_picture', 'best_director', 'international_feature', 'screenplay'],
    fallback: makeFallback(
      496243,
      'Parasita',
      'Gisaengchung',
      2019,
      8.5,
      [35, 53, 18],
      'ko',
      132,
      'Uma família desempregada se infiltra gradualmente na rotina de uma família rica em Seul.',
      '/igw938inb6Fy0YVcwIyxQ7Lu5FO.jpg',
    ),
  },
  {
    tmdbId: 475557,
    ceremonyYear: 2020,
    wonCategories: ['acting'],
    nominatedCategories: ['best_picture', 'best_director', 'screenplay', 'acting'],
    fallback: makeFallback(
      475557,
      'Coringa',
      'Joker',
      2019,
      8.1,
      [80, 53, 18],
      'en',
      122,
      'Isolado e negligenciado em Gotham, um comediante fracassado mergulha em uma espiral de caos.',
    ),
  },

  // ===== 2010–2019 =====
  {
    tmdbId: 324857,
    ceremonyYear: 2019,
    wonCategories: ['animated_feature'],
    nominatedCategories: ['animated_feature'],
    fallback: makeFallback(
      324857,
      'Homem-Aranha no Aranhaverso',
      'Spider-Man: Into the Spider-Verse',
      2018,
      8.4,
      [16, 28, 12, 878],
      'en',
      117,
      'Miles Morales ganha poderes e encontra versões do Homem-Aranha de outras dimensões.',
      '/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg',
    ),
  },
  {
    tmdbId: 426426,
    ceremonyYear: 2019,
    wonCategories: ['best_director', 'international_feature'],
    nominatedCategories: ['best_picture', 'best_director', 'international_feature', 'screenplay', 'acting'],
    fallback: makeFallback(
      426426,
      'Roma',
      'Roma',
      2018,
      7.7,
      [18],
      'es',
      135,
      'Um retrato íntimo de um ano na vida de uma empregada doméstica trabalhando para uma família de classe média na Cidade do México nos anos 1970.',
    ),
  },
  {
    tmdbId: 419430,
    ceremonyYear: 2018,
    wonCategories: ['screenplay'],
    nominatedCategories: ['best_picture', 'best_director', 'screenplay', 'acting'],
    fallback: makeFallback(
      419430,
      'Corra!',
      'Get Out',
      2017,
      7.6,
      [9648, 53, 27],
      'en',
      104,
      'Um jovem fotógrafo descobre um segredo perturbador ao conhecer a família de sua namorada.',
      '/tFXcEccSQMf3lfhfXKSU9iRBpa3.jpg',
    ),
  },
  {
    tmdbId: 354912,
    ceremonyYear: 2018,
    wonCategories: ['animated_feature'],
    nominatedCategories: ['animated_feature'],
    fallback: makeFallback(
      354912,
      'Viva: A Vida é uma Festa',
      'Coco',
      2017,
      8.2,
      [16, 10751, 14, 10402],
      'en',
      105,
      'Apesar da proibição familiar à música, o jovem Miguel embarca em uma jornada mágica pela Terra dos Mortos no México.',
    ),
  },
  {
    tmdbId: 376867,
    ceremonyYear: 2017,
    wonCategories: ['best_picture', 'screenplay', 'acting'],
    nominatedCategories: ['best_picture', 'best_director', 'screenplay', 'acting'],
    fallback: makeFallback(
      376867,
      'Moonlight: Sob a Luz do Luar',
      'Moonlight',
      2016,
      7.4,
      [18],
      'en',
      111,
      'Três fases decisivas na vida de Chiron, um jovem negro crescendo em Miami em busca de identidade e afeto.',
    ),
  },
  {
    tmdbId: 313369,
    ceremonyYear: 2017,
    wonCategories: ['best_director', 'acting'],
    nominatedCategories: ['best_picture', 'best_director', 'screenplay', 'acting'],
    fallback: makeFallback(
      313369,
      'La La Land: Cantando Estações',
      'La La Land',
      2016,
      7.9,
      [35, 18, 10749, 10402],
      'en',
      128,
      'Um pianista de jazz e uma aspirante a atriz se apaixonam enquanto tentam realizar seus sonhos em Los Angeles.',
      '/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg',
    ),
  },
  {
    tmdbId: 329865,
    ceremonyYear: 2017,
    wonCategories: [],
    nominatedCategories: ['best_picture', 'best_director', 'screenplay'],
    fallback: makeFallback(
      329865,
      'A Chegada',
      'Arrival',
      2016,
      7.6,
      [18, 878, 9648],
      'en',
      116,
      'Uma linguista é recrutada para decifrar a comunicação de naves alienígenas que pousaram na Terra.',
      '/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg',
    ),
  },
  {
    tmdbId: 314365,
    ceremonyYear: 2016,
    wonCategories: ['best_picture', 'screenplay'],
    nominatedCategories: ['best_picture', 'best_director', 'screenplay', 'acting'],
    fallback: makeFallback(
      314365,
      'Spotlight: Segredos Revelados',
      'Spotlight',
      2015,
      7.8,
      [18, 36],
      'en',
      129,
      'A investigação real da equipe de jornalismo do Boston Globe que expôs décadas de acobertamento de abusos.',
    ),
  },
  {
    tmdbId: 76341,
    ceremonyYear: 2016,
    wonCategories: [],
    nominatedCategories: ['best_picture', 'best_director'],
    fallback: makeFallback(
      76341,
      'Mad Max: Estrada da Fúria',
      'Mad Max: Fury Road',
      2015,
      7.6,
      [28, 12, 878],
      'en',
      120,
      'Em um deserto pós-apocalíptico, uma rebelde e um andarilho lideram uma fuga alucinante contra um tirano.',
      '/hA2ple9q4qnwxp3hKVNhroipsir.jpg',
    ),
  },
  {
    tmdbId: 150540,
    ceremonyYear: 2016,
    wonCategories: ['animated_feature'],
    nominatedCategories: ['animated_feature', 'screenplay'],
    fallback: makeFallback(
      150540,
      'Divertida Mente',
      'Inside Out',
      2015,
      7.9,
      [16, 10751, 12, 18, 35],
      'en',
      95,
      'Dentro da mente da jovem Riley, cinco emoções tentam guiá-la durante uma mudança difícil para uma nova cidade.',
    ),
  },
  {
    tmdbId: 194662,
    ceremonyYear: 2015,
    wonCategories: ['best_picture', 'best_director', 'screenplay'],
    nominatedCategories: ['best_picture', 'best_director', 'screenplay', 'acting'],
    fallback: makeFallback(
      194662,
      'Birdman ou (A Inesperada Virtude da Ignorância)',
      'Birdman',
      2014,
      7.5,
      [18, 35],
      'en',
      119,
      'Um ator famoso por viver um super-herói no passado tenta recuperar seu prestígio montando uma peça na Broadway.',
    ),
  },
  {
    tmdbId: 244786,
    ceremonyYear: 2015,
    wonCategories: ['acting'],
    nominatedCategories: ['best_picture', 'screenplay', 'acting'],
    fallback: makeFallback(
      244786,
      'Whiplash: Em Busca da Perfeição',
      'Whiplash',
      2014,
      8.4,
      [18, 10402],
      'en',
      107,
      'Um jovem baterista enfrenta os métodos extremos de um maestro obcecado pela perfeição.',
      '/7fn624j5lj3xTme2SgiLCeuedmO.jpg',
    ),
  },
  {
    tmdbId: 120467,
    ceremonyYear: 2015,
    wonCategories: [],
    nominatedCategories: ['best_picture', 'best_director', 'screenplay'],
    fallback: makeFallback(
      120467,
      'O Grande Hotel Budapeste',
      'The Grand Budapest Hotel',
      2014,
      8.0,
      [35, 18],
      'en',
      100,
      'As aventuras de um lendário concierge e seu jovem ajudante durante o roubo de uma pintura renascentista.',
      '/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg',
    ),
  },
  {
    tmdbId: 152601,
    ceremonyYear: 2014,
    wonCategories: ['screenplay'],
    nominatedCategories: ['best_picture', 'screenplay'],
    fallback: makeFallback(
      152601,
      'Ela',
      'Her',
      2013,
      7.9,
      [10749, 878, 18],
      'en',
      126,
      'Em um futuro próximo, um escritor solitário desenvolve uma relação profunda com um sistema operacional inteligente.',
    ),
  },
  {
    tmdbId: 68718,
    ceremonyYear: 2013,
    wonCategories: ['screenplay', 'acting'],
    nominatedCategories: ['best_picture', 'screenplay', 'acting'],
    fallback: makeFallback(
      68718,
      'Django Livre',
      'Django Unchained',
      2012,
      8.2,
      [18, 37],
      'en',
      165,
      'Com a ajuda de um caçador de recompensas alemão, um ex-escravo cruza o sul dos EUA para resgatar sua esposa.',
    ),
  },
  {
    tmdbId: 27205,
    ceremonyYear: 2011,
    wonCategories: [],
    nominatedCategories: ['best_picture', 'screenplay'],
    fallback: makeFallback(
      27205,
      'A Origem',
      'Inception',
      2010,
      8.4,
      [28, 878, 12],
      'en',
      148,
      'Um ladrão que invade sonhos recebe a tarefa inversa de plantar uma ideia na mente de um herdeiro.',
      '/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
    ),
  },
  {
    tmdbId: 25376,
    ceremonyYear: 2010,
    wonCategories: ['international_feature'],
    nominatedCategories: ['international_feature'],
    fallback: makeFallback(
      25376,
      'O Segredo dos Seus Olhos',
      'El secreto de sus ojos',
      2009,
      8.0,
      [80, 18, 9648, 10749],
      'es',
      129,
      'Um oficial de justiça aposentado decide escrever um livro sobre um caso de assassinato não resolvido que marcou sua vida na Argentina.',
    ),
  },

  // ===== 2000–2009 =====
  {
    tmdbId: 10681,
    ceremonyYear: 2009,
    wonCategories: ['animated_feature'],
    nominatedCategories: ['animated_feature', 'screenplay'],
    fallback: makeFallback(
      10681,
      'WALL·E',
      'WALL·E',
      2008,
      8.1,
      [16, 10751, 878],
      'en',
      98,
      'Após séculos limpando uma Terra abandonada, um pequeno robô compacto embarca em uma viagem espacial que define o futuro da humanidade.',
    ),
  },
  {
    tmdbId: 6977,
    ceremonyYear: 2008,
    wonCategories: ['best_picture', 'best_director', 'screenplay', 'acting'],
    nominatedCategories: ['best_picture', 'best_director', 'screenplay', 'acting'],
    fallback: makeFallback(
      6977,
      'Onde os Fracos Não Têm Vez',
      'No Country for Old Men',
      2007,
      7.9,
      [80, 18, 53],
      'en',
      122,
      'Um caçador encontra uma mala cheia de dinheiro no deserto do Texas e passa a ser perseguido por um assassino implacável.',
    ),
  },
  {
    tmdbId: 1422,
    ceremonyYear: 2007,
    wonCategories: ['best_picture', 'best_director', 'screenplay'],
    nominatedCategories: ['best_picture', 'best_director', 'screenplay', 'acting'],
    fallback: makeFallback(
      1422,
      'Os Infiltrados',
      'The Departed',
      2006,
      8.2,
      [18, 53, 80],
      'en',
      151,
      'Em Boston, um policial disfarçado na máfia e um informante da máfia na polícia tentam descobrir a identidade um do outro.',
    ),
  },
  {
    tmdbId: 38,
    ceremonyYear: 2005,
    wonCategories: ['screenplay'],
    nominatedCategories: ['screenplay', 'acting'],
    fallback: makeFallback(
      38,
      'Brilho Eterno de uma Mente sem Lembranças',
      'Eternal Sunshine of the Spotless Mind',
      2004,
      8.1,
      [878, 18, 10749],
      'en',
      108,
      'Após um término doloroso, um casal recorre a um procedimento para apagar as memórias um do outro.',
      '/5MwkWH9tYHv3mV9OdYTMR5qreIz.jpg',
    ),
  },
  {
    tmdbId: 598,
    ceremonyYear: 2004,
    wonCategories: [],
    nominatedCategories: ['best_director', 'screenplay'],
    fallback: makeFallback(
      598,
      'Cidade de Deus',
      'Cidade de Deus',
      2002,
      8.4,
      [18, 80],
      'pt',
      130,
      'A ascensão do crime organizado em uma comunidade do Rio de Janeiro sob o olhar de um jovem fotógrafo.',
      '/gfnXixcGC060khG6gkOTAQz3r0P.jpg',
    ),
  },
  {
    tmdbId: 122,
    ceremonyYear: 2004,
    wonCategories: ['best_picture', 'best_director', 'screenplay'],
    nominatedCategories: ['best_picture', 'best_director', 'screenplay'],
    fallback: makeFallback(
      122,
      'O Senhor dos Anéis: O Retorno do Rei',
      'The Lord of the Rings: The Return of the King',
      2003,
      8.5,
      [12, 14, 28],
      'en',
      201,
      'Enquanto Frodo e Sam se aproximam da Montanha da Perdição, Aragorn lidera o confronto final pela Terra-média.',
    ),
  },
  {
    tmdbId: 129,
    ceremonyYear: 2003,
    wonCategories: ['animated_feature'],
    nominatedCategories: ['animated_feature'],
    fallback: makeFallback(
      129,
      'A Viagem de Chihiro',
      'Sen to Chihiro no Kamikakushi',
      2001,
      8.5,
      [16, 10751, 14],
      'ja',
      125,
      'Uma garota entra em um mundo mágico governado por espíritos e precisa salvar seus pais.',
      '/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg',
    ),
  },
  {
    tmdbId: 2757,
    ceremonyYear: 2003,
    wonCategories: ['acting'],
    nominatedCategories: ['screenplay', 'acting'],
    fallback: makeFallback(
      2757,
      'Adaptação',
      'Adaptation.',
      2002,
      7.4,
      [35, 80, 18],
      'en',
      115,
      'Um roteirista em crise criativa tenta adaptar um livro sobre orquídeas enquanto lida com seu irmão gêmeo.',
      '/s2s421kG2M91u5y7K8S4n9D0P9r.jpg',
    ),
  },
  {
    tmdbId: 194,
    ceremonyYear: 2002,
    wonCategories: [],
    nominatedCategories: ['international_feature', 'screenplay'],
    fallback: makeFallback(
      194,
      'O Fabuloso Destino de Amélie Poulain',
      "Le Fabuleux Destin d'Amélie Poulain",
      2001,
      7.9,
      [35, 10749],
      'fr',
      122,
      'Uma jovem garçonete parisiense decide transformar discretamente a vida das pessoas ao seu redor.',
      '/nSxDa3M9aMvGVLoItzWTepQ5h5d.jpg',
    ),
  },

  // ===== Clássicos (até 1999) =====
  {
    tmdbId: 666,
    ceremonyYear: 1999,
    wonCategories: [],
    nominatedCategories: ['international_feature', 'acting'],
    fallback: makeFallback(
      666,
      'Central do Brasil',
      'Central do Brasil',
      1998,
      8.1,
      [18],
      'pt',
      113,
      'Uma ex-professora escreve cartas na estação Central do Brasil e embarca em uma jornada com um menino à procura do pai.',
      '/f6yW7D4X3R2b8n5k4j9p7s2m3v1.jpg',
    ),
  },
  {
    tmdbId: 637,
    ceremonyYear: 1999,
    wonCategories: ['international_feature', 'acting'],
    nominatedCategories: ['best_picture', 'best_director', 'international_feature', 'screenplay', 'acting'],
    fallback: makeFallback(
      637,
      'A Vida é Bela',
      'La vita è bella',
      1997,
      8.5,
      [35, 18],
      'it',
      116,
      'Durante a Segunda Guerra Mundial, um pai usa humor e imaginação para proteger o filho dos horrores de um campo de concentração.',
    ),
  },
  {
    tmdbId: 680,
    ceremonyYear: 1995,
    wonCategories: ['screenplay'],
    nominatedCategories: ['best_picture', 'best_director', 'screenplay', 'acting'],
    fallback: makeFallback(
      680,
      'Pulp Fiction: Tempo de Violência',
      'Pulp Fiction',
      1994,
      8.5,
      [53, 80],
      'en',
      154,
      'Histórias interligadas de assassinos de aluguel, um boxeador e a esposa de um gângster em Los Angeles.',
    ),
  },
  {
    tmdbId: 424,
    ceremonyYear: 1994,
    wonCategories: ['best_picture', 'best_director', 'screenplay'],
    nominatedCategories: ['best_picture', 'best_director', 'screenplay', 'acting'],
    fallback: makeFallback(
      424,
      'A Lista de Schindler',
      "Schindler's List",
      1993,
      8.6,
      [18, 36, 10752],
      'en',
      195,
      'A história real de Oskar Schindler, empresário que salvou mais de mil judeus poloneses durante o Holocausto.',
    ),
  },
  {
    tmdbId: 274,
    ceremonyYear: 1992,
    wonCategories: ['best_picture', 'best_director', 'screenplay', 'acting'],
    nominatedCategories: ['best_picture', 'best_director', 'screenplay', 'acting'],
    fallback: makeFallback(
      274,
      'O Silêncio dos Inocentes',
      'The Silence of the Lambs',
      1991,
      8.3,
      [80, 18, 53],
      'en',
      118,
      'Uma jovem agente do FBI recorre ao brilhante e manipulador Dr. Hannibal Lecter para capturar outro assassino em série.',
    ),
  },
  {
    tmdbId: 11216,
    ceremonyYear: 1990,
    wonCategories: ['international_feature'],
    nominatedCategories: ['international_feature'],
    fallback: makeFallback(
      11216,
      'Cinema Paradiso',
      'Nuovo Cinema Paradiso',
      1988,
      8.5,
      [18, 10749],
      'it',
      124,
      'Um cineasta recorda sua infância em uma pequena vila italiana e a amizade com o projecionista local.',
      '/8SRUfRUi6x4O68n0VCbDNRa6iGL.jpg',
    ),
  },
  {
    tmdbId: 238,
    ceremonyYear: 1973,
    wonCategories: ['best_picture', 'screenplay', 'acting'],
    nominatedCategories: ['best_picture', 'best_director', 'screenplay', 'acting'],
    fallback: makeFallback(
      238,
      'O Poderoso Chefão',
      'The Godfather',
      1972,
      8.7,
      [18, 80],
      'en',
      175,
      'O patriarca de uma dinastia do crime organizado em Nova York transfere o controle do império ao filho mais novo.',
    ),
  },
];

function buildOscarBadge(entry: OscarEntry, selectedCategories: OscarCategory[]): string {
  const categoryLabelMap = new Map(OSCAR_CATEGORIES.map((c) => [c.id, c.label]));
  const matchingWin = selectedCategories.find((cat) => entry.wonCategories.includes(cat));
  const primaryWin = matchingWin ?? entry.wonCategories[0];

  if (primaryWin) {
    const label = categoryLabelMap.get(primaryWin) ?? 'Vencedor';
    return `Oscar ${entry.ceremonyYear} • ${label}`;
  }

  const matchingNom = selectedCategories.find((cat) => entry.nominatedCategories.includes(cat));
  const primaryNom = matchingNom ?? entry.nominatedCategories[0];
  const nomLabel = primaryNom ? categoryLabelMap.get(primaryNom) : 'Indicado';
  return `Oscar ${entry.ceremonyYear} • Indicado (${nomLabel})`;
}

export function filterOscarEntries(filters: FilterCriteria): OscarEntry[] {
  const oscar = filters.oscar;
  if (!oscar?.enabled) return [];

  const selectedCategories = oscar.categories ?? [];
  const winnersOnly = Boolean(oscar.winnersOnly);

  return OSCAR_CATALOG.filter((entry) => {
    if (winnersOnly && entry.wonCategories.length === 0) {
      return false;
    }

    if (selectedCategories.length > 0) {
      const pool = winnersOnly ? entry.wonCategories : entry.nominatedCategories;
      const matchesCategory = selectedCategories.some((cat) => pool.includes(cat));
      if (!matchesCategory) return false;
    }

    if (oscar.ceremonyYearFrom !== undefined && entry.ceremonyYear < oscar.ceremonyYearFrom) {
      return false;
    }
    if (oscar.ceremonyYearTo !== undefined && entry.ceremonyYear > oscar.ceremonyYearTo) {
      return false;
    }

    const fb = entry.fallback;
    if (filters.genreIds.length > 0) {
      if (!filters.genreIds.some((gid) => fb.genreIds.includes(gid))) return false;
    }
    if (filters.yearFrom !== undefined && (fb.releaseYear ?? 0) < filters.yearFrom) {
      return false;
    }
    if (filters.yearTo !== undefined && (fb.releaseYear ?? 9999) > filters.yearTo) {
      return false;
    }
    if (filters.minRating !== undefined && fb.voteAverage < filters.minRating) {
      return false;
    }
    if (filters.originalLanguage && fb.originalLanguage !== filters.originalLanguage) {
      return false;
    }
    if (filters.minRuntime !== undefined && fb.runtime != null && fb.runtime < filters.minRuntime) {
      return false;
    }
    if (filters.maxRuntime !== undefined && fb.runtime != null && fb.runtime > filters.maxRuntime) {
      return false;
    }

    return true;
  });
}

export async function fetchOscarCatalogPage(
  filters: FilterCriteria,
  page: number,
  catalogProvider: CatalogProvider,
  pageSize = 12,
): Promise<CatalogPageResult> {
  const entries = filterOscarEntries(filters);
  const selectedCategories = filters.oscar?.categories ?? [];
  const watchProviderIds = filters.watchProviderIds ?? [];

  const sorted = [...entries].sort((a, b) => {
    if (filters.sortBy === 'vote_average.desc') {
      return b.fallback.voteAverage - a.fallback.voteAverage;
    }
    if (filters.sortBy === 'primary_release_date.desc') {
      return b.ceremonyYear - a.ceremonyYear;
    }
    // Padrão no Oscar: mistura prestígio (vencedores recentes + clássicos bem avaliados)
    return b.ceremonyYear - a.ceremonyYear || b.fallback.voteAverage - a.fallback.voteAverage;
  });

  const start = (page - 1) * pageSize;
  const slice = sorted.slice(start, start + pageSize);
  const hasMore = start + pageSize < sorted.length;

  // Se TMDB estiver ativo, enriquece com pôster/sinopse oficiais em pt-BR (com cache de 6h)
  if (catalogProvider.source === 'tmdb') {
    const movies: MovieSummary[] = [];
    const batchSize = 4;

    for (let i = 0; i < slice.length; i += batchSize) {
      const batch = slice.slice(i, i + batchSize);
      const resolved = await Promise.all(
        batch.map(async (entry) => {
          const badge = buildOscarBadge(entry, selectedCategories);
          try {
            const details = await catalogProvider.getMovieDetails(entry.tmdbId);
            if (!details) {
              return { ...entry.fallback, oscarBadge: badge };
            }

            // Se o casal também selecionou streamings específicos no Brasil, respeita disponibilidade real
            if (watchProviderIds.length > 0) {
              const hasStreaming = details.watchProvidersBR.providers.some(
                (p) => p.type === 'flatrate' && watchProviderIds.includes(p.providerId),
              );
              if (!hasStreaming) return null;
            }

            return {
              tmdbId: details.tmdbId,
              title: details.title,
              originalTitle: details.originalTitle,
              overview: details.overview || entry.fallback.overview,
              posterPath: details.posterPath ?? entry.fallback.posterPath,
              backdropPath: details.backdropPath ?? entry.fallback.backdropPath,
              voteAverage: details.voteAverage || entry.fallback.voteAverage,
              voteCount: details.voteCount || entry.fallback.voteCount,
              releaseYear: details.releaseYear ?? entry.fallback.releaseYear,
              genreIds: details.genreIds.length > 0 ? details.genreIds : entry.fallback.genreIds,
              originalLanguage: details.originalLanguage || entry.fallback.originalLanguage,
              runtime: details.runtime ?? entry.fallback.runtime,
              oscarBadge: badge,
            } satisfies MovieSummary;
          } catch {
            return { ...entry.fallback, oscarBadge: badge };
          }
        }),
      );

      for (const item of resolved) {
        if (item) movies.push(item);
      }
    }

    return { movies, page, hasMore };
  }

  return {
    movies: slice.map((entry) => ({
      ...entry.fallback,
      oscarBadge: buildOscarBadge(entry, selectedCategories),
    })),
    page,
    hasMore,
  };
}
