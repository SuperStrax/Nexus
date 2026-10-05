import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com', // Разрешаем Unsplash
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com', // Разрешаем сервис заглушек
      },
      // Сюда потом можно добавить домены HLTV, если будут ссылки оттуда
    ],
  },
};

export default nextConfig;