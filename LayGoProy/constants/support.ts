/** Configuración de soporte y contacto */
export const SupportConfig = {
  whatsappNumber: '5197050403',
  whatsappDisplay: '+51 970 504 03',
  supportEmail: 'soporte@fritolay.com.pe',
  companyName: 'Frito-Lay Perú',
};


export const buildWhatsAppUrl = (message?: string): string => {
  const base = `https://wa.me/${SupportConfig.whatsappNumber}`;
  if (message) {
    return `${base}?text=${encodeURIComponent(message)}`;
  }
  return base;
};
