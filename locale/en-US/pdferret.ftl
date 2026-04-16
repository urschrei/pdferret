# PDFerret Plugin - English (US) Localisation
# See https://projectfluent.org/fluent/guide/ for Fluent syntax

# Menu Labels
pdferret-menu-item = Retrieve PDF
pdferret-menu-collection = Retrieve All Collection PDFs
pdferret-menu-all = Update All PDFs

# Preference Pane
pdferret-prefs-title = PDF Provider Settings
pdferret-prefs-automatic =
    .label = Automatic PDF Download
pdferret-prefs-force-redownload =
    .label = Force re-download (add another attachment even if a PDF or EPUB already exists)
pdferret-prefs-provider-label =
    .value = Provider:
pdferret-prefs-provider-url-label = { $provider } URL:
pdferret-prefs-provider-url-help = URL template for { $provider }. Use {"{DOI}"} as placeholder for the DOI.

# Custom Providers Section
pdferret-prefs-custom-title = Custom Providers
pdferret-prefs-custom-help = Add custom PDF providers. These are registered as Zotero PDF resolvers. Use {"{DOI}"} as placeholder for the DOI in the URL template.

    Examples from built-in providers:
    - Sci-Hub: Selector = embed[type="application/pdf"], Attribute = src
    - Anna's Archive: Selector = a[href*="/slow_download"], Attribute = href
pdferret-prefs-custom-empty = No custom providers configured.
pdferret-prefs-custom-name =
    .value = Name:
pdferret-prefs-custom-url =
    .value = URL Template:
pdferret-prefs-custom-selector =
    .value = CSS Selector:
pdferret-prefs-custom-selector-help = CSS selector to find the PDF element on the page (e.g. a[href*=".pdf"], #download-btn)
pdferret-prefs-custom-attribute =
    .value = Attribute:
pdferret-prefs-custom-attribute-help = HTML attribute containing the PDF URL (usually "href" for links or "src" for embeds)
pdferret-prefs-btn-cancel =
    .label = Cancel
pdferret-prefs-btn-save =
    .label = Save
pdferret-prefs-btn-delete = Delete
pdferret-prefs-btn-add =
    .label = + Add Custom Provider

# Retrieval Progress
pdferret-retrieval-skipped = Skipped { $count } item(s) with existing PDF or EPUB attachments
pdferret-retrieval-force-summary = Force re-download: { $succeeded } succeeded, { $failed } failed

# Validation Messages
pdferret-validation-name-required = Please enter a provider name.
pdferret-validation-url-required = Please enter a URL template.
pdferret-validation-url-doi = URL template must contain {"{DOI}"} placeholder.
pdferret-validation-selector-required = Please enter a CSS selector.
