import type { IZotero, ZoteroItem } from '../typings/zotero'
import { ItemPane } from './itemPane'
import { ToolsPane } from './toolsPane'
import { UITool } from 'zotero-plugin-toolkit'
import { providerManager } from './providers'
import { resolverManager } from './resolvers'
import type { Provider } from './providers'
import { getString, initLocale } from './locale'

declare const Zotero: IZotero
declare const window: Window | undefined
declare const rootURI: string | undefined

const ui = new UITool()

class PDFerret {
  private static readonly DEFAULT_AUTOMATIC_PDF_DOWNLOAD = true
  private menuIds: string[] = []
  public ItemPane: ItemPane
  public ToolsPane: ToolsPane

  constructor() {
    this.ItemPane = new ItemPane()
    this.ToolsPane = new ToolsPane()
  }

  // Called by bootstrap.ts on plugin startup
  public startup(reason: string): void {
    Zotero.debug(`PDFerret: startup (${reason})`)
    initLocale()
    providerManager.initialize()
    this.syncResolvers()
  }

  // Called by bootstrap.ts on plugin shutdown
  public shutdown(): void {
    Zotero.debug('PDFerret: shutdown')
    this.unregisterMenus()
    resolverManager.cleanup()
  }

  // Called when main Zotero window loads
  public onMainWindowLoad(win: Window): void {
    Zotero.debug('PDFerret: main window loaded')
    this.registerMenus(win)
  }

  // Called when main Zotero window unloads
  public onMainWindowUnload(_win: Window): void {
    Zotero.debug('PDFerret: main window unloading')
    this.unregisterMenus()
  }

  /**
   * Run PDF retrieval for the given items.
   *
   * Default: filter to items that don't already have a PDF/EPUB and delegate
   * to Zotero's native addAvailableFiles. Surfaces a notice when items are skipped.
   *
   * Force re-download mode: bypass the eligibility gate and call addFileFromURLs
   * per item, which adds an additional attachment alongside any existing one.
   */
  public async retrieveForItems(items: ZoteroItem[]): Promise<void> {
    const regularItems = items.filter(item => item.isRegularItem())
    if (regularItems.length === 0) return

    if (this.isForceRedownload()) {
      await this.forceRedownload(regularItems)
      return
    }

    const eligible = regularItems.filter(item => Zotero.Attachments.canFindFileForItem(item))
    const skipped = regularItems.length - eligible.length

    if (skipped > 0) {
      this.showProgressNotice(getString('retrieval-skipped', { count: String(skipped) }))
    }

    if (eligible.length > 0) {
      await Zotero.Attachments.addAvailableFiles(eligible)
    }
  }

  private async forceRedownload(items: ZoteroItem[]): Promise<void> {
    let succeeded = 0
    let failed = 0
    for (const item of items) {
      try {
        const resolvers = Zotero.Attachments.getFileResolvers(item)
        const result = await Zotero.Attachments.addFileFromURLs(item, resolvers)
        if (result) {
          succeeded++
        } else {
          failed++
        }
      } catch (err) {
        failed++
        Zotero.logError(err as Error)
      }
    }
    this.showProgressNotice(getString('retrieval-force-summary', {
      succeeded: String(succeeded),
      failed: String(failed),
    }))
  }

  private showProgressNotice(headline: string): void {
    try {
      const pw = new Zotero.ProgressWindow()
      pw.changeHeadline(headline)
      pw.show()
      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      pw.startCloseTimer(5000)
    } catch (err) {
      Zotero.logError(err as Error)
    }
  }

  /**
   * Sync current providers to Zotero's PDF resolver preference.
   * Called on startup and when providers are modified.
   */
  public syncResolvers(): void {
    const providers = providerManager.getProviders()
    const automatic = this.isAutomaticPdfDownload()
    resolverManager.syncProviders(providers, automatic)
  }

