/** Configuración y catálogo de métodos de pago peruanos */

export const PAYMENT_LINK_URL = 'https://payments.example.com/checkout';

export type PaymentMethodType =
  | 'card'
  | 'yape'
  | 'plin'
  | 'transfer'
  | 'deposit'
  | 'cash'
  | 'credit';

export interface PaymentTypeOption {
  id: PaymentMethodType;
  label: string;
  description: string;
  icon: string;
  color: string;
}

export const PERU_PAYMENT_TYPES: PaymentTypeOption[] = [
  {
    id: 'yape',
    label: 'Yape',
    description: 'Billetera digital BCP',
    icon: 'phone-portrait-outline',
    color: '#6B21A8',
  },
  {
    id: 'plin',
    label: 'Plin',
    description: 'Transferencias instantáneas',
    icon: 'flash-outline',
    color: '#00A859',
  },
  {
    id: 'card',
    label: 'Tarjeta',
    description: 'Débito o crédito Visa/Mastercard',
    icon: 'card-outline',
    color: '#004B87',
  },
  {
    id: 'transfer',
    label: 'Transferencia',
    description: 'Cuenta bancaria (CCI)',
    icon: 'business-outline',
    color: '#E31E24',
  },
  {
    id: 'deposit',
    label: 'Depósito',
    description: 'Agente o ventanilla bancaria',
    icon: 'storefront-outline',
    color: '#FF8C00',
  },
  {
    id: 'cash',
    label: 'Efectivo',
    description: 'Pago contra entrega',
    icon: 'cash-outline',
    color: '#228B22',
  },
  {
    id: 'credit',
    label: 'Crédito Comercial',
    description: 'Línea de crédito Frito-Lay',
    icon: 'document-text-outline',
    color: '#004B87',
  },
];

export const PERU_BANKS = [
  'BCP - Banco de Crédito del Perú',
  'BBVA Perú',
  'Interbank',
  'Scotiabank Perú',
  'BanBif',
  'Banco de la Nación',
  'MiBanco',
  'Pichincha',
  'Falabella',
  'Ripley',
  'Otro',
];

export const DOCUMENT_TYPES = [
  { id: 'dni', label: 'DNI' },
  { id: 'ruc', label: 'RUC' },
  { id: 'ce', label: 'Carné de Extranjería' },
];

export const getPaymentTypeLabel = (type: PaymentMethodType): string => {
  return PERU_PAYMENT_TYPES.find((t) => t.id === type)?.label ?? type;
};

/** Valida número de celular peruano (9 dígitos, empieza en 9) */
export const validatePeruPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  const normalized = cleaned.startsWith('51') ? cleaned.slice(2) : cleaned;
  return /^9\d{8}$/.test(normalized);
};

/** Valida CCI peruano (20 dígitos) */
export const validateCCI = (cci: string): boolean => {
  return /^\d{20}$/.test(cci.replace(/\s/g, ''));
};

/** Valida DNI (8 dígitos) */
export const validateDNI = (dni: string): boolean => {
  return /^\d{8}$/.test(dni);
};

/** Valida RUC (11 dígitos, empieza en 10 o 20) */
export const validateRUC = (ruc: string): boolean => {
  return /^(10|20)\d{9}$/.test(ruc);
};
