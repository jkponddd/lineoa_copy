import { notFound } from "next/navigation";

// A fully unmatched path (e.g. /th/this-page-does-not-exist) never
// actually reaches any page.tsx, so Next.js can't know to use this
// segment's own not-found.tsx — it falls back to the framework's generic,
// unstyled 404 instead. This catch-all route exists purely so the request
// DOES match something within [locale], which can then call notFound()
// explicitly and correctly trigger ../not-found.tsx.
export default function CatchAll() {
  notFound();
}
