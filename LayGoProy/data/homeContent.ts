/** Contenido promocional para la pantalla de inicio estilo delivery */

export interface HomePromo {
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
  gradient: [string, string];
  categoryId?: string;
}

export interface HomeOffer {
  id: string;
  label: string;
  discount: string;
  description: string;
  icon: string;
}

export const homePromos: HomePromo[] = [
  {
    id: 'promo-mayorista',
    title: 'Precios Mayoristas',
    subtitle: 'Hasta 20% de ahorro en reabastecimiento de tu bodega',
    badge: 'Comerciantes',
    gradient: ['#E31E24', '#B8181D'],
    categoryId: 'papas',
  },
  {
    id: 'promo-nuevos',
    title: 'Novedades Frito Lay',
    subtitle: 'Lay\'s Barbacoa y Doritos Flamin\' Hot ya disponibles',
    badge: 'Nuevo',
    gradient: ['#004B87', '#003366'],
  },
  {
    id: 'promo-piqueo',
    title: 'Mix Piqueo Snax',
    subtitle: 'Variedad de sabores en un solo pedido',
    badge: 'Oferta',
    gradient: ['#FF8C00', '#E67300'],
    categoryId: 'piqueo',
  },
  {
    id: 'promo-doritos',
    title: 'Semana Doritos',
    subtitle: 'Lleva 24 bolsas y obtén precio especial mayorista',
    badge: '-15%',
    gradient: ['#FFD700', '#E6C200'],
    categoryId: 'doritos',
  },
];

export const quickOffers: HomeOffer[] = [
  { id: '1', label: 'Lay\'s', discount: '20% off', description: 'En pedidos +24 bolsas', icon: '🥔' },
  { id: '2', label: 'Doritos', discount: '15% off', description: 'Precio comerciante', icon: '🌽' },
  { id: '3', label: 'Cheetos', discount: '2x1', description: 'En sabores seleccionados', icon: '🧀' },
  { id: '4', label: 'Piqueo', discount: 'S/ 4.00', description: 'Precio mayorista', icon: '🥨' },
];
