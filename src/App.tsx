import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  ExternalLink, 
  Trash2, 
  Grid, 
  List, 
  ChevronRight, 
  X,
  Play,
  Filter,
  Monitor,
  Video
} from 'lucide-react';
import type { StoredLink } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [links, setLinks] = useState<StoredLink[]>(() => {
    const saved = localStorage.getItem('link-storer-links');
    return saved ? JSON.parse(saved) : [];
  });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isGridView, setIsGridView] = useState(true);
  const [activeViewerUrl, setActiveViewerUrl] = useState<string | null>(null);

  // Form state
  const [newUrl, setNewUrl] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [isScraping, setIsScraping] = useState(false);

  useEffect(() => {
    localStorage.setItem('link-storer-links', JSON.stringify(links));
  }, [links]);

  const categories = useMemo(() => {
    const cats = new Set(links.map(l => l.category));
    return ['All', ...Array.from(cats)].sort();
  }, [links]);

  const filteredLinks = useMemo(() => {
    return links.filter(link => {
      const matchesSearch = (link.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                           link.url.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || link.category === selectedCategory;
      return matchesSearch && matchesCategory;
    }).sort((a, b) => b.createdAt - a.createdAt);
  }, [links, searchQuery, selectedCategory]);

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl) return;

    // Filter out YouTube and Vimeo
    if (newUrl.includes('youtube.com') || newUrl.includes('youtu.be') || newUrl.includes('vimeo.com')) {
      alert("This app is not for storing YouTube or Vimeo links. Please provide links from other video sites.");
      return;
    }

    setIsScraping(true);
    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newUrl }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const metadata = await response.json();

      const newLink: StoredLink = {
        id: crypto.randomUUID(),
        url: newUrl,
        title: metadata.title || newUrl,
        image: metadata.image || `https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=600&h=400`,
        category: newCategory.trim() || 'Uncategorized',
        createdAt: Date.now(),
      };

      setLinks(prev => [newLink, ...prev]);
      setNewUrl('');
      setNewCategory('');
      setIsAddModalOpen(false);
    } catch (error) {
      console.error("Failed to add link:", error);
      // Fallback manually if even the API call failed completely
      const fallbackLink: StoredLink = {
        id: crypto.randomUUID(),
        url: newUrl,
        title: newUrl,
        image: `https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=600&h=400`,
        category: newCategory.trim() || 'Uncategorized',
        createdAt: Date.now(),
      };
      setLinks(prev => [fallbackLink, ...prev]);
      setNewUrl('');
      setNewCategory('');
      setIsAddModalOpen(false);
    } finally {
      setIsScraping(false);
    }
  };

  const deleteLink = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLinks(prev => prev.filter(l => l.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#0a0c10] text-slate-300 font-sans selection:bg-indigo-500/30">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 border-b border-slate-800/50 bg-[#0a0c10]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Video className="w-5 h-5 text-white fill-current" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">Video<span className="text-indigo-500">Vault</span></h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-full flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-500/20 text-sm font-semibold"
              id="add-link-btn"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Video</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-6 mb-10 items-center justify-between">
          <div className="relative w-full md:w-[450px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search your videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-3 pl-11 pr-5 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-sm placeholder:text-slate-600"
              id="search-input"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800">
            <button 
              onClick={() => setIsGridView(true)}
              className={cn(
                "p-2.5 rounded-xl transition-all",
                isGridView ? "bg-slate-800 text-indigo-400 shadow-inner shadow-black/20" : "text-slate-500 hover:text-slate-300"
              )}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setIsGridView(false)}
              className={cn(
                "p-2.5 rounded-xl transition-all",
                !isGridView ? "bg-slate-800 text-indigo-400 shadow-inner shadow-black/20" : "text-slate-500 hover:text-slate-300"
              )}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Categories */}
        <div className="flex items-center gap-3 overflow-x-auto pb-4 no-scrollbar mb-8 scroll-smooth">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/50 border border-slate-800 rounded-xl text-slate-500 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Filter</span>
          </div>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0",
                selectedCategory === cat 
                  ? "bg-indigo-500/10 border-indigo-500/50 text-indigo-400 shadow-lg shadow-indigo-500/10" 
                  : "bg-slate-900/30 border-slate-800/80 text-slate-500 hover:bg-slate-900/50 hover:border-slate-700 hover:text-slate-300"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Content */}
        {filteredLinks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-slate-600">
            <div className="relative group">
               <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
               <div className="relative w-20 h-20 bg-slate-900 border border-slate-800 rounded-3xl flex items-center justify-center mb-6 shadow-2xl">
                 <Monitor className="w-8 h-8 opacity-20" />
               </div>
            </div>
            <p className="text-xl font-bold text-slate-400">Your vault is ready</p>
            <p className="text-sm mt-1 max-w-[280px] text-center">Add high-quality video links from across the web to build your collection.</p>
          </div>
        ) : (
          <div className={cn(
            "grid gap-6 md:gap-8",
            isGridView ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"
          )}>
            <AnimatePresence mode="popLayout">
              {filteredLinks.map(link => (
                <motion.div
                  key={link.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={() => setActiveViewerUrl(link.url)}
                  className={cn(
                    "group relative bg-[#111419] border border-slate-800/40 rounded-[2rem] overflow-hidden cursor-pointer transition-all duration-300 hover:border-indigo-500/40 hover:bg-[#151920] hover:shadow-2xl hover:shadow-black/50 hover:-translate-y-1",
                    !isGridView && "flex flex-row items-center h-28 pr-4"
                  )}
                  id={`link-${link.id}`}
                >
                  <div className={cn(
                    "relative overflow-hidden bg-slate-900",
                    isGridView ? "aspect-video" : "h-full aspect-video shrink-0"
                  )}>
                    <img 
                      src={link.image} 
                      alt={link.title}
                      className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 opacity-70 group-hover:opacity-100"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-40 group-hover:opacity-20 transition-opacity" />
                    
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-4 group-hover:translate-y-0">
                      <div className="w-14 h-14 bg-indigo-600 shadow-xl shadow-indigo-600/30 rounded-full flex items-center justify-center transform active:scale-90 transition-transform">
                        <Play className="w-6 h-6 text-white fill-current translate-x-0.5" />
                      </div>
                    </div>

                    <div className="absolute top-4 left-4 flex gap-2">
                      <span className="px-2.5 py-1 bg-black/40 backdrop-blur-md text-[9px] font-black text-white uppercase tracking-wider rounded-lg border border-white/10">
                        {link.category}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 flex flex-col justify-between flex-grow overflow-hidden">
                    <div className="space-y-1">
                      <div className="flex justify-between items-start gap-3">
                        <h3 className="font-bold text-slate-100 text-sm line-clamp-2 leading-tight group-hover:text-indigo-400 transition-colors">
                          {link.title}
                        </h3>
                        <button 
                          onClick={(e) => deleteLink(link.id, e)}
                          className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all opacity-0 group-hover:opacity-100 shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-slate-800/50 flex items-center justify-between">
                      <div className="flex items-center gap-2 overflow-hidden min-w-0">
                        <div className="w-5 h-5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
                           <img 
                            src={`https://www.google.com/s2/favicons?domain=${new URL(link.url).hostname}&sz=32`} 
                            alt="favicon"
                            className="w-3.5 h-3.5 grayscale group-hover:grayscale-0 transition-all opacity-60"
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 truncate lowercase tracking-tight">
                          {new URL(link.url).hostname}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-indigo-500 font-bold text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                         <span>Watch</span>
                         <ChevronRight className="w-3 h-3 translate-y-[0.5px]" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Add Link Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[#111419] border border-slate-800 rounded-[2.5rem] p-8 sm:p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                   <h2 className="text-2xl font-black text-white tracking-tight">Archive Video</h2>
                   <p className="text-xs text-slate-500 mt-1 uppercase font-bold tracking-widest">Metadata extraction enabled</p>
                </div>
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-3 text-slate-500 hover:text-white rounded-2xl hover:bg-slate-800 transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleAddLink} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Source URL</label>
                  <input 
                    autoFocus
                    type="url" 
                    placeholder="https://site.com/video-page"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    required
                    className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-4 px-5 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-medium text-white placeholder:text-slate-700"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Vault Category</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Masterclass, Anime, Reviews"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-4 px-5 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-medium text-white placeholder:text-slate-700"
                  />
                </div>

                <div className="bg-indigo-500/5 border border-indigo-500/10 p-5 rounded-2xl flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0">
                     <Video className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div className="space-y-1">
                     <p className="text-xs font-bold text-indigo-400">Automatic Scraper</p>
                     <p className="text-[11px] text-slate-500 leading-relaxed">
                        Our backend will analyze the URL to extract hidden high-quality thumbnails and the official title.
                     </p>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isScraping || !newUrl}
                  className={cn(
                    "w-full py-5 rounded-[1.5rem] font-bold text-white tracking-widest uppercase text-xs transition-all shadow-xl",
                    isScraping 
                      ? "bg-slate-800 cursor-wait" 
                      : "bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] shadow-indigo-600/20"
                  )}
                >
                  {isScraping ? "Processing Resource..." : "Archive to Vault"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* In-App Viewer Overlay */}
      <AnimatePresence>
        {activeViewerUrl && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-[#07090b] flex flex-col"
          >
            <div className="h-16 border-b border-slate-800/80 flex items-center justify-between px-6 shrink-0 bg-[#0a0c10]">
              <div className="flex items-center gap-6 overflow-hidden">
                <button 
                  onClick={() => setActiveViewerUrl(null)}
                  className="p-2.5 -ml-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-2xl transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em] leading-none mb-1">Secure Vault Player</span>
                  <span className="text-[11px] font-mono text-slate-500 truncate max-w-[200px] sm:max-w-md">{activeViewerUrl}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => window.open(activeViewerUrl, '_blank')}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all border border-slate-800 shadow-lg"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Direct</span>
                </button>
              </div>
            </div>

            <div className="flex-grow bg-[#000000] relative">
              <iframe 
                src={activeViewerUrl}
                title="Vault Viewer"
                className="w-full h-full border-none"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
              
              <div className="absolute inset-x-0 bottom-8 p-6 flex justify-center pointer-events-none">
                 <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="bg-[#0f1115]/80 border border-slate-800 backdrop-blur-xl p-5 rounded-3xl max-w-md pointer-events-auto shadow-2xl"
                  >
                    <div className="flex gap-4">
                         <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                            <Monitor className="w-5 h-5 text-amber-500" />
                         </div>
                         <div className="space-y-1">
                            <p className="text-xs font-black text-amber-500 uppercase tracking-wider">Viewing Limitation Notice</p>
                            <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                                Many modern video platforms (DailyMotion, Twitch, specialized portals) block embedded viewing for security. If the player does not load, please use the **Open Direct** button at the top to watch.
                            </p>
                         </div>
                    </div>
                 </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
