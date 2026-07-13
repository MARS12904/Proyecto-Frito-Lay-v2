/** Configuración de soporte y contacto */
export const SupportConfig = {
  whatsappNumber: '51993164045',
  whatsappDisplay: '+51 993 164 045',
  supportEmail: 'mars12904@gmail.com',
  companyName: 'Frito-Lay Perú',
};


export const buildWhatsAppUrl = (message?: string): string => {
  const base = `https://wa.me/${SupportConfig.whatsappNumber}`;
  if (message) {
    return `${base}?text=${encodeURIComponent(message)}`;
  }
  return base;
};
