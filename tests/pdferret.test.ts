import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Zotero, addAvailableFilesSpy, addFileFromURLsSpy, canFindFileForItemMock } from './zotero.mock'
import { regularItem1, regularItem2 } from './zoteroItem.mock'
import { PDFerret } from '../content/pdferret'
import { providerManager } from '../content/providers'
import { resolverManager } from '../content/resolvers'
import type { ZoteroItem } from '../typings/zotero'

// Resolver preference key (same as in resolverManager)
const RESOLVER_PREF = 'extensions.zotero.findPDFs.resolvers'

Zotero.PDFerret = new PDFerret()

describe('PDFerret resolver integration', () => {
  beforeEach(() => {
    // Clear prefs before each test
    ;(Zotero.Prefs as any).clear()
    providerManager.initialize()
  })

  afterEach(() => {
    // Clean up resolvers after each test
    resolverManager.cleanup()
  })

  describe('syncResolvers', () => {
    it('registers built-in providers as Zotero resolvers', () => {
      Zotero.PDFerret.syncResolvers()

      const resolversJson = Zotero.Prefs.get(RESOLVER_PREF, true) as string
      expect(resolversJson).toBeDefined()

      const resolvers = JSON.parse(resolversJson)
      expect(resolvers).toHaveLength(2)

      // Check Sci-Hub resolver
      const scihub = resolvers.find((r: any) => r.name === 'Sci-Hub')
      expect(scihub).toBeDefined()
      expect(scihub.url).toContain('{doi}')
      expect(scihub.mode).toBe('html')
      expect(scihub.selector).toContain('embed')
      expect(scihub.pdferretManaged).toBe(true)

      // Check Anna's Archive resolver
      const annas = resolvers.find((r: any) => r.name === "Anna's Archive SciDB")
      expect(annas).toBeDefined()
      expect(annas.url).toContain('annas-archive.org')
      expect(annas.selector).toContain('slow_download')
      expect(annas.pdferretManaged).toBe(true)
    })

    it('converts {DOI} to lowercase {doi} for Zotero compatibility', () => {
      Zotero.PDFerret.syncResolvers()

      const resolversJson = Zotero.Prefs.get(RESOLVER_PREF, true) as string
      const resolvers = JSON.parse(resolversJson)

      // All URLs should use lowercase {doi}
      for (const resolver of resolvers) {
        expect(resolver.url).toContain('{doi}')
        expect(resolver.url).not.toContain('{DOI}')
      }
    })

    it('sets automatic flag based on preference', () => {
      // Test with automatic enabled
      Zotero.Prefs.set('pdferret.automatic_pdf_download', true)
      Zotero.PDFerret.syncResolvers()

      let resolversJson = Zotero.Prefs.get(RESOLVER_PREF, true) as string
      let resolvers = JSON.parse(resolversJson)
      expect(resolvers[0].automatic).toBe(true)

      // Test with automatic disabled
      Zotero.Prefs.set('pdferret.automatic_pdf_download', false)
      Zotero.PDFerret.syncResolvers()

      resolversJson = Zotero.Prefs.get(RESOLVER_PREF, true) as string
      resolvers = JSON.parse(resolversJson)
      expect(resolvers[0].automatic).toBe(false)
    })

    it('preserves external resolvers when syncing', () => {
      // Set up an external resolver (not from PDFerret)
      const externalResolver = {
        name: 'My Custom Resolver',
        method: 'GET',
        url: 'https://custom.example.com/{doi}',
        mode: 'html',
        selector: '#pdf-link',
        automatic: false,
      }
      Zotero.Prefs.set(RESOLVER_PREF, JSON.stringify([externalResolver]), true)

      // Sync PDFerret resolvers
      Zotero.PDFerret.syncResolvers()

      const resolversJson = Zotero.Prefs.get(RESOLVER_PREF, true) as string
      const resolvers = JSON.parse(resolversJson)

      // Should have PDFerret resolvers + external resolver
      expect(resolvers.length).toBeGreaterThan(2)

      // External resolver should still be there
      const external = resolvers.find((r: any) => r.name === 'My Custom Resolver')
      expect(external).toBeDefined()
      expect(external.pdferretManaged).toBeUndefined()
    })
  })

  describe('cleanup', () => {
    it('removes only PDFerret resolvers on cleanup', () => {
      // Set up mixed resolvers
      const mixedResolvers = [
        { name: 'Sci-Hub', url: 'https://sci-hub.ru/{doi}', pdferretManaged: true },
        { name: 'External', url: 'https://external.com/{doi}' },
      ]
      Zotero.Prefs.set(RESOLVER_PREF, JSON.stringify(mixedResolvers), true)

      // Run cleanup
      resolverManager.cleanup()

      const resolversJson = Zotero.Prefs.get(RESOLVER_PREF, true) as string
      const resolvers = JSON.parse(resolversJson)

      // Only external resolver should remain
      expect(resolvers).toHaveLength(1)
      expect(resolvers[0].name).toBe('External')
    })

    it('clears preference when no external resolvers remain', () => {
      // Set up only PDFerret resolvers
      Zotero.PDFerret.syncResolvers()

      // Run cleanup
      resolverManager.cleanup()

      const resolversJson = Zotero.Prefs.get(RESOLVER_PREF, true) as string
      expect(resolversJson).toBe('')
    })
  })

  describe('retrieveForItems', () => {
    beforeEach(() => {
      addAvailableFilesSpy.mockClear()
      canFindFileForItemMock.mockReset()
      canFindFileForItemMock.mockReturnValue(true)
    })

    it('passes eligible items to addAvailableFiles', async () => {
      await Zotero.PDFerret.retrieveForItems([regularItem1, regularItem2] as ZoteroItem[])
      expect(addAvailableFilesSpy).toHaveBeenCalledTimes(1)
      expect(addAvailableFilesSpy.mock.calls[0][0]).toHaveLength(2)
    })

    it('skips ineligible items and only sends eligible ones', async () => {
      canFindFileForItemMock.mockImplementation(() => {
        const calls = canFindFileForItemMock.mock.calls.length
        return calls === 1
      })
      await Zotero.PDFerret.retrieveForItems([regularItem1, regularItem2] as ZoteroItem[])
      expect(addAvailableFilesSpy).toHaveBeenCalledTimes(1)
      expect(addAvailableFilesSpy.mock.calls[0][0]).toHaveLength(1)
    })

    it('does not call addAvailableFiles when all items are ineligible', async () => {
      canFindFileForItemMock.mockReturnValue(false)
      await Zotero.PDFerret.retrieveForItems([regularItem1] as ZoteroItem[])
      expect(addAvailableFilesSpy).not.toHaveBeenCalled()
    })

    it('ignores non-regular items', async () => {
      const note = { isRegularItem: () => false } as ZoteroItem
      await Zotero.PDFerret.retrieveForItems([note])
      expect(addAvailableFilesSpy).not.toHaveBeenCalled()
    })

    it('force mode bypasses eligibility and calls addFileFromURLs per item', async () => {
      addFileFromURLsSpy.mockClear()
      Zotero.Prefs.set('pdferret.force_redownload', true)
      canFindFileForItemMock.mockReturnValue(false)

      await Zotero.PDFerret.retrieveForItems([regularItem1, regularItem2] as ZoteroItem[])

      expect(addAvailableFilesSpy).not.toHaveBeenCalled()
      expect(addFileFromURLsSpy).toHaveBeenCalledTimes(2)
    })
  })

  describe('provider management', () => {
    it('getActiveProvider returns default provider', () => {
      const provider = Zotero.PDFerret.getActiveProvider()
      expect(provider).toBeDefined()
      expect(provider.id).toBe('scihub')
    })

    it('isAutomaticPdfDownload returns true by default', () => {
      const automatic = Zotero.PDFerret.isAutomaticPdfDownload()
      expect(automatic).toBe(true)
    })

    it('isAutomaticPdfDownload respects preference', () => {
      Zotero.Prefs.set('pdferret.automatic_pdf_download', false)
      const automatic = Zotero.PDFerret.isAutomaticPdfDownload()
      expect(automatic).toBe(false)
    })
  })
})
