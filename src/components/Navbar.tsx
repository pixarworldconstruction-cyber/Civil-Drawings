import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { UserProfile } from '../types';
import { LogOut, User, LayoutDashboard, Home as HomeIcon } from 'lucide-react';

interface NavbarProps {
  user: UserProfile | null;
  onNavigate: (page: string) => void;
  currentPage: string;
}

export default function Navbar({ user, onNavigate, currentPage }: NavbarProps) {
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      onNavigate('home');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate('home')}>
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">CD</div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">Civil Drawings</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => onNavigate('home')} className={`text-sm font-medium ${currentPage === 'home' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-900'}`}>Home</button>
            <button onClick={() => onNavigate('products')} className={`text-sm font-medium ${currentPage === 'products' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-900'}`}>Products</button>
            <button onClick={() => onNavigate('about')} className={`text-sm font-medium ${currentPage === 'about' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-900'}`}>About</button>
            <button onClick={() => onNavigate('pricing')} className={`text-sm font-medium ${currentPage === 'pricing' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-900'}`}>Pricing</button>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <button
                  onClick={() => onNavigate(user.role === 'admin' ? 'admin-dashboard' : 'dashboard')}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors"
                >
                  <LayoutDashboard size={18} />
                  Dashboard
                </button>
                <div className="h-8 w-px bg-gray-200"></div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700">
                    <User size={16} />
                  </div>
                  <span className="text-sm font-medium text-gray-700 hidden sm:inline">{user.displayName || user.email}</span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  title="Sign Out"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => onNavigate('auth')}
                className="bg-indigo-600 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-indigo-700 transition-all shadow-sm hover:shadow-md"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
