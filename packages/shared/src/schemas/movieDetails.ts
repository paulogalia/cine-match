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

export const MovieDetailsSchema = MovieSummarySchema.extend({
  runtime: z.number().int().positive().nullable(),
  genres: z.array(GenreSchema),
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
export type MovieDetails = z.infer<typeof MovieDetailsSchema>;
export type CatalogStatus = z.infer<typeof CatalogStatusSchema>;
