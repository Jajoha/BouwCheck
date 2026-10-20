import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // BouwCheck gebruikt het klassieke (dynamische) rendermodel: vrijwel elke pagina
  // is gebruikersafhankelijk en leest uit de database.
  cacheComponents: false,
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
  poweredByHeader: false,
  // Migraties worden ook tijdens runtime gelezen (lokale demo-database, controle in Beheer)
  outputFileTracingIncludes: { "/*": ["./supabase/migrations/*.sql"] },
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
