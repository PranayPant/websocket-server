import WebSocket from "ws";
import http from "http";
import * as dotenv from "dotenv";
import * as Redis from "redis";
import { WebsocketRequestResponse } from "types/socket";
import { geoAdd, geoSearch } from "interface/user";
import { connect } from "interface/init";
import { RedisGeoMember, RedisGeoSearchResult } from "types/redis";

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
          case "ready-to-search": {
            if (!SUBSCRIBERS.get(member)) {
              SUBSCRIBERS.set(member, global.redis.duplicate());
            }
            const success = await geoAdd(json.data as RedisGeoMember);
            const nearestUsers = await geoSearch(member, 2000, "km");
            nearestUsers?.forEach((u) =>
              SUBSCRIBERS.set(u.member, global.redis.duplicate())
            );
            socket.send(
              success
                ? `User ${member} is ready to search!`
                : `Error: Failed to initialize search for user ${member}`
            );
            break;
          }
          case "searching-positions":
            {
              if (!SUBSCRIBERS.size) {
                socket.send(`Error: No active users found.`);
                break;
              }
              const ret = await geoSearch(member, 2000, "km");
              if (!ret) {
                socket.send(
                  `Error: Failed to find any users near user ${member}`
                );
                break;
              }
              socket.send(
                `User ${member}, we found ${ret.length - 1} users near you!`
              );
              const userChannel = SUBSCRIBERS.get(member);
              if (!userChannel) {
                socket.send(`Error: User ${member} is not logged in.`);
                break;
              }
              const subscribePromises = ret.map((r) => {
                return userChannel.subscribe(r.member, (message) => {
                  socket.send(
                    `User ${member}: Hi user ${r.member}! You sent '${message}'`
                  );
                });
              });
              await userChannel.connect();
              await Promise.all(subscribePromises);
            }
            break;
          case "changing-position":
            {
              if (!SUBSCRIBERS.size) {
                socket.send(`No users online to receive this message!`);
              }
              global.redis.publish(
                json.data.member,
                `User ${json.data.member} updated his position.`
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
