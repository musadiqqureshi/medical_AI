// The gradient "assistant" mascot orb, with a friendly blinking face.
export function Orb({ size = 160, face = true }: { size?: number; face?: boolean }) {
  const eyeW = size * 0.11;
  const eyeH = size * 0.2;
  return (
    <div
      className="orb relative grid place-items-center"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {face && (
        <div
          className="flex"
          style={{ gap: size * 0.1, transform: "translateY(-4%)" }}
        >
          <span className="orb-eye block" style={{ width: eyeW, height: eyeH }} />
          <span className="orb-eye block" style={{ width: eyeW, height: eyeH }} />
        </div>
      )}
    </div>
  );
}
