import { randomUUID } from "node:crypto";

const now = Date.now();

export const memoryStore = {
  users: [],
  conversations: [],
  alerts: [],
};

export function makeMemoryUser(fields) {
  return { id: randomUUID(), ...fields, createdAt: new Date(), updatedAt: new Date() };
}
