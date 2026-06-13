'use client';

import { useState } from 'react';
import { Account } from '../../types';
import { updateAccount, logout } from '../../lib/auth';
import Avatar from '../Avatar';
import {
  EditIcon,
  CheckIcon,
  BellIcon,
  ShieldIcon,
  LogoutIcon,
  ChevronRightIcon,
} from '../Icons';

function SettingRow({
  icon,
  label,
  hint,
  trailing,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className="text-[var(--jade)]">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-[var(--text-primary)]">{label}</div>
        {hint && <div className="text-xs text-[var(--text-muted)]">{hint}</div>}
      </div>
      {trailing ?? <ChevronRightIcon width={18} height={18} className="text-[var(--text-muted)]" />}
    </div>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-11 h-6 rounded-full p-0.5 transition-colors ${on ? 'bg-[var(--jade)]' : 'bg-white/10'}`}
      aria-pressed={on}
    >
      <span
        className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : ''}`}
      />
    </button>
  );
}

export default function AccountTab({ account }: { account: Account }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(account.name);
  const [status, setStatus] = useState(account.status);
  const [notifications, setNotifications] = useState(true);
  const [readReceipts, setReadReceipts] = useState(false);

  // Both mutators notify the auth store, which re-renders AppPage with the
  // updated account (or signs out), so no callbacks are needed here.
  const save = () => {
    updateAccount(account.id, { name: name.trim() || account.name, status });
    setEditing(false);
  };

  const memberSince = new Date(account.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="max-w-lg mx-auto px-4 pt-8 pb-36">
      <h1 className="text-xl font-bold text-[var(--text-primary)] mb-5">Account</h1>

      {/* Profile card */}
      <div className="glass-modern rounded-3xl p-6 flex flex-col items-center text-center">
        <Avatar name={account.name} size={88} />
        {editing ? (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-4 w-full text-center rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2 text-lg font-semibold text-[var(--text-primary)]"
            placeholder="Your name"
          />
        ) : (
          <h2 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">{account.name}</h2>
        )}
        <p className="text-sm text-[var(--text-muted)] mt-0.5">{account.email}</p>

        {editing ? (
          <input
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            maxLength={60}
            className="mt-3 w-full text-center rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2 text-sm text-[var(--text-secondary)]"
            placeholder="Set a status"
          />
        ) : (
          <p className="mt-3 text-sm text-[var(--text-secondary)] bg-white/[0.04] rounded-full px-4 py-1.5">
            {account.status}
          </p>
        )}

        <button
          onClick={() => (editing ? save() : setEditing(true))}
          className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--jade)] to-[var(--jade-hover)] text-white text-sm font-medium shadow-lg shadow-[var(--jade)]/25 hover:opacity-95 active:scale-[0.99] transition-all"
        >
          {editing ? <CheckIcon width={16} height={16} /> : <EditIcon width={16} height={16} />}
          {editing ? 'Save profile' : 'Edit profile'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        {[
          { label: 'Member since', value: memberSince },
          { label: 'Hive cell', value: '0,0' },
          { label: 'Trust', value: '100%' },
        ].map((s) => (
          <div key={s.label} className="glass-modern rounded-2xl py-4 text-center">
            <div className="text-base font-semibold text-[var(--text-primary)]">{s.value}</div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Settings */}
      <div className="glass-modern rounded-3xl mt-4 divide-y divide-white/5 overflow-hidden">
        <SettingRow
          icon={<BellIcon width={20} height={20} />}
          label="Notifications"
          hint="Push alerts for new messages"
          trailing={<Toggle on={notifications} onClick={() => setNotifications((v) => !v)} />}
        />
        <SettingRow
          icon={<ShieldIcon width={20} height={20} />}
          label="Read receipts"
          hint="Let others see when you've read"
          trailing={<Toggle on={readReceipts} onClick={() => setReadReceipts((v) => !v)} />}
        />
        <SettingRow icon={<ShieldIcon width={20} height={20} />} label="Privacy & security" />
      </div>

      <button
        onClick={logout}
        className="mt-4 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/15 transition-colors"
      >
        <LogoutIcon width={18} height={18} />
        Log out
      </button>
    </div>
  );
}
