import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Koleksi Portofolio. Tiap proyek satu file JSON di src/content/projects/,
// diedit lewat admin (Decap). Field ID & EN dipasangkan agar tidak lupa sinkron.
const projects = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/projects' }),
  schema: z.object({
    order: z.number(),
    featured: z.boolean().default(false),
    name: z.string(),
    url: z.string().url(),
    tags: z.array(z.string()).default([]),
    image: z.string(),
    imageWidth: z.number().optional(),
    imageHeight: z.number().optional(),
    alt_id: z.string(),
    alt_en: z.string(),
    desc_id: z.string(),
    desc_en: z.string(),
    // slug studi kasus (kosong = tidak ada). Mengacu ke /portofolio/<slug> & /en/work/<slug>.
    caseStudy: z.string().default(''),
  }),
});

export const collections = { projects };
