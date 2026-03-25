import { useState, useEffect } from 'react';
import { db, storage } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Folder, Image as ImageIcon, Trash2, Upload, X, Loader2, Camera, FileText, Download, User, Building2, MapPin, Phone, CreditCard, CheckCircle2, Clock, AlertCircle, Coins, Menu } from 'lucide-react';
import { Project, ProjectImage, UserProfile, OperationType, ProjectFile, ProjectType, ConstructionSubType, InteriorSubType, HousingType, NorthDirection, ProjectStatus, Bill, AdminProfile } from '../types';
import { handleFirestoreError } from '../utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ConfirmationModal from './ConfirmationModal';
import imageCompression from 'browser-image-compression';
import { useLanguage } from '../contexts/LanguageContext';

interface DashboardProps {
  user: UserProfile;
  onNavigate: (page: string) => void;
  onAddCoins: () => void;
  isNewProjectModalOpen: boolean;
  setIsNewProjectModalOpen: (open: boolean) => void;
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export default function Dashboard({ 
  user, 
  onNavigate, 
  onAddCoins,
  isNewProjectModalOpen,
  setIsNewProjectModalOpen,
  currentTab,
  setCurrentTab
}: DashboardProps) {
  const { t, formatNumber } = useLanguage();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [images, setImages] = useState<ProjectImage[]>([]);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [projectType, setProjectType] = useState<ProjectType>('Construction Project Drawing');
  const [subType, setSubType] = useState<string>('Resident');
  const [bedrooms, setBedrooms] = useState<string>('');
  const [hall, setHall] = useState<string>('');
  const [kitchen, setKitchen] = useState<string>('');
  const [housingType, setHousingType] = useState<HousingType>('Row House');
  const [totalBuiltUpArea, setTotalBuiltUpArea] = useState<string>('');
  const [totalCarpetArea, setTotalCarpetArea] = useState<string>('');
  const [numberOfFloors, setNumberOfFloors] = useState<string>('');
  const [landscapingArea, setLandscapingArea] = useState<string>('');
  const [compoundArea, setCompoundArea] = useState<string>('');
  const [northDirection, setNorthDirection] = useState<NorthDirection>('Up');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [bills, setBills] = useState<Bill[]>([]);
  const [referralBenefit, setReferralBenefit] = useState({ title: '', desc: '' });
  const [pricingConfig, setPricingConfig] = useState({ welcomeBonus: 500, pricePerSqft: 25, pricePerRoom: 5000 });
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const docRef = doc(db, 'siteContent', 'main');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setReferralBenefit({
            title: data.referralBenefitTitle || t('referAndEarnTitle'),
            desc: data.referralBenefitDesc || t('referAndEarnDesc')
          });
          setPricingConfig({
            welcomeBonus: data.welcomeBonusAmount || 500,
            pricePerSqft: data.pricePerSqft || 25,
            pricePerRoom: data.pricePerRoom || 5000
          });
        }

