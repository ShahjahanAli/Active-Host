import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Missing MONGODB_URI environment variable");
}

const mongodbUri: string = MONGODB_URI;

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cache = global.mongooseCache ?? { conn: null, promise: null };
if (!global.mongooseCache) {
  global.mongooseCache = cache;
}

export async function connectDb(): Promise<typeof mongoose> {
  if (cache.conn) {
    return cache.conn;
  }

  if (!cache.promise) {
    cache.promise = mongoose.connect(mongodbUri, {
      dbName: process.env.MONGODB_DB ?? "remoteservermanager"
    });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}
