// The gradient "assistant" mascot orb, with a friendly face.
export function Orb({ size = 160, face = true }: { size?: number; face?: boolean }) {
  return (
    <div
      className="orb relative grid place-items-center"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {face && (
        <div className="flex gap-[10%]" style={{ transform: "translateY(-4%)" }}>
          <span
            className="block rounded-full bg-white"
            style={{
              width: size * 0.11,
              height: size * 0.2,
              borderRadius: "0 0 999px 999px / 0 0 999px 999px",
              clipPath: "polygon(50% 0, 100% 100%, 0 100%)",
              WebkitClipPath: "polygon(50% 0, 100% 100%, 0 100%)",
            }}
          />
          <span
            className="block bg-white"
            style={{
              width: size * 0.11,
              height: size * 0.2,
              clipPath: "polygon(50% 0, 100% 100%, 0 100%)",
              WebkitClipPath: "polygon(50% 0, 100% 100%, 0 100%)",
            }}
          />
        </div>
      )}
    </div>
  );
}
