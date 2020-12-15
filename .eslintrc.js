module.exports = {
  env: {
    browser: false,
    commonjs: true,
    es2021: true,
    mocha: true
  },
  extends: [
    'airbnb-base'
  ],
  parserOptions: {
    ecmaVersion: 12
  },
  rules: {
    'max-classes-per-file': ['error', 5],
    'comma-dangle': 'off',
    'class-methods-use-this': 'off',
    'no-underscore-dangle': 'off',
    'no-unused-expressions': 'off'
  },
};
