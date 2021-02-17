export default {
  head: {
    title: 'Furbaby Shop',
    htmlAttrs: {
      lang: 'en',
    },
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: '' },
    ],
    link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
  },

  css: [],

  plugins: ['@/plugins/axios'],

  components: false,

  buildModules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/eslint-module',
    '@nuxtjs/stylelint-module',
  ],

  modules: ['@nuxtjs/axios', 'nuxt-helmet'],

  build: {
    extractCSS: process.env.NODE_ENV === 'production',
    hotMiddleware: { client: { noInfo: true } },
    postcss: { plugins: { 'postcss-nested': {} } },
  },

  loading: false,

  server: { port: 9000 },

  serverMiddleware: [{ path: '/api', handler: '@/server/index.js' }],

  /* --- custom --- */

  axios: { baseURL: process.env.BASE_URL },

  eslint: { cache: false },

  helmet: { referrerPolicy: { policy: 'strict-origin-when-cross-origin' } },

  tailwindcss: { cssPath: '@/assets/css/all.css' },
};
