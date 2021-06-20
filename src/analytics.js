const {LighthouseAnalytics, GoogleAnalytics} = require('lighthouse-analytics')
const {objectkit} = require('basekits')

module.exports = function analytics(config) {
  const analytics = new LighthouseAnalytics({
    trackVisibility: false,
    collectReferrer: false
  })

  analytics.setApp({
    name: config.get('name'),
    version: config.get('version')
  })

  const gaPropertyId = objectkit.getProp(
    config.get('frontend'), ['google', 'analytics', 'property'])

  if (config.get('env') == 'production' && gaPropertyId) {
    const ga = GoogleAnalytics({
      property: gaPropertyId
    })
    analytics.newService(ga)
  }

  return analytics
}
