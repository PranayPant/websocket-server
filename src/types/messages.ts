import { RedisUserKey } from "./redis";

export interface WebsocketRequestResponse {
  type: RedisUserKey;
  id: string;
  data: any;
}
