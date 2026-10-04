// Applies the saved (or system) theme before first paint, to avoid a flash.
// A separate file rather than an inline script, so the CSP needs no hash.
;(function () {
  var theme = 'light'
  try {
    var saved = localStorage.getItem('resumy:theme')
    if (saved === 'light' || saved === 'dark') theme = saved
    else if (window.matchMedia('(prefers-color-scheme: dark)').matches) theme = 'dark'
  } catch {
    // Storage can be blocked; the light theme is a safe default.
  }
  document.documentElement.dataset.theme = theme
})()
