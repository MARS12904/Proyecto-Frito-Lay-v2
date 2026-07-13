/**
 * Sistema de imágenes para productos Frito-Lay
 * Maneja las imágenes locales y URLs de productos
 */

// Importaciones de imágenes locales (descomenta cuando tengas las imágenes)
// import laysClassic from '../assets/images/products/lays-classic-150g.png';
// import laysQueso from '../assets/images/products/lays-queso-150g.png';
// import laysCebolla from '../assets/images/products/lays-cebolla-150g.png';
// import laysBarbacoa from '../assets/images/products/lays-barbacoa-150g.png';
// import doritosNacho from '../assets/images/products/doritos-nacho-150g.png';
// import doritosCoolRanch from '../assets/images/products/doritos-cool-ranch-150g.png';
// import doritosFlamas from '../assets/images/products/doritos-flamas-150g.png';
// import cheetosQueso from '../assets/images/products/cheetos-queso-150g.png';
// import cheetosPuffs from '../assets/images/products/cheetos-puffs-150g.png';
// import rufflesQueso from '../assets/images/products/ruffles-queso-150g.png';
// import rufflesCrema from '../assets/images/products/ruffles-crema-150g.png';
// import fritosOriginal from '../assets/images/products/fritos-original-150g.png';
// import tostitosSalsaVerde from '../assets/images/products/tostitos-salsa-verde-150g.png';
// import sabritasAdobadas from '../assets/images/products/sabritas-adobadas-150g.png';
// import gatoradeNaranja from '../assets/images/products/gatorade-naranja-500ml.png';

// URLs de imágenes específicas para productos Frito-Lay Perú
const PRODUCT_IMAGES = {
  // Lay's Perú
  'lays-clasico-150g': 'https://metroio.vtexassets.com/arquivos/ids/538568/PAPAS-LAYS-CLASICAS-BOLSA-36G-4-266694.jpg?v=638580441667570000',
  'lays-queso-150g': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRFwNVlWqmdL8thmmehdvLzjQ21VIaj8Q_pQQ&s',
  'lays-ondas-picante-150g': 'https://metroio.vtexassets.com/arquivos/ids/542892-800-auto?v=638611545675030000&width=800&height=auto&aspect=true',
  'lays-cebolla-150g': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTGmjnYBYL4SGthtLIniAAcyg9H8bP-P2j-_8HGzHOLgXslxI1HIBHhONs&s=10',
  'lays-barbacoa-edicion-limitada-150g': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRxrDseo9r2MdQOKPm_pVc5h4AFtmK3SbyA31Y8zzTB3O1pePsxJ3SkpOuO&s=10',

  // Doritos Perú
  'doritos-nacho-cheese-145g': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRVWFFEn71TrjFkWUGB0d4p0zPdJ5Dx7yp3og&s',
  'doritos-cool-ranch-145g': 'https://www.tastyrewards.com/sites/default/files/2024-02/Doritos_CoolRanch.jpg',
  'doritos-flamin-hot-145g': 'https://www.dia.es/content-manager/image/Carpeta_IMG_landings_proveedores/landingpepsi_DORITOS_20240401.png',
  'doritos-fuego-145g': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQb5xVkjzzGb059KOEowuMRnVAeaHwk0EiAGA&s',
  'doritos-dinamita-145g': 'https://metroio.vtexassets.com/arquivos/ids/537706/Doritos-Dinamita-Flamin-Hot-35g-4-246943.jpg?v=638576121910930000',

  // Cheetos Perú
  'cheetos-queso-clasico-150g': 'https://m.media-amazon.com/images/S/al-eu-726f4d26-7fdb/8e62b18c-e077-487c-be0a-6b135896315d._CR117%2C0%2C750%2C750_SX750_SY750_.png',
  'cheetos-picante-150g': 'https://metroio.vtexassets.com/arquivos/ids/537703-800-auto?v=638576121899700000&width=800&height=auto&aspect=true',
  'cheetos-flamin-hot-150g': 'https://vegaperu.vtexassets.com/arquivos/ids/162353/cheetos.jpg?v=638101061249330000',
  'cheetos-mega-queso-150g': 'https://media.falabella.com/tottusPE/43081753_4/w=800,h=800,fit=pad',

  // Cheese Tris / Chizitos
  'cheese-tris-queso-150g': 'https://static.wixstatic.com/media/921600_ef1ccea6c11a44348d9dc3f0ae3d76f3~mv2.webp/v1/fill/w_480,h_480,al_c,lg_1,q_80,enc_avif,quality_auto/921600_ef1ccea6c11a44348d9dc3f0ae3d76f3~mv2.webp',
  'chizitos-queso-natural-150g': 'https://vegaperu.vtexassets.com/arquivos/ids/157503/7758574001857.jpg?v=637618919546330000',

  // Piqueo Snax
  'piqueo-snax-mix-clasico-145g': 'https://plazavea.vteximg.com.br/arquivos/ids/34750398-1000-1000/20179461.jpg?v=639154116733830000',
  'piqueo-snax-picante-mixto-145g': 'https://metroio.vtexassets.com/arquivos/ids/649242/Piqueo-Snax-Queso-Picante-190g-1-353126.jpg?v=639162778791400000',

  // Cuates
  'cuates-natural-150g': 'https://sumerlabs.com/default/image-tool-lambda?new-width=700&new-height=700&new-quality=80&url-image=https%3A%2F%2Fsumerlabs.com%2Fsumer-app-90b8f.appspot.com%2Fproduct_photos%252F9db380ea5b886789745a6a04080c0408%252Fscaled_image_picker4497447116931694703.jpg%3Falt%3Dmedia%26token%3D1b83c3d5-5273-469a-8d5a-7152f371dd6c',
  'cuates-picante-150g': 'https://mir-s3-cdn-cf.behance.net/projects/404/95975d227105509.Y3JvcCw4MDgsNjMyLDAsMA.png',
  'cuates-rancherito-150g': 'https://images.rappi.pe/products/1753480500830_1753480497510_1753480495452.jpeg',
};

