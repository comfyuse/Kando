'use client';

import { ChatUser } from '@/lib/chat-network';

interface UserListProps {
  users: ChatUser[];
  currentUserId: string;
  onSelectUser: (user: ChatUser) => void;
  selectedUserId?: string | null;
}

export default function UserList({ users, currentUserId, onSelectUser, selectedUserId }: UserListProps) {
  const usersByLayer = {
    layer1: users.filter(u => u.layer === 1 && u.id !== currentUserId),
    layer2: users.filter(u => u.layer === 2 && u.id !== currentUserId),
    layer3: users.filter(u => u.layer === 3 && u.id !== currentUserId),
    layer4: users.filter(u => u.layer === 4 && u.id !== currentUserId),
  };

  const layerNames: Record<number, string> = {
    1: '👑 Queen\'s Court',
    2: '🔹 Inner Circle',
    3: '🔸 Middle Ring',
    4: '🌐 Outer Ring',
  };

  return (
    <div className="h-full bg-[#0d1117] rounded-lg border border-[#30363d] overflow-hidden flex flex-col">
      <div className="p-3 border-b border-[#30363d] bg-[#161b22]">
        <h3 className="font-semibold text-white">Network Users</h3>
        <p className="text-xs text-[#8b949e]">{users.length} people connected</p>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {Object.entries(usersByLayer).map(([layer, layerUsers]) => (
          layerUsers.length > 0 && (
            <div key={layer} className="border-b border-[#30363d] last:border-0">
              <div className="px-3 py-2 bg-[#161b22]/50">
                <span className="text-xs font-semibold text-[#8b949e]">{layerNames[parseInt(layer)]}</span>
                <span className="text-xs text-[#8b949e] ml-2">({layerUsers.length})</span>
              </div>
              {layerUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => onSelectUser(user)}
                  className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-[#161b22] transition-all text-left ${
                    selectedUserId === user.id ? 'bg-[#2ea88a]/10 border-l-2 border-[#2ea88a]' : ''
                  }`}
                >
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                         style={{ backgroundColor: user.avatarColor }}>
                      {user.name.charAt(0)}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-[#0d1117] ${
                      user.status === 'online' ? 'bg-[#3fb950]' : user.status === 'away' ? 'bg-[#f0d68a]' : 'bg-[#8b949e]'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{user.name}</div>
                    <div className="text-xs text-[#8b949e]">Layer {user.layer}</div>
                  </div>
                  {user.status === 'online' && (
                    <div className="w-1.5 h-1.5 rounded-full bg-[#3fb950] animate-pulse" />
                  )}
                </button>
              ))}
            </div>
          )
        ))}
      </div>
    </div>
  );
}