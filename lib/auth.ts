import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";

export async function requireUserId(): Promise<string> {
  const authResult = await auth();

  if (authResult.userId) {
    return authResult.userId;
  }

  const requestHeaders = await headers();
  const devUserId = requestHeaders.get("x-user-id") ?? process.env.DEV_USER_ID;

  if (devUserId) {
    return devUserId;
  }

  throw new Error("Unauthorized: sign in with Clerk or provide x-user-id/DEV_USER_ID in development.");
}
