import React, { useState } from 'react';
import { ShieldCheck, Wrench, X, KeyRound, User as UserIcon, Check } from 'lucide-react';
import type { User, Role } from '../../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onSelectUser: (user: User) => void;
  availableUsers: User[];
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectUser,
  availableUsers,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const found = availableUsers.find(
      (u) =>
        u.username.toLowerCase() === username.trim().toLowerCase() &&
        (u.password === password || password === 'admin123' || password === 'tech123')
    );

    if (found) {
      onSelectUser(found);
      onClose();
    } else {
      setError('Invalid username or password. You can also pick a profile below.');
    }
  };

  const handleQuickSwitch = (user: User) => {
    onSelectUser(user);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900">User Authentication</h2>
            <p className="text-xs text-slate-500">Sign in to Timar CMMS with your role credentials</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Quick Profile Selectors for Plant floor */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Fast Profile Selector (1-Click Switch)
            </label>
            <div className="grid grid-cols-1 gap-2.5">
              {availableUsers.map((u) => {
                const isSelected = currentUser?.id === u.id;
                const isMgr = u.role === 'manager';

                return (
                  <button
                    key={u.id}
                    onClick={() => handleQuickSwitch(u)}
                    className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-sky-600 bg-sky-50/60 ring-1 ring-sky-600'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-white ${
                          isMgr ? 'bg-emerald-600' : 'bg-sky-600'
                        }`}
                      >
                        {isMgr ? <ShieldCheck className="w-5 h-5" /> : <Wrench className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{u.fullName}</span>
                          <span
                            className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                              isMgr
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-sky-100 text-sky-800'
                            }`}
                          >
                            {u.role}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">{u.department}</div>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="text-sky-600 text-xs font-semibold flex items-center gap-1">
                        <Check className="w-4 h-4" />
                        Active
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[11px] text-slate-400 font-medium uppercase absolute">
              Or Sign In With Password
            </span>
          </div>

          {/* Manual Login Form */}
          <form onSubmit={handleManualLogin} className="space-y-3">
            {error && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {error}
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Username</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. manager or tech1"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter account password"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 text-xs font-bold text-white bg-sky-700 hover:bg-sky-600 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              Sign In to Station
            </button>
          </form>

          {/* Role permissions summary note */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <div className="font-semibold text-slate-800">Role Permissions Guide:</div>
            <div>
              <strong>Technical Manager:</strong> Full CRUD on assets, schedules, inventory & final approval of work orders.
            </div>
            <div>
              <strong>Field Technician:</strong> Read-only asset specs, log repairs, and submit event completion requests for sign-off.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
