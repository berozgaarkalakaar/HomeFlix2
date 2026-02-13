/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            colors: {
                background: "var(--bg-color)",
                surface: "var(--surface-color)",
                primary: "var(--accent-color)",
                "text-high": "var(--text-high)",
                "text-medium": "var(--text-medium)",
            }
        },
    },
    plugins: [],
}
