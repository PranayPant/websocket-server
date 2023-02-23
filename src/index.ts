import WebSocket from "ws";
import http from "http";
import * as dotenv from "dotenv";
import * as Redis from "redis";
import { nanoid } from "nanoid";
import { WebsocketRequestResponse } from "types/messages";
import { jsonSet } from "interface/json";
import { connect, createUserIndices } from "interface/init";

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

async function main() {
  await connect();
  await createUserIndices(["users:messages", "users:info"]);
  const wss = new WebSocket.Server({
    server: httpServer,
  });
  wss.on("connection", (socket: WebSocket.WebSocket) => {
    socket.send("You just connected to a WebSocket server!");
    socket.on("message", async (message: string) => {
      try {
        const json = JSON.parse(message) as WebsocketRequestResponse;
        const key = `${json.type}:${json.id}`;
        const success = await jsonSet(key, json.data);
        socket.send(
          success ? "Message received :)" : "Could not process message :("
        );
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
