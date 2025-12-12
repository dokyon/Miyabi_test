/**
 * °ƒ	p¡â¸åüë
 * °ƒ	pn­¼hÐêÇü·çó
 */

import { config } from 'dotenv';
import { z } from 'zod';

// .envÕ¡¤ë’­¼
config();

/**
 * °ƒ	pn¹­üÞš©
 */
const envSchema = z.object({
  // GitHub-š
  GITHUB_TOKEN: z.string().optional(),
  REPOSITORY: z.string().optional(),

  // Anthropic API-š
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),

  // OpenAI API-š
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),

  // ChromaDB-š
  CHROMA_DB_PATH: z.string().default('./data/chromadb'),
  COLLECTION_NAME: z.string().default('bankin_crm_data'),

  // APIµüÐü-š
  PORT: z.string().default('3000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

/**
 * °ƒ	pn‹
 */
export type Env = z.infer<typeof envSchema>;

/**
 * °ƒ	p’<WfÖ—
 */
function validateEnv(): Env {
  try {
    return envSchema.parse({
      GITHUB_TOKEN: process.env.GITHUB_TOKEN,
      REPOSITORY: process.env.REPOSITORY,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      CHROMA_DB_PATH: process.env.CHROMA_DB_PATH,
      COLLECTION_NAME: process.env.COLLECTION_NAME,
      PORT: process.env.PORT,
      NODE_ENV: process.env.NODE_ENV,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('L °ƒ	pn<¨éü:');
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        console.error(`  - ${path}: ${err.message}`);
      });
      throw new Error('°ƒ	pn-šLcWOBŠ~[“.env.example’ÂgWfO`UD');
    }
    throw error;
  }
}

/**
 * <°ƒ	p
 */
export const env = validateEnv();

/**
 * ‹zâüÉKiFK
 */
export const isDevelopment = env.NODE_ENV === 'development';

/**
 * ×íÀ¯·çóâüÉKiFK
 */
export const isProduction = env.NODE_ENV === 'production';

/**
 * Æ¹ÈâüÉKiFK
 */
export const isTest = env.NODE_ENV === 'test';
