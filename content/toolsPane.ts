import type { IZotero } from '../typings/zotero'

declare const Zotero: IZotero

class ToolsPane {
  public async updateAll(): Promise<void> {
    const allItems = await Zotero.Items.getAll()
    const items = allItems.filter(item => {
      const libraryId = item.getField('libraryID')
      const isProcessable = item.isRegularItem()
      const isEditable: boolean = libraryId === null || libraryId === '' || Zotero.Libraries.isEditable(libraryId)

      return isProcessable && isEditable
    })

    if (items.length > 0) {
      await Zotero.PDFerret.retrieveForItems(items)
    }
  }
}

export { ToolsPane }
