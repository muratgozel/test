const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const strhash = require('string-hash')
const {nodeResolve} = require('@rollup/plugin-node-resolve')
const commonjs = require('@rollup/plugin-commonjs')
const {babel} = require('@rollup/plugin-babel')
const {terser} = require('rollup-plugin-terser')
const strip = require('@rollup/plugin-strip')
const json = require('@rollup/plugin-json')
const postcss = require('rollup-plugin-postcss')
const njk = require('@frondjs/dev-ops/build/rollup-plugin-njk')
const html = require('@frondjs/dev-ops/build/rollup-plugin-html')
const {copyAssets, cleanupPrevBuild, shortenCSSPropertyName, copyNginxConfig} = require('@frondjs/dev-ops/build')
const pkg = require('./package.json')

const env = process.env.NODE_ENV || 'development'
const config = require('@frondjs/dev-ops/config')({ctx:{project:{name: pkg.name}}})
const globalName = 'frondjs'

cleanupPrevBuild()
copyNginxConfig()

module.exports = [
  {
    input: 'src/index.js',
    output: [
      {
        format: 'iife',
        dir: 'build',
        entryFileNames: function(chunk) {
          if (env == 'development') {
            return 'app.js'
          }
          else {
            const name = chunk.name
            const hash = crypto
              .createHash('md5')
              .update(JSON.stringify(chunk))
              .digest('hex')
              .slice(0, 12)
            return 'app.' + hash + '.js'
          }
        },
        //entryFileNames: 'app.[hash].js'
        intro: function() {
          let data = `window.${globalName}={};`
          data += `if (window.process === undefined) window.process={};`
          data += `if (window.process.env === undefined) window.process.env={};`
          data += `window.process.env['NODE_ENV']="${env}";`
          data += `window.${globalName}.version="${pkg.version}";`
          data += `window.${globalName}.name="${pkg.name}";`

          const manifest = copyAssets()
          data += `window.${globalName}.assetManifest=${JSON.stringify(manifest)};`

          if (fs.existsSync('translations')) {
            const locales = fs.readdirSync('translations')
              .filter(f => path.extname(f) == '.po' && f != 'messages.po')
              .map(f => path.basename(f, path.extname(f)))
            if (locales.length > 0) {
              data += `window.${globalName}.supportedLocales=${JSON.stringify(locales)};`
            }
          }

          if (env == 'development') {
            data += `window.${globalName}.port="${config.get('port')}";`
            const devServerClientPath = require.resolve('@frondjs/dev-ops/dev-server/client.js');
            data += fs.readFileSync(devServerClientPath, 'utf8')
          }

          return data
        }
      }
    ],
    plugins: [
      nodeResolve({browser: true}),
      commonjs(),
      njk(),
      postcss({
        extract: true,
        minimize: env != 'development',
        autoModules: false,
        modules: {
          localsConvention: 'camelCaseOnly',
          generateScopedName: function(name, filename, css) {
            const line = css.substr(0, css.indexOf('.' + name)).split(/[\r\n]/).length;
            const hash = strhash(name + css).toString(36).slice(0, 4)
            const shortname = shortenCSSPropertyName(name)

            return shortname + '_' + hash + '_' + line
          }
        },
        plugins: [
          require('autoprefixer')
        ]
      }),
      json(),
      html({
        title: 'FrondJS App',
        body: `<div id="frondapp"></div>`
      }),
      strip({
        functions: config.get('env') == 'production' ? ['console.log', 'assert.*'] : []
      }),
      babel({babelHelpers: 'bundled'}),
      terser()
    ]
  }
]
