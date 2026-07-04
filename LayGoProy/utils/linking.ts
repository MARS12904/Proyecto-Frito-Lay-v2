import { Alert, Linking } from 'react-native';
import { buildWhatsAppUrl, SupportConfig } from '@/constants/support';

export async function openWhatsApp(message?: string): Promise<boolean> {
  const url = buildWhatsAppUrl(message);
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return true;
    }
    Alert.alert(
      'WhatsApp no disponible',
      `Escríbenos al ${SupportConfig.whatsappDisplay} o envía un correo a ${SupportConfig.supportEmail}.`
    );
    return false;
  } catch {
    Alert.alert('Error', 'No se pudo abrir WhatsApp. Intenta de nuevo.');
    return false;
  }
}

export async function openSupportWhatsApp(userName?: string): Promise<void> {
  const greeting = userName
    ? `Hola, soy ${userName}, comerciante de Frito-Lay. Necesito ayuda con mi pedido.`
    : 'Hola, soy comerciante de Frito-Lay. Necesito ayuda con mi pedido.';
  await openWhatsApp(greeting);
}
