import { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, getDocFromServer, onSnapshot } from 'firebase/firestore';
import { UserProfile, OperationType } from './types';
import { handleFirestoreError } from './utils';
import Navbar from './components/Navbar';
import Home from './components/Home';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import Pricing from './components/Pricing';
import Products from './components/Products';
import Payment from './components/Payment';
import { Loader2 } from 'lucide-react';
import { PricingPlan } from './types';
import { LanguageProvider } from './contexts/LanguageContext';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);

  useEffect(() => {
    // Test connection to Firestore as per guidelines
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (firebaseUser) {
        unsubscribeProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), (snapshot) => {
          if (snapshot.exists()) {
            setUser(snapshot.data() as UserProfile);
          } else {
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              role: 'user',
              displayName: firebaseUser.displayName || ''
            });
          }
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
          setLoading(false);
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [dashboardTab, setDashboardTab] = useState('projects');

  const handleSelectPlan = (plan: PricingPlan) => {
    if (!user) {
      setCurrentPage('auth');
      return;
    }
    setCurrentPage('dashboard');
    setIsNewProjectModalOpen(true);
  };

  const handleAddCoins = () => {
    setSelectedPlan({
      id: 'custom-coins',
      name: 'Add Coins',
      price: '₹0',
      period: 'one time',
      features: ['Instant wallet credit', 'Use for any project', 'No expiry'],
      isPopular: false,
      buttonText: 'Add Coins'
    });
    setCurrentPage('payment');
  };

  const renderPage = () => {
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="animate-spin text-indigo-600" size={48} />
        </div>
      );
    }

    switch (currentPage) {
      case 'home':
      case 'about':
        return <Home onNavigate={setCurrentPage} currentPage={currentPage} />;
      case 'products':
        return <Products onNavigate={setCurrentPage} />;
      case 'pricing':
        return <Pricing onNavigate={setCurrentPage} onSelectPlan={handleSelectPlan} />;
      case 'payment':
        return selectedPlan ? <Payment plan={selectedPlan} onNavigate={setCurrentPage} user={user} /> : <Pricing onNavigate={setCurrentPage} onSelectPlan={handleSelectPlan} />;
      case 'auth':
        return <Auth onSuccess={() => setCurrentPage(user?.role === 'admin' ? 'admin-dashboard' : 'dashboard')} />;
      case 'dashboard':
        return user ? (
          <Dashboard 
            user={user} 
            onNavigate={setCurrentPage} 
            onAddCoins={handleAddCoins}
            isNewProjectModalOpen={isNewProjectModalOpen}
            setIsNewProjectModalOpen={setIsNewProjectModalOpen}
            currentTab={dashboardTab}
            setCurrentTab={setDashboardTab}
          />
        ) : <Auth onSuccess={() => setCurrentPage('dashboard')} />;
      case 'admin-dashboard':
        return user?.role === 'admin' ? <AdminDashboard /> : <Home onNavigate={setCurrentPage} currentPage={currentPage} />;
      default:
        return <Home onNavigate={setCurrentPage} currentPage={currentPage} />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900">
        <Navbar user={user} onNavigate={setCurrentPage} currentPage={currentPage} />
        <main>
          {renderPage()}
        </main>
      </div>
    </ErrorBoundary>
  );
}
