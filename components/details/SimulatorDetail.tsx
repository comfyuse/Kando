export default function SimulatorDetail() {
  return (
    <div className="grid md:grid-cols-2 gap-6 p-4">
      <div className="space-y-3">
        <h3 className="text-xl font-semibold">⚡ Real Traffic Simulation</h3>
        <p className="text-foreground/70">Up to 1M concurrent messages with less than 50ms latency</p>
        <div className="bg-jade/10 rounded-lg p-4">
          <div className="text-2xl font-mono text-jade">1.2M</div>
          <div className="text-sm">Messages per second</div>
        </div>
      </div>
      <div className="space-y-3">
        <h3 className="text-xl font-semibold">📊 Real-time Dashboard</h3>
        <p className="text-foreground/70">Monitor bandwidth, latency and delivery rate</p>
        <div className="h-16 bg-jade/5 rounded-full overflow-hidden">
          <div className="w-3/4 h-full bg-jade/50 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}