  private registerMenus(win: Window): void {
    try {
      const doc = win.document
      const iconPath = typeof rootURI !== 'undefined' ? `${rootURI}skin/default/pdferret-logo.svg` : ''

      const targets: { popupId: string; id: string; label: string; handler: () => void }[] = [
        {
          popupId: 'zotero-itemmenu',
          id: 'pdferret-itemmenu',
          label: getString('menu-item'),
          handler: () => { void this.ItemPane.updateSelectedItems() },
        },
        {
          popupId: 'zotero-collectionmenu',
          id: 'pdferret-collectionmenu',
          label: getString('menu-collection'),
          handler: () => { void this.ItemPane.updateSelectedEntity('') },
        },
        {
          popupId: 'menu_ToolsPopup',
          id: 'pdferret-tools-updateall',
          label: getString('menu-all'),
          handler: () => { void this.ToolsPane.updateAll() },
        },
      ]

      for (const t of targets) {
        const popup = doc.getElementById(t.popupId)
        if (!popup) continue
        ui.appendElement({
          tag: 'menuitem',
          id: t.id,
          attributes: {
            label: t.label,
            class: 'menuitem-iconic',
            image: iconPath,
          },
          listeners: [
            { type: 'command', listener: t.handler },
          ],
        }, popup)
        this.menuIds.push(t.id)
      }
    } catch (err) {
      Zotero.logError(err as Error)
    }
  }

  private unregisterMenus(): void {
    ui.unregisterAll()
    this.menuIds = []
  }

  /**
   * Get the active provider
   */
  public getActiveProvider(): Provider {
    return providerManager.getActiveProvider()
  }

  public isAutomaticPdfDownload(): boolean {
    if (Zotero.Prefs.get('pdferret.automatic_pdf_download') === undefined) {
      Zotero.Prefs.set('pdferret.automatic_pdf_download', PDFerret.DEFAULT_AUTOMATIC_PDF_DOWNLOAD)
    }

    return Zotero.Prefs.get('pdferret.automatic_pdf_download') as boolean
  }

  public isForceRedownload(): boolean {
    return Zotero.Prefs.get(PDFerret.PREF_FORCE_REDOWNLOAD) === true
  }

  // Legacy methods - kept for compatibility
  public load(): void {
    // No-op - resolvers are registered on startup
  }

  public unload(): void {
    // No-op - resolvers are cleaned up on shutdown
  }

  // Preferences pane methods - called from preferences.xhtml
  private static readonly XUL_NS = 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul'
  private static readonly PREF_AUTOMATIC = 'pdferret.automatic_pdf_download'
  private static readonly PREF_ACTIVE_PROVIDER = 'pdferret.active_provider'
  private static readonly PREF_FORCE_REDOWNLOAD = 'pdferret.force_redownload'

  public onPrefsLoad(doc: Document): void {
    Zotero.debug('PDFerret: onPrefsLoad called')

    const automaticCheckbox = doc.getElementById('pref-automatic-pdf-download') as HTMLInputElement | null
    const forceCheckbox = doc.getElementById('pref-force-redownload') as HTMLInputElement | null
    const providerSelect = doc.getElementById('pref-provider-select') as HTMLSelectElement | null
    const builtinUrlInput = doc.getElementById('pref-builtin-url') as HTMLInputElement | null

    if (!automaticCheckbox || !forceCheckbox || !providerSelect || !builtinUrlInput) {
      Zotero.debug('PDFerret: preferences DOM elements not found')
      return
    }

    // Set initial values
    automaticCheckbox.checked = Zotero.Prefs.get(PDFerret.PREF_AUTOMATIC) !== false
    forceCheckbox.checked = Zotero.Prefs.get(PDFerret.PREF_FORCE_REDOWNLOAD) === true

    // Populate provider dropdown
    this.populateProviderDropdown(doc)
    this.renderCustomProvidersList(doc)

    // Event listeners
    automaticCheckbox.addEventListener('command', () => {
      const cb = doc.getElementById('pref-automatic-pdf-download') as HTMLInputElement
      Zotero.Prefs.set(PDFerret.PREF_AUTOMATIC, cb.checked)
      // Re-sync resolvers with new automatic setting
      this.syncResolvers()
    })

    forceCheckbox.addEventListener('command', () => {
      const cb = doc.getElementById('pref-force-redownload') as HTMLInputElement
      Zotero.Prefs.set(PDFerret.PREF_FORCE_REDOWNLOAD, cb.checked)
    })

    providerSelect.addEventListener('command', () => {
      const select = doc.getElementById('pref-provider-select') as HTMLSelectElement
      Zotero.Prefs.set(PDFerret.PREF_ACTIVE_PROVIDER, select.value)
      this.updateBuiltinUrlSection(doc)
      this.syncResolvers()
    })

    builtinUrlInput.addEventListener('change', () => {
      const select = doc.getElementById('pref-provider-select') as HTMLSelectElement
      const input = doc.getElementById('pref-builtin-url') as HTMLInputElement
      const providerId = select?.value
      const provider = providerManager.getProvider(providerId)

      if (provider?.isBuiltin && input) {
        const urlTemplate = input.value.trim()
        providerManager.updateBuiltinProviderUrl(providerId, urlTemplate)
        // Re-sync resolvers with updated URL
        this.syncResolvers()
      }
    })

    Zotero.debug('PDFerret: preferences initialization complete')
  }

