import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Loader2, ArrowRight, FileDown, Clock } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { PageContent, PricingPlan } from '../types';

interface PricingProps {
  onNavigate: (page: string) => void;
  onSelectPlan: (plan: PricingPlan) => void;
}

const DEFAULT_CONTENT: PageContent = {
  id: 'main',
  heroTitle: 'Transform Your Vision Into Reality',
  heroSubtitle: 'Professional architectural design and 3D visualization services tailored to your unique needs.',
  heroSlides: [],
  features: [],
  productsTitle: 'Our Services',
  productsDesc: 'Explore our range of professional architectural and design services.',
  productsItems: [],
  products: [],
  aboutTitle: 'About Our Studio',
  aboutDesc: 'With over 15 years of experience, we specialize in creating sustainable and innovative architectural solutions.',
  pricingTitle: 'Simple, Transparent Pricing',
  pricingSubtitle: 'Choose the plan that best fits your project requirements.',
  offerTitle: 'Limited Time Offer!',
  offerDescription: 'Get an additional 10% off on all Construction Design Packages this week.',
  offerExpiryDate: '2026-03-30',
  constructionPricingPlans: [
    {
      name: 'Basic',
      price: '₹15,000',
      period: 'per project',
      features: ['Initial Consultation', 'Basic 2D Floor Plan', 'Single 3D View', '1 Revision'],
      buttonText: 'Get Started',
      discountLabel: 'Save 10%'
    },
    {
      name: 'Standard',
      price: '₹45,000',
      period: 'per project',
      features: ['Detailed Consultation', 'Full 2D Drawings', '3 High-Quality 3D Views', '3 Revisions', 'Material Selection'],
      buttonText: 'Choose Standard',
      isPopular: true,
      discountLabel: 'Save 15%'
    }
  ],
  interiorPricingPlans: [
    {
      name: 'Essential',
      price: '₹25,000',
      period: 'per room',
      features: ['Mood Board', 'Furniture Layout', 'Color Palette', '2 Revisions'],
      buttonText: 'Get Started'
    },
    {
      name: 'Full Design',
      price: '₹75,000',
      period: 'per project',
      features: ['Complete Interior Set', '3D Renderings', 'Material Specs', 'Site Visits'],
      buttonText: 'Choose Full Design',
      isPopular: true
    }
  ]
};

export default function Pricing({ onNavigate, onSelectPlan }: PricingProps) {
  const [content, setContent] = useState<PageContent>(DEFAULT_CONTENT);
  const [loading, setLoading] = useState(true);

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
            constructionPricingPlans: data.constructionPricingPlans || DEFAULT_CONTENT.constructionPricingPlans,
            interiorPricingPlans: data.interiorPricingPlans || DEFAULT_CONTENT.interiorPricingPlans,
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  const PricingCard = ({ plan }: { plan: PricingPlan }) => (
    <div 
      className={`p-8 rounded-3xl border transition-all relative ${
        plan.isPopular 
          ? 'bg-indigo-600 border-indigo-400 shadow-2xl scale-105 z-10' 
          : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-lg'
      }`}
    >
      {plan.discountLabel && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-1 rounded-full text-xs font-bold shadow-lg">
          {plan.discountLabel}
        </div>
      )}
      <h3 className={`font-bold text-xl ${plan.isPopular ? 'text-white' : 'text-slate-900'}`}>{plan.name}</h3>
      <div className="mt-4 flex items-baseline gap-2">
        {plan.originalPrice && (
          <span className={`text-lg line-through ${plan.isPopular ? 'text-indigo-200/60' : 'text-slate-400'}`}>
            {plan.originalPrice}
          </span>
        )}
        <p className={`${plan.isPopular ? 'text-white' : 'text-indigo-600'} text-4xl font-bold`}>
          {plan.price}
          <span className={`text-lg font-normal ml-1 ${plan.isPopular ? 'text-indigo-200' : 'text-slate-400'}`}>
            /{plan.period === 'per month' ? 'mo' : plan.period === 'per room' ? 'room' : 'project'}
          </span>
        </p>
      </div>
      <ul className={`mt-8 space-y-4 ${plan.isPopular ? 'text-indigo-50' : 'text-slate-600'}`}>
        {plan.features.map((feature, fi) => (
          <li key={fi} className="flex items-center gap-2">
            <CheckCircle2 size={18} className={plan.isPopular ? 'text-white' : 'text-indigo-600'} />
            {feature}
          </li>
        ))}
      </ul>
      
      <div className="mt-8 space-y-3">
        {plan.samplePdfUrl && (
          <a 
            href={plan.samplePdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center justify-center gap-2 w-full py-2 rounded-xl text-sm font-semibold border transition-all ${
              plan.isPopular 
                ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' 
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileDown size={16} /> Sample PDF
          </a>
        )}
        <button 
          onClick={() => onSelectPlan(plan)} 
          className={`w-full py-3 rounded-xl font-bold transition-colors ${
            plan.isPopular 
              ? 'bg-slate-900 text-white hover:bg-slate-800' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {plan.buttonText}
        </button>
      </div>
    </div>
  );

  return (
    <div className="bg-slate-50 min-h-screen py-24 sm:py-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Offer Banner */}
        {content.offerTitle && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-16 bg-indigo-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl"
          >
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
              <div>
                <h3 className="text-2xl font-bold mb-2">{content.offerTitle}</h3>
                <p className="text-indigo-100">{content.offerDescription}</p>
              </div>
              {content.offerExpiryDate && (
                <div className="flex items-center gap-3 bg-white/10 px-6 py-3 rounded-2xl backdrop-blur-sm border border-white/20">
                  <Clock size={24} className="text-indigo-200" />
                  <div>
                    <p className="text-xs text-indigo-200 uppercase font-bold">Offer Ends On</p>
                    <p className="font-bold">{content.offerExpiryDate}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="absolute right-0 top-0 h-full w-1/4 bg-white/10 -skew-x-12 translate-x-1/2"></div>
          </motion.div>
        )}

        <div className="text-center mb-20">
          <motion.h2 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-indigo-600 font-bold tracking-wide uppercase text-sm"
          >
            Pricing Plans
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-2 text-4xl font-bold text-slate-900 sm:text-5xl tracking-tight"
          >
            {content.pricingTitle}
          </motion.p>
          <motion.p 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto"
          >
            {content.pricingSubtitle}
          </motion.p>
        </div>

        {/* Construction Design Package */}
        <div className="mb-24">
          <div className="flex items-center gap-4 mb-12">
            <div className="h-px flex-1 bg-slate-200"></div>
            <h3 className="text-2xl font-bold text-slate-800 px-4">1. Construction Design Package</h3>
            <div className="h-px flex-1 bg-slate-200"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {content.constructionPricingPlans.map((plan, i) => (
              <PricingCard key={i} plan={plan} />
            ))}
          </div>
        </div>

        {/* Interior Design Packages */}
        <div>
          <div className="flex items-center gap-4 mb-12">
            <div className="h-px flex-1 bg-slate-200"></div>
            <h3 className="text-2xl font-bold text-slate-800 px-4">2. Interior Design Packages</h3>
            <div className="h-px flex-1 bg-slate-200"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {content.interiorPricingPlans.map((plan, i) => (
              <PricingCard key={i} plan={plan} />
            ))}
          </div>
        </div>

        <div className="mt-24 text-center">
          <p className="text-slate-500 mb-6">Need a custom solution for a large-scale project?</p>
          <button 
            onClick={() => onNavigate('auth')}
            className="inline-flex items-center gap-2 text-indigo-600 font-bold hover:text-indigo-700 transition-colors"
          >
            Contact our sales team <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
