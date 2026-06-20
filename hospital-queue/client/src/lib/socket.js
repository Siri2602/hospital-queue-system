import { io } from "socket.io-client";
import { API_BASE } from "./api";

let socket;

export function getSocket() {
  if (!socket) {
    socket = io(API_BASE, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  }
  return socket;
}
