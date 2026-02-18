/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './src/pages/**/*.{js,jsx}',
    './src/components/**/*.{js,jsx}',
    './src/app/**/*.{js,jsx}',
    './src/**/*.{js,jsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Legacy shadcn colors (for backward compatibility)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        // ===== BRILLU BRAND COLORS =====
        // Spark (Primary CTA) - Warm coral
        spark: {
          DEFAULT: '#FF6F61',
          hover: '#FF857A',
          active: '#E85E52',
          dark: '#FF8A7A',
          'dark-hover': '#FF9F92',
        },
        // Sunny (Accent) - Warm yellow
        sunny: {
          glow: '#FFD966',
          soft: '#FFF1B8',
        },
        // Brillu Neutrals
        brillu: {
          bg: '#FFF9F4',
          surface: '#FFFFFF',
          muted: '#F5F5F5',
          border: '#EDEDED',
          // Dark mode
          'dark-bg': '#121212',
          'dark-surface': '#1A1A1A',
          'dark-elevated': '#222222',
          'dark-border': 'rgba(255,255,255,0.08)',
        },
        // Brillu Text Colors
        'brillu-text': {
          primary: '#2E2E2E',
          secondary: '#5F5F5F',
          tertiary: '#8A8A8A',
          inverse: '#FFFFFF',
          // Dark mode text
          'dark-primary': '#F5F5F5',
          'dark-secondary': '#CFCFCF',
          'dark-tertiary': '#9A9A9A',
        },
      },
      // Brillu Spacing System
      spacing: {
        'brillu-xs': '4px',
        'brillu-sm': '8px',
        'brillu-md': '16px',
        'brillu-lg': '24px',
        'brillu-xl': '40px',
        'brillu-2xl': '64px',
      },
      // Brillu Border Radius
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        // Brillu specific
        'brillu-sm': '6px',
        'brillu-md': '10px',
        'brillu-lg': '16px',
        'brillu-xl': '24px',
        'brillu-pill': '999px',
      },
      // Brillu Shadows
      boxShadow: {
        'brillu-sm': '0 2px 6px rgba(0,0,0,0.04)',
        'brillu-md': '0 6px 16px rgba(0,0,0,0.06)',
        'brillu-dark-sm': '0 2px 6px rgba(0,0,0,0.6)',
        'brillu-dark-md': '0 8px 20px rgba(0,0,0,0.7)',
      },
      // Brillu Motion/Transitions
      transitionDuration: {
        'fast': '120ms',
        'base': '200ms',
        'slow': '320ms',
      },
      transitionTimingFunction: {
        'brillu': 'ease-out',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

