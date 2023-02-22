import { RediSearchSchema, SchemaFieldTypes } from "redis";

export const userSchema: RediSearchSchema = {
  "$.name": {
    type: SchemaFieldTypes.TEXT,
    SORTABLE: true,
  },
  "$.age": {
    type: SchemaFieldTypes.NUMERIC,
    AS: "age",
  },
  "$.email": {
    type: SchemaFieldTypes.TAG,
    AS: "email",
  },
};