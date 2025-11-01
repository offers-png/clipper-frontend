export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#6C5CE7",
          accent: "#FF4D4D",
          ink: "#0F172A",
          surface: "#0B1020",
          card: "#12182B",
          line: "#27324A",
          success: "#00D395",
          warn: "#F59E0B",
        },
      },
    },
  },
  plugins: [],
};
