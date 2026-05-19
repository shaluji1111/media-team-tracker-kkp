import { createClient } from '@libsql/client/web';

const tursoUrl = import.meta.env.VITE_TURSO_DATABASE_URL as string | undefined;
const tursoAuthToken = import.meta.env.VITE_TURSO_AUTH_TOKEN as string | undefined;

export const isTursoConfigured = Boolean(tursoUrl && tursoAuthToken);

export const turso = isTursoConfigured
  ? createClient({
      url: tursoUrl!,
      authToken: tursoAuthToken!,
    })
  : null;
