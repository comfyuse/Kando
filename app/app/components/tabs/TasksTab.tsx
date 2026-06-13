'use client';

import { FormEvent, useMemo, useState, useSyncExternalStore } from 'react';
import { Account, Task } from '../../types';
import { subscribeTasks, getTasks, getServerTasks, setTasks } from '../../lib/tasks';
import { PlusIcon, CheckIcon, TrashIcon } from '../Icons';

type Filter = 'all' | 'active' | 'done';

const PRIORITY_META: Record<Task['priority'], { label: string; dot: string; chip: string }> = {
  now: { label: 'Now', dot: 'bg-red-400', chip: 'text-red-300 bg-red-400/10' },
  soon: { label: 'Soon', dot: 'bg-amber-400', chip: 'text-amber-300 bg-amber-400/10' },
  later: { label: 'Later', dot: 'bg-sky-400', chip: 'text-sky-300 bg-sky-400/10' },
};

export default function TasksTab({ account }: { account: Account }) {
  const tasks = useSyncExternalStore(subscribeTasks, () => getTasks(account.id), getServerTasks);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('soon');
  const [filter, setFilter] = useState<Filter>('all');

  const update = (next: Task[]) => setTasks(account.id, next);

  const addTask = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    update([
      { id: `t-${Date.now()}`, title: trimmed, done: false, priority, createdAt: Date.now() },
      ...tasks,
    ]);
    setTitle('');
  };

  const toggle = (id: string) =>
    update(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const remove = (id: string) => update(tasks.filter((t) => t.id !== id));

  const visible = useMemo(() => {
    if (filter === 'active') return tasks.filter((t) => !t.done);
    if (filter === 'done') return tasks.filter((t) => t.done);
    return tasks;
  }, [tasks, filter]);

  const remaining = tasks.filter((t) => !t.done).length;

  return (
    <div className="max-w-lg mx-auto px-4 pt-8 pb-36">
      <div className="flex items-baseline justify-between mb-4">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Tasks</h1>
        <span className="text-xs text-[var(--text-muted)]">{remaining} remaining</span>
      </div>

      {/* Add task */}
      <form onSubmit={addTask} className="glass-modern rounded-2xl p-3 mb-4">
        <div className="flex items-center gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a task…"
            className="flex-1 rounded-xl bg-white/[0.04] border border-white/10 px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--jade)] transition-colors"
          />
          <button
            type="submit"
            className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-[var(--jade)] to-[var(--jade-hover)] text-white flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Add task"
          >
            <PlusIcon width={20} height={20} />
          </button>
        </div>
        <div className="flex items-center gap-1.5 mt-2.5">
          {(Object.keys(PRIORITY_META) as Task['priority'][]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                priority === p ? PRIORITY_META[p].chip + ' ring-1 ring-inset ring-white/10' : 'text-[var(--text-muted)]'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_META[p].dot}`} />
              {PRIORITY_META[p].label}
            </button>
          ))}
        </div>
      </form>

      {/* Filters */}
      <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-white/[0.04] mb-4">
        {(['all', 'active', 'done'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
              filter === f ? 'bg-white/[0.07] text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      {visible.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-2">🗒️</div>
          <p className="text-sm text-[var(--text-muted)]">
            {filter === 'done' ? 'Nothing completed yet.' : 'No tasks here — add one above.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {visible.map((t) => (
            <div
              key={t.id}
              className="group glass-modern rounded-2xl flex items-center gap-3 px-3.5 py-3 animate-fadeInUp"
            >
              <button
                onClick={() => toggle(t.id)}
                className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center border-2 transition-all ${
                  t.done ? 'bg-[var(--jade)] border-[var(--jade)]' : 'border-white/20 hover:border-[var(--jade)]'
                }`}
                aria-label={t.done ? 'Mark as not done' : 'Mark as done'}
              >
                {t.done && <CheckIcon width={14} height={14} className="text-white" />}
              </button>
              <div className="flex-1 min-w-0">
                <div
                  className={`text-sm truncate ${
                    t.done ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]'
                  }`}
                >
                  {t.title}
                </div>
              </div>
              <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-md ${PRIORITY_META[t.priority].chip}`}>
                {PRIORITY_META[t.priority].label}
              </span>
              <button
                onClick={() => remove(t.id)}
                className="shrink-0 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                aria-label="Delete task"
              >
                <TrashIcon width={16} height={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