        const adminRef = doc(db, 'siteContent', 'adminProfile');
        const adminSnap = await getDoc(adminRef);
        if (adminSnap.exists()) {
          setAdminProfile(adminSnap.data() as AdminProfile);
        }
      } catch (error) {
        console.error('Error fetching config:', error);
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    // Handle Welcome Bonus
    if (user && !user.isWelcomeBonusClaimed) {
      const claimBonus = async () => {
        try {
          const newBalance = (user.walletBalance || 0) + pricingConfig.welcomeBonus;
          await updateDoc(doc(db, 'users', user.uid), {
            walletBalance: newBalance,
            isWelcomeBonusClaimed: true
          });
          alert(t('welcomeBonusReceived', { amount: pricingConfig.welcomeBonus }));
        } catch (error) {
          console.error('Error claiming welcome bonus:', error);
        }
      };
      claimBonus();
    }
  }, [user, pricingConfig.welcomeBonus]);

  useEffect(() => {
    // Generate referral code if not exists
    if (user && !user.referralCode) {
      const generateCode = async () => {
        const code = `REF-${user.uid.substring(0, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            referralCode: code,
            referralCount: 0
          });
        } catch (error) {
          console.error('Error generating referral code:', error);
        }
      };
      generateCode();
    }
  }, [user]);

  // Profile fields
  const [companyName, setCompanyName] = useState(user.companyName || '');
  const [address, setAddress] = useState(user.address || '');
  const [mobileNumber, setMobileNumber] = useState(user.mobileNumber || '');
  const [gstNumber, setGstNumber] = useState(user.gstNumber || '');
  const [logoUrl, setLogoUrl] = useState(user.logoUrl || '');

  useEffect(() => {
    setCompanyName(user.companyName || '');
    setAddress(user.address || '');
    setMobileNumber(user.mobileNumber || '');
    setGstNumber(user.gstNumber || '');
    setLogoUrl(user.logoUrl || '');
  }, [user]);

  useEffect(() => {
    const q = query(collection(db, 'projects'), where('userId', '==', user.uid));
    const unsubscribeProjects = onSnapshot(q, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
      setProjects(projectsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'projects');
    });

    const qBills = query(collection(db, 'bills'), where('userId', '==', user.uid));
    const unsubscribeBills = onSnapshot(qBills, (snapshot) => {
      const billsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bill));
      setBills(billsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bills');
    });

    return () => {
      unsubscribeProjects();
      unsubscribeBills();
    };
  }, [user.uid]);

  useEffect(() => {
    if (!selectedProject) {
      setImages([]);
      setProjectFiles([]);
      return;
    }

    const qImages = query(collection(db, 'images'), where('projectId', '==', selectedProject.id));
    const unsubImages = onSnapshot(qImages, (snapshot) => {
      const imagesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProjectImage));
      setImages(imagesData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'images');
    });

    const qFiles = query(collection(db, 'files'), where('projectId', '==', selectedProject.id));
    const unsubFiles = onSnapshot(qFiles, (snapshot) => {
      const filesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProjectFile));
      setProjectFiles(filesData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'files');
    });

    return () => {
      unsubImages();
      unsubFiles();
    };
  }, [selectedProject]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Calculate cost
    let estimatedCost = 0;
    if (subType === 'Resident') {
      const rooms = Number(bedrooms) + Number(hall) + Number(kitchen);
      estimatedCost = rooms * pricingConfig.pricePerRoom;
    } else {
      estimatedCost = Number(totalBuiltUpArea) * pricingConfig.pricePerSqft;
    }

    const gstAmount = estimatedCost * 0.18;
    const totalCost = estimatedCost + gstAmount;

    if ((user.walletBalance || 0) < totalCost) {
      alert(t('insufficientBalanceMsg', { totalCost, walletBalance: user.walletBalance || 0 }));
      return;
    }

    try {
      const projectData: any = {
        userId: user.uid,
        name: newProjectName,
        description: newProjectDesc,
        projectType,
        subType,
        status: 'Project payment not processed',
        totalBuiltUpArea: Number(totalBuiltUpArea),
        totalCarpetArea: Number(totalCarpetArea),
        numberOfFloors: Number(numberOfFloors),
        landscapingArea: Number(landscapingArea) || 0,
        compoundArea: Number(compoundArea) || 0,
        northDirection,
        cost: estimatedCost,
        gst: gstAmount,
        totalCost: totalCost,
        createdAt: serverTimestamp()
      };

      if (subType === 'Resident') {
        projectData.bedrooms = Number(bedrooms);
        projectData.hall = Number(hall);
        projectData.kitchen = Number(kitchen);
        projectData.housingType = housingType;
      }

      const projectRef = await addDoc(collection(db, 'projects'), projectData);
      
      // Generate Bill
      const billData = {
        userId: user.uid,
        projectId: projectRef.id,
        projectName: newProjectName,
        amount: estimatedCost,
        gst: gstAmount,
        total: totalCost,
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'bills'), billData);

      // Deduct coins (including GST)
      await updateDoc(doc(db, 'users', user.uid), {
        walletBalance: (user.walletBalance || 0) - totalCost
      });

      // Reset form
      setNewProjectName('');
      setNewProjectDesc('');
      setProjectType('Construction Project Drawing');
      setSubType('Resident');
      setBedrooms('');
      setHall('');
      setKitchen('');
      setHousingType('Row House');
      setTotalBuiltUpArea('');
      setTotalCarpetArea('');
      setNumberOfFloors('');
      setLandscapingArea('');
      setCompoundArea('');
      setNorthDirection('Up');
      setIsNewProjectModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'projects');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !selectedProject) return;

    if (images.length + files.length > 10) {
      alert(t('limitReachedImages', { count: images.length }));
      return;
    }

    // Check file size (5MB per image)
    const MAX_SIZE = 5 * 1024 * 1024;
    const oversizedFiles = files.filter(file => file.size > MAX_SIZE);
    if (oversizedFiles.length > 0) {
      alert(t('maxSizeExceeded'));
      return;
    }

    setUploading(true);
    try {
      const compressionOptions = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1600,
        useWebWorker: true
      };

      const uploadPromises = files.map(async (file) => {
        let fileToUpload = file;
        if (file.type.startsWith('image/')) {
          try {
            fileToUpload = await imageCompression(file, compressionOptions);
          } catch (e) {
            console.error('Compression failed, uploading original', e);
          }
        }

        return new Promise<void>((resolve, reject) => {
          const storageRef = ref(storage, `images/${selectedProject.id}/${Date.now()}_${file.name}`);
          const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

          uploadTask.on(
            'state_changed',
            (snapshot) => {
              // You could track progress here if needed
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              console.log('Upload is ' + progress + '% done');
            },
            (error) => {
              console.error('Upload error:', error);
              alert(t('uploadFailedFor', { name: file.name, error: error.message }));
              reject(error);
            },
            async () => {
              try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                await addDoc(collection(db, 'images'), {
                  projectId: selectedProject.id,
                  url: downloadURL,
                  caption: file.name,
                  createdAt: serverTimestamp()
                });
                resolve();
              } catch (err) {
                console.error('Firestore error after upload:', err);
                alert(t('failedToSaveImageInfo', { name: file.name }));
                reject(err);
              }
            }
          );
        });
      });

      await Promise.all(uploadPromises);
      alert(t('uploadSuccess'));
    } catch (error) {
      console.error('General upload error:', error);
      alert(t('uploadError'));
      handleFirestoreError(error, OperationType.CREATE, 'images');
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    try {
      await deleteDoc(doc(db, 'projects', projectToDelete));
      if (selectedProject?.id === projectToDelete) setSelectedProject(null);
      setProjectToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `projects/${projectToDelete}`);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingProfile(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        companyName,
        address,
        mobileNumber,
        gstNumber,
        logoUrl
      });
      setIsProfileModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const compressionOptions = {
        maxSizeMB: 0.2, // Compress to ~200KB for much faster upload
        maxWidthOrHeight: 512, // Logos don't need to be huge
        useWebWorker: true
      };

      let fileToUpload = file;
      try {
        fileToUpload = await imageCompression(file, compressionOptions);
      } catch (e) {
        console.error('Logo compression failed', e);
      }

      const storageRef = ref(storage, `logos/${user.uid}/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          null,
          (error) => reject(error),
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              setLogoUrl(downloadURL);
              // Also update Firestore immediately to ensure it's saved
              await updateDoc(doc(db, 'users', user.uid), {
                logoUrl: downloadURL
              });
              alert(t('logoUploadSuccess'));
              resolve();
            } catch (err) {
              reject(err);
            }
          }
        );
      });
    } catch (error) {
      console.error('Logo upload error:', error);
      alert(t('logoUploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  const getStatusKey = (status: ProjectStatus) => {
    switch (status) {
      case 'Project payment not processed': return 'statusPaymentNotProcessed';
      case 'Payment received': return 'statusPaymentReceived';
      case 'All Details verified': return 'statusDetailsVerified';
      case 'Data (photo/details) missing': return 'statusDataMissing';
      case 'Project drawing in process': return 'statusDrawingInProcess';
      case '1st preview sent': return 'status1stPreviewSent';
      case '2nd preview sent': return 'status2ndPreviewSent';
      case 'Working on revision': return 'statusWorkingOnRevision';
      case 'Project completed': return 'statusProjectCompleted';
      default: return 'status';
    }
  };

  const getStatusIcon = (status: ProjectStatus) => {
    switch (status) {
      case 'Project completed': return <CheckCircle2 className="text-emerald-500" size={16} />;
      case 'Data (photo/details) missing': return <AlertCircle className="text-red-500" size={16} />;
      default: return <Clock className="text-amber-500" size={16} />;
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    try {
      await deleteDoc(doc(db, 'images', imageId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `images/${imageId}`);
    }
  };

  const calculateCurrentEstimate = () => {
    let baseCost = 0;
    if (subType === 'Resident') {
      const rooms = (Number(bedrooms) || 0) + (Number(hall) || 0) + (Number(kitchen) || 0);
      baseCost = rooms * pricingConfig.pricePerRoom;
    } else {
      baseCost = (Number(totalBuiltUpArea) || 0) * pricingConfig.pricePerSqft;
    }
    return Math.round(baseCost * 1.18); // Include 18% GST
  };

  const currentEstimate = calculateCurrentEstimate();

  const downloadBill = (bill: Bill) => {
    const doc = new jsPDF();
    
    // Header - Admin Info
    if (adminProfile) {
      if (adminProfile.logoUrl) {
        // Note: Adding images to jsPDF from URL can be tricky due to CORS.
        // For now, we'll focus on text details.
      }
      doc.setFontSize(16);
      doc.text(adminProfile.companyName, 20, 20);
      doc.setFontSize(8);
      doc.text(adminProfile.address, 20, 26);
      doc.text(`Mobile: ${adminProfile.mobileNumber} | GST: ${adminProfile.gstNumber}`, 20, 30);
      
      doc.setDrawColor(200);
      doc.line(20, 35, 190, 35);
    }

    doc.setFontSize(20);
    doc.text(t('invoice'), 105, 50, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`${t('billId')}: ${bill.id}`, 20, 65);
    doc.text(`${t('date')}: ${bill.createdAt?.toDate().toLocaleDateString()}`, 20, 70);
    doc.text(`${t('project')}: ${bill.projectName}`, 20, 75);
    
    // Client Info
    doc.setFontSize(12);
    doc.text(t('billTo'), 20, 90);
    doc.setFontSize(10);
    doc.text(user.displayName || user.email, 20, 97);
    if (user.companyName) doc.text(user.companyName, 20, 102);
    if (user.address) doc.text(user.address, 20, 107);
    if (user.gstNumber) doc.text(`GST: ${user.gstNumber}`, 20, 112);
    
    // Table
    autoTable(doc, {
      startY: 125,
      head: [[t('billDescription'), t('billAmountCoins')]],
      body: [
        [t('projectDesignFee'), bill.amount.toFixed(2)],
        [t('gst18'), bill.gst.toFixed(2)],
        [t('discount'), bill.discount ? `-${bill.discount.toFixed(2)}` : '0.00'],
      ],
      foot: [[t('total'), bill.total.toFixed(2)]],
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] },
    });
    
    doc.save(t('billFileName', { name: bill.projectName.replace(/\s+/g, '_') }));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Top Bar */}
      <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
            <Building2 size={20} />
          </div>
          <span className="font-bold text-slate-900">{t('dashboard')}</span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar Overlay */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <aside className={`fixed lg:sticky top-0 lg:top-16 left-0 h-screen lg:h-[calc(100vh-64px)] w-64 bg-white border-r border-slate-200 z-50 transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-4 space-y-2 h-full overflow-y-auto">
            <button
              onClick={() => { setIsNewProjectModalOpen(true); setIsSidebarOpen(false); }}
              className="w-full bg-indigo-600 text-white px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 mb-6"
            >
              <Plus size={20} />
              {t('newProject')}
            </button>

            <nav className="space-y-1">
              <button
                onClick={() => { setCurrentTab('projects'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                  currentTab === 'projects' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Folder size={20} />
                {t('myProjects')}
              </button>
              
              {currentTab === 'projects' && projects.length > 0 && (
                <div className="ml-9 space-y-1 mt-1 mb-4">
                  {projects.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedProject(p); setIsSidebarOpen(false); }}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium truncate transition-all ${
                        selectedProject?.id === p.id ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={() => { setCurrentTab('profile'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                  currentTab === 'profile' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <User size={20} />
                {t('profile')}
              </button>

              <button
                onClick={() => { setCurrentTab('billing'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                  currentTab === 'billing' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CreditCard size={20} />
                {t('billing')}
              </button>

              <button
                onClick={() => { setCurrentTab('referral'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                  currentTab === 'referral' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Coins size={20} />
                {t('referAndEarn')}
              </button>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          {/* Wallet & Low Balance Notification */}
          <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center justify-between col-span-1"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                  <Coins size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('walletBalance')}</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-slate-900">{user.walletBalance || 0} <span className="text-sm font-normal text-slate-400">{t('coins')}</span></p>
                    <button 
                      onClick={onAddCoins}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 underline flex items-center gap-1"
                    >
                      <Plus size={10} /> {t('addCoins')}
                    </button>
                  </div>
                </div>
              </div>
              {(user.walletBalance || 0) < 1000 && (
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-lg text-[10px] font-bold border border-amber-100">
                    <AlertCircle size={12} />
                    {t('lowBalance')}
                  </div>
                </div>
              )}
            </motion.div>

            {/* Quick Stats */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center gap-4 col-span-1"
            >
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <Folder size={24} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('totalProjects')}</p>
                <p className="text-2xl font-bold text-slate-900">{projects.length}</p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center gap-4 col-span-1"
            >
              <div className="w-12 h-12 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center">
                <CreditCard size={24} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('totalBills')}</p>
                <p className="text-2xl font-bold text-slate-900">{bills.length}</p>
              </div>
            </motion.div>
          </div>

          {currentTab === 'projects' && (
            <>
              <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-4">
                  {user.logoUrl ? (
                    <img src={user.logoUrl || undefined} alt="Logo" className="w-16 h-16 rounded-xl object-contain bg-white border border-slate-100 shadow-sm" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
                      <Building2 size={32} />
                    </div>
                  )}
                  <div>
                    <h1 className="text-3xl font-bold text-slate-900">{user.companyName || t('dashboard')}</h1>
                    <p className="text-slate-500 mt-1">{t('manageProjectsDesc')}</p>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="animate-spin text-indigo-600" size={40} />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-8">
                  {/* Project Details / Images */}
                  <div className="w-full">
                    {selectedProject ? (
              <motion.div
                key={selectedProject.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8"
              >
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <div className="flex justify-between items-start">
                      <h2 className="text-2xl font-bold text-slate-900">{selectedProject.name}</h2>
                      <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                        {getStatusIcon(selectedProject.status)}
                        <span className="text-xs font-bold text-slate-700">{t(getStatusKey(selectedProject.status))}</span>
                      </div>
                    </div>
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('projectType')}</p>
                      <p className="text-xs font-bold text-indigo-600 truncate">
                        {selectedProject.projectType === 'Construction Project Drawing' ? t('construction') : t('interiorDesign')}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('subType')}</p>
                      <p className="text-xs font-bold text-slate-700 capitalize truncate">{t(selectedProject.subType.toLowerCase().replace(/\s+/g, ''))}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('builtUpArea')}</p>
                      <p className="text-xs font-bold text-slate-700 truncate">{formatNumber(selectedProject.totalBuiltUpArea)} {t('sqft')}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('northDirection')}</p>
                      <p className="text-xs font-bold text-slate-700 capitalize truncate">{t(selectedProject.northDirection.toLowerCase())}</p>
                    </div>
                  </div>
                    
                    {selectedProject.subType === 'Resident' && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg">
                          {selectedProject.bedrooms}{t('bedrooms').charAt(0)} {selectedProject.hall}{t('hall').charAt(0)} {selectedProject.kitchen}{t('kitchen').charAt(0)}
                        </span>
                        <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg capitalize">
                          {t(selectedProject.housingType.toLowerCase().replace(/\s+/g, ''))}
                        </span>
                        <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg">
                          {selectedProject.numberOfFloors} {t('floors')}
                        </span>
                      </div>
                    )}

                    <p className="text-slate-500 mt-4 text-sm leading-relaxed">{selectedProject.description}</p>
                    <div className="mt-4 flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${images.length >= 10 ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'}`}>
                        {images.length}/10 {t('siteImages')}
                      </span>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="file"
                      id="image-upload"
                      className="hidden"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      disabled={uploading}
                    />
                      <label
                        htmlFor="image-upload"
                        className={`flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg font-bold cursor-pointer hover:bg-indigo-100 transition-all ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {uploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                        {uploading ? t('uploading') : t('uploadImage')}
                      </label>
                  </div>
                </div>

                {/* Site Images Section */}
                <div className="mb-10">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">{t('sitePhotos')}</h3>
                  {images.length === 0 ? (
                    <div className="py-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100">
                      <ImageIcon className="mx-auto text-slate-300 mb-2" size={32} />
                      <p className="text-slate-500 text-sm">{t('noImagesUploaded')}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {images.map(image => (
                        <motion.div
                          layout
                          key={image.id}
                          className="group relative bg-slate-50 rounded-xl overflow-hidden border border-slate-100"
                        >
                          <img
                            src={image.url}
                            alt={image.caption}
                            className="w-full aspect-square object-cover transition-transform group-hover:scale-105"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                            <button
                              onClick={() => handleDeleteImage(image.id)}
                              className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-red-500 transition-colors"
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>
                          <div className="p-3 bg-white border-t border-slate-100">
                            <p className="text-xs font-medium text-slate-700 truncate">{image.caption}</p>
                            <p className="text-[10px] text-slate-400 mt-1">
                              {image.createdAt?.toDate().toLocaleDateString()}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Project Files Section */}
                <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">{t('adminSharedFiles')}</h3>
                  {projectFiles.length === 0 ? (
                    <div className="py-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100">
                      <FileText className="mx-auto text-slate-300 mb-2" size={32} />
                      <p className="text-slate-500 text-sm">{t('noFilesShared')}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {projectFiles.map(file => (
                        <div key={file.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl group hover:border-indigo-100 transition-all">
                          <div className="flex items-center gap-4 overflow-hidden">
                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-indigo-600 shadow-sm">
                              <FileText size={20} />
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-sm font-bold text-slate-700 truncate">{file.name}</p>
                              <p className="text-[10px] text-slate-400">{file.createdAt?.toDate().toLocaleDateString()}</p>
                            </div>
                          </div>
                          <a
                            href={file.url}
                            download={file.name}
                            className="flex items-center gap-2 bg-white text-indigo-600 px-4 py-2 rounded-lg text-xs font-bold border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                          >
                            <Download size={14} />
                            {t('download')}
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-sm">
                    <Camera className="text-slate-200 mb-6" size={64} />
                    <h2 className="text-xl font-bold text-slate-900">{t('selectProject')}</h2>
                    <p className="text-slate-500 mt-2 max-w-xs mx-auto text-sm">{t('selectProjectDesc')}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

        {currentTab === 'profile' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-slate-900">{t('companyProfile')}</h2>
              </div>
              <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-2xl">
                <div className="flex items-center gap-8 mb-8">
                  <div className="relative">
                    <div className="w-32 h-32 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                      {logoUrl ? (
                        <img src={logoUrl || undefined} alt={t('logoPreview')} className="w-full h-full object-contain" />
                      ) : (
                        <Building2 className="text-slate-300" size={48} />
                      )}
                    </div>
                    <label className="absolute -bottom-2 -right-2 p-2 bg-indigo-600 text-white rounded-xl cursor-pointer hover:bg-indigo-700 shadow-lg transition-all hover:scale-110">
                      <Camera size={20} />
                      <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                    </label>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{t('companyLogo')}</h3>
                    <p className="text-sm text-slate-500">{t('companyLogoDesc')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">{t('companyName')}</label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all"
                        placeholder={t('companyNamePlaceholder')}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">{t('mobileNumber')}</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                      <input
                        type="tel"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all"
                        placeholder={t('mobileNumberPlaceholder')}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">{t('gstNumber')}</label>
                    <div className="relative">
                      <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                      <input
                        type="text"
                        value={gstNumber}
                        onChange={(e) => setGstNumber(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all"
                        placeholder={t('gstNumberPlaceholder')}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">{t('address')}</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-4 text-slate-400" size={20} />
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 h-32 resize-none transition-all"
                      placeholder={t('addressPlaceholder')}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={updatingProfile || uploading}
                  className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                >
                  {updatingProfile ? t('saving') : t('saveChanges')}
                </button>
              </form>
            </motion.div>
          )}

          {currentTab === 'billing' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{t('billingHistory')}</h2>
                  <p className="text-slate-500 text-sm mt-1">{t('billingHistoryDesc')}</p>
                </div>
              </div>

              {bills.length === 0 ? (
                <div className="py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-100">
                  <CreditCard className="mx-auto text-slate-200 mb-4" size={64} />
                  <p className="text-slate-500 font-medium">{t('noBillingHistory')}</p>
                  <p className="text-slate-400 text-sm mt-1">{t('noBillingHistoryDesc')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-hidden border border-slate-100 rounded-2xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-bottom border-slate-100">
                          <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{t('date')}</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{t('project')}</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{t('amount')}</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">{t('action')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {bills.map(bill => (
                          <tr key={bill.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-6 py-4 text-sm text-slate-600">
                              {bill.createdAt?.toDate().toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm font-bold text-slate-900">{bill.projectName}</p>
                              <p className="text-[10px] text-slate-400">ID: {bill.id.substring(0, 8)}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm font-bold text-indigo-600">{formatNumber(bill.total)} {t('coins')}</p>
                              <p className="text-[10px] text-slate-400">{t('inclGst')}</p>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => downloadBill(bill)}
                                className="inline-flex items-center gap-2 bg-white text-indigo-600 px-4 py-2 rounded-lg text-xs font-bold border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                              >
                                <Download size={14} />
                                {t('downloadBill')}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-4">
                    {bills.map(bill => (
                      <div key={bill.id} className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              {bill.createdAt?.toDate().toLocaleDateString()}
                            </p>
                            <h4 className="font-bold text-slate-900">{bill.projectName}</h4>
                            <p className="text-[10px] text-slate-400">ID: {bill.id.substring(0, 8)}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-indigo-600">{formatNumber(bill.total)} {t('coins')}</p>
                            <p className="text-[10px] text-slate-400">{t('inclGst')}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => downloadBill(bill)}
                          className="w-full flex items-center justify-center gap-2 bg-white text-indigo-600 py-3 rounded-xl text-sm font-bold border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                        >
                          <Download size={16} />
                          {t('downloadInvoice')}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {currentTab === 'referral' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8"
            >
              <div className="max-w-3xl">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('referAndEarn')}</h2>
                <p className="text-slate-500 mb-8">{t('referAndEarnDesc')}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                  <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                    <div className="relative z-10">
                      <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest mb-2">{t('yourReferralCode')}</p>
                      <div className="flex items-center gap-4">
                        <h3 className="text-3xl font-mono font-bold tracking-tighter">{user.referralCode || t('generating')}</h3>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(user.referralCode || '');
                            alert(t('referralCodeCopied'));
                          }}
                          className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all backdrop-blur-md"
                        >
                          <Download size={20} />
                        </button>
                      </div>
                    </div>
                    <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                  </div>

                  <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 flex flex-col justify-center">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">{t('totalReferrals')}</p>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-4xl font-bold text-slate-900">{formatNumber(user.referralCount || 0)}</h3>
                      <p className="text-slate-500 text-sm font-medium">{t('friendsJoined')}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-slate-900">{t('howItWorks')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold">1</div>
                      <p className="text-sm font-bold text-slate-900">{t('shareYourCode')}</p>
                      <p className="text-xs text-slate-500 leading-relaxed">{t('shareYourCodeDesc')}</p>
                    </div>
                    <div className="space-y-3">
                      <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold">2</div>
                      <p className="text-sm font-bold text-slate-900">{t('theySignUp')}</p>
                      <p className="text-xs text-slate-500 leading-relaxed">{t('theySignUpDesc')}</p>
                    </div>
                    <div className="space-y-3">
                      <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold">3</div>
                      <p className="text-sm font-bold text-slate-900">{t('earnRewards')}</p>
                      <p className="text-xs text-slate-500 leading-relaxed">{t('earnRewardsDesc')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>

      {/* New Project Modal */}
      <AnimatePresence>
        {isNewProjectModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNewProjectModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900">{t('newProject')}</h2>
                <button onClick={() => setIsNewProjectModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleCreateProject} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">{t('projectName')}</label>
                  <input
                    type="text"
                    required
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder={t('projectNamePlaceholder')}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">{t('projectType')}</label>
                    <select
                      value={projectType}
                      onChange={(e) => {
                        const val = e.target.value as ProjectType;
                        setProjectType(val);
                        setSubType('Resident');
                      }}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="Construction Project Drawing">{t('construction')}</option>
                      <option value="Interior design Project Drawing">{t('interiorDesign')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">{t('subType')}</label>
                    <select
                      value={subType}
                      onChange={(e) => setSubType(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      {projectType === 'Construction Project Drawing' ? (
                        <>
                          <option value="Resident">{t('resident')}</option>
                          <option value="Commercial">{t('commercial')}</option>
                          <option value="Resi-Com">{t('resiCom')}</option>
                          <option value="Other">{t('other')}</option>
                        </>
                      ) : (
                        <>
                          <option value="Resident">{t('resident')}</option>
                          <option value="Office Design">{t('officeDesign')}</option>
                          <option value="Restaurant / Café Design">{t('restaurantCafeDesign')}</option>
                          <option value="Other">{t('other')}</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {subType === 'Resident' && (
                  <div className="space-y-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-indigo-600 uppercase mb-1">{t('bedrooms')}</label>
                        <input
                          type="number"
                          required
                          value={bedrooms}
                          onChange={(e) => setBedrooms(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-indigo-100 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-indigo-600 uppercase mb-1">{t('hall')}</label>
                        <input
                          type="number"
                          required
                          value={hall}
                          onChange={(e) => setHall(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-indigo-100 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-indigo-600 uppercase mb-1">{t('kitchen')}</label>
                        <input
                          type="number"
                          required
                          value={kitchen}
                          onChange={(e) => setKitchen(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-indigo-100 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-indigo-600 uppercase mb-1">{t('housingType')}</label>
                      <select
                        value={housingType}
                        onChange={(e) => setHousingType(e.target.value as HousingType)}
                        className="w-full px-3 py-2 bg-white border border-indigo-100 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="Row House">{t('rowHouse')}</option>
                        <option value="Duplex">{t('duplex')}</option>
                        <option value="Bungalow">{t('bungalow')}</option>
                        <option value="Villa">{t('villa')}</option>
                        <option value="Apartment">{t('apartment')}</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">{t('builtUpAreaSqft')}</label>
                    <input
                      type="number"
                      required
                      value={totalBuiltUpArea}
                      onChange={(e) => setTotalBuiltUpArea(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">{t('carpetAreaSqft')}</label>
                    <input
                      type="number"
                      required
                      value={totalCarpetArea}
                      onChange={(e) => setTotalCarpetArea(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">{t('floors')}</label>
                    <input
                      type="number"
                      required
                      value={numberOfFloors}
                      onChange={(e) => setNumberOfFloors(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">{t('landscaping')}</label>
                    <input
                      type="number"
                      value={landscapingArea}
                      onChange={(e) => setLandscapingArea(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">{t('compound')}</label>
                    <input
                      type="number"
                      value={compoundArea}
                      onChange={(e) => setCompoundArea(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">{t('northDirection')}</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['Up', 'Down', 'Left', 'Right'].map((dir) => (
                      <button
                        key={dir}
                        type="button"
                        onClick={() => setNorthDirection(dir as NorthDirection)}
                        className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                          northDirection === dir
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-200'
                        }`}
                      >
                        {t(dir.toLowerCase())}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">{t('description')}</label>
                  <textarea
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent h-20 resize-none"
                    placeholder={t('descriptionPlaceholder')}
                  />
                </div>

                {/* Cost Estimation & Wallet Check */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('baseDesignFee')}</p>
                    <p className="text-sm font-bold text-slate-700">{formatNumber(Math.round(currentEstimate / 1.18))} {t('coins')}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('gst18')}</p>
                    <p className="text-sm font-bold text-slate-700">{formatNumber(currentEstimate - Math.round(currentEstimate / 1.18))} {t('coins')}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                    <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">{t('totalCost')}</p>
                    <p className="text-lg font-bold text-indigo-600">{formatNumber(currentEstimate)} {t('coins')}</p>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('yourBalance')}</p>
                    <p className={`text-sm font-bold ${(user.walletBalance || 0) < currentEstimate ? 'text-red-500' : 'text-emerald-600'}`}>
                      {formatNumber(user.walletBalance || 0)} {t('coins')}
                    </p>
                  </div>
                  {(user.walletBalance || 0) < currentEstimate && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-[10px] font-bold">
                      <AlertCircle size={14} />
                      {t('insufficientBalance')}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={(user.walletBalance || 0) < currentEstimate}
                  className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('createProject')}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteProject}
        title={t('deleteProjectTitle')}
        message={t('deleteProjectMessage')}
        confirmText={t('deleteProject')}
        cancelText={t('keepProject')}
      />
    </div>
  );
}
