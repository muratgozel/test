const store = require('store/dist/store.modern')
const EventEmitterObject = require('event-emitter-object')
const {hashkit, objectkit} = require('basekits')
const axios = require('axios')

function cms() {
  const eventEmitter = EventEmitterObject.create()
  const storePrefix = 'cms_gozel_'
  const key1 = storePrefix + 'bootstrap_data'
  const key2 = storePrefix + 'bootstrap_data_hash'
  const key3 = storePrefix + 'bootstrap_data_fetched_at'
  const api = {
    host: 'https://cms.gozel.com.tr'
  }
  const memoryStore = {
    bootstrapData: null,
    articles: {}
  }
  const _opts = {}

  function readBootstrapDataFromStore() {
    const data = store.get(key1)

    if (!data) {
      return {
        data: null,
        hash: null,
        fetchedAt: null
      };
    }

    return {
      data: data,
      hash: store.get(key2),
      fetchedAt: store.get(key3)
    }
  }

  function checkBootstrapFreshness(restoredHash=null) {
    return new Promise(function(resolve, reject) {
      const reqconfig = {
        puid: _opts.puid, locale: _opts.locale, fresh: 1, hash: restoredHash
      }
      axios
        .get(api.host + '/api/bootstrap/', {params: reqconfig})
        .then(function(res) {
          return resolve(res.data.fresh || false)
        })
        .catch(function(err) {
          let errmsg = null
          if (err.response) {
            if (err.response.status >= 500) {
              errmsg = 'Bootstrap freshness check failed.'
            }
            else {
              errmsg = err.response.data.error.msg
            }
          }
          else if (err.request) {
            errmsg = 'Bootstrap freshness check failed. Server has no reponse.'
          }
          else {
            errmsg = 'Bootstrap freshness check failed. Frontend integration error.'
          }

          eventEmitter.emit('error', [new Error(errmsg)])

          return reject()
        })
    })
  }

  function fetchBootstrapData() {
    return new Promise(function(resolve, reject) {
      const reqconfig = {
        puid: _opts.puid, locale: _opts.locale
      }
      axios
        .get(api.host + '/api/bootstrap/', {params: reqconfig})
        .then(function(res) {
          res.data.data.pages = res.data.data.pages.map(p => {
            p.path = res.data.data.pages_url_index[p.id]

            if (p.uploads) {
              p.uploads = p.uploads.map(u => {
                u.outputs_by_tag.o.src = getAssetLink(u.outputs_by_tag.o.src)
                u.outputs_by_tag.l.src = getAssetLink(u.outputs_by_tag.l.src)
                u.outputs_by_tag.t.src = getAssetLink(u.outputs_by_tag.t.src)
                u.thumbnail_url = getAssetLink(u.thumbnail_url.src)
                return u
              })
            }

            return p
          })

          store.set(key1, res.data.data)
          store.set(key2, res.data.hash)
          store.set(key3, parseFloat((Date.now()/1000).toFixed()))

          return resolve()
        })
        .catch(function(err) {
          let errmsg = null

          if (err.response) {
            if (err.response.status >= 500) {
              errmsg = 'Bootstrap fetch failed.'
            }
            else {
              errmsg = err.response.data.error.msg
            }
          }
          else if (err.request) {
            errmsg = 'Bootstrap fetch failed. Server has no reponse.'
          }
          else {
            errmsg = 'Bootstrap fetch failed. Frontend integration error.'
          }

          eventEmitter.emit('error', [new Error(errmsg)])
          eventEmitter.emit('error', [err])

          return reject()
        })
    })
  }

  function bootstrap(opts={forceFetch: false}) {
    return new Promise(function(resolve, reject) {
      const result = {}
      const restored = readBootstrapDataFromStore()

      checkBootstrapFreshness(restored.hash)
        .then(function(fresh) {
          result.fresh = fresh

          if (fresh === true) {
            return resolve(result)
          }

          fetchBootstrapData()
            .then(function() {
              result.bootstrapped = true
              return resolve(result)
            })
            .catch(function() {
              result.error = true
              return resolve(result)
            })
        })
        .catch(function() {
          result.error = true
          return resolve(result)
        })
    })
  }

  function getBootstrapData() {
    return readBootstrapDataFromStore().data
  }

  function configure(opts={}) {
    if (opts.puid) _opts.puid = opts.puid
    if (opts.locale) _opts.locale = opts.locale
  }

  function getAssetLink(src) {
    if (window.location.host.indexOf('localhost') !== -1 && window.navigator.userAgent != 'FrondJS') {
      return 'https://cms.gozel.com.tr' + src
    }
    else {
      return src.replace('/uploads/' + _opts.puid + '/', '/media/')
    }
  }

  function parseMediaLinks(data) {
    const search = new RegExp('\/uploads\/' + _opts.puid, 'gm')

    if (window.location.host.indexOf('localhost') !== -1 && window.navigator.userAgent != 'FrondJS') {
      return data.replace(search, getAssetLink('') + '/uploads/' + _opts.puid)
    }
    else {
      return data.replace(search, getAssetLink('') + '/media/')
    }
  }

  function fetchArticle(opts={}) {
    return new Promise(function(resolve, reject) {
      opts.puid = _opts.puid
      opts.locale = _opts.locale

      const hash = hashkit.hashcode(JSON.stringify(opts))
      if (memoryStore.articles.hasOwnProperty(hash)) {
        return resolve(memoryStore.articles[hash])
      }

      axios
        .get(api.host + '/api/article/', {
          params: opts,
          responseType: 'text',
          validateStatus: function (status) {
            return (status >= 200 && status < 400) || status == 404;
          }
        })
        .then(function(res) {
          if (res.status == 404) {
            return resolve('')
          }

          const parsed = parseMediaLinks(res.data)

          memoryStore.articles[hash] = parsed

          return resolve(parsed)
        })
        .catch(function(err) {
          let errmsg = null

          if (err.response) {
            if (err.response.status >= 500) {
              errmsg = 'Article fetch failed.'
            }
            else {
              errmsg = err.response.data.error.msg
            }
          }
          else if (err.request) {
            errmsg = 'Article fetch failed. Server has no reponse.'
          }
          else {
            errmsg = 'Article fetch failed. Frontend integration error.'
          }

          eventEmitter.emit('error', [new Error(errmsg)])

          return resolve('')
        })
    })
  }

  function getURL(pageID, absolute=false) {
    const data = getBootstrapData()
    const page = getPageByID(pageID)

    if (!page) {
      return absolute ? location.origin : '/'
    }

    const path = data.pages_url_index[page.id]

    return absolute ? location.origin + path : path
  }

  function getHomeURL(locale=null) {
    const data = getBootstrapData()

    if (!locale) {
      locale = data.project.locale
    }

    if (!data.homepage_urls_by_locale.hasOwnProperty(locale)) {
      locale = data.project.locale
    }

    return data.homepage_urls_by_locale[locale]
  }

  function genBreadcrumb(pageID) {
    const data = getBootstrapData()

    if (!data.pages_parents_index.hasOwnProperty(pageID)) return []

    const parents = data.pages_parents_index[pageID]
    const arr = parents.map(function(parentPageID, ind) {
      const {name} = getPageByID(parentPageID)
      const obj = {
        title: name,
        path: data.pages_url_index[parentPageID]
      }

      if (ind + 1 == parents.length) obj.first = true

      return obj
    })

    const lastItem = {
      title: getPageByID(pageID).name,
      path: data.pages_url_index[pageID],
      last: true
    }

    arr.push(lastItem)

    return arr
  }

  function getPageByPath(path) {
    const data = getBootstrapData()
    const urlindex = data.pages_url_index
    const pageID = Object.keys(urlindex).filter(pid => urlindex[pid] == path)[0]
    const page = data.pages.filter(p => p.id == pageID)[0]

    return page
  }

  function getPageByID(id) {
    const data = getBootstrapData()
    const matches = data.pages.filter(p => p.id == id)

    if (matches && matches.length > 0) {
      return matches[0]
    }

    return null
  }

  function getPageMediaByTag(id, tag=null, opts={fallback: true, fallbackToAnyTag: false}) {
    const data = getBootstrapData()
    const page = getPageByID(id)

    if (!page || !page.uploads) {
      return null
    }

    if (tag) {
      const matches = data.upload_tags.filter(t => t.name == tag).map(m => {
        m.id = parseFloat(m.id)
        return m
      })
      if (matches && matches.length > 0) {
        const ups = page.uploads.filter(u => u.tags && u.tags.indexOf(matches[0].id) !== -1)
        if (ups && ups.length > 0) {
          return ups[0]
        }

        if (opts.fallback && page.fallback) {
          const upsAlt = page.uploads.filter(u => u.tags && u.tags.indexOf(matches[0].id) !== -1)
          if (upsAlt && upsAlt.length > 0) {
            return upsAlt[0]
          }
        }
      }
    }

    if (opts.fallbackToAnyTag) {
      if (page.uploads && page.uploads.length > 0) {
        return page.uploads[0]
      }

      if (page.fallback && page.fallback.uploads) {
        return page.fallback.uploads[0]
      }
    }

    return null
  }

  function getPageAttribute(id, attr, opts={fallback: true}) {
    const data = getBootstrapData()
    const page = getPageByID(id)

    if (!page) {
      return ''
    }

    const result = objectkit.getProp(page, ['attributes', attr], '')
    if (result.length > 0) {
      return result
    }

    const resultAlt = objectkit.getProp(page, ['fallback', 'attributes', attr], '')
    if (resultAlt.length > 0) {
      return resultAlt
    }

    return ''
  }

  function stripHTML(html) {
    return (new DOMParser().parseFromString(html, 'text/html')).body.textContent || ''
  }

  function getAPI() {
    return api
  }

  function sendInquiry(form) {
    const formdata = new FormData(form)
    const flatobj = {}
    for (var key of formdata.keys()) {
      flatobj[key] = formdata.get(key)
    }
    const payload = objectkit.unflatten(flatobj)
    payload._puid = getBootstrapData().project.uuid

    return new Promise(function(resolve, reject) {
      axios
        .post(api.host + '/api/inquiry/', payload)
        .then(function(res) {
          return resolve(res.data)
        })
        .catch(function(err) {
          let msg = null
          if (err.response) {
            if (err.response.status >= 500) {
              msg = _('İşleminiz gerçekleştirilirken beklenmedik bir hata oluştu. Lütfen daha sonra tekrar deneyin.')
            }
            else {
              msg = err.response.data.error.msg
            }
          }
          else if (err.request) {
            msg = _('Şu anda sunucudan yanıt alınamıyor. Lütfen daha sonra tekrar deneyin.')
          }
          else {
            msg = _('Teknik bir problem nedeniyle şu anda işleminizi gerçekleştiremiyoruz. Lütfen daha sonra tekrar deneyin.')
          }

          eventEmitter.emit('error', [new Error(msg)])

          return resolve({error: {msg: msg}})
        })
    })
  }

  function getArticleIdByTag(name) {
    const data = getBootstrapData()
    const matches = data.article_tags.filter(o => o.name == name)
    return matches && matches.length > 0 ? matches[0].id : 0
  }

  function getPageByCollection(name) {
    const data = getBootstrapData()
    const matches = data.collections.filter(c => c.name == name)
    if (!matches || matches.length === 0) {
      return {}
    }
    const collectionID = matches[0].id

    const pages = data.pages.filter(p => p.collections && p.collections.indexOf(collectionID) !== -1)
    if (!pages || pages.length === 0) {
      return {}
    }

    return pages[0]
  }

  function getPagesByCollection(name) {
    const data = getBootstrapData()
    const matches = data.collections.filter(c => c.name == name)
    if (!matches || matches.length === 0) {
      return []
    }
    const collectionID = matches[0].id

    const pages = data.pages.filter(p => p.collections && p.collections.indexOf(collectionID) !== -1)
    if (!pages || pages.length === 0) {
      return []
    }

    return pages
  }

  function fetchCountries(format='countryNamesByCode') {
    return axios.get(api.host + '/api/i18n/countries', {params: {format: format}})
  }

  function fetchRegions(params) {
    const validParams = ['countryCode', 'stateCode', 'cityCode', 'district']
    const payload = validParams.reduce(function(memo, param) {
      if (params.hasOwnProperty(param)) {
        memo[param] = params[param]
      }
      return memo
    }, {})
    return axios.get(api.host + '/api/i18n/regions/', {params: payload})
  }

  return {
    getBootstrapData: getBootstrapData,
    bootstrap: bootstrap,
    configure: configure,
    on: eventEmitter.on,
    getAssetLink: getAssetLink,
    fetchArticle: fetchArticle,
    getURL: getURL,
    genBreadcrumb: genBreadcrumb,
    getPageByPath: getPageByPath,
    getPageByID: getPageByID,
    getHomeURL: getHomeURL,
    getPageMediaByTag: getPageMediaByTag,
    getPageAttribute: getPageAttribute,
    stripHTML: stripHTML,
    sendInquiry: sendInquiry,
    getAPI: getAPI,
    getArticleIdByTag: getArticleIdByTag,
    getPageByCollection: getPageByCollection,
    getPagesByCollection: getPagesByCollection,
    fetchCountries: fetchCountries,
    fetchRegions: fetchRegions
  }
}

module.exports = cms()
