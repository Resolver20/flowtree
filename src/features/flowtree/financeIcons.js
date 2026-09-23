// One Material Symbols family, grouped around the financial-planning areas used
// throughout Flowtree. Labels stay concrete so the native picker is easy to scan.
export const FINANCE_ICON_GROUPS = [
  { label: 'Cash and banking', options: [
    ['account_balance_wallet', 'Wallet'], ['account_balance', 'Bank'], ['payments', 'Cash'],
    ['savings', 'Savings'], ['currency_rupee', 'Rupees'], ['paid', 'Income'],
    ['credit_card', 'Credit card'], ['contactless', 'Digital payment'], ['currency_exchange', 'Currency exchange'],
  ] },
  { label: 'Income and work', options: [
    ['work', 'Salary'], ['business_center', 'Business'], ['storefront', 'Small business'],
    ['request_quote', 'Invoice'], ['redeem', 'Bonus or reward'], ['handyman', 'Freelance work'],
  ] },
  { label: 'Bills and everyday spending', options: [
    ['receipt_long', 'Bill or receipt'], ['shopping_cart', 'Groceries'], ['restaurant', 'Food'],
    ['local_cafe', 'Coffee'], ['shopping_bag', 'Shopping'], ['smartphone', 'Phone'],
    ['wifi', 'Internet'], ['bolt', 'Electricity'], ['water_drop', 'Water'],
    ['subscriptions', 'Subscription'], ['movie', 'Entertainment'],
  ] },
  { label: 'Subscriptions and memberships', options: [
    ['local_shipping', 'Amazon Prime'], ['movie', 'Netflix'], ['headphones', 'Spotify or music'],
    ['play_circle', 'YouTube Premium'], ['castle', 'Disney+'], ['devices', 'Apple One'],
    ['cloud', 'Google One or Drive'], ['smart_toy', 'ChatGPT or AI tool'], ['grid_view', 'Microsoft 365'],
    ['cloud_sync', 'iCloud'], ['folder_copy', 'Dropbox'], ['auto_stories', 'Kindle Unlimited'],
    ['hearing', 'Audible or audiobooks'], ['live_tv', 'Hotstar or live TV'], ['theaters', 'Cinema streaming'],
    ['sports_cricket', 'Sports streaming'], ['sports_esports', 'Gaming membership'], ['newspaper', 'News subscription'],
    ['terminal', 'Software or developer tool'], ['vpn_lock', 'VPN or security'], ['fitness_center', 'Gym membership'],
    ['delivery_dining', 'Food membership'], ['local_taxi', 'Ride membership'], ['wifi', 'Internet plan'],
  ] },
  { label: 'Housing and property', options: [
    ['home', 'Home'], ['apartment', 'Apartment'], ['real_estate_agent', 'Mortgage or property'],
    ['key', 'Rent'], ['construction', 'Home improvement'], ['weekend', 'Home furnishings'],
  ] },
  { label: 'Debt and commitments', options: [
    ['credit_score', 'Loan or credit'], ['price_check', 'Repayment'], ['event_repeat', 'Recurring payment'],
    ['balance', 'Financial obligation'], ['contract', 'Contract'],
  ] },
  { label: 'Emergency and protection', options: [
    ['emergency', 'Emergency fund'], ['shield', 'Insurance'], ['health_and_safety', 'Health insurance'],
    ['medical_services', 'Medical'], ['directions_car', 'Car insurance'], ['two_wheeler', 'Bike insurance'],
    ['home_work', 'Home insurance'], ['family_restroom', 'Family protection'],
  ] },
  { label: 'Tax and administration', options: [
    ['calculate', 'Tax'], ['calendar_month', 'Due date'], ['description', 'Document'],
    ['gavel', 'Legal'], ['assured_workload', 'Government'], ['badge', 'Identification'],
  ] },
  { label: 'Goals and life events', options: [
    ['flag', 'Goal'], ['track_changes', 'Target'], ['school', 'Education'],
    ['flight', 'Travel'], ['celebration', 'Celebration'], ['favorite', 'Wedding or relationship'],
    ['child_care', 'Children'], ['pets', 'Pet'], ['volunteer_activism', 'Giving'],
  ] },
  { label: 'Investing and retirement', options: [
    ['trending_up', 'Investment growth'], ['show_chart', 'Stocks'], ['pie_chart', 'Portfolio'],
    ['monitoring', 'Performance'], ['token', 'Digital asset'], ['diamond', 'Valuables'],
    ['elderly', 'Retirement'], ['beach_access', 'Retirement lifestyle'],
  ] },
  { label: 'Transport and mobility', options: [
    ['directions_car', 'Car'], ['two_wheeler', 'Motorbike'], ['directions_bus', 'Bus'],
    ['train', 'Train'], ['flight', 'Flight'], ['local_gas_station', 'Fuel'],
    ['build', 'Vehicle maintenance'],
  ] },
  { label: 'Health and lifestyle', options: [
    ['health_and_safety', 'Healthcare'], ['fitness_center', 'Fitness'], ['self_improvement', 'Wellbeing'],
    ['spa', 'Personal care'], ['sports_esports', 'Gaming'], ['menu_book', 'Books'],
  ] },
]

export const FINANCE_ICON_VALUES = new Set(FINANCE_ICON_GROUPS.flatMap(group => group.options.map(([value]) => value)))
