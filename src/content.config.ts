import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const prs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/prs' }),
  schema: z.object({
    // Required
    title: z.string(),
    description: z.string(),
    date: z.string(),
    site: z.string(),
    repoLink: z.string().url(),
    prLink: z.string().url(),
    // Optional
    time: z.string().optional(),
    tags: z.array(z.string()).optional().default([]),
    featured: z.boolean().optional().default(false),
    // Optional manual status override (used only if GitHub can't be reached)
    status: z.enum(['open', 'merged', 'closed']).optional(),
  }),
});

export const collections = { prs };
