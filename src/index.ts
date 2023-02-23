import WebSocket from "ws";
import http from "http";
import * as dotenv from "dotenv";
import * as Redis from "redis";
import { WebsocketRequestResponse } from "types/socket";
import { geoAdd, geoSearch } from "interface/user";
import { connect } from "interface/init";
import { RedisGeoMember } from "types/redis";

dotenv.config();

const httpServer = http.createServer(function (request, response) {
  console.log(new Date() + " Received request for " + request.url);
  response.writeHead(404);
  response.end();
});
httpServer.listen(process.env.PORT || 3001, function () {
  console.log(
    new Date(),
    "Server is listening on port",
    process.env.SERVER_PORT
  );
});

declare global {
  var redis: Redis.RedisClientType;
}

const SUBSCRIBERS: Map<string, Redis.RedisClientType> = new Map<
  string,
  Redis.RedisClientType
>();

async function main() {
  await connect();
  const wss = new WebSocket.Server({
    server: httpServer,
  });
  wss.on("connection", (socket: WebSocket.WebSocket) => {
    socket.send("You just connected to a WebSocket server!");
    socket.on("message", async (message: string) => {
      try {
        const json = JSON.parse(message) as WebsocketRequestResponse;
        const type = json.type;
        const member = json.data.member as string;
        switch (type) {
          case "init":
            {
              if (!SUBSCRIBERS.get(member)) {
                SUBSCRIBERS.set(member, global.redis.duplicate());
              }
              let addSuccess = await geoAdd(json.data as RedisGeoMember);
              if (!addSuccess) {
                socket.send("Error: Failed to initialize position");
                break;
              }
              socket.send("Successfully initialized position!");
              const ret = await geoSearch(member, 2000, "km");
              if (ret) {
                socket.send(`Found ${ret.length - 1} users near you!`);
                const userChannel = SUBSCRIBERS.get(member);
                const subscribePromises = ret.map((r) => {
                  return userChannel?.subscribe(r.member, (message) => {
                    console.log(
                      "User",
                      member,
                      `received a message from ${r.member}:`,
                      `'${message}'`
                    );
                  });
                });
                await userChannel?.connect();
                await Promise.all(subscribePromises);
              }
            }
            break;
          case "position":
            {
              global.redis.publish(
                json.data.member,
                `${json.data.member} updated his position.`
              );
            }
            break;
          default:
            console.log("Error: Cannot handle message of type", type);
        }
      } catch (e) {
        socket.send("Malformed payload");
      }
    });
  });
  wss.on("close", (code: number, reason: string) => {
    console.log("Connection closed:", code, reason);
  });
}

main();
