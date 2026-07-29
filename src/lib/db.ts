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
    cached.promise = mongoose.connect(MONGODB_URI, {
      // Fail fast with a clear error instead of hanging when Atlas is unreachable.
      serverSelectionTimeoutMS: 10_000,
    });
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
