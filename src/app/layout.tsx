import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Academic ERP & OBE Attainment SaaS Platform',
  description:
    'Commercial Multi-Tenant Academic ERP and Outcome-Based Education (OBE) Attainment Engine tailored for ABET, NBA, NAAC, and UGC autonomous accreditation.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#090d16] text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
