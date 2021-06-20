module.exports = function toggle() {
  const css = require('./index.css')

  return {
    instances: 10,
    name: 'toggle',
    template: require('./index.njk'),
    state: {
      css: css.default,
      checked: 'no'
    },
    services: {
      toggle: function(e, arg) {
        e.preventDefault()

        const checked = this.refs.toggle.dataset.checked
        const newValue = checked == 'no' ? 'yes' : 'no'
        this.refs.toggle.dataset.checked = newValue
        this.refs.toggle.querySelector('input').value = newValue
        setTimeout(function() {
          this.updateState({checked: newValue})
        }.bind(this), 300)

        this.emit(newValue == 'yes' ? 'checked' : 'unchecked')
      }
    }
  }
}
