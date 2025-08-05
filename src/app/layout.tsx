import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
// Removed Google font to avoid build-time download issues
// Using system sans-serif stack instead


export const metadata: Metadata = {
  title: 'in3D - Máy tính chi phí in 3D',
  description: 'Tải lên tệp STL của bạn để tính toán khối lượng và ước tính chi phí in.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={`antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
