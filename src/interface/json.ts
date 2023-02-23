export async function jsonSet(key: string, json: any): Promise<boolean> {
  let success = true;
  try {
    const result = await global.redis.json.get(key);
    if (!result) {
      await global.redis.json.set(key, "$", {data: []});
    }
    await global.redis.json.arrAppend(key, "$.data", json);
  } catch (e) {
    console.log('Error inserting json document:', e)
    success = false;
  }
  return success;
}
