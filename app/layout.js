import './globals.css';
import { AppProvider } from '@/context/AppContext';

export const metadata = {
  title: 'SmartPro — მართვის პლატფორმა',
  description: 'SmartPro Georgia — სმარტ სისტემების მართვა',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ka">
      <head>
        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0D1117" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* iOS PWA */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SmartPro" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />

        {/* Viewport — mobile app feel */}
        <meta name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />

        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" sizes="any" />

        {/* Service Worker */}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js')
                .catch(function(e) { console.warn('SW:', e); });
            });
          }
        `}} />
      </head>
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
