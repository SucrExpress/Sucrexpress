/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  // En Docker, el navegador usa el mismo origen y Next reenvía al servicio Nest.
  // Las rutas propias de Next bajo /api no se alteran.
  async rewrites() {
    return process.env.DOCKER_API_PROXY === '1'
      ? [{ source: '/backend/api/:path*', destination: 'http://api:3001/api/:path*' }]
      : [];
  },

  // Permite acceso al HMR desde la IP de red local de Windows
  allowedDevOrigins: ['169.254.253.206'],

  // Paquetes que solo deben correr en el servidor (Node.js)
  // Evita que Turbopack los intente bundlear para el navegador
  serverExternalPackages: [
    'firebase-admin',
    'jsonwebtoken',
    'bcryptjs',
    '@supabase/supabase-js',
  ],

  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
