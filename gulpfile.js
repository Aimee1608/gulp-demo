const { src, dest, parallel, series, watch } = require('gulp')
const loadPlugins = require('gulp-load-plugins')
const browserSync = require('browser-sync')
const del = require('del')
const plugins = loadPlugins()
const bs = browserSync.create()

const data = {
  menus: [
    {
      name: 'Home',
      icon: 'aperture',
      link: 'index.html'
    },
    {
      name: 'Features',
      link: 'features.html'
    },
    {
      name: 'About',
      link: 'about.html'
    },
    {
      name: 'Contact',
      link: '#',
      children: [
        {
          name: 'Twitter',
          link: 'https://twitter.com/w_zce'
        },
        {
          name: 'About',
          link: 'https://weibo.com/zceme'
        },
        {
          name: 'divider'
        },
        {
          name: 'About',
          link: 'https://github.com/zce'
        }
      ]
    }
  ],
  pkg: require('./package.json'),
  date: new Date()
}

const clean = () => {
  return del(['dist', 'temp'])
}

const style = () => {
  return src('src/assets/styles/*.scss', { base: 'src' })
    .pipe(plugins.sass())
    .pipe(dest('temp'))
    .pipe(bs.reload({ stream: true }))
}

const script = () => {
  return src('src/assets/scripts/*.js', { base: 'src' })
    .pipe(plugins.eslint())
    .pipe(plugins.eslint.format())
    .pipe(plugins.eslint.failAfterError())
    .pipe(plugins.babel({ presets: ['@babel/preset-env'] }))
    .pipe(dest('temp'))
    .pipe(bs.reload({ stream: true }))
}

const page = () => {
  // src/**/*.html 指所有目录下的html文件
  return src('src/*.html', { base: 'src' })
    .pipe(plugins.swig({ data }))
    .pipe(dest('temp'))
    .pipe(bs.reload({ stream: true }))
}
const image = () => {
  return src('src/assets/images/**', { base: 'src' })
    .pipe(plugins.imagemin())
    .pipe(dest('dist'))
}

const font = () => {
  return src('src/assets/fonts/**', { base: 'src' })
    .pipe(plugins.imagemin())
    .pipe(dest('dist'))
}

const extra = () => {
  return src('public/**', { base: 'public' })
    .pipe(dest('dist'))
}

const serve = () => {
  watch('src/assets/styles/*.scss', style)
  watch('src/assets/scripts/*.js', script)
  watch('src/*.html', page)
  // watch('src/assets/images/**', image)
  // watch('src/assets/fonts/**', font)
  // watch('public/**', extra)
  watch([
    'src/assets/images/**',
    'src/assets/fonts/**',
    'public/**'
  ], bs.reload)

  bs.init({
    notify: false, // 小提示 默认为true
    port: 8088, // 默认端口号位3000
    open: false, // 是否默认打开浏览器，默认为true
    // files: 'dist/**', // 默认监听文件的改动
    server: {
      baseDir: ['temp', 'src', 'public'], // 查找文件的路径
      routes: { // 优先于baseDir
        '/node_modules': 'node_modules'
      }
    }
  })
}

const useref = () => {
  return src('temp/*.html', { base: 'temp' })
    .pipe(plugins.useref({ searchPath: ['temp', '.'] }))
    .pipe(plugins.if(/\.js$/, plugins.uglify()))
    .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
    .pipe(plugins.if(/\.html$/, plugins.htmlmin({
      collapseWhitespace: true,
      minifyCSS: true,
      minifyJS: true
    })))
    .pipe(dest('dist'))
}

const compile = parallel(style, script, page)
// 上线前执行的任务
// const build = series(clear, parallel(compile, image, font, extra))
const develop = series(compile, serve)
// 上线之前执行的任务

const build = series(
  clean,
  parallel(
    series(compile, useref),
    image,
    font,
    extra
  )
)
const zipFile = () => {
  return src(['dist/**'], { base: './' })
    .pipe(plugins.zip('publish.zip'))
    .pipe(dest('./dist'))
}
// 大致如下
const publish = () => {
  var config = {

    servers: [
      {
        sshConfig: {
          host: '172.16.70.174',
          port: '8080',
          username: 'admin',
          password: 'cavin@123',
          readyTimeout: 1000
        }
      }]
  }
  config.deployPath = '/home/admin/publish/web/express-demo/'
  // 待实现
  const deploySSH = () => { }
  return src('dist/publish.zip', { base: './' })
    .pipe(deploySSH({
      servers: config.servers,
      dest: config.deployPath + 'publish.zip',
      logPath: 'deploy',
      shell: ['cd ' + config.deployPath,
        'shopt -s extglob',
        'rm -rf !(logs|node_modules|config.js|publish.zip)',
        'unzip -o publish.zip',
        'cp -rf dist/** .',
        'rm -rf dist',
        'rm publish.zip',
        'npm install --production',
        'pm2 startOrRestart pm2-start.json']
    }))
}
const deploy = series(zipFile, publish)

module.exports = {
  clean,
  lint: script,
  serve: develop,
  compile,
  build,
  useref,
  deploy
}
