import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { filesAPI, foldersAPI } from '../services/api';
import { useDropzone } from 'react-dropzone';
import {
  Search, Grid3x3, List, Settings, HelpCircle, Menu, Home,
  Clock, Star, Trash2, Upload, FolderPlus, ChevronDown,
  Download, StarOff, X, FileText, File, Folder, MoreVertical
} from 'lucide-react';
import './Dashboard.css';

const Dashboard = ({ view = 'my-drive' }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  const currentView = view || (location.pathname === '/recent' ? 'recent' : 
                               location.pathname === '/starred' ? 'starred' :
                               location.pathname === '/trash' ? 'trash' : 'my-drive');

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      let data;
      switch (currentView) {
        case 'recent':
          data = await filesAPI.getRecentFiles();
          setFiles(data || []);
          setFolders([]);
          break;
        case 'starred':
          data = await filesAPI.getStarredFiles();
          setFiles(data || []);
          setFolders([]);
          break;
        case 'trash':
          data = await filesAPI.getTrashedFiles();
          setFiles(data || []);
          setFolders([]);
          break;
        default:
          const filesData = await filesAPI.getFiles();
          const foldersData = await foldersAPI.getFolders();
          setFiles(filesData || []);
          setFolders(foldersData || []);
      }
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoading(false);
    }
  }, [currentView]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const onDrop = useCallback(async (acceptedFiles) => {
    setUploading(true);
    try {
      for (const file of acceptedFiles) {
        await filesAPI.uploadFile(file);
      }
      await loadFiles();
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload files');
    } finally {
      setUploading(false);
    }
  }, [loadFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleDownload = async (file) => {
    try {
      const blob = await filesAPI.downloadFile(file.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download file');
    }
  };

  const handleDelete = async (fileId) => {
    if (window.confirm('Move to trash?')) {
      try {
        await filesAPI.deleteFile(fileId);
        await loadFiles();
      } catch (error) {
        console.error('Delete error:', error);
        alert('Failed to delete file');
      }
    }
  };

  const handleRestore = async (fileId) => {
    try {
      await filesAPI.restoreFile(fileId);
      await loadFiles();
    } catch (error) {
      console.error('Restore error:', error);
      alert('Failed to restore file');
    }
  };

  const handleToggleStar = async (fileId) => {
    try {
      await filesAPI.toggleStar(fileId);
      await loadFiles();
    } catch (error) {
      console.error('Star error:', error);
    }
  };

  const handleCreateFolder = async () => {
    const name = prompt('Folder name:');
    if (name) {
      try {
        await foldersAPI.createFolder(name);
        await loadFiles();
      } catch (error) {
        console.error('Create folder error:', error);
        alert('Failed to create folder');
      }
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getFileIcon = (fileName, isFolder) => {
    if (isFolder) return <Folder size={20} className="file-icon folder-icon" />;
    const ext = fileName.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) {
      return <File size={20} className="file-icon image-icon" />;
    }
    if (['doc', 'docx', 'txt'].includes(ext)) {
      return <FileText size={20} className="file-icon doc-icon" />;
    }
    return <File size={20} className="file-icon" />;
  };

  const getViewTitle = () => {
    switch (currentView) {
      case 'recent': return 'Recent';
      case 'starred': return 'Starred';
      case 'trash': return 'Trash';
      default: return 'My Drive';
    }
  };

  return (
    <div className="dashboard" {...getRootProps()}>
      <input {...getInputProps()} />
      
      {/* Header */}
      <header className="drive-header">
        <div className="header-left">
          <button className="icon-btn menu-btn">
            <Menu size={20} />
          </button>
          <div className="logo-section">
            <svg className="drive-logo" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
              <path fill="#0066da" d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z"/>
              <path fill="#00ac47" d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z"/>
              <path fill="#ea4335" d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z"/>
              <path fill="#00832d" d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z"/>
              <path fill="#2684fc" d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z"/>
              <path fill="#ffba00" d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z"/>
            </svg>
            <span className="drive-title">Drive</span>
          </div>
        </div>

        <div className="header-center">
          <div className="search-bar">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              placeholder="Search in Drive"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="header-right">
          <button className="icon-btn">
            <HelpCircle size={20} />
          </button>
          <button className="icon-btn">
            <Settings size={20} />
          </button>
          <div className="user-menu">
            <button 
              className="user-avatar"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </button>
            {showUserMenu && (
              <div className="user-dropdown">
                <div className="user-info">
                  <div className="user-avatar-large">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="user-details">
                    <div className="user-name">{user?.name}</div>
                    <div className="user-email">{user?.email}</div>
                  </div>
                </div>
                <button onClick={handleLogout} className="logout-btn">
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="dashboard-content">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-actions">
            <div className="new-button-wrapper">
              <button 
                className="new-button"
                onClick={() => setShowCreateMenu(!showCreateMenu)}
              >
                <svg width="36" height="36" viewBox="0 0 36 36">
                  <path fill="#34A853" d="M16 16v14h4V20z"/>
                  <path fill="#4285F4" d="M30 16H20l-4 4h14z"/>
                  <path fill="#FBBC04" d="M6 16v4h10l4-4z"/>
                  <path fill="#EA4335" d="M20 16V6h-4v14z"/>
                  <path fill="none" d="M0 0h36v36H0z"/>
                </svg>
                <span>New</span>
              </button>
              {showCreateMenu && (
                <div className="create-menu">
                  <button onClick={handleCreateFolder}>
                    <FolderPlus size={20} />
                    New folder
                  </button>
                  <hr />
                  <button onClick={() => document.querySelector('input[type="file"]').click()}>
                    <Upload size={20} />
                    File upload
                  </button>
                  {index < folderPath.length - 1 && (
                    <ChevronDown size={16} style={{ transform: 'rotate(-90deg)' }} />
                  )}
                </div>
              )}
            </div>
          </div>

          <nav className="sidebar-nav">
            <button 
              className={`nav-item ${currentView === 'my-drive' ? 'active' : ''}`}
              onClick={() => navigate('/')}
            >
              <Home size={20} />
              <span>My Drive</span>
            </button>
            <button 
              className={`nav-item ${currentView === 'recent' ? 'active' : ''}`}
              onClick={() => navigate('/recent')}
            >
              <Clock size={20} />
              <span>Recent</span>
            </button>
            <button 
              className={`nav-item ${currentView === 'starred' ? 'active' : ''}`}
              onClick={() => navigate('/starred')}
            >
              <Star size={20} />
              <span>Starred</span>
            </button>
            <button 
              className={`nav-item ${currentView === 'trash' ? 'active' : ''}`}
              onClick={() => navigate('/trash')}
            >
              <Trash2 size={20} />
              <span>Trash</span>
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          <div className="content-header">
            <h2>{getViewTitle()}</h2>
            <div className="view-controls">
              <button 
                className={`icon-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
              >
                <List size={20} />
              </button>
              <button 
                className={`icon-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                <Grid3x3 size={20} />
              </button>
            </div>
          </div>

          {isDragActive && (
            <div className="drop-overlay">
              <div className="drop-message">
                <Upload size={48} />
                <p>Drop files to upload</p>
              </div>
            </div>
          )}

          {uploading && (
            <div className="upload-progress">
              Uploading files...
            </div>
          )}

          {loading ? (
            <div className="loading">Loading...</div>
          ) : (
            <>
              {viewMode === 'list' ? (
                <div className="file-list">
                  {folders.length > 0 && (
                    <div className="file-section">
                      <div className="section-header">Folders</div>
                      {folders.map((folder) => (
                        <div key={folder.id} className="file-item">
                          <div className="file-info">
                            {getFileIcon(folder.name, true)}
                            <span className="file-name">{folder.name}</span>
                          </div>
                          <div className="file-owner">me</div>
                          <div className="file-modified">{formatDate(folder.created_at)}</div>
                          <div className="file-size">-</div>
                          <div className="file-actions">
                            <button className="icon-btn-small">
                              <MoreVertical size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {files.length > 0 && (
                    <div className="file-section">
                      {folders.length > 0 && <div className="section-header">Files</div>}
                      {files.map((file) => (
                        <div key={file.id} className="file-item">
                          <div className="file-info">
                            {getFileIcon(file.name, false)}
                            <span className="file-name">{file.name}</span>
                          </div>
                          <div className="file-owner">me</div>
                          <div className="file-modified">{formatDate(file.updated_at)}</div>
                          <div className="file-size">{formatFileSize(file.size)}</div>
                          <div className="file-actions">
                            <button 
                              className="icon-btn-small"
                              onClick={() => handleToggleStar(file.id)}
                              title={file.starred ? "Remove star" : "Add star"}
                            >
                              {file.starred ? <Star size={16} fill="currentColor" /> : <StarOff size={16} />}
                            </button>
                            {currentView === 'trash' ? (
                              <button 
                                className="icon-btn-small"
                                onClick={() => handleRestore(file.id)}
                                title="Restore"
                              >
                                <Upload size={16} />
                              </button>
                            ) : (
                              <>
                                <button 
                                  className="icon-btn-small"
                                  onClick={() => handleDownload(file)}
                                  title="Download"
                                >
                                  <Download size={16} />
                                </button>
                                <button 
                                  className="icon-btn-small"
                                  onClick={() => handleDelete(file.id)}
                                  title="Move to trash"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {files.length === 0 && folders.length === 0 && (
                    <div className="empty-state">
                      <p>No files yet</p>
                      <p className="empty-subtitle">Drop files here or use the New button</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="file-grid">
                  {folders.map((folder) => (
                    <div key={folder.id} className="grid-item">
                      <div className="grid-item-preview folder-preview">
                        <Folder size={32} />
                      </div>
                      <div className="grid-item-info">
                        <span className="grid-item-name">{folder.name}</span>
                      </div>
                    </div>
                  ))}
                  {files.map((file) => (
                    <div key={file.id} className="grid-item">
                      <div className="grid-item-preview">
                        {getFileIcon(file.name, false)}
                      </div>
                      <div className="grid-item-info">
                        <span className="grid-item-name">{file.name}</span>
                      </div>
                    </div>
                  ))}
                  {files.length === 0 && folders.length === 0 && (
                    <div className="empty-state">
                      <p>No files yet</p>
                      <p className="empty-subtitle">Drop files here or use the New button</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Share Dialog */}
      {shareDialog.show && (
        <ShareDialog
          item={shareDialog.item}
          itemType={shareDialog.type}
          onClose={closeShareDialog}
        />
      )}
    </div>
  );
};

export default Dashboard;
