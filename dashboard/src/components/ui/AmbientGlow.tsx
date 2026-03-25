export function AmbientGlow() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1]">
      <div className="ambient-glow top-[-10%] left-[-5%] w-[40vw] h-[40vh] bg-indigo-900/10" />
      <div className="ambient-glow bottom-[-10%] right-[-5%] w-[30vw] h-[30vh] bg-purple-900/5" />
    </div>
  );
}
