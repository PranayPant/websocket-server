import WebSocket from "ws";
import http from "http";
import * as dotenv from "dotenv";
import * as Redis from "redis";
import { userSchema } from "./schemas/users";
import { nanoid } from "nanoid";
import { WebsocketMessage } from "./types/messages";
import { jsonSet } from "interface/json";
import { connect } from "interface/init";

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
  await connect()
  const wss = new WebSocket.Server({
    server: httpServer,
  });
  wss.on("connection", (socket: WebSocket.WebSocket) => {
    socket.send("You just connected to a WebSocket server!");
    socket.on("message", async (message: string) => {
      try {
        const json = JSON.parse(message) as WebsocketMessage;
        const key = `${json.type}:${json.data.id}`;
        socket.send("Recieved message, please wait for a response...")
        await jsonSet(key, json)
        socket.send(`You sent '${json.data.message}'`);
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
