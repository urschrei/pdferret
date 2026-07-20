# PDFerret

This is an add-on for [Zotero](https://www.zotero.org/) 8.x and above and [Juris-M](https://juris-m.github.io/) that enables automatic download of PDFs for items with a DOI using various configurable providers.

## Quick Start Guide

### Install

- Download the latest release (.xpi file) from the [Releases Page](https://github.com/urschrei/pdferret/releases)
  _Note_ If you're using Firefox as your browser, right click the xpi and select "Save As.."
- In Zotero click "Tools" in the top menu bar and then click "Plugins"
- Click the gear icon on the top right
- Select Install Add-on from file
- Browse to where you downloaded the `.xpi` file and select it, then click `Open`
- The plugin is now installed.

### Usage

Right-click any item in your collections.
There will now be a new context menu option titled "Retrieve PDF." When you
click this, a PDF will be downloaded from your configured provider (Sci-Hub by default) and attached to your
item in Zotero. Clicking on a collection will give you the option of retrieving all PDFs in the same way.

You can configure the plugin to automatically download and attach PDFs when items are added.

### Configuration

You can configure providers in **Preferences > PDFerret**:

- **Automatic PDF Download**: When enabled, PDFerret will attempt to download PDFs for newly added items with DOIs
- **Provider Selection**: Choose from built-in providers (Sci-Hub, Anna's Archive) or add custom providers
- **Custom Providers**: Add your own PDF sources by specifying a URL template, CSS selector, and attribute

## How It Works

PDFerret uses Zotero's built-in [Custom PDF Resolvers](https://www.zotero.org/support/kb/custom_pdf_resolvers) system. When the plugin starts, it registers your configured providers as PDF resolvers in Zotero's `extensions.zotero.findPDFs.resolvers` preference.

This means:

- **Integration with Zotero**: PDFerret works with Zotero's native "Find Available PDF" functionality
- **Automatic cleanup**: When the plugin is disabled or uninstalled, its resolver entries are removed
- **Non-destructive**: Any resolvers you've manually configured are preserved

### Custom Provider Configuration

When adding a custom provider, you need to specify:

| Field | Description | Example |
|-------|-------------|---------|
| **Name** | Display name for the provider | `My University` |
| **URL Template** | URL with `{DOI}` placeholder | `https://example.com/{DOI}` |
| **CSS Selector** | Selector to find the PDF element | `a[href*=".pdf"]` |
| **Attribute** | HTML attribute containing the PDF URL | `href` |

The built-in providers use these configurations:

- **Sci-Hub**: Selector = `embed[type="application/pdf"], #pdf`, Attribute = `src`
- **Anna's Archive**: Selector = `a[href*="/slow_download"]`, Attribute = `href`

For more details on how Zotero's resolver system works, see the [Custom PDF Resolvers documentation](https://www.zotero.org/support/kb/custom_pdf_resolvers).

### DNS-over-HTTPS

In case of malfunctioning or unsafe local DNS server, Zotero (as it's built on Firefox) might be configured with [Trusted Recursive Resolver](https://wiki.mozilla.org/Trusted_Recursive_Resolver) or DNS-over-HTTPS, where you could set your own DNS server just for Zotero without modifying network settings.

_Preferences > Advanced > Config Editor_

1. set `network.trr.mode` to `2` or `3`, this enables DNS-over-HTTPS (2 enables it with fallback)
2. set `network.trr.uri` to `https://cloudflare-dns.com/dns-query`, this is the provider’s URL
3. set `network.trr.bootstrapAddress` to `1.1.1.1`, this is cloudflare’s normal DNS server (only) used to retrieve the IP of cloudflare-dns.com
4. Restart zotero, wait for a DNS cache to clean up.

## Building

1. You have [node.js](nodejs.org) installed. Builds are tested using the LTS version (as of late 2025)
2. Run `npm install`
3. Run `npm run build` to build the XPI

## Publishing a Release

1. Update the version number in **both** files (they must match):
   - `package.json`
   - `manifest.json`

2. Commit and push to master

3. Create and push a version tag:
   ```bash
   git tag v1.0.3
   git push origin v1.0.3
   ```

4. The CI workflow will automatically:
   - Build the XPI
   - Create a GitHub release with the XPI attached
   - Update `updates.json` for auto-updates

Installed plugins will receive the update automatically via Zotero's built-in update mechanism.

## Localisation

This plugin uses Mozilla's [Fluent](https://projectfluent.org/) localisation system. All user-facing strings are stored in `.ftl` files located in `locale/`.

### File structure

```
locale/
  en-US/
    pdferret.ftl    # English (US) strings
```

### Adding new strings

1. Add the string to `locale/en-US/pdferret.ftl` with a key prefixed by `pdferret-`:

   ```ftl
   pdferret-my-new-string = My new string value
   ```

2. Use the string in TypeScript via the `getString()` helper:

   ```typescript
   import { getString } from './locale'

   const message = getString('my-new-string')
   ```

3. For strings with parameters:

   ```ftl
   pdferret-greeting = Hello, { $name }!
   ```

   ```typescript
   getString('greeting', { name: 'World' })
   ```

4. For XHTML elements, use `data-l10n-id`:

   ```xml
   <label data-l10n-id="pdferret-my-new-string"/>
   ```

### Adding a new language

1. Create a new directory under `locale/` (e.g., `locale/de-DE/`)
2. Copy `pdferret.ftl` from `en-US/` and translate the values
3. Register the locale in `content/bootstrap.ts` by adding a line to `registerChrome()`:

   ```typescript
   ['locale', 'pdferret', 'de-DE', 'locale/de-DE/'],
   ```

See the [Fluent Syntax Guide](https://projectfluent.org/fluent/guide/) for more details on the `.ftl` format.

## [Contributing](./CONTRIBUTING.md)

## Disclaimer

You should be aware of and comply with applicable laws regarding the use of copyrighted material in your jurisdiction when using this plugin.
