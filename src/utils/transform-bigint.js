module.exports = function ({ types: t }) {
  return {
    visitor: {
      BigIntLiteral(path) {
        path.replaceWith(t.numericLiteral(parseInt(path.node.value, 10)));
      }
    }
  };
};
