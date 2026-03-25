import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Building2, CheckCircle2, ArrowRight, Shield, Clock, Users, Layout, Box, FileText, Loader2 } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { PageContent } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface HomeProps {
  onNavigate: (page: string) => void;
  currentPage?: string;
}

const DEFAULT_CONTENT: PageContent = {
  id: 'main',
  heroTitle: 'Modernizing Civil Engineering Documentation',
  heroSubtitle: 'A specialized platform for designer companies and civil construction contractors to manage, share, and track project drawings and site progress in real-time.',
  heroSlides: [
    'https://images.unsplash.com/photo-1503387762-592dee58c460?auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1541888946425-d81bb19480c5?auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1590348697170-71744960c4f3?auto=format&fit=crop&q=80'
  ],
  features: [
    { icon: 'Shield', title: 'Secure Storage', desc: 'Your drawings and site images are stored with enterprise-grade security.' },
    { icon: 'Clock', title: 'Real-time Updates', desc: 'Instant sync between designers and contractors on the field.' },
    { icon: 'Users', title: 'Role-based Access', desc: 'Granular permissions for admins, designers, and contractors.' }
  ],
  productsTitle: 'Digital Drawing Management',
  productsDesc: 'Our core product allows contractors to carry their entire project library in their pocket. No more bulky paper drawings or outdated versions on site.',
  productsItems: [
    "Version control for all civil drawings",
    "Instant site photo documentation",
    "Offline access to critical documents",
    "Automated progress reports"
  ],
  products: [],
  aboutTitle: 'Our Mission',
  aboutDesc: 'Civil Drawings was founded with a simple goal: to bridge the gap between the design office and the construction site. We believe that clear communication and real-time documentation are the keys to successful civil engineering projects.',
  pricingTitle: 'Simple, transparent plans',
  pricingSubtitle: 'Choose the plan that best fits your project requirements.',
  constructionPricingPlans: [
    {
      name: 'Contractor',
      price: '₹4,000',
      period: 'per month',
      features: ['Unlimited project uploads', 'Mobile app access', 'Real-time collaboration'],
      buttonText: 'Start Free Trial'
    }
  ],
  interiorPricingPlans: [
    {
      name: 'Enterprise (Designer)',
      price: '₹15,000',
      period: 'per month',
      features: ['Full admin dashboard', 'Manage all contractors', 'Advanced analytics'],
      buttonText: 'Contact Sales',
      isPopular: true
    }
  ]
};

