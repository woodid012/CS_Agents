import './globals.css';
import NavBar from '../components/NavBar';

export const metadata = {
  title: 'CS Capital - CRM Dashboard',
  description: 'Internal CRM dashboard for managing bidder engagement and development pipeline',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <header className="bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-5">
            {/* Logo mark + wordmark */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm tracking-tight">CS</span>
              </div>
              <div>
                <div className="text-white font-bold text-sm leading-tight tracking-tight">CS Capital</div>
                <div className="text-slate-400 text-[9px] leading-tight tracking-widest uppercase">Renewable Energy Advisory</div>
              </div>
            </div>
            {/* Divider */}
            <div className="h-6 w-px bg-slate-700 shrink-0" />
            {/* Nav */}
            <NavBar />
          </div>
        </header>
        <main className="px-6 py-5">{children}</main>
      </body>
    </html>
  );
}
