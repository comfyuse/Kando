'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { conversations as seed, Conversation, ChatMessage } from '../../data/chats';
import Avatar from '../Avatar';
import { SearchIcon, ChevronRightIcon } from '../Icons';

function ChatList({
  items,
  query,
  onQuery,
  onOpen,
}: {
  items: Conversation[];
  query: string;
  onQuery: (v: string) => void;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="max-w-lg mx-auto px-4 pt-8 pb-36">
      <h1 className="text-xl font-bold text-[var(--text-primary)] mb-4">Chats</h1>

      <div className="relative flex items-center mb-4">
        <SearchIcon width={18} height={18} className="absolute left-3.5 text-[var(--text-muted)]" />
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search conversations"
          className="w-full rounded-xl bg-white/[0.04] border border-white/10 pl-11 pr-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--jade)] transition-colors"
        />
      </div>

      {items.length === 0 ? (
        <p className="text-center text-sm text-[var(--text-muted)] py-16">No conversations found.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {items.map((c) => {
            const last = c.messages[c.messages.length - 1];
            return (
              <button
                key={c.id}
                onClick={() => onOpen(c.id)}
                className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-white/[0.04] transition-colors text-left"
              >
                <div className="relative">
                  <Avatar name={c.name} size={48} />
                  {c.online && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#0d1117]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-[var(--text-primary)] truncate">{c.name}</span>
                    <span className="text-[11px] text-[var(--text-muted)] shrink-0">{c.lastTime}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-[var(--text-muted)] truncate">
                      {last.fromMe ? 'You: ' : ''}
                      {last.text}
                    </span>
                    {c.unread > 0 && (
                      <span className="shrink-0 min-w-5 h-5 px-1.5 flex items-center justify-center rounded-full bg-[var(--jade)] text-white text-[11px] font-semibold">
                        {c.unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Conversationview({
  conversation,
  draft,
  onBack,
  onSend,
}: {
  conversation: Conversation;
  draft: ChatMessage[];
  onBack: () => void;
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState('');
  const messages = [...conversation.messages, ...draft];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  };

  return (
    <div className="max-w-lg mx-auto flex flex-col h-[100dvh]">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-white/5 glass-modern sticky top-0 z-10">
        <button
          onClick={onBack}
          className="p-1.5 -ml-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] rotate-180"
          aria-label="Back"
        >
          <ChevronRightIcon width={22} height={22} />
        </button>
        <Avatar name={conversation.name} size={38} />
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[var(--text-primary)] truncate">{conversation.name}</div>
          <div className="text-[11px] text-[var(--text-muted)]">
            {conversation.online ? 'Online' : 'Offline'}
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 flex flex-col gap-2">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-sm ${
              m.fromMe
                ? 'self-end bg-gradient-to-br from-[var(--jade)] to-[var(--jade-hover)] text-white rounded-br-md'
                : 'self-start bg-white/[0.06] text-[var(--text-primary)] rounded-bl-md'
            }`}
          >
            <p className="break-words">{m.text}</p>
            <span className={`block text-[10px] mt-0.5 ${m.fromMe ? 'text-white/70' : 'text-[var(--text-muted)]'}`}>
              {m.time}
            </span>
          </div>
        ))}
      </div>

      {/* Composer */}
      <form onSubmit={submit} className="flex items-center gap-2 px-3 py-3 border-t border-white/5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message…"
          className="flex-1 rounded-full bg-white/[0.05] border border-white/10 px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--jade)] transition-colors"
        />
        <button
          type="submit"
          className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-[var(--jade)] to-[var(--jade-hover)] text-white flex items-center justify-center shadow-lg shadow-[var(--jade)]/25 active:scale-95 transition-transform"
          aria-label="Send"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m22 2-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </form>
    </div>
  );
}

export default function ChatsTab({ onImmersiveChange }: { onImmersiveChange?: (v: boolean) => void }) {
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  // Locally-appended messages per conversation (not persisted — session only).
  const [drafts, setDrafts] = useState<Record<string, ChatMessage[]>>({});

  // A full-screen conversation hides the bottom nav.
  useEffect(() => {
    onImmersiveChange?.(openId !== null);
    return () => onImmersiveChange?.(false);
  }, [openId, onImmersiveChange]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return seed;
    return seed.filter((c) => c.name.toLowerCase().includes(q));
  }, [query]);

  const open = openId ? seed.find((c) => c.id === openId) ?? null : null;

  if (open) {
    return (
      <Conversationview
        conversation={open}
        draft={drafts[open.id] ?? []}
        onBack={() => setOpenId(null)}
        onSend={(text) => {
          const msg: ChatMessage = {
            id: `local-${Date.now()}`,
            fromMe: true,
            text,
            time: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
          };
          setDrafts((prev) => ({ ...prev, [open.id]: [...(prev[open.id] ?? []), msg] }));
        }}
      />
    );
  }

  return <ChatList items={filtered} query={query} onQuery={setQuery} onOpen={setOpenId} />;
}
