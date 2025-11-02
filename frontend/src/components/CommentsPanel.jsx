import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Edit2, Trash2, X, Check } from 'lucide-react';
import { commentsAPI } from '../services/api';
import './CommentsPanel.css';

const CommentsPanel = ({ fileId, currentUser }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadComments();
  }, [fileId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await commentsAPI.getFileComments(fileId);
      setComments(data);
    } catch (err) {
      console.error('Failed to load comments:', err);
      setError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const comment = await commentsAPI.createComment(fileId, newComment.trim());
      setComments([...comments, comment]);
      setNewComment('');
    } catch (err) {
      console.error('Failed to add comment:', err);
      setError('Failed to add comment');
    }
  };

  const handleEditComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditContent(comment.content);
  };

  const handleSaveEdit = async (commentId) => {
    if (!editContent.trim()) return;

    try {
      const updatedComment = await commentsAPI.updateComment(commentId, editContent.trim());
      setComments(comments.map(c => c.id === commentId ? updatedComment : c));
      setEditingCommentId(null);
      setEditContent('');
    } catch (err) {
      console.error('Failed to update comment:', err);
      setError('Failed to update comment');
    }
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditContent('');
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    try {
      await commentsAPI.deleteComment(commentId);
      setComments(comments.filter(c => c.id !== commentId));
    } catch (err) {
      console.error('Failed to delete comment:', err);
      setError('Failed to delete comment');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <div className="comments-panel">
      <div className="comments-header">
        <MessageSquare size={20} />
        <h3>Comments ({comments.length})</h3>
      </div>

      {error && (
        <div className="comments-error">
          {error}
        </div>
      )}

      <div className="comments-list">
        {loading ? (
          <div className="comments-loading">Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className="comments-empty">
            <MessageSquare size={48} />
            <p>No comments yet</p>
            <span>Be the first to comment</span>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="comment-item">
              <div className="comment-avatar">
                {comment.user_name.charAt(0).toUpperCase()}
              </div>
              <div className="comment-content">
                <div className="comment-header">
                  <div className="comment-info">
                    <span className="comment-author">{comment.user_name}</span>
                    <span className="comment-date">{formatDate(comment.created_at)}</span>
                    {comment.created_at !== comment.updated_at && (
                      <span className="comment-edited">(edited)</span>
                    )}
                  </div>
                  {comment.user_id === currentUser?.id && (
                    <div className="comment-actions">
                      {editingCommentId === comment.id ? (
                        <>
                          <button
                            onClick={() => handleSaveEdit(comment.id)}
                            className="comment-action-btn save"
                            title="Save"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="comment-action-btn cancel"
                            title="Cancel"
                          >
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEditComment(comment)}
                            className="comment-action-btn"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="comment-action-btn delete"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                {editingCommentId === comment.id ? (
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="comment-edit-input"
                    rows="3"
                    autoFocus
                  />
                ) : (
                  <p className="comment-text">{comment.content}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleAddComment} className="comment-form">
        <div className="comment-input-wrapper">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="comment-input"
            rows="3"
          />
        </div>
        <button
          type="submit"
          disabled={!newComment.trim()}
          className="comment-submit-btn"
        >
          <Send size={16} />
          <span>Comment</span>
        </button>
      </form>
    </div>
  );
};

export default CommentsPanel;
