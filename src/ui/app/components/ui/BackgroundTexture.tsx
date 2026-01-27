export function BackgroundTexture() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      {/* Subtle gradient from top */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-transparent" />
      {/* Centered glow at top */}
      <div className="absolute -top-24 left-1/2 h-72 w-[44rem] -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />
      {/* Bottom left glow */}
      <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
    </div>
  );
}
