const {component} = require('@frondjs/frond')

module.exports = function() {
  component(require('./devbar'))
  component(require('./errorbar'))
  component(require('./loadingbar'))
  component(require('./breadcrumb'))
  component(require('./toggle'))
}
