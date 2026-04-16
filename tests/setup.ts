// Test setup - register mocks before tests run
import { vi } from 'vitest'
import { JSDOM } from 'jsdom'

// Set up DOMParser before any other imports
globalThis.DOMParser = new JSDOM().window.DOMParser

// Mock zotero-plugin-toolkit
vi.mock('zotero-plugin-toolkit', () => ({
  UITool: class {
    appendElement(_props: Record<string, unknown>, _container: Element): Node {
      return {} as Node
    }

    unregisterAll(): void {
      // Mock implementation
    }
  },
}))

// Import and set up Zotero mock
import { Zotero } from './zotero.mock'
globalThis.Zotero = Zotero

// Since there is catch-all in the code which raises alerts
globalThis.alert = (m: string) => { throw new Error(m) }
