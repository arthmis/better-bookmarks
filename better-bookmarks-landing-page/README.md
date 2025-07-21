# Better Bookmarks Landing Page

A modern, responsive landing page for Better Bookmarks built with AstroJS.

## 🚀 Features

- **Modern Design**: Clean, gradient-based design with glassmorphism effects
- **Responsive**: Mobile-first approach that works on all devices
- **Fast**: Built with AstroJS for optimal performance
- **Accessible**: Semantic HTML and proper accessibility considerations
- **TypeScript**: Full TypeScript support for better development experience

## 🛠️ Tech Stack

- [Astro](https://astro.build/) - Static site generator
- TypeScript - Type safety and better DX
- CSS3 - Modern styling with gradients and backdrop filters

## 📦 Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd better-bookmarks-landing-page
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Start the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🏗️ Project Structure

```
/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   ├── layouts/
│   │   └── Layout.astro
│   └── pages/
│       └── index.astro
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

- `src/pages/` - File-based routing. Each `.astro` file becomes a route
- `src/layouts/` - Reusable layout components
- `src/components/` - Reusable UI components
- `public/` - Static assets served as-is

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run astro` - Run Astro CLI commands

## 🎨 Customization

### Colors

The project uses a gradient color scheme defined in the Layout component. You can customize the colors by modifying the CSS variables in `src/layouts/Layout.astro`:

```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

### Content

Update the landing page content by editing `src/pages/index.astro`. The page includes:

- Hero section with call-to-action buttons
- Feature showcase cards
- Responsive design elements

## 🚀 Deployment

Build the project for production:

```bash
npm run build
```

The built files will be in the `dist/` directory, ready to be deployed to any static hosting service.

### Deployment Options

- [Netlify](https://netlify.com/)
- [Vercel](https://vercel.com/)
- [GitHub Pages](https://pages.github.com/)
- [Cloudflare Pages](https://pages.cloudflare.com/)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
