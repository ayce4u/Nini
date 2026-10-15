import 'reflect-metadata';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ENTITIES } from './entities.js';

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Réglages de la base de données, partagés par l'API et par la ligne de commande
 * TypeORM (pour créer et lancer les migrations).
 */
export function databaseOptions(): DataSourceOptions {
  return {
    type: 'postgres',
    url: process.env.DATABASE_URL ?? 'postgres://nini:nini@localhost:5432/nini',
    entities: ENTITIES,
    migrations: [join(here, 'migrations', '*.js')],
    // Les migrations se lancent toutes seules au démarrage de l'API :
    // le schéma de la base suit toujours le code déployé.
    migrationsRun: true,
    synchronize: false,
    logging: process.env.DB_LOGGING === 'true',
  };
}

export default new DataSource(databaseOptions());
