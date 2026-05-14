'use client';

export default function OpenSourceDetail() {
  return (
    <div className="p-4">
      <div className="flex justify-center gap-8 flex-wrap">
        <div className="text-center">
          <div className="text-3xl font-bold text-jade">⭐ 2.4k</div>
          <div className="text-sm">GitHub Stars</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-jade">🔀 189</div>
          <div className="text-sm">Forks</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-jade">👥 47</div>
          <div className="text-sm">Contributors</div>
        </div>
      </div>
      <div className="mt-6 text-center">
        <button 
          onClick={() => window.open('https://github.com/cando-hex', '_blank')}
          className="border border-jade hover:bg-jade/20 px-6 py-2 rounded-lg transition-colors"
        >
          View on GitHub →
        </button>
      </div>
      <div className="mt-4 text-center text-sm text-foreground/50">
        <p>📜 MIT License - Free to use for everyone</p>
      </div>
    </div>
  );
}