  public onPrefsShowAddForm(doc: Document): void {
    const form = doc.getElementById('add-provider-form')
    const btnContainer = doc.getElementById('add-provider-btn-container')
    const nameInput = doc.getElementById('new-provider-name') as HTMLInputElement
    const urlInput = doc.getElementById('new-provider-url') as HTMLInputElement
    const selectorInput = doc.getElementById('new-provider-selector') as HTMLInputElement
    const attributeInput = doc.getElementById('new-provider-attribute') as HTMLInputElement

    if (form && btnContainer && nameInput && urlInput && selectorInput && attributeInput) {
      nameInput.value = ''
      urlInput.value = ''
      selectorInput.value = ''
      attributeInput.value = 'href'
      form.style.display = ''
      btnContainer.style.display = 'none'
    }
  }

  public onPrefsHideAddForm(doc: Document): void {
    const form = doc.getElementById('add-provider-form')
    const btnContainer = doc.getElementById('add-provider-btn-container')

    if (form && btnContainer) {
      form.style.display = 'none'
      btnContainer.style.display = ''
    }
  }

  public onPrefsSaveProvider(doc: Document): void {
    const nameInput = doc.getElementById('new-provider-name') as HTMLInputElement
    const urlInput = doc.getElementById('new-provider-url') as HTMLInputElement
    const selectorInput = doc.getElementById('new-provider-selector') as HTMLInputElement
    const attributeInput = doc.getElementById('new-provider-attribute') as HTMLInputElement

    if (!nameInput || !urlInput || !selectorInput || !attributeInput) return

    const name = nameInput.value.trim()
    const urlTemplate = urlInput.value.trim()
    const selector = selectorInput.value.trim()
    const attribute = attributeInput.value.trim() || undefined

    // Validation
    const alertFn = Zotero.getMainWindow()?.alert || alert
    if (!name) {
      alertFn(getString('validation-name-required'))
      return
    }
    if (!urlTemplate) {
      alertFn(getString('validation-url-required'))
      return
    }
    if (!urlTemplate.includes('{DOI}')) {
      alertFn(getString('validation-url-doi'))
      return
    }
    if (!selector) {
      alertFn(getString('validation-selector-required'))
      return
    }

    // Use providerManager to add the provider (updates both in-memory and storage)
    const newProvider = {
      id: providerManager.generateCustomProviderId(),
      name,
      urlTemplate,
      selector,
      attribute,
    }
    providerManager.addCustomProvider(newProvider)

    // Re-sync resolvers with new provider
    this.syncResolvers()

    this.onPrefsHideAddForm(doc)
    this.populateProviderDropdown(doc)
    this.renderCustomProvidersList(doc)
  }

  private populateProviderDropdown(doc: Document): void {
    const providerPopup = doc.getElementById('pref-provider-popup')
    const providerSelect = doc.getElementById('pref-provider-select') as HTMLSelectElement | null

    if (!providerPopup || !providerSelect) return

    // Clear existing items
    while (providerPopup.firstChild) {
      providerPopup.removeChild(providerPopup.firstChild)
    }

    const providers = providerManager.getProviders()
    const activeId = (Zotero.Prefs.get(PDFerret.PREF_ACTIVE_PROVIDER) as string) || 'scihub'

    for (const provider of providers) {
      const menuitem = doc.createElementNS(PDFerret.XUL_NS, 'menuitem')
      menuitem.setAttribute('value', provider.id)
      menuitem.setAttribute('label', provider.name)
      providerPopup.appendChild(menuitem)
    }

    providerSelect.value = activeId
    this.updateBuiltinUrlSection(doc)
  }

