/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        gov: {
          blue: "#0B3A6E",
          blueLight: "#E9F1FA",
          green: "#1F7A45",
          yellow: "#B58900",
          red: "#B42318",
          slate: "#1F2937"
        }
      },
      fontFamily: {
        sans: ["Source Sans 3", "system-ui", "sans-serif"]
      },
      boxShadow: {
        card: "0 8px 24px rgba(14, 30, 52, 0.08)"
      }
    }
  },
  plugins: []
};
