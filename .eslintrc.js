module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'plugin:vue/recommended',
    'airbnb-base',
    'plugin:prettier/recommended',
    'plugin:nuxt/recommended',
  ],
  settings: {
    'import/resolver': {
      alias: {
        map: [
          ['~', './'],
          ['@', './'],
          ['~~', './'],
          ['@@', './'],
        ],
        extensions: ['.js', '.vue'],
      },
    },
  },
  parserOptions: {
    parser: 'babel-eslint',
    sourceType: 'module',
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 1 : 0,
    'no-debugger': process.env.NODE_ENV === 'production' ? 1 : 0,
    'no-underscore-dangle': [2, { allow: ['_id'] }],
  },
};
