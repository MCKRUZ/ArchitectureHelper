import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { CopilotKitProvider } from '@/components/providers/CopilotKitProvider';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AzureCraft - AI-Powered Azure Architecture Designer',
  description:
    'Design Azure architecture with AI. Describe what you need and watch it build visually in real-time.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <CopilotKitProvider>{children}</CopilotKitProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
