
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';

import {
  HardDrive, Folder, FileText, Clock, Users, Star, Trash2, Cloud, Search, ChevronDown, List, Info, X,
  Archive, Video, Presentation, Image as ImageIcon, FileSpreadsheet, Plus, HelpCircle, Settings, Link, Share2, Download, Pencil, MoreVertical, LogOut
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// --- App Router (Main Component) ---
const App = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-gray-500">Loading Application...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
      <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/" />} />
      <Route 
        path="/*" 
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <DriveUI />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

// --- ProtectedRoute Wrapper ---
const ProtectedRoute = ({ isAuthenticated, children }) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};


// --- Re-usable components and hooks for DriveUI ---

const fileTypeIcons = {
  folder: <Folder className="w-5 h-5 text-blue-500" />,
  sheet: <FileSpreadsheet className="w-5 h-5 text-green-500" />,
  doc: <FileText className="w-5 h-5 text-blue-500" />,
  presentation: <Presentation className="w-5 h-5 text-yellow-500" />,
  zip: <Archive className="w-5 h-5 text-yellow-800" />,
  image: <ImageIcon className="w-5 h-5 text-red-500" />,
  video: <Video className="w-5 h-5 text-red-500" />,
  default: <FileText className="w-5 h-5 text-gray-500" />,
};

const useContextMenu = () => {
  const [menu, setMenu] = useState(null);
  const handleContextMenu = useCallback((e, item) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, item }); }, []);
  const closeMenu = useCallback(() => setMenu(null), []);
  useEffect(() => { document.addEventListener('click', closeMenu); return () => document.removeEventListener('click', closeMenu); }, [closeMenu]);
  return { menu, handleContextMenu, closeMenu };
};

const Sidebar = ({ onUploadClick }) => (
  <aside className="w-[230px] flex-shrink-0 bg-gray-50 border-r border-gray-200 flex flex-col" style={{ fontFamily: "'Google Sans', Roboto, Arial, sans-serif" }}>
    <div className="p-4 pl-6 h-16 flex items-center"><img src="https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png" alt="Google" className="w-24" /></div>
    <div className="p-2 px-4"><button onClick={onUploadClick} className="flex items-center justify-center bg-white shadow-md hover:shadow-lg transition-shadow rounded-full p-3 pr-6 w-full text-sm font-medium"><Plus className="w-6 h-6 mr-2" />New</button></div>
    <nav className="flex-1 px-4 py-2 mt-4 space-y-1">
      <a href="#" className="flex items-center px-4 py-2 text-sm font-medium text-blue-800 bg-blue-100 rounded-r-full -ml-4"><HardDrive className="mr-4 h-5 w-5 text-blue-700" /> My Drive</a>
      <a href="#" className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"><Users className="mr-4 h-5 w-5" /> Shared with me</a>
    </nav>
  </aside>
);

const Header = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => { await logout(); navigate('/login'); };
  return (
    <header className="h-16 bg-gray-50/50 backdrop-blur-sm border-b border-gray-200 px-4 flex items-center justify-between flex-shrink-0">
      <div className="flex-1 max-w-2xl"><div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-4"><Search className="h-6 w-6 text-gray-500" /></span><input type="text" placeholder="Search in Drive" className="block w-full pl-14 pr-3 py-3.5 border border-transparent rounded-full bg-gray-200/70 focus:outline-none focus:bg-white focus:border-blue-500 transition-colors text-base" /></div></div>
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-700">Welcome, {user.username}</span>
        <button onClick={handleLogout} className="p-2.5 text-gray-600 hover:bg-gray-200 rounded-full" title="Logout"><LogOut className="h-6 w-6" /></button>
        <img className="w-9 h-9 rounded-full ml-2" src={`https://i.pravatar.cc/150?u=${user.id}`} alt="User Avatar" />
      </div>
    </header>
  );
};

const ContextMenu = ({ menu, closeMenu, onRename, onDelete }) => {
  if (!menu) return null;
  const menuItems = [
    { icon: <Pencil size={18} />, label: 'Rename', action: () => onRename(menu.item) },
    { icon: <Trash2 size={18} />, label: 'Move to Trash', action: () => onDelete(menu.item.id) },
  ];
  return (<div style={{ top: menu.y, left: menu.x }} className="fixed bg-white rounded-md shadow-lg py-2 w-56 z-50 border border-gray-200" onClick={closeMenu}>{menuItems.map(item => (<button key={item.label} onClick={item.action} className="w-full flex items-center px-4 py-2 text-sm text-gray-800 hover:bg-gray-100"><span className="mr-3 text-gray-600">{item.icon}</span>{item.label}</button>))}</div>);
};

