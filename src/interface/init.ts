import * as Redis from "redis";
import { userSchemas } from "schemas/users";
import * as dotenv from "dotenv";
import { RedisUserKey } from "types/redis";

dotenv.config();

const REDIS_PORT = (process.env.REDIS_PORT || 6259) as number;
const REDIS_HOST = process.env.REDIS_HOST || "";

export async function connect() {
  global.redis = Redis.createClient({
    username: process.env.REDIS_USER,
    password: process.env.REDIS_PASSWORD,
    socket: {
      host: REDIS_HOST,
      port: REDIS_PORT,
    },
  });
  await global.redis.connect();
}

export async function createUserIndices(indices: RedisUserKey[]) {
  await Promise.all(indices.map((i) => createUserIndex(i)));
}

async function createUserIndex(index: RedisUserKey) {
  try {
    await global.redis.ft.info(index);
  } catch (e) {
    console.log("Creating new index", index);
    global.redis.ft
      .create(index, userSchemas[index], {
        ON: "JSON",
        PREFIX: index
      })
      .then(() => console.log("Successfully created new index", index))
      .catch((e) => {
        console.log("Error: Could not create new index", index, e);
        throw e;
      });
  }
}
