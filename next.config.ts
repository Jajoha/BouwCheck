import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // BouwCheck gebruikt het klassieke (dynamische) rendermodel: vrijwel elke pagina
  // is gebruikersafhankelijk en leest uit de database.
  cacheComponents: false,
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
