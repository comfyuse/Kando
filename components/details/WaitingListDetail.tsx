'use client';

import { useState } from 'react';

export default function WaitingListDetail() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    }
  };

  return (
    <div className="p-4 text-center">
      <h3 className="text-xl font-semibold mb-4">✨ Get Early Access</h3>
      {submitted ? (
        <div className="bg-jade/20 rounded-lg p-4 text-jade">
          ✅ Successfully registered! We'll contact you soon.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 px-4 py-2 rounded-lg bg-white/10 border border-jade/30 focus:outline-none focus:border-jade"
            required
          />
          <button 
            type="submit"
            className="bg-jade hover:bg-jade-dark px-6 py-2 rounded-lg transition-colors"
          >
            Register
          </button>
        </form>
      )}
      <p className="text-sm text-foreground/50 mt-4">✨ 2,347 people on the waiting list</p>
    </div>
  );
}