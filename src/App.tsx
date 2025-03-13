import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'react-hot-toast';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { getDatabase, ref, onValue, push, remove, set } from 'firebase/database';
import { Book, Heart, MessageCircle, Send, Home, Upload, User, LogOut } from 'lucide-react';

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
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
      })) : [];
      setNovels(novelsList);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast.success('Welcome back!');
    } catch (error) {
      toast.error('Login failed. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  const handlePostNovel = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
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

      setTitle('');
      setContent('');
      setCurrentView('novels');
      toast.success('Novel posted successfully!');
    } catch (error) {
      toast.error('Failed to post novel');
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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <Toaster position="top-center" />
      
      {/* Navigation */}
      <nav className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Book className="h-8 w-8 text-white" />
              <span className="ml-2 text-xl font-bold text-white">NovelVerse</span>
            </div>
            
            {user ? (
              <div className="flex items-center space-x-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative"
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                >
                  <img
                    src={user.photoURL}
                    alt={user.displayName}
                    className="h-10 w-10 rounded-full border-2 border-white/50"
                  />
                </motion.button>
                
                <AnimatePresence>
                  {showProfileMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="absolute right-4 top-16 w-48 py-2 bg-white rounded-lg shadow-xl"
                    >
                      <button
                        onClick={() => {
                          setCurrentView('myNovels');
                          setShowProfileMenu(false);
                        }}
                        className="flex items-center px-4 py-2 text-gray-800 hover:bg-gray-100 w-full"
                      >
                        <Book className="h-5 w-5 mr-2" />
                        My Novels
                      </button>
                      <button
                        onClick={() => {
                          setCurrentView('upload');
                          setShowProfileMenu(false);
                        }}
                        className="flex items-center px-4 py-2 text-gray-800 hover:bg-gray-100 w-full"
                      >
                        <Upload className="h-5 w-5 mr-2" />
                        Upload Novel
                      </button>
                      <button
                        onClick={handleLogout}
                        className="flex items-center px-4 py-2 text-red-600 hover:bg-gray-100 w-full"
                      >
                        <LogOut className="h-5 w-5 mr-2" />
                        Logout
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogin}
                className="px-4 py-2 rounded-lg bg-white text-purple-900 font-semibold"
              >
                Login with Google
              </motion.button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'novels' && (
          <div className="space-y-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Search novels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredNovels.map((novel) => (
                <motion.div
                  key={novel.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20"
                >
                  <div className="flex items-center mb-4">
                    <img
                      src={novel.userPhoto}
                      alt={novel.userName}
                      className="h-10 w-10 rounded-full"
                    />
                    <div className="ml-3">
                      <h3 className="text-lg font-semibold text-white">{novel.title}</h3>
                      <p className="text-sm text-white/70">by {novel.userName}</p>
                    </div>
                  </div>
                  
                  <p className="text-white/90 mb-4 line-clamp-3">
                    {novel.chapters[0].content}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleLike(novel.id)}
                      className={`flex items-center space-x-1 ${
                        novel.isLiked ? 'text-red-500' : 'text-white/70'
                      }`}
                    >
                      <Heart className={`h-5 w-5 ${novel.isLiked ? 'fill-current' : ''}`} />
                      <span>{novel.likes}</span>
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        setSelectedNovel(novel);
                        setCurrentView('chapter');
                      }}
                      className="px-4 py-2 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors"
                    >
                      Read More
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {currentView === 'upload' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20"
          >
            <h2 className="text-2xl font-bold text-white mb-6">Upload New Novel</h2>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Novel Title"
              className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 mb-4"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your novel..."
              className="w-full h-64 px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 mb-4 resize-none"
            />
            <div className="flex justify-end space-x-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentView('novels')}
                className="px-6 py-2 rounded-lg border border-white/20 text-white"
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handlePostNovel}
                className="px-6 py-2 rounded-lg bg-white text-purple-900 font-semibold"
              >
                Post Novel
              </motion.button>
            </div>
          </motion.div>
        )}

        {currentView === 'chapter' && selectedNovel && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto bg-white/10 backdrop-blur-md rounded-lg p-8 border border-white/20"
          >
            <button
              onClick={() => {
                setCurrentView('novels');
                setSelectedNovel(null);
              }}
              className="flex items-center text-white/70 hover:text-white mb-6"
            >
              <Home className="h-5 w-5 mr-2" />
              Back to Novels
            </button>
            
            <h2 className="text-3xl font-bold text-white mb-2">{selectedNovel.title}</h2>
            <div className="flex items-center mb-6">
              <img
                src={selectedNovel.userPhoto}
                alt={selectedNovel.userName}
                className="h-10 w-10 rounded-full"
              />
              <p className="ml-3 text-white/70">by {selectedNovel.userName}</p>
            </div>
            
            <div className="prose prose-invert max-w-none">
              <p className="text-white/90 whitespace-pre-wrap">
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