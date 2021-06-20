const {asset, config} = require('@frondjs/frond')

module.exports = function breadcrumb() {
  const css = require('./index.css')

  return {
    name: 'breadcrumb',
    template: require('./index.njk'),
    state: {
      css: css.default,
      items: []
    }
  }
}
