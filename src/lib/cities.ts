// Şehir renk kodlaması sistemi

export const CITIES = {
  antalya: {
    name: 'Antalya',
    color: 'blue',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    borderColor: 'border-blue-200',
    badgeColor: 'bg-blue-500 text-white',
    cardBorder: 'border-l-blue-500',
    hoverColor: 'hover:bg-blue-50',
    icon: '🏖️'
  },
  bursa: {
    name: 'Bursa',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    borderColor: 'border-green-200',
    badgeColor: 'bg-green-500 text-white',
    cardBorder: 'border-l-green-500',
    hoverColor: 'hover:bg-green-50',
    icon: '🌿'
  },
  eskisehir: {
    name: 'Eskişehir',
    color: 'yellow',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    borderColor: 'border-yellow-200',
    badgeColor: 'bg-yellow-500 text-white',
    cardBorder: 'border-l-yellow-500',
    hoverColor: 'hover:bg-yellow-50',
    icon: '🎭'
  }
} as const

export type CityKey = keyof typeof CITIES

export const getCityInfo = (cityKey: string) => {
  return CITIES[cityKey as CityKey] || CITIES.antalya // Default to Antalya
}

export const getCityOptions = () => {
  return Object.entries(CITIES).map(([key, value]) => ({
    value: key,
    label: `${value.icon} ${value.name}`,
    name: value.name,
    color: value.color
  }))
}

// Şehir istatistikleri için
export const getCityStats = (technicians: any[]) => {
  const stats = {
    antalya: 0,
    bursa: 0,
    eskisehir: 0
  }

  technicians.forEach(tech => {
    if (tech.city && stats.hasOwnProperty(tech.city)) {
      stats[tech.city as CityKey]++
    }
  })

  return Object.entries(stats).map(([key, count]) => ({
    city: key,
    count,
    info: CITIES[key as CityKey]
  }))
}
