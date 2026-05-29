import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { InvoicesProvider } from "@/lib/store";
import { SettingsProvider } from "@/lib/settings";
import { AuthProvider } from "@/lib/auth";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Sollecita — Solleciti di pagamento automatici",
  description:
    "Software per PMI italiane: solleciti automatici, legali e conformi per farti pagare le fatture in ritardo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={`${poppins.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <AuthProvider>
          <SettingsProvider>
            <InvoicesProvider>{children}</InvoicesProvider>
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