// Mapeo de imágenes locales (descomenta cuando tengas las imágenes)
// const LOCAL_IMAGES = {
//   'lays-classic-150g': laysClassic,
//   'lays-queso-150g': laysQueso,
//   'lays-cebolla-150g': laysCebolla,
//   'lays-barbacoa-150g': laysBarbacoa,
//   'doritos-nacho-150g': doritosNacho,
//   'doritos-cool-ranch-150g': doritosCoolRanch,
//   'doritos-flamas-150g': doritosFlamas,
//   'cheetos-queso-150g': cheetosQueso,
//   'cheetos-puffs-150g': cheetosPuffs,
//   'ruffles-queso-150g': rufflesQueso,
//   'ruffles-crema-150g': rufflesCrema,
//   'fritos-original-150g': fritosOriginal,
//   'tostitos-salsa-verde-150g': tostitosSalsaVerde,
//   'sabritas-adobadas-150g': sabritasAdobadas,
//   'gatorade-naranja-500ml': gatoradeNaranja,
// };

/**
 * Obtiene la imagen de un producto por su ID
 * @param productId - ID del producto
 * @param useLocal - Si usar imágenes locales (true) o URLs (false)
 * @returns URI de la imagen
 */
export const getProductImage = (productId: string, useLocal: boolean = false): string => {
  // Si tienes imágenes locales, descomenta esta línea:
  // if (useLocal && LOCAL_IMAGES[productId as keyof typeof LOCAL_IMAGES]) {
  //   return LOCAL_IMAGES[productId as keyof typeof LOCAL_IMAGES];
  // }
  
  // Por ahora, siempre usa URLs
  return PRODUCT_IMAGES[productId as keyof typeof PRODUCT_IMAGES] || 
         'https://via.placeholder.com/400x400/E31E24/FFFFFF?text=Imagen+No+Disponible';
};

/**
 * Obtiene todas las imágenes de productos
 * @param useLocal - Si usar imágenes locales (true) o URLs (false)
 * @returns Objeto con todas las imágenes
 */
export const getAllProductImages = (useLocal: boolean = false): Record<string, string> => {
  const images: Record<string, string> = {};
  
  Object.keys(PRODUCT_IMAGES).forEach(productId => {
    images[productId] = getProductImage(productId, useLocal);
  });
  
  return images;
};

/**
 * Verifica si una imagen existe
 * @param productId - ID del producto
 * @returns true si la imagen existe
 */
export const hasProductImage = (productId: string): boolean => {
  return productId in PRODUCT_IMAGES;
};

/**
 * Obtiene una imagen de placeholder personalizada
 * @param productName - Nombre del producto
 * @param brand - Marca del producto
 * @returns URL de placeholder personalizada
 */
export const getPlaceholderImage = (productName: string, brand: string): string => {
  const encodedName = encodeURIComponent(`${brand} ${productName}`);
  return `https://via.placeholder.com/400x400/E31E24/FFFFFF?text=${encodedName}`;
};