  private updateBuiltinUrlSection(doc: Document): void {
    const providerSelect = doc.getElementById('pref-provider-select') as HTMLSelectElement | null
    const builtinUrlSection = doc.getElementById('builtin-url-section')
    const builtinUrlLabel = doc.getElementById('builtin-url-label')
    const builtinUrlHelp = doc.getElementById('builtin-url-help')
    const builtinUrlInput = doc.getElementById('pref-builtin-url') as HTMLInputElement | null

    if (!providerSelect || !builtinUrlSection || !builtinUrlLabel || !builtinUrlHelp || !builtinUrlInput) {
      return
    }

    const providerId = providerSelect.value
    const provider = providerManager.getProvider(providerId)

    if (provider?.isBuiltin) {
      // Show URL section for built-in providers
      builtinUrlSection.style.display = ''

      // Update label and help text with provider name
      builtinUrlLabel.setAttribute('value', getString('prefs-provider-url-label', { provider: provider.name }))
      builtinUrlHelp.textContent = getString('prefs-provider-url-help', { provider: provider.name })

      // Load current URL template for this provider
      builtinUrlInput.value = provider.urlTemplate
    } else {
      // Hide URL section for custom providers (they have their own editing)
      builtinUrlSection.style.display = 'none'
    }
  }

  private renderCustomProvidersList(doc: Document): void {
    const customProvidersList = doc.getElementById('custom-providers-list')
    if (!customProvidersList) return

    // Clear existing items
    while (customProvidersList.firstChild) {
      customProvidersList.removeChild(customProvidersList.firstChild)
    }

    // Get custom providers from providerManager (filter out built-ins)
    const customProviders = providerManager.getProviders().filter(p => !p.isBuiltin)
    if (customProviders.length === 0) {
      const emptyMsg = doc.createElementNS('http://www.w3.org/1999/xhtml', 'p')
      emptyMsg.style.cssText = 'color: #999; font-style: italic; margin: 0;'
      emptyMsg.textContent = getString('prefs-custom-empty')
      customProvidersList.appendChild(emptyMsg)
      return
    }

    for (const provider of customProviders) {
      const row = doc.createElementNS(PDFerret.XUL_NS, 'hbox') as HTMLElement
      row.setAttribute('align', 'center')
      row.style.cssText = 'margin-bottom: 8px; padding: 8px; border: 1px solid currentColor; border-radius: 4px; opacity: 0.8;'

      const infoBox = doc.createElementNS(PDFerret.XUL_NS, 'vbox')
      infoBox.setAttribute('flex', '1')

      const nameLabel = doc.createElementNS(PDFerret.XUL_NS, 'label')
      nameLabel.setAttribute('value', provider.name)
      ;(nameLabel as HTMLElement).style.fontWeight = 'bold'
      infoBox.appendChild(nameLabel)

      const urlLabel = doc.createElementNS(PDFerret.XUL_NS, 'label')
      urlLabel.setAttribute('value', provider.urlTemplate)
      ;(urlLabel as HTMLElement).style.cssText = 'font-size: 11px; opacity: 0.7;'
      infoBox.appendChild(urlLabel)

      const selectorLabel = doc.createElementNS(PDFerret.XUL_NS, 'label')
      selectorLabel.setAttribute('value', `Selector: ${provider.selector}`)
      ;(selectorLabel as HTMLElement).style.cssText = 'font-size: 11px; opacity: 0.7;'
      infoBox.appendChild(selectorLabel)

      row.appendChild(infoBox)

      const deleteBtn = doc.createElementNS(PDFerret.XUL_NS, 'button')
      deleteBtn.setAttribute('label', getString('prefs-btn-delete'))
      deleteBtn.setAttribute('data-provider-id', provider.id)
      deleteBtn.addEventListener('click', e => {
        const id = (e.target as HTMLElement).getAttribute('data-provider-id')
        if (id) {
          this.deleteCustomProvider(doc, id)
        }
      })
      row.appendChild(deleteBtn)

      customProvidersList.appendChild(row)
    }
  }

  private deleteCustomProvider(doc: Document, id: string): void {
    // Use providerManager to remove (handles both in-memory and storage, plus active provider reset)
    providerManager.removeCustomProvider(id)

    // Re-sync resolvers
    this.syncResolvers()

    this.populateProviderDropdown(doc)
    this.renderCustomProvidersList(doc)
  }
}

Zotero.PDFerret = new PDFerret()

// Legacy initialization for Zotero 6 compatibility (if XUL overlays are still used)
// In Zotero 7/8, initialization is handled by bootstrap.ts
if (typeof window !== 'undefined' && typeof rootURI === 'undefined') {
  // Only attach listeners in legacy mode (non-bootstrap)
  window.addEventListener('load', _ => {
    Zotero.PDFerret.load()
  }, false)
  window.addEventListener('unload', _ => {
    Zotero.PDFerret.unload()
  }, false)
}

export { PDFerret }
