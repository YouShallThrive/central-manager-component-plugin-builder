# snippets/ - reusable fixes (not loaded)

Nothing in this folder runs. PHP hook files go into a site's `wp-content/plugins/yst-manager/custom/` folder (they auto-load there); CSS goes where its section says. Adjust the values listed below, then purge the cache. Never put one site's specific code in the core plugin.

## wpforms-scroll-header-offset.php

Stops a fixed header (and the admin bar) from covering a WPForms confirmation message or validation error after submit. WPForms scrolls the message to 100px below the top of the window; this subtracts the header height from every WPForms scroll.

Adjust per site:
- `.fusion-tb-header .fusion-sticky-container` is the fixed header element (Avada layout-section header). Change it to the site's fixed header selector.
- `fusion-container-stuck` is the class the header gets when it is fixed and floating. Change it to the site's active class.

Check: submit the form with a required field empty and with valid data at 1920, 768 and 425px; the message must clear the header.

Origin: the Asana template task "IF site has fixed header, check if header overlaps content on Form Submissions" (YST AI Systems project), adapted from `scroll-top-v1.txt` to a YST Manager hook on `wpforms_wp_footer_end`.

## wpforms-loading-indicator-hidden-submit.css

Shows WPForms' own spinner while a form sends, for forms whose native submit button is hidden and submitted by a custom button (`requestSubmit()`). WPForms adds `wpforms-loading` to `.wpforms-container` during the AJAX request and shows `.wpforms-submit-spinner` inside the submit container; if page CSS hides that container (`.wpforms-submit-container{display:none}`) nobody sees it.

Use: paste into the page's CSS (for example the Avada Code Block's `<style>`), not a YST Manager hook. Change `.sa-form-grid` to the class on the form's wrapper. Save the page by direct database update or in the builder, never `wp post update` (it strips `<style>` tags).

Check: add the `wpforms-loading` class to the container in dev tools; only the spinner should appear in place of the button, and the form fades to 60%.
