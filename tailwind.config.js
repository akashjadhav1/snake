/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      boxShadow: {
        // Claymorphism: soft outer drop + white top highlight + darker inner base
        clay: '0 18px 36px rgba(133,148,177,0.35), 0 6px 12px rgba(133,148,177,0.22), inset 0 4px 8px rgba(255,255,255,0.85), inset 0 -6px 12px rgba(133,148,177,0.3)',
        'clay-sm': '0 8px 16px rgba(133,148,177,0.3), 0 3px 6px rgba(133,148,177,0.2), inset 0 2px 4px rgba(255,255,255,0.8), inset 0 -3px 6px rgba(133,148,177,0.25)',
        'clay-inset': 'inset 0 6px 12px rgba(133,148,177,0.4), inset 0 -4px 8px rgba(255,255,255,0.6)',
        'clay-emerald': '0 14px 24px rgba(16,185,129,0.35), 0 4px 8px rgba(16,185,129,0.25), inset 0 3px 6px rgba(255,255,255,0.55), inset 0 -4px 8px rgba(6,95,70,0.3)',
        'clay-rose': '0 14px 24px rgba(244,63,94,0.35), 0 4px 8px rgba(244,63,94,0.25), inset 0 3px 6px rgba(255,255,255,0.5), inset 0 -4px 8px rgba(136,19,55,0.3)',
      },
      fontFamily: {
        game: ["'Segoe UI'", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
