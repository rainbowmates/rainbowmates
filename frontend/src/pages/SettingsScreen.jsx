import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, User, Heart, Lock, Trash2, LogOut } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function SettingsScreen({ user, onLogout }) {
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleLogout = () => {
    onLogout();
    navigate('/auth');
  };

  const handleDeleteAccount = async () => {
    try {
      await axios.delete(`${API}/user/delete/${user.id}`);
      toast.success('Account deleted successfully');
      onLogout();
      navigate('/auth');
    } catch (error) {
      toast.error('Failed to delete account');
    }
  };

  const settings = [
    {
      icon: User,
      title: 'Edit User Avatar',
      description: 'Update your profile avatar',
      action: () => navigate('/create-avatar'),
      testId: 'edit-avatar'
    },
    {
      icon: Heart,
      title: 'Edit Bestie',
      description: 'Update bestie personality & preferences',
      action: () => navigate('/create-bestie'),
      testId: 'edit-bestie'
    },
    {
      icon: Lock,
      title: 'Change Password',
      description: 'Update your password',
      action: () => toast.info('Password change coming soon!'),
      testId: 'change-password'
    },
    {
      icon: LogOut,
      title: 'Log Out',
      description: 'Sign out of your account',
      action: handleLogout,
      testId: 'logout',
      color: 'text-orange-500'
    },
    {
      icon: Trash2,
      title: 'Delete Account',
      description: 'Permanently delete your account',
      action: () => setShowDeleteConfirm(true),
      testId: 'delete-account',
      color: 'text-red-500'
    }
  ];

  return (
    <div className="app-container gradient-mesh min-h-screen overflow-y-auto">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <button
            data-testid="back-button"
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-full bg-white border border-border hover:bg-muted transition-all"
          >
            <ArrowLeft className="w-6 h-6 text-dark-purple" />
          </button>
          <h1 className="text-3xl font-bold text-dark-purple" style={{ fontFamily: 'Nunito, sans-serif' }}>
            Settings
          </h1>
        </div>

        {/* User Info */}
        <div className="card-soft p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-neon-pink to-soft-blue flex items-center justify-center overflow-hidden">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-dark-purple">{user.first_name} {user.surname}</h2>
              <p className="text-sm text-dark-purple/70">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Settings Options */}
        <div className="space-y-3">
          {settings.map((setting, idx) => (
            <button
              key={idx}
              data-testid={setting.testId}
              onClick={setting.action}
              className="w-full card-soft p-4 text-left hover:scale-[1.02] transition-all"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl bg-muted ${setting.color || 'text-dark-purple'}`}>
                  <setting.icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-dark-purple">{setting.title}</h3>
                  <p className="text-sm text-dark-purple/70">{setting.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
          <div className="card-soft p-6 max-w-sm w-full" data-testid="delete-confirm-modal">
            <h3 className="text-xl font-bold text-dark-purple mb-2">Delete Account?</h3>
            <p className="text-sm text-dark-purple/70 mb-6">
              This action cannot be undone. All your data will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                data-testid="cancel-delete"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 px-4 rounded-full bg-muted text-dark-purple font-semibold hover:bg-border transition-all"
              >
                Cancel
              </button>
              <button
                data-testid="confirm-delete"
                onClick={handleDeleteAccount}
                className="flex-1 py-3 px-4 rounded-full bg-red-500 text-white font-semibold hover:bg-red-600 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}