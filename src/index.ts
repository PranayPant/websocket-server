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

function format(type: string, data: any) {
  return JSON.stringify({ type, data });
}

async function main() {
  await connect();
  const wss = new WebSocket.Server({
    server: httpServer,
  });
  wss.on("connection", (socket: WebSocket.WebSocket) => {
    socket.send(format("connect", "You just connected to a WebSocket server!"));
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
            if (!success) throw Error(`Failed to initialize user ${member}`);
            const nearestUsers = await geoSearch(
              member,
              json.data.radius,
              json.data.radiusUnit
            );
            nearestUsers?.forEach((u) =>
              SUBSCRIBERS.set(u.member, global.redis.duplicate())
            );
            socket.send(
              format("initialized-user", `User ${member} is ready to search!`)
            );
            break;
          }
          case "searching-positions":
            {
              if (!SUBSCRIBERS.size) {
                throw Error(`Error: No users exist at this time.`);
              }
              const userChannel = SUBSCRIBERS.get(member);
              const ret = await geoSearch(
                member,
                json.data.radius,
                json.data.radiusUnit
              );
              if (!ret) {
                throw Error(
                  `Error: Failed to find any users near user ${member}`
                );
              }
              socket.send(format("nearby-users", ret));
              if (!userChannel) {
                throw Error(`Error: User ${member} is not logged in.`);
              }
              if (userChannel?.isOpen) break;
              const subscribePromises = ret.map((r) => {
                return userChannel.subscribe(r.member, (message) => {
                  socket.send(format("user-message", message));
                });
              });
              await userChannel.connect();
              await Promise.all(subscribePromises);
            }
            break;
          case "changing-position":
            {
              if (!SUBSCRIBERS.size) {
                throw Error("No users registered in your area");
              }
              global.redis.publish(
                json.data.member,
                JSON.stringify({ data: json.data, action: "position-change" })
              );
            }
            break;
          default:
            console.log("Error: Cannot handle message of type", type);
        }
      } catch (e) {
        console.error(e);
        socket.send(format("error", e));
      }
    });
  });
  wss.on("close", (code: number, reason: string) => {
    console.log("Connection closed:", code, reason);
  });
}

main();
