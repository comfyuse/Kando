// Seed conversations for the Chats tab. The hive's citizens, with a short
// recent thread each so the UI feels alive without a backend.

export interface ChatMessage {
  id: string;
  fromMe: boolean;
  text: string;
  time: string;
}

export interface Conversation {
  id: string;
  name: string;
  online: boolean;
  unread: number;
  lastTime: string;
  messages: ChatMessage[];
}

export const conversations: Conversation[] = [
  {
    id: 'shaya',
    name: 'Shaya',
    online: true,
    unread: 2,
    lastTime: '09:24',
    messages: [
      { id: 'm1', fromMe: false, text: 'Did the new hive build deploy?', time: '09:20' },
      { id: 'm2', fromMe: true, text: 'Yep, Turbopack is happy now 🎉', time: '09:22' },
      { id: 'm3', fromMe: false, text: 'Amazing. Sending you the invite link', time: '09:24' },
    ],
  },
  {
    id: 'sahand',
    name: 'Sahand',
    online: true,
    unread: 0,
    lastTime: '08:51',
    messages: [
      { id: 'm1', fromMe: false, text: 'Cell (1,-1) is reserved for you', time: '08:50' },
      { id: 'm2', fromMe: true, text: 'On my way to claim it', time: '08:51' },
    ],
  },
  {
    id: 'dorsa',
    name: 'Dorsa',
    online: false,
    unread: 0,
    lastTime: 'Yesterday',
    messages: [
      { id: 'm1', fromMe: true, text: 'Thanks for the review!', time: '21:10' },
      { id: 'm2', fromMe: false, text: 'Anytime 🙌', time: '21:12' },
    ],
  },
  {
    id: 'arman',
    name: 'Arman',
    online: false,
    unread: 5,
    lastTime: 'Yesterday',
    messages: [
      { id: 'm1', fromMe: false, text: 'Can you approve my message ring?', time: '18:02' },
      { id: 'm2', fromMe: false, text: '3 of 6 neighbours already said yes', time: '18:03' },
    ],
  },
  {
    id: 'bahram',
    name: 'Bahram',
    online: true,
    unread: 0,
    lastTime: 'Mon',
    messages: [{ id: 'm1', fromMe: false, text: 'Welcome to the hive 🐝', time: '11:30' }],
  },
];
