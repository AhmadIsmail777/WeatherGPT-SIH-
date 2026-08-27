import { request } from "./api";

export async function sendChatMessage(message, coordinates, language = "en") {
  return request("/api/v1/chat", {
    method: "POST",
    body: JSON.stringify({ message, ...coordinates, language }),
  });
}
