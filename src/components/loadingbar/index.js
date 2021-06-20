const {asset, config, component} = require('@frondjs/frond')

module.exports = function errorbar() {
  const css = require('./index.css')

  return {
    name: 'loadingbar',
    template: require('./index.njk'),
    state: {
      css: css.default,
      active: false
    }
  }
}
