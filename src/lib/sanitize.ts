// Minimal HTML sanitiser for merchant-authored rich text from Shopify (policy bodies). Shopify already
// controls who can write this content; this is defence in depth so nothing executable reaches the page.
const DROP = 'script,style,iframe,frame,frameset,object,embed,form,input,button,textarea,select,link,meta,base,svg,math'
const URL_ATTRS = ['href', 'src', 'xlink:href', 'action', 'formaction', 'poster']

export function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  doc.body.querySelectorAll(DROP).forEach(el => el.remove())
  doc.body.querySelectorAll('*').forEach(el => {
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase()
      // Drop whitespace and control characters, which browsers ignore inside a URL scheme ("java\tscript:").
      const value = [...attr.value].filter(c => c > ' ').join('').toLowerCase()
      if (name.startsWith('on') || name === 'style' || name === 'srcdoc') el.removeAttribute(attr.name)
      else if (URL_ATTRS.includes(name) && /^(javascript|vbscript|data):/.test(value)) el.removeAttribute(attr.name)
    }
    if (el.tagName === 'A' && el.getAttribute('target') === '_blank') el.setAttribute('rel', 'noopener noreferrer')
  })
  return doc.body.innerHTML
}
