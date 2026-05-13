/**
 * Drizzle ORM client for Postgres via Neon serverless driver.
 * Uses DATABASE_URL from environment. Shared across API routes and server components.
 */
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../drizzle/schema';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
