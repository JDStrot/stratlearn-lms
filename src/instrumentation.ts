import type { Instrumentation } from "next";

export function register() {}

/** Every server error (pages, server actions, API routes) goes to error alerts. */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { reportError } = await import("./lib/alerts");
    const e = err as Error & { digest?: string };
    await reportError({
      source: "server",
      message: `${e?.name ?? "Error"}: ${e?.message ?? String(err)}`,
      path: request.path,
      details: {
        method: request.method,
        route: context.routePath,
        kind: context.routeType,
        digest: e?.digest,
        stack: e?.stack?.split("\n").slice(0, 6).join("\n"),
      },
    });
  }
};
