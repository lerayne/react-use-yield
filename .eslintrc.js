// eslint-disable-next-line import/no-unused-modules,import/unambiguous
module.exports = {
  'extends': ['anrom'],
  'rules':   {
    'react-hooks/exhaustive-deps': ['error', {
      additionalHooks: '^useYield[A-Z]',
    }],
  },
  'ignorePatterns': ['./lib/**'], 
}
