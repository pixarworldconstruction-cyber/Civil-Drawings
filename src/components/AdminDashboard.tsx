import { useState, useEffect } from 'react';
import { db, storage } from '../firebase';
import { collection, query, onSnapshot, getDocs, where, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Folder, Image as ImageIcon, ChevronRight, Search, Loader2, FileText, Upload, Trash2, Download, CheckCircle2, Clock, AlertCircle, Send, CheckCircle, FileEdit, Coins, Plus, Building2, Save, Menu, X, LayoutDashboard, Settings, LogOut } from 'lucide-react';
import { Project, ProjectImage, UserProfile, OperationType, ProjectFile, ProjectStatus, AdminProfile } from '../types';
import { handleFirestoreError } from '../utils';
import ConfirmationModal from './ConfirmationModal';
import PageEditor from './PageEditor';
import imageCompression from 'browser-image-compression';

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectImages, setProjectImages] = useState<ProjectImage[]>([]);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'contractors' | 'content' | 'adminProfile'>('contractors');
  const [adminAddCoins, setAdminAddCoins] = useState<string>('');
  const [isUpdatingWallet, setIsUpdatingWallet] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [adminProfile, setAdminProfile] = useState<AdminProfile>({
    companyName: '',
    address: '',
    mobileNumber: '',
    gstNumber: '',
    logoUrl: ''
  });
  const [savingAdminProfile, setSavingAdminProfile] = useState(false);
  const [uploadingAdminLogo, setUploadingAdminLogo] = useState(false);

  useEffect(() => {
    const fetchAdminProfile = async () => {
      try {
        const docRef = doc(db, 'siteContent', 'adminProfile');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setAdminProfile(docSnap.data() as AdminProfile);
        }
      } catch (error) {
        console.error('Error fetching admin profile:', error);
      }
    };
    fetchAdminProfile();
  }, []);

  const handleAdminProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAdminProfile(true);
    try {
      await setDoc(doc(db, 'siteContent', 'adminProfile'), adminProfile);
      alert('Profile updated successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'siteContent/adminProfile');
    } finally {
      setSavingAdminProfile(false);
    }
  };

  const handleAdminLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAdminLogo(true);
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

      const storageRef = ref(storage, `admin/logo_${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          null,
          (error) => reject(error),
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              setAdminProfile(prev => ({ ...prev, logoUrl: downloadURL }));
              alert('Admin logo uploaded successfully!');
              resolve();
            } catch (err) {
              reject(err);
            }
          }
        );
      });
    } catch (error) {
      console.error('Admin logo upload error:', error);
      alert('Admin logo upload failed');
    } finally {
      setUploadingAdminLogo(false);
    }
  };

  const getStatusTranslation = (status: ProjectStatus) => {
    switch (status) {
      case 'Project payment not processed': return 'Project payment not processed';
      case 'Payment received': return 'Payment received';
      case 'All Details verified': return 'All Details verified';
      case 'Data (photo/details) missing': return 'Data (photo/details) missing';
      case 'Project drawing in process': return 'Project drawing in process';
      case '1st preview sent': return '1st preview sent';
      case '2nd preview sent': return '2nd preview sent';
      case 'Working on revision': return 'Working on revision';
      case 'Project completed': return 'Project completed';
      default: return status;
    }
  };

  const projectStatuses: ProjectStatus[] = [
    'Project payment not processed',
    'Payment received',
    'All Details verified',
    'Data (photo/details) missing',
    'Project drawing in process',
    '1st preview sent',
    '2nd preview sent',
    'Working on revision',
    'Project completed'
  ];

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = snapshot.docs.map(doc => doc.data() as UserProfile);
      const filteredUsers = usersData.filter(u => u.role === 'user');
      setUsers(filteredUsers);
      
      // Sync selected user if they exist in the new data
      if (selectedUser) {
        const updatedUser = filteredUsers.find(u => u.uid === selectedUser.uid);
        if (updatedUser) setSelectedUser(updatedUser);
      }
      
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    return () => unsubscribe();
  }, [selectedUser]);

  useEffect(() => {
    if (!selectedUser) {
      setUserProjects([]);
      setSelectedProject(null);
      return;
    }

    const q = query(collection(db, 'projects'), where('userId', '==', selectedUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
      setUserProjects(projectsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'projects');
    });

    return () => unsubscribe();
  }, [selectedUser]);

  useEffect(() => {
    if (!selectedProject) {
      setProjectImages([]);
      setProjectFiles([]);
      return;
    }

    const qImages = query(collection(db, 'images'), where('projectId', '==', selectedProject.id));
    const unsubImages = onSnapshot(qImages, (snapshot) => {
      const imagesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProjectImage));
      setProjectImages(imagesData);
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !selectedProject) return;

    // Check file size (50MB per file)
    const MAX_SIZE = 50 * 1024 * 1024;
    const oversizedFiles = files.filter(file => file.size > MAX_SIZE);
    if (oversizedFiles.length > 0) {
      alert('File size exceeds 50MB limit');
      return;
    }

    setUploadingFile(true);
    try {
      const uploadPromises = files.map(file => {
        return new Promise<void>((resolve, reject) => {
          const storageRef = ref(storage, `files/${selectedProject.id}/${Date.now()}_${file.name}`);
          const uploadTask = uploadBytesResumable(storageRef, file);

          uploadTask.on(
            'state_changed',
            null,
            (error) => reject(error),
            async () => {
              try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                await addDoc(collection(db, 'files'), {
                  projectId: selectedProject.id,
                  name: file.name,
                  url: downloadURL,
                  type: file.type,
                  createdAt: serverTimestamp()
                });
                resolve();
              } catch (err) {
                reject(err);
              }
            }
          );
        });
      });

      await Promise.all(uploadPromises);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'files');
    } finally {
      setUploadingFile(false);
      // Reset input
      e.target.value = '';
    }
  };

  const deleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    try {
      await deleteDoc(doc(db, 'files', fileId));
      alert('File deleted successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'files');
      alert('Error deleting file');
    }
  };

  const handleStatusUpdate = async (projectId: string, newStatus: ProjectStatus) => {
    setUpdatingStatus(projectId);
    try {
      await updateDoc(doc(db, 'projects', projectId), {
        status: newStatus
      });
      alert('Status updated successfully!');
      // Mock email notification
      console.log(`Email sent to ${selectedUser?.email}: Project "${selectedProject?.name}" status updated to "${newStatus}"`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}`);
      alert('Error updating status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    try {
      await deleteDoc(doc(db, 'projects', projectToDelete));
      if (selectedProject?.id === projectToDelete) setSelectedProject(null);
      setProjectToDelete(null);
      alert('File deleted successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `projects/${projectToDelete}`);
      alert('Error deleting file');
    }
  };

  const handleAdminAddCoins = async () => {
    if (!selectedUser || !adminAddCoins) return;
    const amount = parseInt(adminAddCoins);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setIsUpdatingWallet(true);
    try {
      const userRef = doc(db, 'users', selectedUser.uid);
      await updateDoc(userRef, {
        walletBalance: (selectedUser.walletBalance || 0) + amount
      });
      setAdminAddCoins('');
      alert(`${amount} coins added to ${selectedUser.displayName || selectedUser.email}'s wallet`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${selectedUser.uid}`);
      alert('Error adding coins');
    } finally {
      setIsUpdatingWallet(false);
    }
  };

  const filteredUsers = users.filter(u =>
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Top Bar */}
      <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
            <LayoutDashboard size={20} />
          </div>
          <span className="font-bold text-slate-900">{t('admin')}</span>
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
        <aside className={`fixed lg:sticky top-0 lg:top-0 left-0 h-screen w-64 bg-white border-r border-slate-200 z-50 transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-6 h-full flex flex-col">
            <div className="flex items-center gap-3 mb-10">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                <LayoutDashboard size={24} />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 leading-tight">{t('adminPanel')}</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t('managementSuite')}</p>
              </div>
            </div>

            <nav className="space-y-1 flex-1">
              <button
                onClick={() => { setActiveTab('contractors'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                  activeTab === 'contractors' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Users size={20} />
                {t('contractors')}
              </button>
              <button
                onClick={() => { setActiveTab('content'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                  activeTab === 'content' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Settings size={20} />
                {t('pageEditor')}
              </button>
              <button
                onClick={() => { setActiveTab('adminProfile'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                  activeTab === 'adminProfile' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Building2 size={20} />
                {t('adminProfile')}
              </button>
            </nav>

            <div className="mt-auto pt-6 border-t border-slate-50">
              <button
                onClick={() => window.location.reload()}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
              >
                <LogOut size={20} />
                {t('logout')}
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('adminConsole')}</h1>
          <p className="text-slate-500 mt-1">{t('monitorContractors')}</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('contractors')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'contractors'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users size={18} />
            {t('contractors')}
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'content'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileEdit size={18} />
            {t('pageContent')}
          </button>
          <button
            onClick={() => setActiveTab('adminProfile')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'adminProfile'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Building2 size={18} />
            {t('adminProfile')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-indigo-600" size={40} />
        </div>
      ) : activeTab === 'content' ? (
        <PageEditor />
      ) : activeTab === 'adminProfile' ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-8">{t('adminCompanyProfile')}</h2>
          <form onSubmit={handleAdminProfileUpdate} className="space-y-6 max-w-2xl">
            <div className="flex items-center gap-8 mb-8">
              <div className="relative">
                <div className="w-32 h-32 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                  {adminProfile.logoUrl ? (
                    <img src={adminProfile.logoUrl || undefined} alt={t('logoPreview')} className="w-full h-full object-contain" />
                  ) : (
                    <ImageIcon className="text-slate-300" size={48} />
                  )}
                </div>
                <label className="absolute -bottom-2 -right-2 p-2 bg-indigo-600 text-white rounded-xl cursor-pointer hover:bg-indigo-700 shadow-lg transition-all hover:scale-110">
                  {uploadingAdminLogo ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
                  <input type="file" className="hidden" accept="image/*" onChange={handleAdminLogoUpload} disabled={uploadingAdminLogo} />
                </label>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{t('adminCompanyLogo')}</h3>
                <p className="text-sm text-slate-500">{t('logoInvoices')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">{t('companyName')}</label>
                <input
                  type="text"
                  value={adminProfile.companyName}
                  onChange={(e) => setAdminProfile(prev => ({ ...prev, companyName: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder={t('companyNamePlaceholder')}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">{t('mobileNumber')}</label>
                <input
                  type="tel"
                  value={adminProfile.mobileNumber}
                  onChange={(e) => setAdminProfile(prev => ({ ...prev, mobileNumber: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder={t('mobileNumberPlaceholder')}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">{t('gstNumber')}</label>
                <input
                  type="text"
                  value={adminProfile.gstNumber}
                  onChange={(e) => setAdminProfile(prev => ({ ...prev, gstNumber: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder={t('gstNumberPlaceholder')}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">{t('address')}</label>
              <textarea
                value={adminProfile.address}
                onChange={(e) => setAdminProfile(prev => ({ ...prev, address: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 h-32 resize-none transition-all"
                placeholder={t('addressPlaceholder')}
                required
              />
            </div>

            <button
              type="submit"
              disabled={savingAdminProfile || uploadingAdminLogo}
              className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 flex items-center gap-2"
            >
              {savingAdminProfile ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              {savingAdminProfile ? t('uploading') : t('saveAdminProfile')}
            </button>
          </form>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Users List */}
          <div className="lg:col-span-3 space-y-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder={t('searchContractors')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">{t('contractors')}</h3>
              {filteredUsers.map(u => (
                <div
                  key={u.uid}
                  onClick={() => { setSelectedUser(u); setSelectedProject(null); }}
                  className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between group ${
                    selectedUser?.uid === u.uid
                      ? 'bg-indigo-50 border-indigo-200'
                      : 'bg-white border-slate-100 hover:border-indigo-100'
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className={`text-sm font-bold truncate ${selectedUser?.uid === u.uid ? 'text-indigo-900' : 'text-slate-700'}`}>
                      {u.displayName || t('unnamedContractor')}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                  </div>
                  <ChevronRight size={14} className={selectedUser?.uid === u.uid ? 'text-indigo-600' : 'text-slate-300'} />
                </div>
              ))}
            </div>
          </div>

          {/* User Projects & Wallet */}
          <div className="lg:col-span-3 space-y-8">
            {/* Wallet Management */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">{t('walletManagement')}</h3>
              {!selectedUser ? (
                <div className="bg-slate-50 rounded-xl p-8 text-center border-2 border-dashed border-slate-200">
                  <Coins className="mx-auto text-slate-300 mb-2" size={32} />
                  <p className="text-xs text-slate-500">{t('selectContractorToManageWallet')}</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('currentBalance')}</p>
                    <p className="text-xl font-bold text-emerald-600">{formatNumber(selectedUser.walletBalance || 0)} {t('coins')}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('addCoinsManually')}</p>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder={t('amount')}
                        value={adminAddCoins}
                        onChange={(e) => setAdminAddCoins(e.target.value)}
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <button
                        onClick={handleAdminAddCoins}
                        disabled={isUpdatingWallet || !adminAddCoins}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-1"
                      >
                        {isUpdatingWallet ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        {t('add')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">{t('myProjects')}</h3>
              {!selectedUser ? (
                <div className="bg-slate-50 rounded-xl p-8 text-center border-2 border-dashed border-slate-200">
                  <Folder className="mx-auto text-slate-300 mb-2" size={32} />
                  <p className="text-xs text-slate-500">{t('selectContractorToViewProjects')}</p>
                </div>
              ) : userProjects.length === 0 ? (
                <div className="bg-slate-50 rounded-xl p-8 text-center border-2 border-dashed border-slate-200">
                  <Folder className="mx-auto text-slate-300 mb-2" size={32} />
                  <p className="text-xs text-slate-500">{t('noProjectsFound')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {userProjects.map(p => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedProject(p)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between group ${
                        selectedProject?.id === p.id
                          ? 'bg-indigo-50 border-indigo-200'
                          : 'bg-white border-slate-100 hover:border-indigo-100'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <p className={`text-sm font-bold truncate ${selectedProject?.id === p.id ? 'text-indigo-900' : 'text-slate-700'}`}>
                          {p.name}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">{p.createdAt?.toDate().toLocaleDateString()}</p>
                      </div>
                      <ChevronRight size={14} className={selectedProject?.id === p.id ? 'text-indigo-600' : 'text-slate-300'} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Project Content (Details, Images & Files) */}
          <div className="lg:col-span-6 space-y-8">
            {/* Project Details */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('projectDetails')}</h3>
              {!selectedProject ? (
                <div className="bg-slate-50 rounded-xl p-10 text-center border-2 border-dashed border-slate-200">
                  <FileText className="mx-auto text-slate-300 mb-2" size={32} />
                  <p className="text-xs text-slate-500">{t('selectProjectToViewDetails')}</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('projectName')}</p>
                      <p className="text-sm font-bold text-slate-900">{selectedProject.name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('projectType')}</p>
                      <p className="text-sm font-bold text-indigo-600">{selectedProject.projectType === 'Construction Project Drawing' ? t('constructionProjectDrawing') : t('interiorDesignProjectDrawing')}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{t('projectStatus')}</p>
                      <div className="flex flex-wrap gap-2">
                        <select
                          value={selectedProject.status || 'Project payment not processed'}
                          onChange={(e) => handleStatusUpdate(selectedProject.id, e.target.value as ProjectStatus)}
                          disabled={updatingStatus === selectedProject.id}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
                        >
                          {projectStatuses.map(status => (
                            <option key={status} value={status}>{getStatusTranslation(status)}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('subType')}</p>
                      <p className="text-sm font-medium text-slate-700 capitalize">{t(selectedProject.subType.toLowerCase().replace(/\s+/g, '') as any)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('northDirection')}</p>
                      <p className="text-sm font-medium text-slate-700 capitalize">{t(selectedProject.northDirection.toLowerCase() as any)}</p>
                    </div>
                  </div>

                  {selectedProject.subType === 'Resident' && (
                    <div className="pt-4 border-t border-slate-50">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">{t('residentSpecifications')}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-slate-50 p-3 rounded-lg">
                          <p className="text-[9px] font-bold text-slate-400 uppercase">{t('bedrooms')}</p>
                          <p className="text-lg font-bold text-slate-900">{formatNumber(selectedProject.bedrooms)}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg">
                          <p className="text-[9px] font-bold text-slate-400 uppercase">{t('hall')}</p>
                          <p className="text-lg font-bold text-slate-900">{formatNumber(selectedProject.hall)}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg">
                          <p className="text-[9px] font-bold text-slate-400 uppercase">{t('kitchen')}</p>
                          <p className="text-lg font-bold text-slate-900">{formatNumber(selectedProject.kitchen)}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg">
                          <p className="text-[9px] font-bold text-slate-400 uppercase">{t('housing')}</p>
                          <p className="text-sm font-bold text-slate-900 capitalize">{t(selectedProject.housingType.toLowerCase().replace(/\s+/g, '') as any)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-50">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">{t('measurementsAndAreas')}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">{t('builtUpArea')}</p>
                        <p className="text-sm font-bold text-slate-900">{formatNumber(selectedProject.totalBuiltUpArea)} <span className="text-[10px] font-normal text-slate-500">{t('sqft')}</span></p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">{t('carpetArea')}</p>
                        <p className="text-sm font-bold text-slate-900">{formatNumber(selectedProject.totalCarpetArea)} <span className="text-[10px] font-normal text-slate-500">{t('sqft')}</span></p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">{t('floors')}</p>
                        <p className="text-sm font-bold text-slate-900">{formatNumber(selectedProject.numberOfFloors)}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">{t('landscaping')}</p>
                        <p className="text-sm font-bold text-slate-900">{formatNumber(selectedProject.landscapingArea)} <span className="text-[10px] font-normal text-slate-500">{t('sqft')}</span></p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">{t('compound')}</p>
                        <p className="text-sm font-bold text-slate-900">{formatNumber(selectedProject.compoundArea)} <span className="text-[10px] font-normal text-slate-500">{t('sqft')}</span></p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-50 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <Clock size={12} />
                      {t('created')}: {selectedProject.createdAt?.toDate().toLocaleDateString()}
                    </div>
                    <button
                      onClick={() => {
                        setProjectToDelete(selectedProject.id);
                        setIsDeleteModalOpen(true);
                      }}
                      className="flex items-center gap-2 text-red-500 hover:text-red-700 text-xs font-bold transition-colors"
                    >
                      <Trash2 size={14} />
                      {t('deleteProject')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Site Images */}
            <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('siteImages')}</h3>
                {selectedProject && (
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    {formatNumber(projectImages.length)}/{formatNumber(10)}
                  </span>
                )}
              </div>
              {!selectedProject ? (
                <div className="bg-slate-50 rounded-xl p-10 text-center border-2 border-dashed border-slate-200">
                  <ImageIcon className="mx-auto text-slate-300 mb-2" size={32} />
                  <p className="text-xs text-slate-500">{t('selectProjectToViewImages')}</p>
                </div>
              ) : projectImages.length === 0 ? (
                <div className="bg-slate-50 rounded-xl p-10 text-center border-2 border-dashed border-slate-200">
                  <ImageIcon className="mx-auto text-slate-300 mb-2" size={32} />
                  <p className="text-xs text-slate-500">{t('noImagesUploaded')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {projectImages.map(img => (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      key={img.id}
                      className="group relative bg-white rounded-xl overflow-hidden border border-slate-100 shadow-sm"
                    >
                      <img
                        src={img.url}
                        alt={img.caption}
                        className="w-full aspect-square object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="p-2">
                        <p className="text-[10px] font-medium text-slate-700 truncate">{img.caption}</p>
                        <p className="text-[8px] text-slate-400">{img.createdAt?.toDate().toLocaleDateString()}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Project Files */}
            <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('projectFiles')}</h3>
                {selectedProject && (
                  <label className="cursor-pointer bg-indigo-600 text-white px-3 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 hover:bg-indigo-700 transition-colors">
                    <Upload size={12} />
                    {uploadingFile ? t('uploading') : t('uploadFiles')}
                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" multiple onChange={handleFileUpload} disabled={uploadingFile} />
                  </label>
                )}
              </div>
              {!selectedProject ? (
                <div className="bg-slate-50 rounded-xl p-10 text-center border-2 border-dashed border-slate-200">
                  <FileText className="mx-auto text-slate-300 mb-2" size={32} />
                  <p className="text-xs text-slate-500">{t('selectProjectToManageFiles')}</p>
                </div>
              ) : projectFiles.length === 0 ? (
                <div className="bg-slate-50 rounded-xl p-10 text-center border-2 border-dashed border-slate-200">
                  <FileText className="mx-auto text-slate-300 mb-2" size={32} />
                  <p className="text-xs text-slate-500">{t('noFilesUploaded')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {projectFiles.map(file => (
                    <div key={file.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl group hover:border-indigo-100 transition-all">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                          <FileText size={16} />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                          <p className="text-[10px] text-slate-400">{file.createdAt?.toDate().toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={file.url}
                          download={file.name}
                          className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                          title={t('download')}
                        >
                          <Download size={16} />
                        </a>
                          <button
                           onClick={() => deleteFile(file.id)}
                           className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                           title={t('delete')}
                         >
                           <Trash2 size={16} />
                         </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </main>
      </div>
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteProject}
        title={t('deleteProjectTitle')}
        message={t('deleteProjectMessage').replace('{name}', selectedProject?.name || '')}
        confirmText={t('deleteProjectConfirm')}
        cancelText={t('deleteProjectCancel')}
      />
    </div>
  );
}
