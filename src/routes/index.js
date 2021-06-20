const {route} = require('@frondjs/frond')

module.exports = function() {
  route('/', require('./start'))
  route('/not-found', {tag: 'notFound'}, require('./notFound'))
}
