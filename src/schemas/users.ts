import { RediSearchSchema, SchemaFieldTypes } from "redis";
import { RedisUserKey } from "types/redis";

const messagesSchema: RediSearchSchema = {
  "$.data[*]": {
    type: SchemaFieldTypes.TAG,
    SORTABLE: true,
  },
};

const infoSchema: RediSearchSchema = {
  "$.location": {
    type: SchemaFieldTypes.GEO,
    AS: "location",
  },
};

export const userSchemas: { [k in RedisUserKey]: RediSearchSchema } = {
  "users:messages": messagesSchema,
  "users:info": infoSchema,
};
