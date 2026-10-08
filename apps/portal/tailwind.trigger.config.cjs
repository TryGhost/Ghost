/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('./tailwind.config.cjs')],
  content: ['./src/components/trigger-button.jsx', './src/components/common/member-gravatar.jsx'],
};
