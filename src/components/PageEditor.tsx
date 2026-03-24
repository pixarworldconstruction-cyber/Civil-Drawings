import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { PageContent } from '../types';
import imageCompression from 'browser-image-compression';
import { Save, Loader2, Plus, Trash2, ChevronDown, ChevronUp, Upload, CreditCard, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const DEFAULT_CONTENT: PageContent = {
  id: 'main',
  heroTitle: 'Transform Your Vision Into Reality',
  heroSubtitle: 'Professional architectural design and 3D visualization services tailored to your unique needs.',
  heroSlides: [
    'https://images.unsplash.com/photo-1600585154340-be6199f7e009?auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600566753190-17f0bb2a6c3e?auto=format&fit=crop&q=80'
  ],
  features: [
    { icon: 'Layout', title: 'Architectural Design', desc: 'Comprehensive design solutions from concept to construction.' },
    { icon: 'Box', title: '3D Visualization', desc: 'High-quality 3D renderings and walkthroughs for your projects.' },
    { icon: 'FileText', title: 'Planning Permits', desc: 'Expert assistance with planning and building permit applications.' }
  ],
  productsTitle: 'Our Services',
  productsDesc: 'Explore our range of professional architectural and design services.',
  productsItems: ['Residential Design', 'Commercial Architecture', 'Interior Design', 'Landscape Planning', 'Urban Design', 'Renovations'],
  products: [
    {
      id: '1',
      name: 'Modern Villa Design',
      description: 'Complete architectural drawings for a 4-bedroom modern villa.',
      price: '₹25,000',
      image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&q=80'
    }
  ],
  aboutTitle: 'About Our Studio',
  aboutDesc: 'With over 15 years of experience, we specialize in creating sustainable and innovative architectural solutions.',
  pricingTitle: 'Simple, Transparent Pricing',
  pricingSubtitle: 'Choose the plan that best fits your project requirements.',
  referralBenefitTitle: 'Refer & Earn',
  referralBenefitDesc: 'Share your code with friends and get benefits on your next project!',
  welcomeBonusAmount: 500,
  pricePerSqft: 25,
  pricePerRoom: 5000,
  offerTitle: 'Limited Time Offer!',
  offerDescription: 'Get an additional 10% off on all Construction Design Packages this week.',
  offerExpiryDate: '2026-03-30',
  constructionPricingPlans: [
    {
      name: 'Basic',
      price: '₹15,000',
      period: 'per project',
      features: ['Initial Consultation', 'Basic 2D Floor Plan', 'Single 3D View', '1 Revision'],
      buttonText: 'Get Started'
    },
    {
      name: 'Standard',
      price: '₹45,000',
      period: 'per project',
      features: ['Detailed Consultation', 'Full 2D Drawings', '3 High-Quality 3D Views', '3 Revisions', 'Material Selection'],
      buttonText: 'Choose Standard',
      isPopular: true
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

export default function PageEditor() {
  const [content, setContent] = useState<PageContent>(DEFAULT_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState<string | null>(null);
  const [uploadingHeroImage, setUploadingHeroImage] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<string>('hero');

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
            // Ensure arrays exist even if missing in DB
            features: data.features || DEFAULT_CONTENT.features,
            constructionPricingPlans: data.constructionPricingPlans || DEFAULT_CONTENT.constructionPricingPlans,
            interiorPricingPlans: data.interiorPricingPlans || DEFAULT_CONTENT.interiorPricingPlans,
            productsItems: data.productsItems || DEFAULT_CONTENT.productsItems,
            heroSlides: data.heroSlides || DEFAULT_CONTENT.heroSlides,
            products: data.products || DEFAULT_CONTENT.products,
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

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'siteContent', 'main'), content);
      alert('Content saved successfully!');
    } catch (error) {
      console.error('Error saving content:', error);
      alert('Failed to save content.');
    } finally {
      setSaving(false);
    }
  };

  const updateFeature = (index: number, field: string, value: string) => {
    const newFeatures = [...content.features];
    newFeatures[index] = { ...newFeatures[index], [field]: value };
    setContent({ ...content, features: newFeatures });
  };

  const updatePricingPlan = (type: 'construction' | 'interior', index: number, field: string, value: any) => {
    const key = type === 'construction' ? 'constructionPricingPlans' : 'interiorPricingPlans';
    const newPlans = [...content[key]];
    newPlans[index] = { ...newPlans[index], [field]: value };
    setContent({ ...content, [key]: newPlans });
  };

  const updatePlanFeature = (type: 'construction' | 'interior', planIndex: number, featureIndex: number, value: string) => {
    const key = type === 'construction' ? 'constructionPricingPlans' : 'interiorPricingPlans';
    const newPlans = [...content[key]];
    const newFeatures = [...newPlans[planIndex].features];
    newFeatures[featureIndex] = value;
    newPlans[planIndex] = { ...newPlans[planIndex], features: newFeatures };
    setContent({ ...content, [key]: newPlans });
  };

  const addPlanFeature = (type: 'construction' | 'interior', planIndex: number) => {
    const key = type === 'construction' ? 'constructionPricingPlans' : 'interiorPricingPlans';
    const newPlans = [...content[key]];
    newPlans[planIndex].features.push('New Feature');
    setContent({ ...content, [key]: newPlans });
  };

  const removePlanFeature = (type: 'construction' | 'interior', planIndex: number, featureIndex: number) => {
    const key = type === 'construction' ? 'constructionPricingPlans' : 'interiorPricingPlans';
    const newPlans = [...content[key]];
    newPlans[planIndex].features.splice(featureIndex, 1);
    setContent({ ...content, [key]: newPlans });
  };

  const addPricingPlan = (type: 'construction' | 'interior') => {
    const key = type === 'construction' ? 'constructionPricingPlans' : 'interiorPricingPlans';
    const newPlans = [...content[key], {
      name: 'New Plan',
      price: '₹0',
      period: 'per project',
      features: ['Initial Consultation'],
      buttonText: 'Get Started'
    }];
    setContent({ ...content, [key]: newPlans });
  };

  const removePricingPlan = (type: 'construction' | 'interior', index: number) => {
    const key = type === 'construction' ? 'constructionPricingPlans' : 'interiorPricingPlans';
    const newPlans = [...content[key]];
    newPlans.splice(index, 1);
    setContent({ ...content, [key]: newPlans });
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'construction' | 'interior', planIndex: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const planId = `${type}-${planIndex}`;
    setUploadingPdf(planId);
    try {
      const storageRef = ref(storage, `samples/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        null,
        (error) => { throw error; },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          updatePricingPlan(type, planIndex, 'samplePdfUrl', downloadURL);
          setUploadingPdf(null);
        }
      );
    } catch (error) {
      console.error('PDF upload error:', error);
      alert('Failed to upload PDF');
      setUploadingPdf(null);
    }
  };

  const updateHeroSlide = (index: number, value: string) => {
    const newSlides = [...content.heroSlides];
    newSlides[index] = value;
    setContent({ ...content, heroSlides: newSlides });
  };

  const addHeroSlide = () => {
    setContent({ ...content, heroSlides: [...content.heroSlides, ''] });
  };

  const removeHeroSlide = (index: number) => {
    const newSlides = [...content.heroSlides];
    newSlides.splice(index, 1);
    setContent({ ...content, heroSlides: newSlides });
  };

  const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    // Check file type
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      alert('Only JPG and PNG images are allowed');
      return;
    }

    setUploadingHeroImage(index);
    try {
      const compressionOptions = {
        maxSizeMB: 1, // Compress to ~1MB for faster upload while maintaining quality
        maxWidthOrHeight: 1600, // 1600px is plenty for hero images
        useWebWorker: true
      };

      let fileToUpload = file;
      try {
        fileToUpload = await imageCompression(file, compressionOptions);
      } catch (e) {
        console.error('Image compression failed', e);
      }

      const storageRef = ref(storage, `hero/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          null,
          (error) => reject(error),
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              updateHeroSlide(index, downloadURL);
              alert('Image uploaded successfully!');
              resolve();
            } catch (err) {
              reject(err);
            }
          }
        );
      });
    } catch (error) {
      console.error('Hero image upload error:', error);
      alert('Failed to upload image');
    } finally {
      setUploadingHeroImage(null);
    }
  };

  const updateProduct = (index: number, field: string, value: string) => {
    const newProducts = [...content.products];
    newProducts[index] = { ...newProducts[index], [field]: value };
    setContent({ ...content, products: newProducts });
  };

  const addProduct = () => {
    setContent({
      ...content,
      products: [
        ...content.products,
        { id: Date.now().toString(), name: 'New Product', description: '', price: '₹0', image: '' }
      ]
    });
  };

  const removeProduct = (index: number) => {
    const newProducts = [...content.products];
    newProducts.splice(index, 1);
    setContent({ ...content, products: newProducts });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  const SectionHeader = ({ id, title }: { id: string; title: string }) => (
    <button
      onClick={() => setActiveSection(activeSection === id ? '' : id)}
      className="w-full flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors mb-2"
    >
      <span className="font-semibold text-slate-800">{title}</span>
      {activeSection === id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
    </button>
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Page Content Editor</h2>
          <p className="text-slate-500">Edit the content of your public pages</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all font-semibold shadow-lg shadow-indigo-200"
        >
          {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Hero Section */}
      <SectionHeader id="hero" title="Hero Section (Home Page Carousel)" />
      <AnimatePresence>
        {activeSection === 'hero' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-6 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Hero Title</label>
                  <input
                    type="text"
                    value={content.heroTitle}
                    onChange={(e) => setContent({ ...content, heroTitle: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Hero Subtitle</label>
                  <input
                    type="text"
                    value={content.heroSubtitle}
                    onChange={(e) => setContent({ ...content, heroSubtitle: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800">Carousel Images</h4>
                  <button
                    onClick={addHeroSlide}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-semibold"
                  >
                    <Plus size={16} /> Add Slide
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {content.heroSlides.map((slide, index) => (
                    <div key={index} className="relative group p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-400">Slide {index + 1}</span>
                        <button
                          onClick={() => removeHeroSlide(index)}
                          className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="space-y-3">
                        <div className="relative aspect-video bg-slate-200 rounded-lg overflow-hidden">
                          {slide ? (
                            <img src={slide || undefined} alt={`Slide ${index + 1}`} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="text-slate-400" size={32} />
                            </div>
                          )}
                          <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                            <div className="flex flex-col items-center gap-2 text-white">
                              {uploadingHeroImage === index ? <Loader2 className="animate-spin" size={24} /> : <Upload size={24} />}
                              <span className="text-xs font-bold">{uploadingHeroImage === index ? 'Uploading...' : 'Upload Image'}</span>
                            </div>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => handleHeroImageUpload(e, index)}
                              disabled={uploadingHeroImage !== null}
                            />
                          </label>
                        </div>
                        <input
                          type="text"
                          value={slide}
                          onChange={(e) => updateHeroSlide(index, e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                          placeholder="Or enter image URL..."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Features Section */}
      <SectionHeader id="features" title="Features Section (Home Page)" />
      <AnimatePresence>
        {activeSection === 'features' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-6 mb-4">
              {content.features.map((feature, index) => (
                <div key={index} className="p-4 bg-slate-50 rounded-lg space-y-3">
                  <h4 className="font-semibold text-slate-800">Feature {index + 1}</h4>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={feature.title}
                      onChange={(e) => updateFeature(index, 'title', e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <textarea
                      value={feature.desc}
                      onChange={(e) => updateFeature(index, 'desc', e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 h-20"
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Products Section */}
      <SectionHeader id="products" title="Products Page & Management" />
      <AnimatePresence>
        {activeSection === 'products' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-8 mb-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Page Title</label>
                  <input
                    type="text"
                    value={content.productsTitle}
                    onChange={(e) => setContent({ ...content, productsTitle: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Page Description</label>
                  <input
                    type="text"
                    value={content.productsDesc}
                    onChange={(e) => setContent({ ...content, productsDesc: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800">Product Listings</h4>
                  <button
                    onClick={addProduct}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-semibold"
                  >
                    <Plus size={16} /> Add Product
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  {content.products.map((product, index) => (
                    <div key={product.id} className="p-6 bg-slate-50 rounded-xl border border-slate-200 relative space-y-4">
                      <button
                        onClick={() => removeProduct(index)}
                        className="absolute top-4 right-4 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Product Name</label>
                            <input
                              type="text"
                              value={product.name}
                              onChange={(e) => updateProduct(index, 'name', e.target.value)}
                              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Price</label>
                            <input
                              type="text"
                              value={product.price}
                              onChange={(e) => updateProduct(index, 'price', e.target.value)}
                              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Image URL</label>
                            <input
                              type="text"
                              value={product.image}
                              onChange={(e) => updateProduct(index, 'image', e.target.value)}
                              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                            <textarea
                              value={product.description}
                              onChange={(e) => updateProduct(index, 'description', e.target.value)}
                              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 h-20"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* About Section */}
      <SectionHeader id="about" title="About Page" />
      <AnimatePresence>
        {activeSection === 'about' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Page Title</label>
                <input
                  type="text"
                  value={content.aboutTitle}
                  onChange={(e) => setContent({ ...content, aboutTitle: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Page Content</label>
                <textarea
                  value={content.aboutDesc}
                  onChange={(e) => setContent({ ...content, aboutDesc: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 h-48"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pricing Section */}
      <SectionHeader id="pricing" title="Pricing Page & Discount Offers" />
      <AnimatePresence>
        {activeSection === 'pricing' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-10 mb-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Page Title</label>
                  <input
                    type="text"
                    value={content.pricingTitle}
                    onChange={(e) => setContent({ ...content, pricingTitle: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Page Subtitle</label>
                  <input
                    type="text"
                    value={content.pricingSubtitle}
                    onChange={(e) => setContent({ ...content, pricingSubtitle: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Referral Benefit Section */}
              <div className="p-6 bg-violet-50 rounded-2xl border border-violet-100 space-y-4">
                <h4 className="font-bold text-violet-900 flex items-center gap-2">
                  <Plus size={18} /> Referral Benefit Configuration
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-violet-700 mb-1">Benefit Title</label>
                    <input
                      type="text"
                      value={content.referralBenefitTitle || ''}
                      onChange={(e) => setContent({ ...content, referralBenefitTitle: e.target.value })}
                      className="w-full px-4 py-2 border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-500 bg-white"
                      placeholder="e.g. Refer & Earn"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-violet-700 mb-1">Benefit Description</label>
                    <input
                      type="text"
                      value={content.referralBenefitDesc || ''}
                      onChange={(e) => setContent({ ...content, referralBenefitDesc: e.target.value })}
                      className="w-full px-4 py-2 border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-500 bg-white"
                      placeholder="e.g. Get 10% off on your next project"
                    />
                  </div>
                </div>
              </div>

              {/* Wallet & Pricing Configuration */}
              <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-4">
                <h4 className="font-bold text-emerald-900 flex items-center gap-2">
                  <CreditCard size={18} /> Wallet & Pricing Configuration
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-emerald-700 mb-1">Welcome Bonus (Coins)</label>
                    <input
                      type="number"
                      value={content.welcomeBonusAmount || 0}
                      onChange={(e) => setContent({ ...content, welcomeBonusAmount: Number(e.target.value) })}
                      className="w-full px-4 py-2 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                      placeholder="e.g. 500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-emerald-700 mb-1">Price per Sqft (Coins)</label>
                    <input
                      type="number"
                      value={content.pricePerSqft || 0}
                      onChange={(e) => setContent({ ...content, pricePerSqft: Number(e.target.value) })}
                      className="w-full px-4 py-2 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                      placeholder="e.g. 25"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-emerald-700 mb-1">Price per Room (Coins)</label>
                    <input
                      type="number"
                      value={content.pricePerRoom || 0}
                      onChange={(e) => setContent({ ...content, pricePerRoom: Number(e.target.value) })}
                      className="w-full px-4 py-2 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                      placeholder="e.g. 5000"
                    />
                  </div>
                </div>
              </div>

              {/* Global Offer Section */}
              <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100 space-y-4">
                <h4 className="font-bold text-indigo-900 flex items-center gap-2">
                  <Save size={18} /> Global Discount Offer Section
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-indigo-700 mb-1">Offer Title</label>
                    <input
                      type="text"
                      value={content.offerTitle || ''}
                      onChange={(e) => setContent({ ...content, offerTitle: e.target.value })}
                      className="w-full px-4 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-indigo-700 mb-1">Offer Expiry Date</label>
                    <input
                      type="date"
                      value={content.offerExpiryDate || ''}
                      onChange={(e) => setContent({ ...content, offerExpiryDate: e.target.value })}
                      className="w-full px-4 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-indigo-700 mb-1">Offer Description</label>
                  <textarea
                    value={content.offerDescription || ''}
                    onChange={(e) => setContent({ ...content, offerDescription: e.target.value })}
                    className="w-full px-4 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white h-20"
                  />
                </div>
              </div>

              {/* Construction Design Package */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">1. Construction Design Package</h3>
                  <button
                    onClick={() => addPricingPlan('construction')}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-semibold"
                  >
                    <Plus size={16} /> Add Plan
                  </button>
                </div>
                {content.constructionPricingPlans.map((plan, pIndex) => (
                  <div key={pIndex} className="p-6 bg-slate-50 rounded-xl space-y-4 border border-slate-200 relative">
                    <button
                      onClick={() => removePricingPlan('construction', pIndex)}
                      className="absolute top-4 right-4 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                    <div className="flex items-center justify-between pr-10">
                      <h4 className="font-bold text-lg text-slate-800">{plan.name} Plan</h4>
                      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={plan.isPopular}
                          onChange={(e) => updatePricingPlan('construction', pIndex, 'isPopular', e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        Most Popular
                      </label>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Plan Name</label>
                        <input
                          type="text"
                          value={plan.name}
                          onChange={(e) => updatePricingPlan('construction', pIndex, 'name', e.target.value)}
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Original Price</label>
                        <input
                          type="text"
                          placeholder="e.g. ₹20,000"
                          value={plan.originalPrice || ''}
                          onChange={(e) => updatePricingPlan('construction', pIndex, 'originalPrice', e.target.value)}
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Discounted Price</label>
                        <input
                          type="text"
                          value={plan.price}
                          onChange={(e) => updatePricingPlan('construction', pIndex, 'price', e.target.value)}
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-600"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Period</label>
                        <input
                          type="text"
                          value={plan.period}
                          onChange={(e) => updatePricingPlan('construction', pIndex, 'period', e.target.value)}
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Discount Tag</label>
                        <input
                          type="text"
                          placeholder="e.g. Save 20%"
                          value={plan.discountLabel || ''}
                          onChange={(e) => updatePricingPlan('construction', pIndex, 'discountLabel', e.target.value)}
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Sample PDF URL</label>
                        <input
                          type="text"
                          placeholder="https://example.com/sample.pdf"
                          value={plan.samplePdfUrl || ''}
                          onChange={(e) => updatePricingPlan('construction', pIndex, 'samplePdfUrl', e.target.value)}
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Upload Sample PDF</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            accept="application/pdf"
                            onChange={(e) => handlePdfUpload(e, 'construction', pIndex)}
                            className="hidden"
                            id={`pdf-upload-construction-${pIndex}`}
                          />
                          <label
                            htmlFor={`pdf-upload-construction-${pIndex}`}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition-all text-sm font-medium text-slate-600"
                          >
                            {uploadingPdf === `construction-${pIndex}` ? (
                              <Loader2 className="animate-spin" size={18} />
                            ) : (
                              <Upload size={18} />
                            )}
                            {uploadingPdf === `construction-${pIndex}` ? 'Uploading...' : 'Upload PDF from Device'}
                          </label>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Features</label>
                      <div className="space-y-2">
                        {plan.features.map((feature, fIndex) => (
                          <div key={fIndex} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={feature}
                              onChange={(e) => updatePlanFeature('construction', pIndex, fIndex, e.target.value)}
                              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                            <button
                              onClick={() => removePlanFeature('construction', pIndex, fIndex)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => addPlanFeature('construction', pIndex)}
                          className="flex items-center gap-2 px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors text-sm font-medium"
                        >
                          <Plus size={16} />
                          Add Feature
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Interior Design Packages */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <h3 className="text-lg font-bold text-slate-900">2. Interior Design Packages</h3>
                  <button
                    onClick={() => addPricingPlan('interior')}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-semibold"
                  >
                    <Plus size={16} /> Add Plan
                  </button>
                </div>
                {content.interiorPricingPlans.map((plan, pIndex) => (
                  <div key={pIndex} className="p-6 bg-slate-50 rounded-xl space-y-4 border border-slate-200 relative">
                    <button
                      onClick={() => removePricingPlan('interior', pIndex)}
                      className="absolute top-4 right-4 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                    <div className="flex items-center justify-between pr-10">
                      <h4 className="font-bold text-lg text-slate-800">{plan.name} Plan</h4>
                      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={plan.isPopular}
                          onChange={(e) => updatePricingPlan('interior', pIndex, 'isPopular', e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        Most Popular
                      </label>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Plan Name</label>
                        <input
                          type="text"
                          value={plan.name}
                          onChange={(e) => updatePricingPlan('interior', pIndex, 'name', e.target.value)}
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Original Price</label>
                        <input
                          type="text"
                          placeholder="e.g. ₹30,000"
                          value={plan.originalPrice || ''}
                          onChange={(e) => updatePricingPlan('interior', pIndex, 'originalPrice', e.target.value)}
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Discounted Price</label>
                        <input
                          type="text"
                          value={plan.price}
                          onChange={(e) => updatePricingPlan('interior', pIndex, 'price', e.target.value)}
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-600"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Period</label>
                        <input
                          type="text"
                          value={plan.period}
                          onChange={(e) => updatePricingPlan('interior', pIndex, 'period', e.target.value)}
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Discount Tag</label>
                        <input
                          type="text"
                          placeholder="e.g. Save 20%"
                          value={plan.discountLabel || ''}
                          onChange={(e) => updatePricingPlan('interior', pIndex, 'discountLabel', e.target.value)}
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Sample PDF URL</label>
                        <input
                          type="text"
                          placeholder="https://example.com/sample.pdf"
                          value={plan.samplePdfUrl || ''}
                          onChange={(e) => updatePricingPlan('interior', pIndex, 'samplePdfUrl', e.target.value)}
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Upload Sample PDF</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            accept="application/pdf"
                            onChange={(e) => handlePdfUpload(e, 'interior', pIndex)}
                            className="hidden"
                            id={`pdf-upload-interior-${pIndex}`}
                          />
                          <label
                            htmlFor={`pdf-upload-interior-${pIndex}`}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition-all text-sm font-medium text-slate-600"
                          >
                            {uploadingPdf === `interior-${pIndex}` ? (
                              <Loader2 className="animate-spin" size={18} />
                            ) : (
                              <Upload size={18} />
                            )}
                            {uploadingPdf === `interior-${pIndex}` ? 'Uploading...' : 'Upload PDF from Device'}
                          </label>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Features</label>
                      <div className="space-y-2">
                        {plan.features.map((feature, fIndex) => (
                          <div key={fIndex} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={feature}
                              onChange={(e) => updatePlanFeature('interior', pIndex, fIndex, e.target.value)}
                              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                            <button
                              onClick={() => removePlanFeature('interior', pIndex, fIndex)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => addPlanFeature('interior', pIndex)}
                          className="flex items-center gap-2 px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors text-sm font-medium"
                        >
                          <Plus size={16} />
                          Add Feature
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
