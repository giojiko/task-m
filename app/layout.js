import './globals.css';
import { AppProvider } from '@/context/AppContext';

export const metadata = {
  title: 'SmartPro — მართვის პლატფორმა',
  description: 'SmartPro Management Platform',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ka">
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
