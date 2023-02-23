import { GeoReplyWith } from "redis";
import {
  RedisGeoMember,
  RedisGeoSearchResult,
  RedisGeoUnits,
} from "types/redis";

export async function geoAdd(toAdd: RedisGeoMember): Promise<boolean> {
  let success = true;
  try {
    await global.redis.geoAdd("default", toAdd);
  } catch (e) {
    console.log("Error: Could not add geolocation for user:", toAdd, e);
    success = false;
  }
  return success;
}

export async function geoSearch(
  member: string,
  radius: number,
  unit: RedisGeoUnits
): Promise<RedisGeoSearchResult[] | null> {
  let ret: RedisGeoSearchResult[] | null = null;
  try {
    ret = (await global.redis.geoSearchWith(
      "default",
      member,
      { radius, unit },
      ["WITHDIST", "WITHCOORD"] as GeoReplyWith[],
      { SORT: "ASC" }
    )) as unknown as RedisGeoSearchResult[];
  } catch (e) {
    console.log("Error: Could not search geolocation:", e);
  }
  return ret;
}
