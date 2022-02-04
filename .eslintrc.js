module.exports = {
  parser: '@babel/eslint-parser',
  parserOptions: {
    babelOptions: {
      presets: ['@babel/preset-react']
    }
  },
  extends: ['standard', 'standard-jsx'],
  plugins: ['react', 'react-hooks'],
  rules: {
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': ['error', {
      additionalHooks: '^useYield[A-Z]'
    }]
  }
}
