const Sentry = require('@sentry/browser')
const {Integrations} = require('@sentry/tracing')
const {objectkit} = require('basekits')

module.exports = function sentry(config) {
  if (objectkit.getProp(config.get('frontend'), ['sentry', 'dsn'])) {
    Sentry.init({
      dsn: config.get('frontend').sentry.dsn,
      release: config.get('name') + '@' + config.get('version'),
      environment: config.get('env'),
      integrations: [new Integrations.BrowserTracing()],
      sampleRate: 0.25,
      tracesSampleRate: 0.25
    })

    return Sentry;
  }

  return {
    captureException: function(err) {
      console.log(err)
    },
    captureMessage: function(msg) {
      console.log(msg)
    }
  }
}
