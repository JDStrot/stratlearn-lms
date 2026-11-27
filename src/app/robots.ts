import type { MetadataRoute } from "next";

/** Keep search engines out of private areas. Shared badge pages stay findable. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: ["/admin", "/api", "/play", "/learn", "/answer", "/q/", "/files", "/tablet", "/auth", "/verify"],
    },
  };
}
