/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {},
    colors: {
      teal: {
        100: "#E6F4F4",
        200: "#89D8C9",
        500: "#1FC1A4",
        600: "#13B094",
      },
      blue: {
        50: "#D2EAFF",
        100: "#B0D9FF",
        200: "#84C4FF",
        600: "#1D89FF",
        900: "#01305C",
      },
      white: "#FFF",
      black: "#050015",
      gray: {
        50: "#F3F4F4",
        200: "#E4E4E4",
      },
      yellow: {
        200: "#FFDA93",
        600: "#FFBC3A",
      },
    },
    fontSize: {
      tiny: ".75rem",
      sm: ".875rem",
      base: "1rem",
      xl: "1.25rem",
      "2xl": "1.5rem",
      "3xl": "1.75rem",
    },
  },
  plugins: [],
};
