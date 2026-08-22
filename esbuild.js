const path = require('path')
const fs = require('fs')
const esbuild = require('esbuild')

// Copy manifest.json to build directory
function copyManifest() {
  const manifestSrc = path.join(__dirname, 'manifest.json')
  const manifestDest = path.join(__dirname, 'build', 'manifest.json')

  // Ensure build directory exists
  if (!fs.existsSync(path.join(__dirname, 'build'))) {
    fs.mkdirSync(path.join(__dirname, 'build'), { recursive: true })
  }

  // Read manifest and update version from package.json
  const manifest = JSON.parse(fs.readFileSync(manifestSrc, 'utf-8'))
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'))
  manifest.version = pkg.version

  fs.writeFileSync(manifestDest, JSON.stringify(manifest, null, 2))
  console.log('Copied manifest.json to build/')
}

// Copy chrome.manifest to build directory
function copyChromeManifest() {
  const src = path.join(__dirname, 'chrome.manifest')
  const dest = path.join(__dirname, 'build', 'chrome.manifest')
  fs.copyFileSync(src, dest)
  console.log('Copied chrome.manifest to build/')
}

// Copy locale directory to build
function copyLocales() {
  const srcDir = path.join(__dirname, 'locale')
  const destDir = path.join(__dirname, 'build', 'locale')

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true })
  }

  // Copy en-US locale
  const enUSDir = path.join(destDir, 'en-US')
  if (!fs.existsSync(enUSDir)) {
    fs.mkdirSync(enUSDir, { recursive: true })
  }

  const localeFiles = fs.readdirSync(path.join(srcDir, 'en-US'))
    .filter(f => f.endsWith('.ftl'))  // Only copy Fluent files
  for (const file of localeFiles) {
    fs.copyFileSync(
      path.join(srcDir, 'en-US', file),
      path.join(enUSDir, file)
    )
  }
  console.log('Copied locale files to build/')
}

// Copy skin directory to build
function copySkin() {
  const srcDir = path.join(__dirname, 'skin', 'default')
  const destDir = path.join(__dirname, 'build', 'skin', 'default')

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true })
  }

  const skinFiles = fs.readdirSync(srcDir)
  for (const file of skinFiles) {
    fs.copyFileSync(
      path.join(srcDir, file),
      path.join(destDir, file)
    )
  }
  console.log('Copied skin files to build/')
}

// Copy preferences.xhtml to build
function copyPreferences() {
  const src = path.join(__dirname, 'content', 'preferences.xhtml')
  const dest = path.join(__dirname, 'build', 'content', 'preferences.xhtml')

  if (!fs.existsSync(path.join(__dirname, 'build', 'content'))) {
    fs.mkdirSync(path.join(__dirname, 'build', 'content'), { recursive: true })
  }

  fs.copyFileSync(src, dest)
  console.log('Copied preferences.xhtml to build/')
}

async function build() {
  // Copy assets first
  copyManifest()
  copyChromeManifest()
  copyLocales()
  copySkin()
  copyPreferences()

  // Build bootstrap.js (root level for plugin loading)
  await esbuild.build({
    bundle: true,
    format: 'iife',
    target: ['firefox115'],
    entryPoints: ['content/bootstrap.ts'],
    outfile: 'build/bootstrap.js',
    globalName: 'PDFerretBootstrap',
    footer: {
      js: `
// Export bootstrap functions for Zotero
var install = PDFerretBootstrap.install;
var uninstall = PDFerretBootstrap.uninstall;
var startup = PDFerretBootstrap.startup;
var shutdown = PDFerretBootstrap.shutdown;
var onMainWindowLoad = PDFerretBootstrap.onMainWindowLoad;
var onMainWindowUnload = PDFerretBootstrap.onMainWindowUnload;
`
    },
  })
  console.log('Built bootstrap.js')

  // Build main plugin script
  await esbuild.build({
    bundle: true,
    format: 'iife',
    target: ['firefox115'],
    entryPoints: ['content/pdferret.ts'],
    outdir: 'build/content',
    banner: { js: 'if (!Zotero.PDFerret) {\n' },
    footer: { js: '\n}' },
  })
  console.log('Built pdferret.js')
}

build().catch(err => {
  console.log(err)
  process.exit(1)
})
