import React from 'react';
import { PlusCircle, FileText, ArrowRight, Sparkles } from 'lucide-react';
import '../styles/HomePage.css';

const HomePage = ({ userName }) => {
  return (
    <div className="home-page fade-in">
      <section className="welcome-section glass-panel">
        <div className="welcome-content">
          <div className="badge-group">
            <span className="badge ai-badge">
              <Sparkles size={14} />
              AI WORKSPACE
            </span>
            <span className="badge secure-badge">SECURE & SYNCED</span>
          </div>
          <h1>Welcome, {userName || 'Guest'}</h1>
          <p>
            Your AI-powered workspace — clean, fast, and beautifully organized. 
            Sign in to start creating notes.
          </p>
          <button className="btn btn-primary create-btn">
            <PlusCircle size={20} />
            Create New Note
          </button>
        </div>
        <div className="welcome-illustration">
          {/* Decorative elements to match the image */}
          <div className="sketch-icon"></div>
        </div>
      </section>

      <div className="stats-row">
        <div className="stat-card glass-panel">
          <div className="stat-icon-wrapper">
            <FileText size={24} color="#6366f1" />
          </div>
          <div className="stat-info">
            <span className="stat-label">TOTAL NOTES</span>
            <h3 className="stat-value">—</h3>
          </div>
          <span className="status-badge active">Active</span>
        </div>

        <div className="action-card glass-panel">
          <div className="action-content">
            <div className="action-icon">
              <FileText size={24} />
            </div>
            <div className="action-text">
              <h3>Manage Content</h3>
              <p>Access your full library, organize with tags, and review drafts efficiently.</p>
            </div>
          </div>
          <button className="btn btn-ghost view-all-btn">
            View All Notes
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
