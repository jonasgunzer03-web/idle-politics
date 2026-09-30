// Gemeinsame Verläufe und Muster der Straße.

/** Gemeinsame Verläufe und Muster der Straße (einmal in <defs>). */
export function PaintDefs() {
  return (
    <>
      <linearGradient id="glass" x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0" stopColor="#cfe6f3" />
        <stop offset="0.55" stopColor="#8fb6cc" />
        <stop offset="1" stopColor="#5d7f95" />
      </linearGradient>
      <radialGradient id="windowGlow" cx="50%" cy="60%" r="75%">
        <stop offset="0" stopColor="#fff2b8" />
        <stop offset="0.7" stopColor="#ffcf6b" />
        <stop offset="1" stopColor="#e9a23b" />
      </radialGradient>
      <linearGradient id="facadeShade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.14" />
        <stop offset="0.5" stopColor="#ffffff" stopOpacity="0" />
        <stop offset="1" stopColor="#000000" stopOpacity="0.14" />
      </linearGradient>
      <radialGradient id="groundShadow" cx="50%" cy="50%" r="50%">
        <stop offset="0" stopColor="#000" stopOpacity="0.28" />
        <stop offset="1" stopColor="#000" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="lampHalo" cx="50%" cy="50%" r="50%">
        <stop offset="0" stopColor="#fff6cf" stopOpacity="0.95" />
        <stop offset="0.35" stopColor="#ffd97a" stopOpacity="0.45" />
        <stop offset="1" stopColor="#ffd97a" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="lightCone" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffe9a8" stopOpacity="0.5" />
        <stop offset="1" stopColor="#ffe9a8" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="asphalt" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#4d535b" />
        <stop offset="1" stopColor="#3a3f46" />
      </linearGradient>
      <pattern id="bricks" width="12" height="6" patternUnits="userSpaceOnUse">
        <path
          d="M0 6 H12 M0 3 H12 M6 0 V3 M0 3 V6 M12 3 V6"
          stroke="rgb(0 0 0 / 22%)"
          strokeWidth="0.6"
          fill="none"
        />
      </pattern>
      <pattern id="cobble" width="8" height="7" patternUnits="userSpaceOnUse">
        <circle cx="4" cy="3.5" r="2.4" fill="rgb(0 0 0 / 18%)" />
      </pattern>
      <pattern id="tiles" width="16" height="14" patternUnits="userSpaceOnUse">
        <path d="M0 0 H16 M0 0 V14" stroke="rgb(0 0 0 / 14%)" strokeWidth="0.7" />
      </pattern>
    </>
  );
}
