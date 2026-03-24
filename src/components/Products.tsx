import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { PageContent } from '../types';
import { Loader2, ShoppingCart, ArrowRight, Tag } from 'lucide-react';

interface ProductsProps {
  onNavigate: (page: string) => void;
}

const DEFAULT_CONTENT: PageContent = {
  id: 'main',
  heroTitle: '',
  heroSubtitle: '',
  heroSlides: [],
  features: [],
  productsTitle: 'Our Products',
  productsDesc: 'Explore our range of digital solutions for civil engineering and construction management.',
  productsItems: [],
  products: [
    {
      id: '1',
      name: 'SiteLog Pro',
      description: 'Complete site documentation and daily log management system.',
      price: '₹12,000',
      image: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&q=80'
    },
    {
      id: '2',
      name: 'DraftSync',
      description: 'Real-time drawing synchronization between office and field.',
      price: '₹8,500',
      image: 'https://images.unsplash.com/photo-1503387762-592dee58c460?auto=format&fit=crop&q=80'
    }
  ],
  aboutTitle: '',
  aboutDesc: '',
  pricingTitle: '',
  pricingSubtitle: '',
  constructionPricingPlans: [],
  interiorPricingPlans: []
};

export default function Products({ onNavigate }: ProductsProps) {
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
            products: data.products || DEFAULT_CONTENT.products,
          });
        }
      } catch (error) {
        console.error('Error fetching products:', error);
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

  return (
    <div className="min-h-screen bg-slate-50 py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-slate-900 mb-4"
          >
            {content.productsTitle}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-slate-600 max-w-2xl mx-auto"
          >
            {content.productsDesc}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {content.products?.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-slate-100 group"
            >
              <div className="aspect-video relative overflow-hidden">
                <img 
                  src={product.image} 
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-indigo-600 font-bold text-sm flex items-center gap-1 shadow-sm">
                  <Tag size={14} />
                  {product.price}
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-slate-900 mb-2">{product.name}</h3>
                <p className="text-slate-600 mb-6 line-clamp-2">{product.description}</p>
                <div className="flex items-center justify-between">
                  <button 
                    onClick={() => onNavigate('pricing')}
                    className="flex items-center gap-2 text-indigo-600 font-semibold hover:gap-3 transition-all"
                  >
                    View Plans <ArrowRight size={18} />
                  </button>
                  <button 
                    onClick={() => onNavigate('pricing')}
                    className="p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all"
                  >
                    <ShoppingCart size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {(!content.products || content.products.length === 0) && (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <p className="text-slate-500">No products available at the moment.</p>
          </div>
        )}
      </div>
    </div>
  );
}
