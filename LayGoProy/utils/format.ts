/** Etiqueta corta para pedidos (evita mostrar UUID completo). */
export function formatOrderLabel(orderId: string, orderNumber?: string | null): string {
  if (orderNumber?.trim()) {
    return orderNumber.trim();
  }
  if (orderId.startsWith('FL-') || orderId.startsWith('ORD-')) {
    return orderId;
  }
  const short = orderId.replace(/-/g, '').slice(0, 8).toUpperCase();
  return `#${short}`;
}

/** Primer nombre para saludos en pantallas estrechas. */
export function formatFirstName(fullName?: string): string {
  if (!fullName?.trim()) return 'Comerciante';
  return fullName.trim().split(/\s+/)[0];
}
