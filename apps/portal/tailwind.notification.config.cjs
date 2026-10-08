/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('./tailwind.config.cjs')],
  content: ['./src/components/notification.jsx', './src/components/notification-classes.js'],
};
