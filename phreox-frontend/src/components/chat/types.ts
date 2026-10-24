import type { groups } from "../../data/groups.ts";
import type { users } from "../../data/users.ts";

export type UserData = (typeof users)[number];
export type GroupData = (typeof groups)[number];

export type ChatMessage = {
  id: string;
  chatId: string;
  userId: string;
  text: string;
  timestamp: string;
  files?: File[];
  gif?: string;
};

export type Draft = {
  text: string;
  files: File[];
  gif?: string;
};
