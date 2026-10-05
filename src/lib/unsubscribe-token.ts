import { createHmac, timingSafeEqual } from "crypto";

export function makeToken(leadId: string): string {
  return createHmac("sha256", process.env.UNSUBSCRIBE_SECRET!)
    .update(leadId)
    .digest("hex");
}

export function verifyToken(leadId: string, token: string): boolean {
  const expected = makeToken(leadId);
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}