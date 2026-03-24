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
      alert('Admin profile updated successfully!');
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
      alert('Failed to upload logo.');
    } finally {
      setUploadingAdminLogo(false);
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
      alert('Some files are too large. Maximum size per file is 50MB.');
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
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'files');
    }
  };

  const handleStatusUpdate = async (projectId: string, newStatus: ProjectStatus) => {
    setUpdatingStatus(projectId);
    try {
      await updateDoc(doc(db, 'projects', projectId), {
        status: newStatus
      });
      // Mock email notification
      console.log(`Email sent to ${selectedUser?.email}: Project "${selectedProject?.name}" status updated to "${newStatus}"`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}`);
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
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `projects/${projectToDelete}`);
    }
  };

  const handleAdminAddCoins = async () => {
    if (!selectedUser || !adminAddCoins) return;
    const amount = parseInt(adminAddCoins);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid positive amount');
      return;
    }

    setIsUpdatingWallet(true);
    try {
      const userRef = doc(db, 'users', selectedUser.uid);
      await updateDoc(userRef, {
        walletBalance: (selectedUser.walletBalance || 0) + amount
      });
      setAdminAddCoins('');
      alert(`Successfully added ${amount} coins to ${selectedUser.displayName || selectedUser.email}'s wallet.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${selectedUser.uid}`);
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
          <span className="font-bold text-slate-900">Admin</span>
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
                <h2 className="font-bold text-slate-900 leading-tight">Admin Panel</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Management Suite</p>
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
                Contractors
              </button>
              <button
                onClick={() => { setActiveTab('content'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                  activeTab === 'content' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Settings size={20} />
                Page Editor
              </button>
              <button
                onClick={() => { setActiveTab('adminProfile'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                  activeTab === 'adminProfile' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Building2 size={20} />
                Admin Profile
              </button>
            </nav>

            <div className="mt-auto pt-6 border-t border-slate-50">
              <button
                onClick={() => window.location.reload()}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
              >
                <LogOut size={20} />
                Logout
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Admin Console</h1>
          <p className="text-slate-500 mt-1">Monitor all contractors and their project activities</p>
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
            Contractors
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
            Page Content
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
            Admin Profile
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
          <h2 className="text-2xl font-bold text-slate-900 mb-8">Admin Company Profile</h2>
          <form onSubmit={handleAdminProfileUpdate} className="space-y-6 max-w-2xl">
            <div className="flex items-center gap-8 mb-8">
              <div className="relative">
                <div className="w-32 h-32 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                  {adminProfile.logoUrl ? (
                    <img src={adminProfile.logoUrl || undefined} alt="Logo Preview" className="w-full h-full object-contain" />
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
                <h3 className="text-lg font-bold text-slate-900">Admin Company Logo</h3>
                <p className="text-sm text-slate-500">This logo will appear on all customer invoices.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Company Name</label>
                <input
                  type="text"
                  value={adminProfile.companyName}
                  onChange={(e) => setAdminProfile(prev => ({ ...prev, companyName: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="e.g. Admin Architectural Studio"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Mobile Number</label>
                <input
                  type="tel"
                  value={adminProfile.mobileNumber}
                  onChange={(e) => setAdminProfile(prev => ({ ...prev, mobileNumber: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="+91 98765 43210"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">GST Number</label>
                <input
                  type="text"
                  value={adminProfile.gstNumber}
                  onChange={(e) => setAdminProfile(prev => ({ ...prev, gstNumber: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="22AAAAA0000A1Z5"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Address</label>
              <textarea
                value={adminProfile.address}
                onChange={(e) => setAdminProfile(prev => ({ ...prev, address: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 h-32 resize-none transition-all"
                placeholder="Full office address..."
                required
              />
            </div>

            <button
              type="submit"
              disabled={savingAdminProfile || uploadingAdminLogo}
              className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 flex items-center gap-2"
            >
              {savingAdminProfile ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              {savingAdminProfile ? 'Saving...' : 'Save Admin Profile'}
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
                placeholder="Search contractors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">Contractors</h3>
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
                      {u.displayName || 'Unnamed Contractor'}
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
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">Wallet Management</h3>
              {!selectedUser ? (
                <div className="bg-slate-50 rounded-xl p-8 text-center border-2 border-dashed border-slate-200">
                  <Coins className="mx-auto text-slate-300 mb-2" size={32} />
                  <p className="text-xs text-slate-500">Select a contractor to manage wallet</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Balance</p>
                    <p className="text-xl font-bold text-emerald-600">{selectedUser.walletBalance || 0} Coins</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Add Coins Manually</p>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Amount"
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
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">Projects</h3>
              {!selectedUser ? (
                <div className="bg-slate-50 rounded-xl p-8 text-center border-2 border-dashed border-slate-200">
                  <Folder className="mx-auto text-slate-300 mb-2" size={32} />
                  <p className="text-xs text-slate-500">Select a contractor to view their projects</p>
                </div>
              ) : userProjects.length === 0 ? (
                <div className="bg-slate-50 rounded-xl p-8 text-center border-2 border-dashed border-slate-200">
                  <Folder className="mx-auto text-slate-300 mb-2" size={32} />
                  <p className="text-xs text-slate-500">No projects found for this contractor</p>
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
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">Project Details</h3>
              {!selectedProject ? (
                <div className="bg-slate-50 rounded-xl p-10 text-center border-2 border-dashed border-slate-200">
                  <FileText className="mx-auto text-slate-300 mb-2" size={32} />
                  <p className="text-xs text-slate-500">Select a project to view details</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Project Name</p>
                      <p className="text-sm font-bold text-slate-900">{selectedProject.name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Project Type</p>
                      <p className="text-sm font-bold text-indigo-600">{selectedProject.projectType === 'Construction Project Drawing' ? 'Construction Project Drawing' : 'Interior Design Project Drawing'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Project Status</p>
                      <div className="flex flex-wrap gap-2">
                        <select
                          value={selectedProject.status || 'Project payment not processed'}
                          onChange={(e) => handleStatusUpdate(selectedProject.id, e.target.value as ProjectStatus)}
                          disabled={updatingStatus === selectedProject.id}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
                        >
                          {projectStatuses.map(status => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Sub Type</p>
                      <p className="text-sm font-medium text-slate-700 capitalize">{selectedProject.subType}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">North Direction</p>
                      <p className="text-sm font-medium text-slate-700 capitalize">{selectedProject.northDirection}</p>
                    </div>
                  </div>

                  {selectedProject.subType === 'Resident' && (
                    <div className="pt-4 border-t border-slate-50">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Resident Specifications</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-slate-50 p-3 rounded-lg">
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Bedrooms</p>
                          <p className="text-lg font-bold text-slate-900">{selectedProject.bedrooms}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg">
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Hall</p>
                          <p className="text-lg font-bold text-slate-900">{selectedProject.hall}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg">
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Kitchen</p>
                          <p className="text-lg font-bold text-slate-900">{selectedProject.kitchen}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg">
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Housing</p>
                          <p className="text-sm font-bold text-slate-900 capitalize">{selectedProject.housingType}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-50">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Measurements & Areas</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Built-up Area</p>
                        <p className="text-sm font-bold text-slate-900">{selectedProject.totalBuiltUpArea} <span className="text-[10px] font-normal text-slate-500">sqft</span></p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Carpet Area</p>
                        <p className="text-sm font-bold text-slate-900">{selectedProject.totalCarpetArea} <span className="text-[10px] font-normal text-slate-500">sqft</span></p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Floors</p>
                        <p className="text-sm font-bold text-slate-900">{selectedProject.numberOfFloors}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Landscaping</p>
                        <p className="text-sm font-bold text-slate-900">{selectedProject.landscapingArea} <span className="text-[10px] font-normal text-slate-500">sqft</span></p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Compound</p>
                        <p className="text-sm font-bold text-slate-900">{selectedProject.compoundArea} <span className="text-[10px] font-normal text-slate-500">sqft</span></p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-50 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <Clock size={12} />
                      Created: {selectedProject.createdAt?.toDate().toLocaleDateString()}
                    </div>
                    <button
                      onClick={() => {
                        setProjectToDelete(selectedProject.id);
                        setIsDeleteModalOpen(true);
                      }}
                      className="flex items-center gap-2 text-red-500 hover:text-red-700 text-xs font-bold transition-colors"
                    >
                      <Trash2 size={14} />
                      Delete Project
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Site Images */}
            <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Site Images</h3>
                {selectedProject && (
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    {projectImages.length}/10
                  </span>
                )}
              </div>
              {!selectedProject ? (
                <div className="bg-slate-50 rounded-xl p-10 text-center border-2 border-dashed border-slate-200">
                  <ImageIcon className="mx-auto text-slate-300 mb-2" size={32} />
                  <p className="text-xs text-slate-500">Select a project to view images</p>
                </div>
              ) : projectImages.length === 0 ? (
                <div className="bg-slate-50 rounded-xl p-10 text-center border-2 border-dashed border-slate-200">
                  <ImageIcon className="mx-auto text-slate-300 mb-2" size={32} />
                  <p className="text-xs text-slate-500">No images uploaded</p>
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
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Project Files (PDF/Docs)</h3>
                {selectedProject && (
                  <label className="cursor-pointer bg-indigo-600 text-white px-3 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 hover:bg-indigo-700 transition-colors">
                    <Upload size={12} />
                    {uploadingFile ? 'Uploading...' : 'Upload Files'}
                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" multiple onChange={handleFileUpload} disabled={uploadingFile} />
                  </label>
                )}
              </div>
              {!selectedProject ? (
                <div className="bg-slate-50 rounded-xl p-10 text-center border-2 border-dashed border-slate-200">
                  <FileText className="mx-auto text-slate-300 mb-2" size={32} />
                  <p className="text-xs text-slate-500">Select a project to manage files</p>
                </div>
              ) : projectFiles.length === 0 ? (
                <div className="bg-slate-50 rounded-xl p-10 text-center border-2 border-dashed border-slate-200">
                  <FileText className="mx-auto text-slate-300 mb-2" size={32} />
                  <p className="text-xs text-slate-500">No files uploaded for this project</p>
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
                          title="Download"
                        >
                          <Download size={16} />
                        </a>
                        <button
                          onClick={() => deleteFile(file.id)}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                          title="Delete"
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
        title="Delete Project?"
        message={`Are you sure you want to delete "${selectedProject?.name}"? This action cannot be undone and will remove all associated images and files.`}
        confirmText="Delete Project"
        cancelText="Keep Project"
      />
    </div>
  );
}
