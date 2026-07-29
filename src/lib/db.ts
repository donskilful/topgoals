import mongoose from "mongoose";

/**
 * Next.js hot-reloads modules in development, which would otherwise open a new
 * connection on every reload until Atlas refuses them. Cache the connection (and
 * the in-flight promise, so concurrent callers share one attempt) on globalThis.
 */
type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as typeof globalThis & {
  _mongooseCache?: MongooseCache;
};

const cached: MongooseCache = globalForMongoose._mongooseCache ?? {
  conn: null,
  promise: null,
};

globalForMongoose._mongooseCache = cached;

export async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  // Read lazily rather than at module scope: ES imports are hoisted above any
  // dotenv/loadEnvConfig call in a script's body, so a module-level read would
  // capture undefined before the env file had been loaded.
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is not set. Copy .env.example to .env.local and add your MongoDB Atlas connection string.",
    );
  }

  if (!cached.promise) {
    cached.promise = connectWithRetry(MONGODB_URI);
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    // Clear the rejected promise so the next call retries instead of replaying it.
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}

const MAX_ATTEMPTS = 3;

/**
 * Connects, retrying briefly on transient network failures.
 *
 * A build prerenders many pages at once and a single dropped handshake
 * (ECONNRESET, a momentary Atlas blip) would otherwise fail the whole deploy.
 * Genuine problems — bad credentials, wrong host — fail on the first attempt
 * rather than being retried pointlessly.
 */
async function connectWithRetry(uri: string): Promise<typeof mongoose> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await mongoose.connect(uri, {
        // Fail fast with a clear error instead of hanging when Atlas is unreachable.
        serverSelectionTimeoutMS: 10_000,
      });
    } catch (error) {
      lastError = error;

      if (!isTransient(error) || attempt === MAX_ATTEMPTS) break;

      const backoffMs = 500 * 2 ** (attempt - 1);
      console.warn(
        `MongoDB connection attempt ${attempt} failed (${describe(error)}); retrying in ${backoffMs}ms.`,
      );
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  throw lastError;
}

/** Network-level hiccups worth retrying, as opposed to auth or config errors. */
function isTransient(error: unknown): boolean {
  const message = describe(error);
  return (
    /ECONNRESET|ETIMEDOUT|EPIPE|ENOTFOUND|ECONNREFUSED|EAI_AGAIN/.test(message) ||
    /SystemOverloaded|RetryableError|HandshakeError|connection .* closed/i.test(message)
  );
}

function describe(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}
