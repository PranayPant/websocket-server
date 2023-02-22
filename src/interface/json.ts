import * as Redis from "redis";
import { WebsocketMessage } from "types/messages";

export async function jsonSet(key: string, json: WebsocketMessage) {
  await global.redis.json.set(key, "$", json as any);
}
