const {asset, config} = require('@frondjs/frond')

module.exports = function devbar() {
  const css = require('./index.css')

  return {
    name: 'devbar',
    template: require('./index.njk'),
    state: {
      css: css.default,
      show: true
    },
    services: {
      close: function(e, arg) {
        e.preventDefault()

        this.updateState({show: false})
      }
    }
  }
}
