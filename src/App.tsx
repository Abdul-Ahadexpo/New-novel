import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'react-hot-toast';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, updateProfile } from 'firebase/auth';
import { getDatabase, ref, onValue, push, remove, set, get } from 'firebase/database';
import { Book, Heart, Moon, Sun, LogOut, Plus, ArrowLeft, Edit, Trash, Share2, FolderEdit as UserEdit, Shield, Download, Upload, Search, Menu, X, Image as ImageIcon } from 'lucide-react';

const firebaseConfig = {
  apiKey: "AIzaSyA3kVwiDyZM172-vMdlP8asqv8bE55_E_8",
  authDomain: "doro-novel.firebaseapp.com",
  databaseURL: "https://doro-novel-default-rtdb.firebaseio.com",
  projectId: "doro-novel",
  storageBucket: "doro-novel.firebasestorage.app",
  messagingSenderId: "920808024384",
  appId: "1:920808024384:web:c01add4641e996030c32a5",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const IMGBB_API_KEY = "2a78816b4b5cc1c4c3b18f8f258eda60";

function App() {
  const [user, setUser] = useState(null);
  const [novels, setNovels] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [currentView, setCurrentView] = useState('novels');
  const [selectedNovel, setSelectedNovel] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true';
    }
    return true;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [editingNovel, setEditingNovel] = useState(null);
  const [newUsername, setNewUsername] = useState('');
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [chapters, setChapters] = useState([{ content: '' }]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Check for shared novel ID in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedNovelId = params.get('novel');
    if (sharedNovelId) {
      const novelRef = ref(db, `novels/${sharedNovelId}`);
      get(novelRef).then((snapshot) => {
        if (snapshot.exists()) {
          const novel = { id: sharedNovelId, ...snapshot.val() };
          setSelectedNovel(novel);
          setCurrentView('chapter');
        }
      });
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('darkMode', isDarkMode.toString());
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });

    // Load novels for everyone (including guests)
    const novelsRef = ref(db, 'novels');
    onValue(novelsRef, (snapshot) => {
      const data = snapshot.val();
      const novelsList = data ? Object.entries(data).map(([id, novel]) => ({
        id,
        ...novel,
        likes: novel.likes ? Object.keys(novel.likes).length : 0,
        isLiked: user && novel.likes ? novel.likes[user.uid] : false
      })).sort((a, b) => b.createdAt - a.createdAt) : [];
      setNovels(novelsList);
    });

    return () => unsubscribe();
  }, [user]);

  const uploadImageToImgBB = async (file) => {
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('key', IMGBB_API_KEY);

      const response = await fetch('https://api.imgbb.com/1/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (result.success) {
        setCoverImage(result.data.url);
        toast.success('Cover image uploaded successfully!');
        return result.data.url;
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      toast.error('Failed to upload image. Please try again.');
      console.error('Image upload error:', error);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 32 * 1024 * 1024) { // 32MB limit
        toast.error('Image size must be less than 32MB');
        return;
      }
      uploadImageToImgBB(file);
    }
  };

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        const userRef = ref(db, `users/${result.user.uid}`);
        await set(userRef, {
          name: result.user.displayName,
          email: result.user.email,
          photoURL: result.user.photoURL,
          lastLogin: Date.now()
        });
      }
      toast.success('Welcome to NovelVerse!');
      setIsMenuOpen(false);
    } catch (error) {
      toast.error('Login failed. Please try again.');
      console.error('Login error:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out successfully');
      setCurrentView('novels');
      setEditingNovel(null);
      setIsAdmin(false);
      setIsMenuOpen(false);
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  const handleAdminLogin = () => {
    if (adminPassword === 'Niharuja1829') {
      setIsAdmin(true);
      setShowAdminLogin(false);
      setAdminPassword('');
      toast.success('Admin access granted');
    } else {
      toast.error('Invalid admin password');
      setAdminPassword('');
    }
  };

  const exportData = async () => {
    try {
      const novelsSnapshot = await get(ref(db, 'novels'));
      const novelsData = novelsSnapshot.val() || {};

      const usersSnapshot = await get(ref(db, 'users'));
      const usersData = usersSnapshot.val() || {};

      const commentsSnapshot = await get(ref(db, 'comments'));
      const commentsData = commentsSnapshot.val() || {};

      const exportData = {
        novels: novelsData,
        users: usersData,
        comments: commentsData,
        exportDate: new Date().toISOString(),
        version: '1.0'
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `novelverse-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Data exported successfully!');
    } catch (error) {
      toast.error('Failed to export data');
      console.error('Export error:', error);
    }
  };

  const importData = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        
        if (!importedData.novels || !importedData.users) {
          toast.error('Invalid backup file format');
          return;
        }

        const confirmImport = window.confirm(
          'This will overwrite all existing data. Are you sure you want to continue?'
        );
        
        if (!confirmImport) return;

        if (importedData.novels) {
          await set(ref(db, 'novels'), importedData.novels);
        }

        if (importedData.users) {
          await set(ref(db, 'users'), importedData.users);
        }

        if (importedData.comments) {
          await set(ref(db, 'comments'), importedData.comments);
        }

        toast.success('Data imported successfully!');
        
        setTimeout(() => {
          window.location.reload();
        }, 1000);

      } catch (error) {
        toast.error('Failed to import data. Please check the file format.');
        console.error('Import error:', error);
      }
    };
    
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleUpdateUsername = async () => {
    if (!newUsername.trim()) {
      toast.error('Please enter a valid username');
      return;
    }

    try {
      await updateProfile(auth.currentUser, {
        displayName: newUsername
      });

      const userNovels = novels.filter(novel => novel.userId === user.uid);
      const updates = {};
      userNovels.forEach(novel => {
        updates[`novels/${novel.id}/userName`] = newUsername;
      });
      await set(ref(db), updates);

      setIsEditingUsername(false);
      setNewUsername('');
      toast.success('Username updated successfully!');
    } catch (error) {
      toast.error('Failed to update username');
    }
  };

  const handleShare = (novelId) => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?novel=${novelId}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Share link copied to clipboard!');
  };

  const handlePostNovel = async () => {
    if (!user) {
      toast.error('Please login to post novels');
      return;
    }

    if (!title.trim() || !chapters.some(ch => ch.content.trim())) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      if (editingNovel) {
        const novelRef = ref(db, `novels/${editingNovel}`);
        const snapshot = await get(novelRef);
        const existingLikes = snapshot.val()?.likes || {};

        await set(novelRef, {
          userId: user.uid,
          userName: user.displayName,
          userPhoto: user.photoURL,
          title: title.trim(),
          chapters: chapters.map(ch => ({ content: ch.content.trim() })),
          coverImage: coverImage || '',
          createdAt: Date.now(),
          likes: existingLikes
        });
        setEditingNovel(null);
        toast.success('Novel updated successfully!');
      } else {
        const novelsRef = ref(db, 'novels');
        await push(novelsRef, {
          userId: user.uid,
          userName: user.displayName,
          userPhoto: user.photoURL,
          title: title.trim(),
          chapters: chapters.map(ch => ({ content: ch.content.trim() })),
          coverImage: coverImage || '',
          createdAt: Date.now(),
          likes: {}
        });
        toast.success('Novel posted successfully!');
      }

      setTitle('');
      setChapters([{ content: '' }]);
      setCoverImage('');
      setCurrentView('novels');
    } catch (error) {
      toast.error(editingNovel ? 'Failed to update novel' : 'Failed to post novel');
    }
  };

  const handleEdit = (novel) => {
    setTitle(novel.title);
    setChapters(novel.chapters || [{ content: novel.content || '' }]);
    setCoverImage(novel.coverImage || '');
    setEditingNovel(novel.id);
    setCurrentView('upload');
    setIsMenuOpen(false);
  };

  const handleDelete = async (novelId) => {
    if (!user) return;

    const confirmDelete = window.confirm('Are you sure you want to delete this novel?');
    if (!confirmDelete) return;

    try {
      await remove(ref(db, `novels/${novelId}`));
      toast.success('Novel deleted successfully');
    } catch (error) {
      toast.error('Failed to delete novel');
    }
  };

  const handleLike = async (novelId) => {
    if (!user) {
      toast.error('Please login to like novels');
      return;
    }

    const likeRef = ref(db, `novels/${novelId}/likes/${user.uid}`);
    const novel = novels.find(n => n.id === novelId);
    
    try {
      if (novel.isLiked) {
        await remove(likeRef);
      } else {
        await set(likeRef, true);
      }
    } catch (error) {
      toast.error('Failed to update like');
    }
  };

  const addChapter = () => {
    setChapters([...chapters, { content: '' }]);
  };

  const updateChapter = (index, content) => {
    const newChapters = [...chapters];
    newChapters[index] = { content };
    setChapters(newChapters);
  };

  const removeChapter = (index) => {
    if (chapters.length > 1) {
      const newChapters = chapters.filter((_, i) => i !== index);
      setChapters(newChapters);
    }
  };

  const filteredNovels = novels.filter(novel => 
    novel.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    novel.userName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-black text-white' : 'bg-white text-black'}`}>
      <Toaster 
        position="top-center"
        toastOptions={{
          style: {
            background: isDarkMode ? '#1f1f1f' : '#fff',
            color: isDarkMode ? '#fff' : '#000',
            border: `1px solid ${isDarkMode ? '#333' : '#ddd'}`,
          },
        }}
      />
      
      {/* Header */}
      <header className={`sticky top-0 z-50 ${isDarkMode ? 'bg-black border-gray-800' : 'bg-white border-gray-200'} border-b`}>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Book className="h-8 w-8" />
            <span className="text-xl font-bold">NovelVerse</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-full ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            <button
              onClick={() => setShowAdminLogin(true)}
              className={`p-2 rounded-full ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
            >
              <Shield className="h-5 w-5" />
            </button>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`p-2 rounded-full ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search novels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-900 border-gray-700 text-white' 
                  : 'bg-gray-50 border-gray-200 text-black'
              }`}
            />
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-[60]"
            onClick={() => setIsMenuOpen(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className={`absolute right-0 top-0 h-full w-80 ${
                isDarkMode ? 'bg-black border-gray-800' : 'bg-white border-gray-200'
              } border-l shadow-lg p-6 z-[70]`}
              onClick={(e) => e.stopPropagation()}
            >
              {user ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 mb-6">
                    <img
                      src={user.photoURL}
                      alt={user.displayName}
                      className="h-12 w-12 rounded-full cursor-pointer"
                      onClick={() => setIsEditingUsername(true)}
                    />
                    <div>
                      <h3 className="font-semibold">{user.displayName}</h3>
                      <p className="text-sm opacity-75">{user.email}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setCurrentView('upload');
                      setEditingNovel(null);
                      setTitle('');
                      setChapters([{ content: '' }]);
                      setCoverImage('');
                      setIsMenuOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 p-3 rounded-lg ${
                      isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    <Plus className="h-5 w-5" />
                    <span>Write Novel</span>
                  </button>
                  
                  <button
                    onClick={() => setIsEditingUsername(true)}
                    className={`w-full flex items-center space-x-3 p-3 rounded-lg ${
                      isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    <UserEdit className="h-5 w-5" />
                    <span>Edit Profile</span>
                  </button>
                  
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-3 p-3 rounded-lg text-red-500 hover:bg-red-50"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold mb-4">Welcome to NovelVerse</h3>
                  <p className="text-sm opacity-75 mb-4">
                    You can read all novels as a guest. Login to like and post your own stories.
                  </p>
                  <button
                    onClick={handleLogin}
                    className={`w-full p-3 rounded-lg ${
                      isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-900 hover:bg-gray-800 text-white'
                    }`}
                  >
                    Login with Google
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Login Modal */}
      {showAdminLogin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-black border border-gray-800' : 'bg-white border border-gray-200'} w-96 mx-4`}>
            <h3 className="text-lg font-semibold mb-4">Admin Login</h3>
            <input
              type="password"
              placeholder="Enter admin password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg mb-4 border ${
                isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'
              }`}
              onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
            />
            <div className="flex space-x-2">
              <button
                onClick={handleAdminLogin}
                className={`flex-1 px-4 py-2 rounded-lg ${
                  isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-900 hover:bg-gray-800 text-white'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => {
                  setShowAdminLogin(false);
                  setAdminPassword('');
                }}
                className={`flex-1 px-4 py-2 rounded-lg border ${
                  isDarkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Username Edit Modal */}
      {isEditingUsername && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-black border border-gray-800' : 'bg-white border border-gray-200'} w-96 mx-4`}>
            <h3 className="text-lg font-semibold mb-4">Edit Username</h3>
            <input
              type="text"
              placeholder="New username"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg mb-4 border ${
                isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'
              }`}
            />
            <div className="flex space-x-2">
              <button
                onClick={handleUpdateUsername}
                className={`flex-1 px-4 py-2 rounded-lg ${
                  isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-900 hover:bg-gray-800 text-white'
                }`}
              >
                Update
              </button>
              <button
                onClick={() => {
                  setIsEditingUsername(false);
                  setNewUsername('');
                }}
                className={`flex-1 px-4 py-2 rounded-lg border ${
                  isDarkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Panel */}
      {isAdmin && (
        <div className={`border-b ${isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-gray-50'} p-4`}>
          <div className="max-w-6xl mx-auto">
            <h3 className="text-lg font-semibold mb-4">Admin Panel</h3>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={exportData}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                  isDarkMode ? 'bg-green-800 hover:bg-green-700' : 'bg-green-600 hover:bg-green-700'
                } text-white`}
              >
                <Download className="h-4 w-4" />
                <span>Export Data</span>
              </button>
              <label className={`flex items-center space-x-2 px-4 py-2 rounded-lg cursor-pointer ${
                isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-600 hover:bg-gray-700'
              } text-white`}>
                <Upload className="h-4 w-4" />
                <span>Import Data</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={importData}
                  className="hidden"
                />
              </label>
              <button
                onClick={() => setIsAdmin(false)}
                className={`px-4 py-2 rounded-lg border ${
                  isDarkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                Exit Admin
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-6">
        {currentView === 'novels' && (
          <div className="space-y-8">
            {/* All Novels Grid */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">All Novels</h2>
                {user && (
                  <button
                    onClick={() => {
                      setCurrentView('upload');
                      setEditingNovel(null);
                      setTitle('');
                      setChapters([{ content: '' }]);
                      setCoverImage('');
                    }}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                      isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-900 hover:bg-gray-800 text-white'
                    }`}
                  >
                    <Plus className="h-5 w-5" />
                    <span>Write Novel</span>
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredNovels.map((novel) => (
                  <motion.div
                    key={novel.id}
                    whileHover={{ scale: 1.05 }}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedNovel(novel);
                      setCurrentView('chapter');
                      setCurrentChapterIndex(0);
                    }}
                  >
                    <div className="aspect-[3/4] rounded-lg overflow-hidden mb-2">
                      {novel.coverImage ? (
                        <img
                          src={novel.coverImage}
                          alt={novel.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className={`w-full h-full ${
                          isDarkMode ? 'bg-gray-800' : 'bg-gray-200'
                        } flex items-center justify-center`}>
                          <Book className="h-8 w-8 opacity-50" />
                        </div>
                      )}
                    </div>
                    <h3 className="text-sm font-medium line-clamp-2 mb-1">{novel.title}</h3>
                    <p className="text-xs opacity-75">{novel.userName}</p>
                    <div className="flex items-center justify-between mt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLike(novel.id);
                        }}
                        className={`flex items-center space-x-1 text-xs ${
                          novel.isLiked ? 'text-red-500' : 'opacity-75'
                        }`}
                        disabled={!user}
                      >
                        <Heart className={`h-3 w-3 ${novel.isLiked ? 'fill-current' : ''}`} />
                        <span>{novel.likes}</span>
                      </button>
                      
                      <div className="flex space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShare(novel.id);
                          }}
                          className="p-1 rounded opacity-75 hover:opacity-100"
                        >
                          <Share2 className="h-3 w-3" />
                        </button>
                        
                        {user && user.uid === novel.userId && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(novel);
                              }}
                              className="p-1 rounded opacity-75 hover:opacity-100"
                            >
                              <Edit className="h-3 w-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(novel.id);
                              }}
                              className="p-1 rounded text-red-500 opacity-75 hover:opacity-100"
                            >
                              <Trash className="h-3 w-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {filteredNovels.length === 0 && (
                <div className="text-center py-12">
                  <Book className="h-16 w-16 mx-auto opacity-50 mb-4" />
                  <p className="text-lg opacity-75">No novels found</p>
                  {user && (
                    <button
                      onClick={() => {
                        setCurrentView('upload');
                        setEditingNovel(null);
                        setTitle('');
                        setChapters([{ content: '' }]);
                        setCoverImage('');
                      }}
                      className={`mt-4 px-6 py-2 rounded-lg ${
                        isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-900 hover:bg-gray-800 text-white'
                      }`}
                    >
                      Write the first novel
                    </button>
                  )}
                </div>
              )}
            </section>
          </div>
        )}

        {currentView === 'upload' && user && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`max-w-2xl mx-auto ${isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'} rounded-lg p-6 shadow-lg`}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">{editingNovel ? 'Edit Novel' : 'Write a Novel'}</h2>
              <button
                onClick={() => {
                  setCurrentView('novels');
                  setEditingNovel(null);
                  setTitle('');
                  setChapters([{ content: '' }]);
                  setCoverImage('');
                }}
                className={`p-2 rounded-full ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            </div>
            
            {/* Cover Image Upload */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Cover Image</label>
              <div className="flex items-center space-x-4">
                {coverImage ? (
                  <div className="relative">
                    <img
                      src={coverImage}
                      alt="Cover preview"
                      className="w-24 h-32 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => setCoverImage('')}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className={`w-24 h-32 ${
                    isDarkMode ? 'bg-gray-800' : 'bg-gray-200'
                  } rounded-lg flex items-center justify-center`}>
                    <ImageIcon className="h-8 w-8 opacity-50" />
                  </div>
                )}
                
                <label className={`cursor-pointer px-4 py-2 rounded-lg border ${
                  isDarkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'
                } ${uploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {uploadingImage ? 'Uploading...' : 'Upload Cover'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                </label>
              </div>
            </div>
            
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Novel Title"
              className={`w-full px-4 py-2 rounded-lg mb-4 border ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-gray-50 border-gray-200'
              } focus:outline-none focus:ring-2 focus:ring-gray-500`}
            />

            {chapters.map((chapter, index) => (
              <div key={index} className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">Chapter {index + 1}</h3>
                  {chapters.length > 1 && (
                    <button
                      onClick={() => removeChapter(index)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <textarea
                  value={chapter.content}
                  onChange={(e) => updateChapter(index, e.target.value)}
                  placeholder={`Write Chapter ${index + 1}...`}
                  className={`w-full h-96 px-4 py-2 rounded-lg mb-4 border ${
                    isDarkMode 
                      ? 'bg-gray-800 border-gray-700' 
                      : 'bg-gray-50 border-gray-200'
                  } focus:outline-none focus:ring-2 focus:ring-gray-500 resize-none`}
                />
              </div>
            ))}

            <div className="flex space-x-4">
              <button
                onClick={addChapter}
                className={`px-4 py-2 rounded-lg border ${
                  isDarkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                Add Chapter
              </button>
              <button
                onClick={handlePostNovel}
                className={`flex-1 py-2 rounded-lg ${
                  isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-900 hover:bg-gray-800 text-white'
                }`}
              >
                {editingNovel ? 'Update Novel' : 'Post Novel'}
              </button>
            </div>
          </motion.div>
        )}

        {currentView === 'chapter' && selectedNovel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`max-w-4xl mx-auto ${isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'} rounded-lg p-6 shadow-lg`}
          >
            <button
              onClick={() => {
                setCurrentView('novels');
                setSelectedNovel(null);
                setCurrentChapterIndex(0);
              }}
              className={`flex items-center mb-6 ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-black'}`}
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Novels
            </button>
            
            <div className="flex flex-col md:flex-row gap-6 mb-6">
              {selectedNovel.coverImage && (
                <div className="flex-shrink-0">
                  <img
                    src={selectedNovel.coverImage}
                    alt={selectedNovel.title}
                    className="w-48 h-64 object-cover rounded-lg"
                  />
                </div>
              )}
              
              <div className="flex-1">
                <h2 className="text-3xl font-bold mb-2">{selectedNovel.title}</h2>
                <div className="flex items-center mb-4">
                  <img
                    src={selectedNovel.userPhoto}
                    alt={selectedNovel.userName}
                    className="h-10 w-10 rounded-full mr-3"
                  />
                  <p className="opacity-75">by {selectedNovel.userName}</p>
                </div>
                
                <div className="flex items-center space-x-4 mb-4">
                  <button
                    onClick={() => handleLike(selectedNovel.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg border ${
                      selectedNovel.isLiked 
                        ? 'bg-red-500 text-white border-red-500' 
                        : isDarkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    disabled={!user}
                  >
                    <Heart className={`h-5 w-5 ${selectedNovel.isLiked ? 'fill-current' : ''}`} />
                    <span>{selectedNovel.likes}</span>
                  </button>
                  
                  <button
                    onClick={() => handleShare(selectedNovel.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg border ${
                      isDarkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <Share2 className="h-5 w-5" />
                    <span>Share</span>
                  </button>
                </div>
              </div>
            </div>

            {selectedNovel.chapters && selectedNovel.chapters.length > 1 && (
              <div className="mb-6 flex flex-wrap gap-2">
                <button
                  onClick={() => setCurrentChapterIndex(Math.max(0, currentChapterIndex - 1))}
                  disabled={currentChapterIndex === 0}
                  className={`px-4 py-2 rounded-lg border ${
                    isDarkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'
                  } ${currentChapterIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Previous Chapter
                </button>
                
                <span className="px-4 py-2 text-sm opacity-75">
                  Chapter {currentChapterIndex + 1} of {selectedNovel.chapters.length}
                </span>
                
                <button
                  onClick={() => setCurrentChapterIndex(Math.min(selectedNovel.chapters.length - 1, currentChapterIndex + 1))}
                  disabled={currentChapterIndex === selectedNovel.chapters.length - 1}
                  className={`px-4 py-2 rounded-lg border ${
                    isDarkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'
                  } ${currentChapterIndex === selectedNovel.chapters.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Next Chapter
                </button>
              </div>
            )}
            
            <div className="prose prose-lg max-w-none">
              <h3 className="text-xl font-semibold mb-4">Chapter {currentChapterIndex + 1}</h3>
              <div className="whitespace-pre-wrap leading-relaxed text-lg">
                {(selectedNovel.chapters?.[currentChapterIndex]?.content) || selectedNovel.content}
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}

export default App;