export default function Home({ onNavigate, currentPage }: HomeProps) {
  const { t, formatNumber } = useLanguage();
  const [content, setContent] = useState<PageContent>(DEFAULT_CONTENT);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const docRef = doc(db, 'siteContent', 'main');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setContent({
            ...DEFAULT_CONTENT,
            ...data,
            features: data.features || DEFAULT_CONTENT.features,
            productsItems: data.productsItems || DEFAULT_CONTENT.productsItems,
            heroSlides: data.heroSlides || DEFAULT_CONTENT.heroSlides,
          });
        }
      } catch (error) {
        console.error('Error fetching content:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, []);

  useEffect(() => {
    if (currentPage === 'about') {
      const element = document.getElementById('about');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (currentPage === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentPage]);

  useEffect(() => {
    if (content.heroSlides.length > 1) {
      const timer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % content.heroSlides.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [content.heroSlides]);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Shield': return <Shield className="text-indigo-600" />;
      case 'Clock': return <Clock className="text-indigo-600" />;
      case 'Users': return <Users className="text-indigo-600" />;
      case 'Layout': return <Layout className="text-indigo-600" />;
      case 'Box': return <Box className="text-indigo-600" />;
      case 'FileText': return <FileText className="text-indigo-600" />;
      default: return <Building2 className="text-indigo-600" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-slate-900 py-24 sm:py-32 min-h-[80vh] flex items-center">
        {/* Background Carousel */}
        <div className="absolute inset-0 z-0">
          {content.heroSlides.map((slide, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0 }}
              animate={{ opacity: currentSlide === index ? 0.4 : 0 }}
              transition={{ duration: 1 }}
              className="absolute inset-0"
            >
              <img
                src={slide || undefined}
                alt=""
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          ))}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-5xl font-bold tracking-tight text-white sm:text-7xl leading-tight">
                {content.heroTitle.split(' ').map((word, i) => 
                  word.toLowerCase() === 'civil' || word.toLowerCase() === 'engineering' ? 
                  <span key={i} className="text-indigo-400">{word} </span> : word + ' '
                )}
              </h1>
              <p className="mt-6 text-lg leading-8 text-slate-300 max-w-xl">
                {content.heroSubtitle}
              </p>
              <div className="mt-10 flex items-center gap-x-6">
                <button
                  onClick={() => onNavigate('pricing')}
                  className="rounded-full bg-indigo-600 px-8 py-4 text-lg font-semibold text-white shadow-lg hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-all"
                >
                  {t('getStarted')}
                </button>
                <button onClick={() => onNavigate('about')} className="text-lg font-semibold leading-6 text-white flex items-center gap-2">
                  {t('learnMore')} <ArrowRight size={20} />
                </button>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="relative hidden lg:block"
            >
              <div className="bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/20 shadow-2xl">
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-indigo-500 p-3 rounded-2xl text-white">
                    <CheckCircle2 size={32} />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-white">{formatNumber(1200)}+ {t('projects')}</p>
                    <p className="text-indigo-200">{t('managedSuccessfully')}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '85%' }}
                      transition={{ duration: 1.5, delay: 0.5 }}
                      className="h-full bg-indigo-500"
                    ></motion.div>
                  </div>
                  <div className="flex justify-between text-sm text-indigo-200">
                    <span>{t('efficiencyRate')}</span>
                    <span className="font-bold text-white">85%</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 sm:py-32 max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-base font-semibold leading-7 text-indigo-600">{t('efficiencyFirst')}</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{t('everythingYouNeed')}</p>
        </div>
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-12">
          {content.features.map((feature, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -5 }}
              className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all"
            >
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-6">
                {getIcon(feature.icon)}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{feature.title}</h3>
              <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Products Section */}
      <div id="products" className="py-24 sm:py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <img
                src="https://picsum.photos/seed/blueprint/800/600"
                alt="Digital Blueprints"
                className="rounded-2xl shadow-xl"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl mb-6">
                {content.productsTitle}
              </h2>
              <p className="text-lg text-slate-600 mb-8">
                {content.productsDesc}
              </p>
              <ul className="space-y-4">
                {content.productsItems.map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-700 font-medium">
                    <CheckCircle2 size={20} className="text-indigo-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div id="about" className="py-24 sm:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="bg-indigo-600 rounded-3xl p-12 lg:p-20 relative overflow-hidden">
            <div className="relative z-10 max-w-2xl">
              <h2 className="text-3xl font-bold text-white sm:text-4xl mb-6">{content.aboutTitle}</h2>
              <p className="text-indigo-100 text-lg leading-relaxed mb-8">
                {content.aboutDesc}
              </p>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-4xl font-bold text-white">99.9%</p>
                  <p className="text-indigo-200 text-sm">{t('uptimeReliability')}</p>
                </div>
                <div>
                  <p className="text-4xl font-bold text-white">24/7</p>
                  <p className="text-indigo-200 text-sm">{t('expertSupport')}</p>
                </div>
              </div>
            </div>
            <div className="absolute right-0 top-0 h-full w-1/3 bg-white/10 -skew-x-12 translate-x-1/2"></div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white font-bold">CD</div>
            <span className="font-bold text-slate-900">{t('civilDrawings')}</span>
          </div>
          <p className="text-slate-500 text-sm">© 2026 {t('civilDrawings')} Inc. {t('allRightsReserved')}.</p>
          <div className="flex gap-6 text-slate-400">
            <a href="#" className="hover:text-indigo-600">{t('privacy')}</a>
            <a href="#" className="hover:text-indigo-600">{t('terms')}</a>
            <a href="#" className="hover:text-indigo-600">{t('contact')}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
