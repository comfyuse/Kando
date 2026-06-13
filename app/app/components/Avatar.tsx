// Deterministic initials avatar — same name always yields the same gradient.

const GRADIENTS = [
  'from-[#2ea88a] to-[#1f7a64]',
  'from-[#3b82f6] to-[#1e40af]',
  'from-[#a855f7] to-[#6b21a8]',
  'from-[#f59e0b] to-[#b45309]',
  'from-[#ec4899] to-[#9d174d]',
  'from-[#06b6d4] to-[#0e7490]',
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function gradientFor(name: string): string {
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return GRADIENTS[sum % GRADIENTS.length];
}

export default function Avatar({
  name,
  size = 44,
  className = '',
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center rounded-full bg-gradient-to-br ${gradientFor(name)} font-semibold text-white shadow-lg shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(name)}
    </div>
  );
}
