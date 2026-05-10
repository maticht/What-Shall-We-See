import mongoose from "mongoose";

declare global {
  var mongooseCache:
    | {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
        categoryGlobalTypeBackfill: Promise<void> | null;
      }
    | undefined;
}

const cache = global.mongooseCache ?? {
  conn: null,
  promise: null,
  categoryGlobalTypeBackfill: null,
};

global.mongooseCache = cache;

export async function connectToDatabase() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is not configured.");
  }

  if (cache.conn) {
    return cache.conn;
  }

  if (!cache.promise) {
    cache.promise = mongoose.connect(uri, {
      bufferCommands: false,
    });
  }

  cache.conn = await cache.promise;

  if (!cache.categoryGlobalTypeBackfill) {
    cache.categoryGlobalTypeBackfill = (async () => {
      const { default: Category } = await import("@/models/category");
      await Category.updateMany(
        { globalType: { $exists: false } },
        { $set: { globalType: "other" } },
      );
    })();
  }

  await cache.categoryGlobalTypeBackfill;

  return cache.conn;
}
