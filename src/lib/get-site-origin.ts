import "server-only";
import { headers } from "next/headers";

// Not a Server Action ("use server") — used from both Server Components
// (e.g. displaying the LINE webhook URL) and Server Actions (e.g. building
// email redirect links), and only Server Actions can be called as plain
// functions from a Server Component without going through a form/transition.
export async function getSiteOrigin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol = host?.startsWith("localhost") || host?.startsWith("127.0.0.1") ? "http" : "https";
  return `${protocol}://${host}`;
}
