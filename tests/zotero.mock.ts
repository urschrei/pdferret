import { vi } from 'vitest'
import { IZotero, ZoteroItem, ZoteroObserver, ProgressWindow } from '../typings/zotero'
import { regularItem1, regularItem2 } from './zoteroItem.mock'

const progressWindowSpy = vi.fn()

// Create mockable HTTP request function
const httpRequestMock = vi.fn()

const addAvailableFilesSpy = vi.fn()
const addFileFromURLsSpy = vi.fn()
const canFindFileForItemMock = vi.fn(() => true)

const Zotero: IZotero = new class {
  public PDFerret
  public initialized = true

  public debug(_msg: string) { return }
  public logError(_err: Error | string) { return }
  public launchURL(_url: string) { return }
  public getMainWindow() { return null }
  public getActiveZoteroPane() { return null }
  public setTimeout(fn: () => void, _ms: number) { fn(); return 1 }
  public clearTimeout(_id: number) { return }

  public Notifier: IZotero['Notifier'] = new class {
    public registerObserver(_observer: ZoteroObserver, _types: string[], _id: string, _priority?: number) {
      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      return 42
    }
    public unregisterObserver(_id: number) { return }
  }

  public Prefs = new class {
    private prefs: Record<string, string | number | boolean> = {}

    public get(pref: string, _global?: boolean): string | number | boolean {
      return this.prefs[pref]
    }

    public set(pref: string, value: string | number | boolean, _global?: boolean) {
      this.prefs[pref] = value
    }

    public clear() {
      this.prefs = {}
    }
  }

  Items = new class {
    public get(_id: number): ZoteroItem | null {
      return null  // Return null to simulate no PDF attachments
    }

    public async getAsync(ids: number | number[]): Promise<any> {
      if (Array.isArray(ids)) {
        return Promise.resolve([regularItem1, regularItem2])
      } else {
        return Promise.resolve(regularItem1)
      }
    }

    public async getAll(): Promise<ZoteroItem[]> {
      return Promise.resolve([regularItem1, regularItem2])
    }
  }

  public HTTP = {
    request: httpRequestMock,
  }

  public Attachments = new class {
    public async importFromURL(_options: Record<string, any>): Promise<ZoteroItem> {
      return Promise.resolve(regularItem1)
    }

    public async addAvailableFiles(items: ZoteroItem[]): Promise<void> {
      addAvailableFilesSpy(items)
      return Promise.resolve()
    }

    public async addFileFromURLs(item: ZoteroItem, _urlResolvers: unknown[]): Promise<ZoteroItem | false> {
      addFileFromURLsSpy(item)
      return Promise.resolve(item)
    }

    public getFileResolvers(_item: ZoteroItem): unknown[] {
      return []
    }

    public canFindFileForItem(_item: ZoteroItem): boolean {
      return canFindFileForItemMock()
    }
  }

  public Libraries = new class {
    public isEditable(_libraryId: string): boolean { return true }
  }

  public ProgressWindow = class implements ProgressWindow {
    public changeHeadline(headline: string, _icon?: string, _postText?: string) {
      progressWindowSpy(headline)
    }
    public addDescription(_body: string) { return }
    public startCloseTimer(_millis: number) { return }
    public show() { return }
  }

  public PreferencePanes = new class {
    public async register(_options: {
      pluginID: string
      src: string
      label: string
      image?: string
    }): Promise<void> {
      return Promise.resolve()
    }
  }
}

export { Zotero, progressWindowSpy, httpRequestMock, addAvailableFilesSpy, addFileFromURLsSpy, canFindFileForItemMock }
