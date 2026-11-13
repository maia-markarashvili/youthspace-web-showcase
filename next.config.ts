import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* PGlite (ლოკალური dev ბაზა) WASM-ს იყენებს — bundling-ის გარეშე უნდა დარჩეს. */
  serverExternalPackages: ["@electric-sql/pglite"],
  experimental: {
    serverActions: {
      /* default 1MB იყო და admin-ის ატვირთვებს ჭრიდა (PDF ≤15MB, ფოტო ≤5MB —
         ლიმიტები upload-actions.ts-შია); +1MB multipart-გარსისთვის */
      bodySizeLimit: "16mb",
    },
    /* ⚠ proxy.ts-ის (matcher: /admin/:path*) გამო Next ატვირთვის body-ს კლონირებს
       და **ცალკე**, ნაგულისხმევი 10MB-ით ჭრის - serverActions-ის bodySizeLimit
       ამას არ ცვლის. 10MB-ზე დიდი PDF (მაგ. კვლევის ანგარიში)
       admin-ში ჩუმად იჭრებოდა, multipart-ის დამუშავება ვარდებოდა და
       მომხმარებელი მხოლოდ ზოგად „ატვირთვა ვერ მოხერხდა"-ს ხედავდა.
       bodySizeLimit-ის ტოლი ლიმიტი ამ ხარვეზს ხურავს. */
    proxyClientMaxBodySize: "16mb",
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          /* iframe-ჩასმის აკრძალვა (clickjacking, განსაკუთრებით /admin) —
             ორივე სათაური ძველი+ახალი ბრაუზერების დასაფარად */
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'",
          },
          /* ბრაუზერმა Content-Type არ „გამოიცნოს" (MIME sniffing) */
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          /* ⚠ განზრახ includeSubDomains-ის გარეშე — mail.youthspace.ge
             (webmail) HTTPS-ზე იძულებას ვერ გაუძლებდა */
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
