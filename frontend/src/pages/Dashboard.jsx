import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { filesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

function Dashboard({ view = 'mydrive' }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { user, logout } = useAuth();

  useEffect(() => {
    loadFiles();
  }, [view]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      let data;
      switch (view) {
        case 'recent':
          data = await filesAPI.getRecentFiles();
          break;
        case 'starred':
          data = await filesAPI.getStarredFiles();
          break;
        case 'trash':
          data = await filesAPI.getTrashedFiles();
          break;
        default:
          data = await filesAPI.getFiles();
      }
      setFiles(data || []);
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      await filesAPI.uploadFile(file);
      await loadFiles();
      e.target.value = '';
    } catch (error) {
      alert('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (file) => {
    try {
      const blob = await filesAPI.downloadFile(file.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
    } catch (error) {
      alert('Download failed');
    }
  };

  const handleDelete = async (fileId) => {
    if (!confirm('Move to trash?')) return;
    try {
      await filesAPI.deleteFile(fileId);
      await loadFiles();
    } catch (error) {
      alert('Delete failed');
    }
  };

  const handleStar = async (fileId) => {
    try {
      await filesAPI.toggleStar(fileId);
      await loadFiles();
    } catch (error) {
      alert('Failed to star file');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f5f5f5' }}>
      {/* Sidebar */}
      <div style={{
        width: '250px',
        background: 'white',
        padding: '20px',
        borderRight: '1px solid #ddd'
      }}>
        <h2 style={{ marginBottom: '30px', color: '#667eea' }}>🚀 GDrive</h2>
        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="file-upload" style={{
            display: 'block',
            padding: '12px 20px',
            background: '#667eea',
            color: 'white',
            borderRadius: '5px',
            cursor: 'pointer',
            textAlign: 'center',
            fontWeight: 'bold'
          }}>
            {uploading ? 'Uploading...' : '+ Upload File'}
          </label>
          <input
            id="file-upload"
            type="file"
            onChange={handleUpload}
            disabled={uploading}
            style={{ display: 'none' }}
          />
        </div>
        <nav>
          <Link to="/" style={{
            display: 'block',
            padding: '10px',
            marginBottom: '5px',
            textDecoration: 'none',
            color: view === 'mydrive' ? '#667eea' : '#333',
            background: view === 'mydrive' ? '#f0f0ff' : 'transparent',
            borderRadius: '5px'
          }}>
            📁 My Drive
          </Link>
          <Link to="/recent" style={{
            display: 'block',
            padding: '10px',
            marginBottom: '5px',
            textDecoration: 'none',
            color: view === 'recent' ? '#667eea' : '#333',
            background: view === 'recent' ? '#f0f0ff' : 'transparent',
            borderRadius: '5px'
          }}>
            🕒 Recent
          </Link>
          <Link to="/starred" style={{
            display: 'block',
            padding: '10px',
            marginBottom: '5px',
            textDecoration: 'none',
            color: view === 'starred' ? '#667eea' : '#333',
            background: view === 'starred' ? '#f0f0ff' : 'transparent',
            borderRadius: '5px'
          }}>
            ⭐ Starred
          </Link>
          <Link to="/trash" style={{
            display: 'block',
            padding: '10px',
            marginBottom: '5px',
            textDecoration: 'none',
            color: view === 'trash' ? '#667eea' : '#333',
            background: view === 'trash' ? '#f0f0ff' : 'transparent',
            borderRadius: '5px'
          }}>
            🗑️ Trash
          </Link>
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid #ddd' }}>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
            👤 {user?.name}
          </p>
          <button
            onClick={logout}
            style={{
              width: '100%',
              padding: '8px',
              background: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '30px', overflowY: 'auto' }}>
        <h1 style={{ marginBottom: '30px', color: '#333' }}>
          {view === 'mydrive' ? '📁 My Drive' :
           view === 'recent' ? '🕒 Recent Files' :
           view === 'starred' ? '⭐ Starred Files' :
           '🗑️ Trash'}
        </h1>

        {loading ? (
          <p>Loading...</p>
        ) : files.length === 0 ? (
          <p style={{ color: '#999', textAlign: 'center', marginTop: '50px' }}>
            No files here. Upload your first file! 📤
          </p>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '20px'
          }}>
            {files.map((file) => (
              <div
                key={file.id}
                style={{
                  background: 'white',
                  padding: '20px',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  transition: 'transform 0.2s',
                  cursor: 'pointer'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>
                  {file.mime_type?.startsWith('image/') ? '🖼️' :
                   file.mime_type === 'application/pdf' ? '📄' :
                   file.mime_type?.startsWith('video/') ? '🎥' :
                   '📎'}
                </div>
                <h3 style={{
                  fontSize: '16px',
                  marginBottom: '10px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {file.name}
                </h3>
                <p style={{ fontSize: '14px', color: '#999', marginBottom: '15px' }}>
                  {formatFileSize(file.size)}
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => handleDownload(file)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      background: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    ⬇️ Download
                  </button>
                  <button
                    onClick={() => handleStar(file.id)}
                    style={{
                      padding: '8px 12px',
                      background: file.is_starred ? '#FFD700' : '#eee',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer'
                    }}
                  >
                    {file.is_starred ? '⭐' : '☆'}
                  </button>
                  <button
                    onClick={() => handleDelete(file.id)}
                    style={{
                      padding: '8px 12px',
                      background: '#f44336',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer'
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
