// From: https://github.com/OpenGG/babel-plugin-transform-ternary-to-if-else
const template = require('@babel/template').default(`
if (TEST) {
  return CONSEQUENT;
} else {
  return ALTERNATE;
}
`);

module.exports = function ({ types: t }) {
  return {
    visitor: {
      ConditionalExpression(path) {
        const {
          node: {
            test,
            consequent,
            alternate,
          },
        } = path;

        path.replaceWith(
          template({
            TEST: test,
            CONSEQUENT: consequent,
            ALTERNATE: alternate,
          })
        );
      },
    },
  };
};
