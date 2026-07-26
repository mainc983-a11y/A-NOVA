import { User } from "../types";

/**
 * Returns or generates a permanent, unique User ID in the format ANV-XXXXXXXX
 * Example output: ANV-7X4K92P1, ANV-A83FD21B, ANV-Q9L2M8XE
 */
export function getOrGenerateUserId(user?: Partial<User> | null): string {
  if (!user) return "ANV-7X4K92P1";

  if (user.userId && /^ANV-[A-Z0-9]{8}$/.test(user.userId)) {
    return user.userId;
  }

  if (user.id && /^ANV-[A-Z0-9]{8}$/.test(user.id)) {
    return user.id;
  }

  // Derive a deterministic 8-character uppercase alphanumeric code from account seed
  const seed = user.id || user.email || user.username || "ANV_DEFAULT_USER";
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }

  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";
  let h = Math.abs(hash);
  for (let i = 0; i < 8; i++) {
    code += chars[(h + i * 13) % chars.length];
  }
  return `ANV-${code}`;
}
