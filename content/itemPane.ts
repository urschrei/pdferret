import type { ZoteroItem, IZotero, IZoteroPane } from '../typings/zotero'
declare const Zotero: IZotero

function getZoteroPane(): IZoteroPane | null {
  return Zotero.getActiveZoteroPane?.() ?? null
}

class ItemPane {
  public async updateSelectedEntity(_libraryId: string): Promise<void> {
    const zoteroPane = getZoteroPane()
    if (!zoteroPane) return

    if (!zoteroPane.canEdit()) {
      zoteroPane.displayCannotEditLibraryMessage()
      return
    }

    const collection = zoteroPane.getSelectedCollection(false)
    if (collection) {
      const items = collection.getChildItems(false, false) as ZoteroItem[]
      await Zotero.PDFerret.retrieveForItems(items)
    }
  }

  public async updateSelectedItems(): Promise<void> {
    try {
      const zoteroPane = getZoteroPane()
      if (!zoteroPane) return

      const items = zoteroPane.getSelectedItems() as ZoteroItem[]
      if (items && items.length > 0) {
        await Zotero.PDFerret.retrieveForItems(items)
      }
    } catch (err) {
      Zotero.logError(err as Error)
    }
  }
}

export { ItemPane }
