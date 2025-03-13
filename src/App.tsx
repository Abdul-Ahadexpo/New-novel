import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'react-hot-toast';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { getDatabase, ref, onValue, push, remove, set } from 'firebase/database';
import { Book, Heart, Moon, Sun, LogOut, Plus, ArrowLeft, Edit, Trash } from 'lucide-react';

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

function App() {
  const [user, setUser] = useState(null);
  const [novels, setNovels] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
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

  useEffect(() => {
    localStorage.setItem('darkMode', isDarkMode.toString());
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });

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
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  const handlePostNovel = async () => {
    if (!user) {
      toast.error('Please login to post novels');
      return;
    }

    if (!title.trim() || !content.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      if (editingNovel) {
        // Update existing novel
        const novelRef = ref(db, `novels/${editingNovel}`);
        await set(novelRef, {
          userId: user.uid,
          userName: user.displayName,
          userPhoto: user.photoURL,
          title: title.trim(),
          content: content.trim(),
          createdAt: Date.now(),
          chapters: [{ content: content.trim() }]
        });
        setEditingNovel(null);
        toast.success('Novel updated successfully!');
      } else {
        // Create new novel
        const novelsRef = ref(db, 'novels');
        await push(novelsRef, {
          userId: user.uid,
          userName: user.displayName,
          userPhoto: user.photoURL,
          title: title.trim(),
          content: content.trim(),
          createdAt: Date.now(),
          chapters: [{ content: content.trim() }]
        });
        toast.success('Novel posted successfully!');
      }

      setTitle('');
      setContent('');
      setCurrentView('novels');
    } catch (error) {
      toast.error(editingNovel ? 'Failed to update novel' : 'Failed to post novel');
    }
  };

  const handleEdit = (novel) => {
    setTitle(novel.title);
    setContent(novel.chapters[0].content);
    setEditingNovel(novel.id);
    setCurrentView('upload');
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
            background: isDarkMode ? '#333' : '#fff',
            color: isDarkMode ? '#fff' : '#333',
          },
        }}
      />
      
      <nav className={`border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'} sticky top-0 z-50 backdrop-blur-sm`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Book className="h-6 w-6" />
              <span className="text-xl font-semibold">NovelVerse</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2 rounded-full ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
              >
                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              {user ? (
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => {
                      setCurrentView('upload');
                      setEditingNovel(null);
                      setTitle('');
                      setContent('');
                    }}
                    className={`p-2 rounded-full ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                  <div className="flex items-center space-x-2">
                    <img
                      src={user.photoURL}
                      alt={user.displayName}
                      className="h-8 w-8 rounded-full"
                    />
                    <button
                      onClick={handleLogout}
                      className={`p-2 rounded-full ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
                    >
                      <LogOut className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleLogin}
                  className={`px-4 py-2 rounded-lg ${
                    isDarkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'
                  }`}
                >
                  Login with Google
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'novels' && (
          <div className="space-y-6">
            <input
              type="text"
              placeholder="Search novels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg ${
                isDarkMode 
                  ? 'bg-gray-900 border-gray-800 focus:border-gray-700' 
                  : 'bg-gray-100 border-gray-200 focus:border-gray-300'
              } border focus:outline-none`}
            />

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
              {filteredNovels.map((novel) => (
                <motion.div
                  key={novel.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`p-6 rounded-lg ${
                    isDarkMode ? 'bg-gray-900' : 'bg-gray-100'
                  }`}
                >
                  <div className="flex items-center mb-4">
                    <img
                      src={novel.userPhoto}
                      alt={novel.userName}
                      className="h-10 w-10 rounded-full"
                    />
                    <div className="ml-3">
                      <h3 className="text-lg font-semibold">{novel.title}</h3>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        by {novel.userName}
                      </p>
                    </div>
                  </div>
                  
                  <p className={`mb-4 line-clamp-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {novel.chapters[0].content}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleLike(novel.id)}
                        className={`flex items-center space-x-1 ${
                          novel.isLiked ? 'text-red-500' : isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}
                      >
                        <Heart className={`h-5 w-5 ${novel.isLiked ? 'fill-current' : ''}`} />
                        <span>{novel.likes}</span>
                      </button>
                      
                      {user && user.uid === novel.userId && (
                        <>
                          <button
                            onClick={() => handleEdit(novel)}
                            className={`p-2 rounded-full ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-200'}`}
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(novel.id)}
                            className={`p-2 rounded-full text-red-500 ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-200'}`}
                          >
                            <Trash className="h-5 w-5" />
                          </button>
                        </>
                      )}
                    </div>
                    
                    <button
                      onClick={() => {
                        setSelectedNovel(novel);
                        setCurrentView('chapter');
                      }}
                      className={`px-4 py-2 rounded-lg ${
                        isDarkMode 
                          ? 'bg-gray-800 hover:bg-gray-700' 
                          : 'bg-gray-200 hover:bg-gray-300'
                      }`}
                    >
                      Read More
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {currentView === 'upload' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`max-w-2xl mx-auto ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'} rounded-lg p-6`}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">{editingNovel ? 'Edit Novel' : 'Write a Novel'}</h2>
              <button
                onClick={() => {
                  setCurrentView('novels');
                  setEditingNovel(null);
                  setTitle('');
                  setContent('');
                }}
                className={`p-2 rounded-full ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-200'}`}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            </div>
            
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Novel Title"
              className={`w-full px-4 py-2 rounded-lg mb-4 ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-200'
              } border focus:outline-none`}
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your novel..."
              className={`w-full h-96 px-4 py-2 rounded-lg mb-4 ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-200'
              } border focus:outline-none resize-none`}
            />
            <button
              onClick={handlePostNovel}
              className={`w-full py-2 rounded-lg ${
                isDarkMode 
                  ? 'bg-white text-black hover:bg-gray-200' 
                  : 'bg-black text-white hover:bg-gray-800'
              }`}
            >
              {editingNovel ? 'Update Novel' : 'Post Novel'}
            </button>
          </motion.div>
        )}

        {currentView === 'chapter' && selectedNovel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`max-w-3xl mx-auto ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'} rounded-lg p-8`}
          >
            <button
              onClick={() => {
                setCurrentView('novels');
                setSelectedNovel(null);
              }}
              className="flex items-center mb-6"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Novels
            </button>
            
            <h2 className="text-3xl font-bold mb-2">{selectedNovel.title}</h2>
            <div className="flex items-center mb-6">
              <img
                src={selectedNovel.userPhoto}
                alt={selectedNovel.userName}
                className="h-10 w-10 rounded-full"
              />
              <p className={`ml-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                by {selectedNovel.userName}
              </p>
            </div>
            
            <div className={`prose max-w-none ${isDarkMode ? 'prose-invert' : ''}`}>
              <p className="whitespace-pre-wrap leading-relaxed">
                {selectedNovel.chapters[0].content}
              </p>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}

export default App;