const FileRow = ({ file, onContextMenu, onSelect, isSelected }) => (<div onContextMenu={(e) => onContextMenu(e, file)} onClick={() => onSelect(file)} className={`grid grid-cols-12 items-center text-sm text-gray-700 border-b border-gray-200 cursor-pointer ${isSelected ? 'bg-blue-100' : 'hover:bg-gray-50'}`}><div className="col-span-5 px-4 py-2.5 flex items-center">{fileTypeIcons[file.type] || fileTypeIcons.default}<span className="ml-4 truncate">{file.name}</span></div><div className="col-span-2 px-4 py-2.5 flex items-center">{file.owner === 'me' ? <img className="w-6 h-6 rounded-full mr-2" src="https://i.pravatar.cc/150?u=me" alt="Owner" /> : <div className="w-6 h-6 rounded-full mr-2 bg-gray-300" />}{file.owner}</div><div className="col-span-3 px-4 py-2.5">{file.lastModified}</div><div className="col-span-2 px-4 py-2.5">{file.size}</div></div>);

// --- The Main Drive UI Component ---
const DriveUI = () => {
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const { menu, handleContextMenu, closeMenu } = useContextMenu();
  const mainPanelRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/files-and-folders`);
        if (!response.ok) throw new Error('Could not fetch files. Your session may have expired.');
        const data = await response.json();
        setFolders(data.folders);
        setFiles(data.files);
      } catch (e) { setError(e.message); } finally { setIsLoading(false); }
    };
    fetchData();
  }, []);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch(`${API_BASE_URL}/api/upload`, { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Upload failed');
      const newFile = await response.json();
      setFiles(prevFiles => [newFile, ...prevFiles]);
    } catch (error) { setError(error.message); }
  };

  const handleDelete = async (id) => {
    const originalFiles = [...files];
    setFiles(files.filter(f => f.id !== id));
    try {
      const response = await fetch(`${API_BASE_URL}/api/files/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete');
    } catch (error) { setError(error.message); setFiles(originalFiles); }
  };

  const handleRename = async (item) => {
    const newName = prompt('Enter new name:', item.name);
    if (!newName || newName === item.name) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/files/${item.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName }) });
      if (!response.ok) throw new Error('Failed to rename');
      const updatedItem = await response.json();
      const updateList = (list) => list.map(i => (i.id === updatedItem.id ? updatedItem : i));
      if (item.type === 'folder') setFolders(updateList); else setFiles(updateList);
    } catch (error) { setError(error.message); }
  };

  const handleSelect = (file) => setSelectedFile(file.id === selectedFile?.id ? null : file);

  const deselectIfClickedOutside = (e) => { if (mainPanelRef.current && !mainPanelRef.current.contains(e.target)) setSelectedFile(null); };
  useEffect(() => { document.addEventListener('mousedown', deselectIfClickedOutside); return () => document.removeEventListener('mousedown', deselectIfClickedOutside); }, []);

  return (
    <div className="bg-white text-gray-800 flex h-screen overflow-hidden">
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
      <Sidebar onUploadClick={() => fileInputRef.current.click()} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 flex overflow-hidden"><div ref={mainPanelRef} className="flex-1 p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6"><h2 className="text-2xl text-gray-700 flex items-center" style={{ fontFamily: "'Google Sans', Roboto, Arial, sans-serif" }}>My Drive<ChevronDown className="ml-3 h-6 w-6 text-gray-600" /></h2></div>
          {isLoading && <p>Loading files...</p>}
          {error && <p className="text-red-500">{error}</p>}
          {!isLoading && !error && (
            <div className="border border-gray-200 rounded-t-lg">
              <div className="grid grid-cols-12 items-center text-sm font-medium text-gray-600 bg-gray-50/80 rounded-t-lg"><div className="col-span-5 px-4 py-2.5">Name</div><div className="col-span-2 px-4 py-2.5">Owner</div><div className="col-span-3 px-4 py-2.5">Last Modified</div><div className="col-span-2 px-4 py-2.5">File Size</div></div>
              <div className="divide-y divide-gray-200">{[...folders, ...files].map(file => (<FileRow key={file.id} file={file} onContextMenu={handleContextMenu} onSelect={handleSelect} isSelected={selectedFile?.id === file.id}/>))}</div>
            </div>
          )}
        </div></main>
      </div>
      <ContextMenu menu={menu} closeMenu={closeMenu} onRename={handleRename} onDelete={handleDelete} />
    </div>
  );
};

export default App;
