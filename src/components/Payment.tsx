import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CreditCard, ShieldCheck, ArrowLeft, CheckCircle2, Loader2, AlertCircle, Smartphone } from 'lucide-react';
import { PricingPlan, UserProfile } from '../types';

import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface PaymentProps {
  plan: PricingPlan;
  onNavigate: (page: string) => void;
  user: UserProfile | null;
}

export default function Payment({ plan, onNavigate, user }: PaymentProps) {
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi'>('card');
  const [upiId, setUpiId] = useState('');

  const getNumericPrice = (priceStr: string) => {
    if (plan.id === 'custom-coins' && customAmount) {
      return parseInt(customAmount) || 0;
    }
    return parseInt(priceStr.replace(/[^0-9]/g, '')) || 0;
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const price = getNumericPrice(plan.price);
    const minAmount = 100;

    if (price < minAmount) {
      setError(`Minimum payment amount should be ₹${minAmount.toLocaleString()}. Please adjust the amount.`);
      return;
    }

    if (paymentMethod === 'upi' && !upiId) {
      setError('Please enter your UPI ID.');
      return;
    }

    if (!user) {
      setError('Please sign in to complete the payment.');
      return;
    }

    setProcessing(true);
    // Simulate payment processing
    setTimeout(async () => {
      try {
        // Update user wallet balance
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          walletBalance: (user.walletBalance || 0) + price
        });
        
        setProcessing(false);
        setCompleted(true);
      } catch (err) {
        console.error('Error updating wallet:', err);
        setError('Payment successful but failed to update wallet. Please contact support.');
        setProcessing(false);
      }
    }, 2000);
  };

  if (completed) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 text-center"
        >
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Payment Successful!</h2>
          <p className="text-slate-600 mb-8">
            ₹{getNumericPrice(plan.price).toLocaleString()} has been added to your wallet. 
            You can now use these coins to start your projects.
          </p>
          <button 
            onClick={() => onNavigate('dashboard')}
            className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg"
          >
            Go to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  const displayPrice = plan.id === 'custom-coins' ? `₹${customAmount || '0'}` : plan.price;

  return (
    <div className="min-h-screen bg-slate-50 py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <button 
          onClick={() => onNavigate('pricing')}
          className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors mb-8 font-medium"
        >
          <ArrowLeft size={20} /> Back to Pricing
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 sticky top-24">
              <h3 className="text-xl font-bold text-slate-900 mb-6">Order Summary</h3>
              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">{plan.name}</span>
                  <span className="font-bold text-slate-900">{displayPrice}</span>
                </div>
                {plan.id === 'custom-coins' && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">Enter Amount (₹)</label>
                    <input 
                      type="number"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder="Min ₹100"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                )}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Type</span>
                  <span className="text-slate-700 uppercase">{plan.period}</span>
                </div>
                {plan.discountLabel && (
                  <div className="flex justify-between items-center text-green-600 text-sm font-medium">
                    <span>Discount</span>
                    <span>{plan.discountLabel}</span>
                  </div>
                )}
              </div>
              <div className="border-t border-slate-100 pt-6 mb-8">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-slate-900">Total</span>
                  <span className="text-2xl font-bold text-indigo-600">{displayPrice}</span>
                </div>
              </div>
              <div className="space-y-3">
                {plan.features.slice(0, 4).map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-slate-500">
                    <CheckCircle2 size={14} className="text-green-500" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-10">
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-3xl font-bold text-slate-900">Payment Details</h2>
                <div className="flex gap-2">
                  <div className="w-10 h-6 bg-slate-100 rounded border border-slate-200"></div>
                  <div className="w-10 h-6 bg-slate-100 rounded border border-slate-200"></div>
                  <div className="w-10 h-6 bg-slate-100 rounded border border-slate-200"></div>
                </div>
              </div>

              <div className="flex gap-4 mb-8">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${
                    paymentMethod === 'card'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                      : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                  }`}
                >
                  <CreditCard size={20} />
                  <span className="font-bold">Card</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('upi')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${
                    paymentMethod === 'upi'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                      : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                  }`}
                >
                  <Smartphone size={20} />
                  <span className="font-bold">UPI</span>
                </button>
              </div>

              <form onSubmit={handlePayment} className="space-y-6">
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm font-medium"
                  >
                    <AlertCircle size={18} />
                    {error}
                  </motion.div>
                )}
                
                {paymentMethod === 'card' ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">First Name</label>
                        <input 
                          type="text" 
                          required
                          defaultValue={user?.displayName?.split(' ')[0] || ''}
                          className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Last Name</label>
                        <input 
                          type="text" 
                          required
                          defaultValue={user?.displayName?.split(' ')[1] || ''}
                          className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Email Address</label>
                      <input 
                        type="email" 
                        required
                        defaultValue={user?.email || ''}
                        className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Card Number</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          required
                          placeholder="0000 0000 0000 0000"
                          className="w-full pl-12 pr-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                        <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Expiry Date</label>
                        <input 
                          type="text" 
                          required
                          placeholder="MM/YY"
                          className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">CVC</label>
                        <input 
                          type="text" 
                          required
                          placeholder="123"
                          className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-6">
                    <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-32 h-32 bg-white rounded-xl shadow-sm border border-indigo-100 mx-auto mb-4 flex items-center justify-center">
                          <img 
                            src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=civilcontractor@upi&pn=Civil%20Contractor&am=0&cu=INR" 
                            alt="UPI QR Code"
                            className="w-24 h-24"
                          />
                        </div>
                        <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Scan to Pay</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Enter UPI ID</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          required
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          placeholder="username@upi"
                          className="w-full pl-12 pr-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                        <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-6">
                  <button 
                    type="submit"
                    disabled={processing}
                    className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        Processing...
                      </>
                    ) : (
                      <>Pay {displayPrice}</>
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-center gap-2 text-slate-400 text-sm pt-4">
                  <ShieldCheck size={16} />
                  Secure SSL Encrypted Payment
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
