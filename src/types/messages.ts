export type WebsocketMessageType = "users";
export interface WebsocketMessageData {
  id: string;
  date: number;
  message: string;
}
export interface WebsocketMessage {
  type: WebsocketMessageType;
  data: WebsocketMessageData;
}