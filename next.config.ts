import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // nodemailer usa funzioni di rete di Node: lo escludiamo dal bundling così
  // l'invio PEC (SMTP) funziona correttamente sul server.
  serverExternalPackages: ["nodemailer"],
};

export default nextConfig;
