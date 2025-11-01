import { useState, useEffect } from 'react';
import { X, Link as LinkIcon, Check, Globe, Lock } from 'lucide-react';
import { sharingAPI } from '../services/api';
import './ShareDialog.css';

const ShareDialog = ({ item, itemType, onClose }) => {
  const [shareLink, setShareLink] = useState(null);
  const [linkPermission, setLinkPermission] = useState('viewer');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkAccess, setLinkAccess] = useState('restricted'); // 'restricted' or 'anyone'

  useEffect(() => {
    loadShareLink();
  }, []);

  const loadShareLink = async () => {
    try {
      const links = await sharingAPI.getShareLinks(itemType, item.id);
      if (links && links.length > 0) {
        setShareLink(links[0]);
        setLinkAccess('anyone');
        setLinkPermission(links[0].permission?.permission_role || 'viewer');
      }
    } catch (error) {
      console.error('Failed to load share link:', error);
    }
  };

  const handleCreateLink = async () => {
    setLoading(true);
    try {
      const link = await sharingAPI.createShareLink(itemType, item.id, linkPermission);
      setShareLink(link);
      setLinkAccess('anyone');
    } catch (error) {
      console.error('Failed to create share link:', error);
      alert('Failed to create share link');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLink = async () => {
    if (!shareLink) return;
    if (!confirm('Remove link access?')) return;

    setLoading(true);
    try {
      await sharingAPI.deactivateShareLink(shareLink.id);
      setShareLink(null);
      setLinkAccess('restricted');
    } catch (error) {
      console.error('Failed to remove link:', error);
      alert('Failed to remove link');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/shared/${shareLink.token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLinkAccessChange = (access) => {
    if (access === 'restricted' && shareLink) {
      handleRemoveLink();
    } else if (access === 'anyone' && !shareLink) {
      handleCreateLink();
    }
  };

  return (
    <div className="share-dialog-overlay" onClick={onClose}>
      <div className="share-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="share-dialog-header">
          <h2>Share "{item.name}"</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="share-dialog-body">
          {/* General Access Section */}
          <div className="access-section">
            <div className="section-title">General access</div>

            <div className="access-option">
              <div className="access-icon">
                {linkAccess === 'restricted' ? <Lock size={20} /> : <Globe size={20} />}
              </div>
              <div className="access-info">
                <select
                  className="access-select"
                  value={linkAccess}
                  onChange={(e) => handleLinkAccessChange(e.target.value)}
                  disabled={loading}
                >
                  <option value="restricted">Restricted</option>
                  <option value="anyone">Anyone with the link</option>
                </select>
                <div className="access-description">
                  {linkAccess === 'restricted'
                    ? 'Only you have access'
                    : 'Anyone on the internet with the link can view'}
                </div>
              </div>
              {linkAccess === 'anyone' && shareLink && (
                <select
                  className="permission-select"
                  value={linkPermission}
                  onChange={(e) => setLinkPermission(e.target.value)}
                  disabled={loading}
                >
                  <option value="viewer">Viewer</option>
                  <option value="commenter">Commenter</option>
                  <option value="editor">Editor</option>
                </select>
              )}
            </div>
          </div>

          {/* Copy Link Section */}
          {shareLink && linkAccess === 'anyone' && (
            <div className="link-section">
              <div className="link-input-wrapper">
                <LinkIcon size={18} className="link-icon" />
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/shared/${shareLink.token}`}
                  className="link-input"
                />
              </div>
              <button
                className="copy-link-btn"
                onClick={handleCopyLink}
              >
                {copied ? (
                  <>
                    <Check size={16} />
                    Copied
                  </>
                ) : (
                  'Copy link'
                )}
              </button>
            </div>
          )}

          {/* Owner Section */}
          <div className="owner-section">
            <div className="section-title">People with access</div>
            <div className="owner-item">
              <div className="owner-avatar">
                {item.owner_name?.[0]?.toUpperCase() || 'M'}
              </div>
              <div className="owner-info">
                <div className="owner-name">me (owner)</div>
                <div className="owner-email">Owner</div>
              </div>
            </div>
          </div>
        </div>

        <div className="share-dialog-footer">
          <button className="done-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareDialog;
