/** What the service answers to the dashboard. */

export type Overview = { accounts: number; newAccounts7d: number; spaces: number; news: number; roles: number; superAdmins: number };
export type Row = { id: string; username: string; createdAt: number; flags: string[]; roles: string[]; mfaEnabled: boolean; badges: string[] };
export type Role = { name: string; flags: string[]; createdAt: number };
export type Audit = { id: string; at: number; actor: string; action: string; detail: string };
export type Catalog = { flags: string[]; categories: string[]; badges: string[] };
export type System = { startedAt: number; uptimeMillis: number; java: string; os: string; processors: number; heapUsed: number; heapMax: number; accounts: number; spaces: number; spaceMembers: number; spaceMessages: number; spaceInvites: number; bots: number; badgeGrants: number; mfaAccounts: number };
export type SpaceRow = { id: string; name: string; ownerId: string; owner: string; visibility: string; listed: boolean; applicationsOpen: boolean; members: number; channels: number; volt?: number; level?: number; createdAt: number; updatedAt: number };
export type Queue = { reportsOpen: number; reportsReview: number; ticketsOpen: number; ticketsMine: number; reportsMine: number; decorationsPending?: number };
export type Standing = { accountId: string; status: "" | "suspended" | "banned"; warnings: number };

export type ClusterNode = { url: string; self: boolean; healthy: boolean; leaving: boolean; streams: number; heap: number; weight: number; score: number; position: number; cursor: number; lag: number };
export type ClusterStatus = { enabled: boolean; url: string; node: string; position: number; nodes: ClusterNode[]; roots: string[]; conflicts: string[] };

export const tabs = ["overview", "reports", "tickets", "creator", "accounts", "testers", "spaces", "roles", "news", "audit", "database", "cluster", "system", "settings"] as const;
export type Tab = (typeof tabs)[number];

/** Something another part of the dashboard asks a page to open (the search, a button of the overview). */
export type Intent = "add-node" | "new-token" | "new-post" | "new-role";

export function duration(millis: number, lang: string) {
  const minutes = Math.floor(millis / 60_000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const unit = lang === "de" ? ["T", "Std", "Min"] : ["d", "h", "min"];

  return days > 0 ? `${days} ${unit[0]} ${hours} ${unit[1]}` : hours > 0 ? `${hours} ${unit[1]} ${minutes % 60} ${unit[2]}` : `${minutes} ${unit[2]}`;
}

export function megabytes(bytes: number) {
  return `${Math.round(bytes / 1_048_576)} MB`;
}

/** The name of a service without the scheme, as it is shown in small places. */
export function hostOf(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
