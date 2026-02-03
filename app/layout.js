import './globals.css';
import NavBar from '../components/NavBar';

export const metadata = {
  title: 'CS Capital - CRM Dashboard',
  description: 'Internal CRM dashboard for managing bidder engagement and development pipeline',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-gray-900">CS Capital</h1>
            <NavBar />
          </div>
        </header>
        <main className="px-6 py-4">{children}</main>
      </body>
    </html>
  );
}
