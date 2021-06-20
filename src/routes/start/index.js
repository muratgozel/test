const {asset} = require('@frondjs/frond')

module.exports = function() {
  const css = require('./index.css')

  return {
    name: 'start',
    template: require('./index.njk'),
    state: {
      css: css.default
    },
    on: {
      ready: function() {
        const component = this
      }
    }
  }
}
