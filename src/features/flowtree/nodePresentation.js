const categoryIcons = {
  needs: 'account_balance_wallet',
  obligations: 'account_balance',
  provisions: 'emergency',
  protection: 'shield',
  tax: 'calendar_month',
  goals: 'flag',
  growth: 'trending_up',
}

const categoryColors = {
  needs: '#2563eb',
  obligations: '#7c3aed',
  provisions: '#d97706',
  protection: '#dc2626',
  tax: '#0891b2',
  goals: '#db2777',
  growth: '#16a34a',
}

function identityFor(item) {
  return `${item?.id || ''} ${item?.name || ''}`.toLowerCase()
}

export function iconForNode(item) {
  if (item?.symbol) return item.symbol
  if (categoryIcons[item?.id]) return categoryIcons[item.id]
  const identity = identityFor(item)
  if (/google drive/.test(identity)) return 'cloud'
  if (/apple one/.test(identity)) return 'devices'
  if (/gpt/.test(identity)) return 'smart_toy'
  if (/netflix/.test(identity)) return 'movie'
  if (/amazon prime|prime video/.test(identity)) return 'local_shipping'
  if (/spotify/.test(identity)) return 'headphones'
  if (/youtube premium/.test(identity)) return 'play_circle'
  if (/disney\+|disney plus/.test(identity)) return 'castle'
  if (/microsoft 365|office 365/.test(identity)) return 'grid_view'
  if (/hotstar/.test(identity)) return 'live_tv'
  if (/audible/.test(identity)) return 'hearing'
  if (/kindle/.test(identity)) return 'auto_stories'
  if (/dropbox/.test(identity)) return 'folder_copy'
  if (/subscriptions?/.test(identity)) return 'subscriptions'
  if (/current bill|property tax|tax /.test(identity)) return 'receipt_long'
  if (/mobile|recharge|phone/.test(identity)) return 'smartphone'
  if (/loan|emi|debt/.test(identity)) return 'currency_rupee'
  if (/personal insurance|health/.test(identity)) return 'health_and_safety'
  if (/car insurance/.test(identity)) return 'directions_car'
  if (/bike insurance/.test(identity)) return 'two_wheeler'
  if (/insurance|risk protection|protection/.test(identity)) return 'shield'
  if (/recurring deposit|emergency rd/.test(identity)) return 'savings'
  if (/emergency/.test(identity)) return 'emergency'
  if (/cash flow|essentials|needs/.test(identity)) return 'home'
  if (/goal/.test(identity)) return 'flag'
  if (/growth|investment/.test(identity)) return 'trending_up'
  return 'savings'
}

export function colorForNode(item) {
  if (categoryColors[item?.id]) return categoryColors[item.id]
  const identity = identityFor(item)
  if (/google drive/.test(identity)) return '#4285f4'
  if (/apple one/.test(identity)) return '#475569'
  if (/gpt/.test(identity)) return '#10a37f'
  if (/netflix/.test(identity)) return '#e50914'
  if (/amazon prime|prime video/.test(identity)) return '#ff9900'
  if (/spotify/.test(identity)) return '#1db954'
  if (/youtube premium/.test(identity)) return '#ff0000'
  if (/disney\+|disney plus/.test(identity)) return '#113ccf'
  if (/microsoft 365|office 365/.test(identity)) return '#d83b01'
  if (/hotstar/.test(identity)) return '#1f80e0'
  if (/audible|kindle/.test(identity)) return '#f59e0b'
  if (/subscriptions?/.test(identity)) return '#4f46e5'
  if (/current bill|property tax|tax /.test(identity)) return '#b45309'
  if (/mobile|recharge|phone/.test(identity)) return '#0284c7'
  if (/loan|emi|debt/.test(identity)) return '#9333ea'
  if (/personal insurance|health/.test(identity)) return '#e11d48'
  if (/car insurance/.test(identity)) return '#2563eb'
  if (/bike insurance/.test(identity)) return '#f97316'
  if (/insurance|risk protection|protection/.test(identity)) return '#dc2626'
  if (/recurring deposit|emergency rd/.test(identity)) return '#059669'
  if (/emergency/.test(identity)) return '#d97706'
  return '#64748b'
}
