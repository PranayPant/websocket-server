export interface RedisGeoMember extends RedisGeoCoordinates {
  member: string;
}

export interface RedisGeoSearchResult {
  member: string;
  distance: string;
  coordinates: RedisGeoCoordinates
}

export interface RedisGeoCoordinates {
  latitude: string | number
  longitude: string | number
}

export type RedisGeoUnits = "m" | "km" | "mi" | "ft";