const KEY = 'crm_settings'

export function getSettings() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {} } catch { return {} }
}

export function saveSettings(s) {
  localStorage.setItem(KEY, JSON.stringify(s))
}

export function getProductNames() {
  return getSettings().productNames || {}
}

export function getExpertNames() {
  return getSettings().expertNames || {}
}
