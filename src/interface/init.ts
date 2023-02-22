import * as Redis from "redis";
import { userSchema } from "schemas/users";
import * as dotenv from "dotenv";

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
  await createIndices();
}

export async function createIndices() {
  try {
    await global.redis.ft.info("users");
  } catch (e) {
    console.log("creating new index users...");
    global.redis.ft
      .create("users", userSchema, {
        ON: "JSON",
        PREFIX: "users",
      })
      .then(() => console.log("Successfully created new index"))
      .catch((e) => console.log("Error: Could not create new index."));
  }
}
