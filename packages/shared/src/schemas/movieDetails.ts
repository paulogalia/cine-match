import { z } from 'zod';
import { MovieSummarySchema } from './domain';

export const GenreSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
});

export const WatchProviderOptionSchema = z.object({
  providerId: z.number().int().positive(),
  name: z.string().min(1),
  logoPath: z.string().nullable(),
});

export const WatchProviderSchema = z.object({
  providerId: z.number().int().positive(),
  name: z.string().min(1),
  logoPath: z.string().nullable(),
  type: z.enum(['flatrate', 'rent', 'buy']),
});

export const PersonSearchResultSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  profilePath: z.string().nullable(),
  knownForDepartment: z.string(),
  knownForTitles: z.array(z.string()),
});

export const DirectorCreditSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  profilePath: z.string().nullable(),
});

export const CastMemberSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  character: z.string(),
  profilePath: z.string().nullable(),
});

export const MovieTrailerSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  site: z.literal('YouTube'),
  type: z.string(),
  language: z.string(),
});

export const MovieDetailsSchema = MovieSummarySchema.extend({
  runtime: z.number().int().positive().nullable(),
  genres: z.array(GenreSchema),
  directors: z.array(DirectorCreditSchema),
  cast: z.array(CastMemberSchema),
  trailer: MovieTrailerSchema.nullable(),
  watchProvidersBR: z.object({
    link: z.string().nullable(),
    available: z.boolean(),
    providers: z.array(WatchProviderSchema),
  }),
  fetchedAt: z.string(),
});

export const CatalogStatusSchema = z.object({
  source: z.enum(['tmdb', 'seed']),
  tmdbConfigured: z.boolean(),
});

export type Genre = z.infer<typeof GenreSchema>;
export type WatchProviderOption = z.infer<typeof WatchProviderOptionSchema>;
export type WatchProvider = z.infer<typeof WatchProviderSchema>;
export type PersonSearchResult = z.infer<typeof PersonSearchResultSchema>;
export type DirectorCredit = z.infer<typeof DirectorCreditSchema>;
export type CastMember = z.infer<typeof CastMemberSchema>;
export type MovieTrailer = z.infer<typeof MovieTrailerSchema>;
export type MovieDetails = z.infer<typeof MovieDetailsSchema>;
export type CatalogStatus = z.infer<typeof CatalogStatusSchema>;
