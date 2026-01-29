(function() {
  'use strict';
  
  // 默认配置
  const defaults = {
    apiUrl: 'https://bamby-comments.vercel.app/api',
    container: '#comments',
    postId: window.location.pathname,
    theme: 'light',
    showAvatar: true,
    autoLoad: true
  };
  
  class CommentSystem {
    constructor(options = {}) {
      this.config = { ...defaults, ...options };
      this.container = typeof this.config.container === 'string' 
        ? document.querySelector(this.config.container)
        : this.config.container;
      
      if (!this.container) {
        console.error('Comment container not found');
        return;
      }
      
      if (this.config.autoLoad) {
        this.init();
      }
    }
    
    async init() {
      this.renderLoading();
      this.renderForm();
      await this.loadComments();
    }
    
    renderLoading() {
      this.container.innerHTML = `
        <div class="comments-loading">
          <div class="loading-spinner"></div>
          <p>加载评论中...</p>
        </div>
      `;
    }
    
    renderForm() {
      const formHTML = `
        <div class="comment-form-section">
          <h3>发表评论</h3>
          <form class="comment-form" id="comment-form-${Date.now()}">
            <div class="form-group">
              <label for="author">昵称 *</label>
              <input 
                type="text" 
                id="author" 
                name="author" 
                required 
                placeholder="您的昵称"
                maxlength="50"
              >
            </div>
            
            <div class="form-group">
              <label for="email">邮箱 (可选)</label>
              <input 
                type="email" 
                id="email" 
                name="email" 
                placeholder="用于显示Gravatar头像"
              >
              <small>邮箱不会被公开显示</small>
            </div>
            
            <div class="form-group">
              <label for="content">评论内容 *</label>
              <textarea 
                id="content" 
                name="content" 
                rows="4" 
                required 
                placeholder="请输入您的评论..."
                maxlength="1000"
              ></textarea>
              <div class="char-counter">0/1000</div>
            </div>
            
            <div class="form-actions">
              <button type="submit" class="submit-btn">
                <span class="btn-text">提交评论</span>
                <span class="loading-spinner" style="display:none;"></span>
              </button>
            </div>
            
            <div class="form-notice" style="display:none;"></div>
          </form>
        </div>
        
        <div class="comments-section">
          <h3>评论 <span class="comments-count">0</span></h3>
          <div class="comments-list"></div>
        </div>
      `;
      
      this.container.innerHTML = formHTML;
      this.bindFormEvents();
      this.setupCharCounter();
      this.injectStyles();
    }
    
    bindFormEvents() {
      const form = this.container.querySelector('.comment-form');
      if (!form) return;
      
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.submitComment(form);
      });
    }
    
    setupCharCounter() {
      const textarea = this.container.querySelector('textarea[name="content"]');
      const counter = this.container.querySelector('.char-counter');
      
      if (textarea && counter) {
        textarea.addEventListener('input', () => {
          const length = textarea.value.length;
          counter.textContent = `${length}/1000`;
          counter.style.color = length > 900 ? '#ff6b6b' : '#666';
        });
      }
    }
    
    async submitComment(form) {
      const formData = new FormData(form);
      const submitBtn = form.querySelector('.submit-btn');
      const btnText = submitBtn.querySelector('.btn-text');
      const spinner = submitBtn.querySelector('.loading-spinner');
      const notice = form.querySelector('.form-notice');
      
      // 获取表单数据
      const comment = {
        postId: this.config.postId,
        author: formData.get('author').trim(),
        email: formData.get('email').trim() || null,
        content: formData.get('content').trim()
      };
      
      // 验证
      if (!comment.author || !comment.content) {
        this.showNotice(notice, '请填写昵称和评论内容', 'error');
        return;
      }
      
      // 显示加载状态
      btnText.style.display = 'none';
      spinner.style.display = 'inline-block';
      submitBtn.disabled = true;
      notice.style.display = 'none';
      
      try {
        const response = await fetch(`${this.config.apiUrl}/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(comment)
        });
        
        const result = await response.json();
        
        if (response.ok) {
          // 提交成功
          form.reset();
          this.showNotice(notice, '评论提交成功！', 'success');
          await this.loadComments(); // 重新加载评论
        } else {
          // 提交失败
          this.showNotice(notice, result.error || '提交失败，请重试', 'error');
        }
      } catch (error) {
        console.error('Submit error:', error);
        this.showNotice(notice, '网络错误，请稍后重试', 'error');
      } finally {
        // 恢复按钮状态
        btnText.style.display = 'inline-block';
        spinner.style.display = 'none';
        submitBtn.disabled = false;
      }
    }
    
    showNotice(element, message, type = 'info') {
      if (!element) return;
      
      element.textContent = message;
      element.className = `form-notice notice-${type}`;
      element.style.display = 'block';
      
      // 3秒后自动隐藏
      setTimeout(() => {
        element.style.display = 'none';
      }, 3000);
    }
    
    async loadComments() {
      const list = this.container.querySelector('.comments-list');
      const count = this.container.querySelector('.comments-count');
      
      if (!list) return;
      
      list.innerHTML = '<div class="loading">加载中...</div>';
      
      try {
        const response = await fetch(
          `${this.config.apiUrl}/comments?postId=${encodeURIComponent(this.config.postId)}`
        );
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const comments = await response.json();
        
        if (comments.length === 0) {
          list.innerHTML = '<div class="no-comments">暂无评论，快来第一个发言吧！</div>';
          if (count) count.textContent = '0';
          return;
        }
        
        // 更新评论数量
        if (count) count.textContent = comments.length.toString();
        
        // 渲染评论
        list.innerHTML = comments.map(comment => this.renderComment(comment)).join('');
      } catch (error) {
        console.error('Load comments error:', error);
        list.innerHTML = `<div class="error">加载评论失败: ${error.message}</div>`;
      }
    }
    
    renderComment(comment) {
      const date = new Date(comment.createdAt);
      const formattedDate = date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      return `
        <div class="comment-item" id="comment-${comment._id}">
          <div class="comment-header">
            ${this.config.showAvatar && comment.avatar ? 
              `<img src="${comment.avatar}" alt="${comment.author}" class="comment-avatar">` : 
              `<div class="comment-avatar default-avatar">${comment.author.charAt(0)}</div>`
            }
            <div class="comment-meta">
              <strong class="comment-author">${this.escapeHtml(comment.author)}</strong>
              <span class="comment-date">${formattedDate}</span>
            </div>
          </div>
          <div class="comment-content">${this.formatContent(this.escapeHtml(comment.content))}</div>
        </div>
      `;
    }
    
    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
    
    formatContent(content) {
      // 简单格式化：URL转链接，换行处理
      return content
        .replace(/\n/g, '<br>')
        .replace(
          /(https?:\/\/[^\s]+)/g, 
          '<a href="$1" target="_blank" rel="nofollow noopener">$1</a>'
        );
    }
    
    injectStyles() {
      if (document.getElementById('comments-widget-styles')) return;
      
      const styles = `
        .comment-form-section {
          background: ${this.config.theme === 'dark' ? '#2d2d2d' : '#f8f9fa'};
          padding: 1.5rem;
          border-radius: 8px;
          margin-bottom: 2rem;
          border: 1px solid ${this.config.theme === 'dark' ? '#404040' : '#dee2e6'};
        }
        
        .comment-form-section h3 {
          margin-top: 0;
          margin-bottom: 1rem;
          color: ${this.config.theme === 'dark' ? '#fff' : '#333'};
        }
        
        .form-group {
          margin-bottom: 1rem;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: ${this.config.theme === 'dark' ? '#ccc' : '#555'};
        }
        
        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid ${this.config.theme === 'dark' ? '#555' : '#ced4da'};
          border-radius: 4px;
          font-size: 1rem;
          background: ${this.config.theme === 'dark' ? '#363636' : '#fff'};
          color: ${this.config.theme === 'dark' ? '#fff' : '#333'};
          box-sizing: border-box;
        }
        
        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
        }
        
        .form-group small {
          display: block;
          margin-top: 0.25rem;
          color: #6c757d;
          font-size: 0.875rem;
        }
        
        .char-counter {
          text-align: right;
          font-size: 0.875rem;
          margin-top: 0.25rem;
          color: #666;
        }
        
        .form-actions {
          margin-top: 1.5rem;
        }
        
        .submit-btn {
          background: #007bff;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          font-size: 1rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 120px;
          transition: background-color 0.2s;
        }
        
        .submit-btn:hover:not(:disabled) {
          background: #0056b3;
        }
        
        .submit-btn:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }
        
        .loading-spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,.3);
          border-radius: 50%;
          border-top-color: #fff;
          animation: spin 1s ease-in-out infinite;
          margin-left: 8px;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .form-notice {
          padding: 0.75rem;
          border-radius: 4px;
          margin-top: 1rem;
          display: none;
        }
        
        .notice-success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }
        
        .notice-error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }
        
        .comments-section {
          margin-top: 2rem;
        }
        
        .comments-section h3 {
          color: ${this.config.theme === 'dark' ? '#fff' : '#333'};
          margin-bottom: 1rem;
        }
        
        .comments-count {
          background: #007bff;
          color: white;
          padding: 0.1rem 0.5rem;
          border-radius: 12px;
          font-size: 0.9rem;
          margin-left: 0.5rem;
        }
        
        .comment-item {
          padding: 1rem 0;
          border-bottom: 1px solid ${this.config.theme === 'dark' ? '#404040' : '#e9ecef'};
        }
        
        .comment-item:last-child {
          border-bottom: none;
        }
        
        .comment-header {
          display: flex;
          align-items: center;
          margin-bottom: 0.75rem;
        }
        
        .comment-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          margin-right: 0.75rem;
          object-fit: cover;
        }
        
        .default-avatar {
          background: #007bff;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 1.2rem;
        }
        
        .comment-meta {
          flex: 1;
        }
        
        .comment-author {
          display: block;
          color: ${this.config.theme === 'dark' ? '#fff' : '#333'};
          font-weight: 600;
        }
        
        .comment-date {
          display: block;
          color: #6c757d;
          font-size: 0.875rem;
          margin-top: 0.1rem;
        }
        
        .comment-content {
          color: ${this.config.theme === 'dark' ? '#ccc' : '#555'};
          line-height: 1.6;
          margin-left: 55px;
        }
        
        .comment-content a {
          color: #007bff;
          text-decoration: none;
        }
        
        .comment-content a:hover {
          text-decoration: underline;
        }
        
        .comments-loading {
          text-align: center;
          padding: 2rem;
          color: #6c757d;
        }
        
        .no-comments, .loading, .error {
          text-align: center;
          padding: 2rem;
          color: #6c757d;
          font-style: italic;
        }
        
        .error {
          color: #dc3545;
        }
      `;
      
      const styleTag = document.createElement('style');
      styleTag.id = 'comments-widget-styles';
      styleTag.textContent = styles;
      document.head.appendChild(styleTag);
    }
  }
  
  // 导出到全局
  window.CommentSystem = CommentSystem;
  
  // 自动初始化（如果容器存在）
  document.addEventListener('DOMContentLoaded', function() {
    const container = document.querySelector('#comments');
    if (container) {
      window.bambyComments = new CommentSystem({
        container: container
      });
    }
  });
})();