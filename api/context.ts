import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { jwtVerify } from "jose";
import { getDb } from "./queries/connection";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import { JWT_SECRET } from "./lib/jwtSecret";

export type UserContext = {
  id: number;
  email: string;
  name: string | null;
  role: string;
  avatar: string | null;
};

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: UserContext;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const token = opts.req.headers.get("authorization")?.replace("Bearer ", "");
  let user: UserContext | undefined;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET, { clockTolerance: 60 });
      const userId = payload.sub ? Number(payload.sub) : 0;
      if (userId > 0) {
        const db = getDb();
        const dbUser = await db.query.users.findFirst({
          where: eq(users.id, userId),
        });
        if (dbUser) {
          user = {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            role: dbUser.role,
            avatar: dbUser.avatar,
          };
        }
      }
    } catch { /* invalid token */ }
  }

  return { req: opts.req, resHeaders: opts.resHeaders, user };
}
