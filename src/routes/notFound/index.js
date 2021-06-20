const {config} = require('@frondjs/frond')

module.exports = function notFound() {
  const css = require('./index.css')

  return {
    name: 'notFound',
    template: require('./index.njk'),
    state: {
      css: css.default,
      homepage: '/'
    }
  }
}
