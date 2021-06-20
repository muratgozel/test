const {asset, config} = require('@frondjs/frond')

module.exports = function errorbar() {
  const css = require('./index.css')

  return {
    name: 'errorbar',
    template: require('./index.njk'),
    state: {
      css: css.default,
      msg: null,
      timeout: 0
    },
    services: {
      close: function(e, arg) {
        e.preventDefault()

        this.updateState({msg: null})
      }
    },
    on: {
      render: function() {
        const self = this
        const {timeout} = self.getState()

        if (timeout > 0) {
          setTimeout(function() {
            self.updateState({
              msg: null
            })
          }, timeout)
        }
      }
    }
  }
}
