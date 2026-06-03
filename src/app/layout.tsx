import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/app/context/AuthContext";
import { MissionProvider } from "@/app/context/MissionContext";

export const metadata: Metadata = {
  title: "CyberLab – Simulation Platform",
  description: "Cybersecurity simulation platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <AuthProvider>
          <MissionProvider>
            {children}
          </MissionProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
