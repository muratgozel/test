console.log('Test.')

require('./stylesheets')

const {init, externals, eventEmitter, render, config, asset, component, meta,
  i18n, route} = require('@frondjs/frond')
const {objectkit} = require('basekits')
const externalScripts = require('./externals')
const cms = require('./cms')
const frontend = require('./config')
const configureAnalytics = require('./analytics')
const configureSentry = require('./sentry')

config.set('env', window.process.env.NODE_ENV)
config.set('name', window.frondjs.name)
config.set('version', window.frondjs.version)
config.set('host', location.hostname)
config.set('frontend', frontend)
config.set('locale', frontend.cms.project.locale)

const projectUUID = objectkit.getProp(frontend, ['cms', 'project', 'uuid'])
const sentry = configureSentry(config)

i18n
  .configure({defaultLocale: frontend.cms.project.locale})
  .then(function() {
    const elem = document.getElementById('frondapp')
    init(elem, {
      rehydrate: elem.innerHTML.length > 0 && navigator.userAgent != 'FrondJS',
      autoAddLocalePrefixToRoutes: false
    })

    if (projectUUID) {
      cms.on('error', function(err) {
        if (config.get('env') == 'production') sentry.captureException(err)
        else console.log('[CMS]: Error:', err);
      })

      config.set('locale', i18n.getAppLocale())

      if (config.get('env') != 'production') {
        console.log('[FROND]: Application locale has been set:', config.get('locale'))
      }

      cms.configure({
        puid: frontend.cms.project.uuid,
        locale: config.get('locale')
      })

      cms.bootstrap().then(function(result) {
        // register components
        require('./components')()
        require('./middlewares')()
        require('./routes')()

        const templateRouteMap = {
          // TODO: Add all app spesific templates
          'Not Found': require('./routes/notFound')
        }

        if (config.get('env') != 'production') {
          console.log('[CMS]: Bootstrap:', cms.getBootstrapData())
        }

        if (result.error) {
          component('errorbar').updateState({
            msg: _('Sayfa yüklenirken beklenmedik bir hata oluştu.')
          })
        }

        const data = cms.getBootstrapData()

        // register fetched routes
        if (data) {
          const {homepage_urls_by_locale, pages_url_index, pages} = data
          Object
            .keys(homepage_urls_by_locale)
            .map(l => l == config.get('locale') ? route(homepage_urls_by_locale[l], require('./routes/start')) : '')
          Object
            .keys(pages_url_index)
            .map(function(pageid) {
              const page = cms.getPageByID(pageid)
              const template = objectkit.getProp(page, ['attributes', 'Arayüz Şablonu'], 'Not Found')

              route(pages_url_index[pageid], objectkit.getProp(templateRouteMap, template, templateRouteMap['Not Found']))
            })
        }
        else {
          component('errorbar').updateState({
            msg: _('Sayfa yüklenirken beklenmedik bir hata oluştu. Sunucuyla iletişim kurulamadı. Lütfen daha sonra tekrar deneyin.')
          })
        }

        eventEmitter.on('SCREEN', function(route) {
          if (config.get('env') != 'production') {
            console.log('[FROND]: Changed route: ', route.path)
          }

          const page = cms.getPageByPath(route.path)
          if (!page) {
            return
          }

          const breadcrumb = cms.genBreadcrumb(page.id)
          component('breadcrumb').updateState({
            items: breadcrumb
          })

          const defaultPageCover = {
            mime: 'image/jpg',
            outputs_by_tag: {
              l: {
                src: asset.has('brand/social-media-cover.jpg') ? '/' + asset.get('brand/social-media-cover.jpg') : '',
                width: 1920,
                height: 1080
              }
            }
          }
          const pageCover = cms.getPageMediaByTag(page.id, 'Cover', {
            fallback: true,
            fallbackToAnyTag: true
          })
          const coverImage = pageCover ? pageCover.outputs_by_tag.l.src : defaultPageCover.outputs_by_tag.l.src

          meta.setPageMeta({
            title: page.name,
            description: page.excerpt,
            url: cms.getURL(page.id),
            image: coverImage,
            locale: config.get('locale')
          })

          meta.breadcrumb(
            breadcrumb.map(function(item) {
              return {title: item.title, url: location.origin + item.path}
            })
          )

          if (config.get('env') == 'production') {
            analytics.newActivity('SCREEN', {title: page.name})
          }
        })

        externals.inject(externalScripts)

        render({
          path: window.location.pathname
        })
      })
    }
    else {
      // register components
      require('./components')()
      require('./middlewares')()
      require('./routes')()

      // on route change
      eventEmitter.on('SCREEN', function(route) {
        if (config.get('env') != 'production') {
          console.log('[FROND]: Changed route:', route.path)
        }

        /*
        meta.setPageMeta({
          title: page.name,
          description: page.excerpt,
          url: location.href,
          image: asset.get('cover.jpg'),
          locale: config.get('locale')
        })
        */

        /*
        meta.breadcrumb([
          {title: 'Home', url: 'https://gozel.com.tr'}
        ])
        */

        /*
        if (config.get('env') == 'production') {
          analytics.newActivity('SCREEN', {title: page.name})
        }
        */
      })

      externals.inject(externalScripts)

      render({
        path: window.location.pathname
      })
    }
  })

configureAnalytics(config)

// patch meta tags
if (config.get('env') != 'production') {
  meta.robots('noindex')
}

if (asset.has('brand/favicon.ico')) {
  meta.setFavicon('/' + asset.get('brand/favicon.ico'))
}
meta.set('meta', 'name', {
  name: 'viewport',
  content: 'width=device-width, initial-scale=1, viewport-fit=cover'
})
meta.setProjectMeta({
  name: '',
  url: '',
  logo: asset.has('brand/logo.png') ? '/' + asset.get('brand/logo.png') : '',
  primaryColor: '#000000',
  backgroundColor: '#ffffff'
})
const icons = []
if (asset.has('brand/icon-16x16.png')) icons.push('brand/icon-16x16.png')
if (asset.has('brand/icon-32x32.png')) icons.push('brand/icon-32x32.png')
if (asset.has('brand/icon-144x144.png')) icons.push('brand/icon-144x144.png')
if (asset.has('brand/icon-150x150.png')) icons.push('brand/icon-150x150.png')
if (asset.has('brand/icon-180x180.png')) icons.push('brand/icon-180x180.png')
if (asset.has('brand/icon-192x192.png')) icons.push('brand/icon-192x192.png')
if (asset.has('brand/icon-310x310.png')) icons.push('brand/icon-310x310.png')
if (asset.has('brand/icon-512x512.png')) icons.push('brand/icon-512x512.png')
if (icons.length > 0) {
  meta.setIcons(icons)
}
if (asset.has('brand/safari-pinned-tab.svg')) {
  meta.setSafariPinnedTab(asset.get('brand/safari-pinned-tab.svg'), '#000000')
}
meta.setSafariMobileWebApp({
  statusBarStyle: 'black-translucent'
})
