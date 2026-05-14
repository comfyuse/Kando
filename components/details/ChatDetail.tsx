export default function ChatDetail() {
  return (
    <div className="grid md:grid-cols-2 gap-6 p-4">
      <div className="space-y-3">
        <h3 className="text-xl font-semibold">🔐 E2EE Encryption</h3>
        <p className="text-foreground/70">Signal Protocol with one-time keys</p>
        <div className="bg-jade/10 rounded-lg p-3 mt-2">
          <code className="text-xs">AES-256 + ChaCha20</code>
        </div>
      </div>
      <div className="space-y-3">
        <h3 className="text-xl font-semibold">🎥 HD Calls</h3>
        <p className="text-foreground/70">Studio quality audio & 4K video</p>
        <div className="flex gap-2 mt-2">
          <span className="px-2 py-1 bg-jade/20 rounded text-xs">WebRTC</span>
          <span className="px-2 py-1 bg-jade/20 rounded text-xs">Opus</span>
        </div>
      </div>
    </div>
  );
}