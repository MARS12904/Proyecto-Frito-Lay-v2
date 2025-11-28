import { Order } from '../contexts/OrdersContext';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  templateParams?: Record<string, unknown>;
}

/**
 * Convierte el estado del pedido a etiqueta en español
 */
function getStatusLabel(status: Order['status']): string {
  const labels: Record<Order['status'], string> = {
    pending: 'Pendiente',
    confirmed: 'Confirmado',
    preparing: 'En Preparación',
    shipped: 'Enviado',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
  };
  return labels[status] || status;
}

/**
 * Genera el contenido HTML del email de confirmación de pedido
 */
export function generateOrderConfirmationEmail(order: Order, userName: string): string {
  const orderDate = new Date(order.date).toLocaleDateString('es-PE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const itemsHtml = order.items.map(item => `
    <tr style="border-bottom: 1px solid #e0e0e0;">
      <td style="padding: 12px; text-align: left;">
        <strong>${item.name}</strong><br>
        <span style="color: #666; font-size: 12px;">${item.brand}</span>
      </td>
      <td style="padding: 12px; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; text-align: right;">S/ ${item.unitPrice.toFixed(2)}</td>
      <td style="padding: 12px; text-align: right;">
        <strong>S/ ${item.subtotal.toFixed(2)}</strong>
      </td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmación de Pedido</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #E31E24 0%, #C4161A 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                🎉 ¡Pedido Confirmado!
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hola <strong>${userName}</strong>,
              </p>
              
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Gracias por tu compra. Tu pedido ha sido recibido y está siendo procesado.
              </p>
              
              <!-- Order Info -->
              <div style="background-color: #f8f9fa; border-radius: 6px; padding: 20px; margin: 20px 0;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 8px 0;">
                      <strong style="color: #666;">Número de Pedido:</strong>
                      <span style="color: #E31E24; font-size: 18px; font-weight: bold; margin-left: 10px;">
                        ${order.id}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <strong style="color: #666;">Fecha:</strong>
                      <span style="color: #333; margin-left: 10px;">${orderDate}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <strong style="color: #666;">Estado:</strong>
                      <span style="color: #E31E24; font-weight: bold; margin-left: 10px; text-transform: capitalize;">
                        ${getStatusLabel(order.status)}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <strong style="color: #666;">Método de Pago:</strong>
                      <span style="color: #333; margin-left: 10px;">${order.paymentMethod}</span>
                    </td>
                  </tr>
                </table>
              </div>
              
              <!-- Order Items -->
              <h2 style="color: #333; font-size: 20px; margin: 30px 0 15px 0; border-bottom: 2px solid #E31E24; padding-bottom: 10px;">
                Detalles del Pedido
              </h2>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin: 20px 0;">
                <thead>
                  <tr style="background-color: #f8f9fa;">
                    <th style="padding: 12px; text-align: left; color: #666; font-weight: 600;">Producto</th>
                    <th style="padding: 12px; text-align: center; color: #666; font-weight: 600;">Cantidad</th>
                    <th style="padding: 12px; text-align: right; color: #666; font-weight: 600;">Precio Unit.</th>
                    <th style="padding: 12px; text-align: right; color: #666; font-weight: 600;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
              
              <!-- Delivery Info -->
              ${order.deliveryAddress ? `
              <div style="background-color: #e8f4f8; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <h3 style="color: #1976D2; margin: 0 0 10px 0; font-size: 16px;">📦 Información de Entrega</h3>
                <p style="color: #333; margin: 5px 0; font-size: 14px;">
                  <strong>Dirección:</strong> ${order.deliveryAddress}
                </p>
                ${order.deliveryDate ? `
                <p style="color: #333; margin: 5px 0; font-size: 14px;">
                  <strong>Fecha de Entrega:</strong> ${order.deliveryDate}
                </p>
                ` : ''}
                ${order.deliveryTimeSlot ? `
                <p style="color: #333; margin: 5px 0; font-size: 14px;">
                  <strong>Horario:</strong> ${order.deliveryTimeSlot}
                </p>
                ` : ''}
              </div>
              ` : ''}
              
              <!-- Summary -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                ${order.isWholesale && order.savings > 0 ? `
                <tr>
                  <td style="padding: 8px 0; text-align: right; color: #666;">
                    Subtotal:
                  </td>
                  <td style="padding: 8px 0; text-align: right; padding-left: 20px; width: 120px; color: #333;">
                    S/ ${(order.total + order.savings).toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; text-align: right; color: #666;">
                    Descuento Mayorista:
                  </td>
                  <td style="padding: 8px 0; text-align: right; padding-left: 20px; color: #28a745; font-weight: bold;">
                    -S/ ${order.savings.toFixed(2)}
                  </td>
                </tr>
                ` : ''}
                <tr style="border-top: 2px solid #E31E24;">
                  <td style="padding: 15px 0; text-align: right; font-size: 18px; font-weight: bold; color: #333;">
                    Total:
                  </td>
                  <td style="padding: 15px 0; text-align: right; padding-left: 20px; font-size: 20px; font-weight: bold; color: #E31E24;">
                    S/ ${order.total.toFixed(2)}
                  </td>
                </tr>
              </table>
              
              ${order.trackingNumber ? `
              <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="color: #333; margin: 0; font-size: 14px;">
                  <strong>📦 Número de Seguimiento:</strong> ${order.trackingNumber}
                </p>
              </div>
              ` : ''}
              
              <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                Te notificaremos cuando tu pedido esté en camino. Si tienes alguna pregunta, no dudes en contactarnos.
              </p>
              
              <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                ¡Gracias por elegir Frito-Lay Perú!
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="color: #666; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Frito-Lay Perú. Todos los derechos reservados.
              </p>
              <p style="color: #999; font-size: 11px; margin: 10px 0 0 0;">
                Este es un correo automático, por favor no responder.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Genera el contenido de texto plano del email
 */
export function generateOrderConfirmationEmailText(order: Order, userName: string): string {
  const orderDate = new Date(order.date).toLocaleDateString('es-PE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  let text = `¡Pedido Confirmado!\n\n`;
  text += `Hola ${userName},\n\n`;
  text += `Gracias por tu compra. Tu pedido ha sido recibido y está siendo procesado.\n\n`;
  text += `Número de Pedido: ${order.id}\n`;
  text += `Fecha: ${orderDate}\n`;
  text += `Estado: ${getStatusLabel(order.status)}\n`;
  text += `Método de Pago: ${order.paymentMethod}\n\n`;
  text += `Detalles del Pedido:\n`;
  text += `${'='.repeat(50)}\n`;
  
  order.items.forEach(item => {
    text += `${item.name} (${item.brand})\n`;
    text += `  Cantidad: ${item.quantity} x S/ ${item.unitPrice.toFixed(2)} = S/ ${item.subtotal.toFixed(2)}\n`;
  });
  
  text += `\n${'='.repeat(50)}\n`;
  if (order.isWholesale && order.savings > 0) {
    text += `Subtotal: S/ ${(order.total + order.savings).toFixed(2)}\n`;
    text += `Descuento Mayorista: -S/ ${order.savings.toFixed(2)}\n`;
  }
  text += `TOTAL: S/ ${order.total.toFixed(2)}\n\n`;
  
  if (order.deliveryAddress) {
    text += `Información de Entrega:\n`;
    text += `Dirección: ${order.deliveryAddress}\n`;
    if (order.deliveryDate) text += `Fecha: ${order.deliveryDate}\n`;
    if (order.deliveryTimeSlot) text += `Horario: ${order.deliveryTimeSlot}\n`;
    text += `\n`;
  }
  
  if (order.trackingNumber) {
    text += `Número de Seguimiento: ${order.trackingNumber}\n\n`;
  }
  
  text += `Te notificaremos cuando tu pedido esté en camino.\n\n`;
  text += `¡Gracias por elegir Frito-Lay Perú!\n`;
  
  return text;
}

/**
 * Genera HTML para los items (versión simplificada para template)
 */
function generateItemsHtml(items: Order['items']): string {
  return items
    .map(
      (item) => `
      <table style="width:100%; border-collapse:collapse;">
        <tr>
          <td style="padding:12px 0;">
            <div style="font-weight:600;">${item.name}</div>
            <div style="color:#666; font-size:13px;">${item.brand}</div>
          </td>
          <td style="text-align:right;">
            <div>Cant: ${item.quantity}</div>
            <div>S/ ${item.subtotal.toFixed(2)}</div>
          </td>
        </tr>
      </table>`
    )
    .join('');
}

// Configuración de EmailJS desde variables de entorno
const emailJsServiceId =
  process.env.EXPO_PUBLIC_EMAILJS_SERVICE_ID || 'service_xg32syj';
const emailJsTemplateId =
  process.env.EXPO_PUBLIC_EMAILJS_TEMPLATE_ID || 'template_dhx72hh';
const emailJsPublicKey =
  process.env.EXPO_PUBLIC_EMAILJS_PUBLIC_KEY || 'U6JTnDcliUFxpKRSG';
const emailJsPrivateKey =
  process.env.EXPO_PUBLIC_EMAILJS_PRIVATE_KEY || 'aajVA4khB07FJT0C1-xe0';

/**
 * Envía un correo electrónico usando EmailJS
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    if (!emailJsServiceId || !emailJsTemplateId || !emailJsPublicKey || !emailJsPrivateKey) {
      console.error('❌ Falta configurar EmailJS (service/template/public/private key).');
      return false;
    }

    const payload = {
      service_id: emailJsServiceId,
      template_id: emailJsTemplateId,
      user_id: emailJsPublicKey,
      accessToken: emailJsPrivateKey,
      template_params: {
        to_email: options.to,
        subject: options.subject,
        html_content: options.html,
        text_content: options.text || options.html.replace(/<[^>]*>/g, ''),
        ...(options.templateParams || {}),
      },
    };

    console.log('📧 Enviando email de confirmación a:', options.to);

    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message);
    }

    console.log('✅ Email enviado exitosamente vía EmailJS a:', options.to);
    return true;
  } catch (error) {
    console.error('❌ Error al enviar email (EmailJS):', error);
    return false;
  }
}

/**
 * Envía el correo de confirmación de pedido
 */
export async function sendOrderConfirmationEmail(
  order: Order,
  userEmail: string,
  userName: string
): Promise<boolean> {
  const subject = `✅ Confirmación de Pedido ${order.id} - Frito-Lay Perú`;
  const html = generateOrderConfirmationEmail(order, userName);
  const text = generateOrderConfirmationEmailText(order, userName);
  const orderDate = new Date(order.date).toLocaleDateString('es-PE');

  const templateParams = {
    order_id: order.id,
    user_name: userName,
    order_date: orderDate,
    order_status: getStatusLabel(order.status),
    payment_method: order.paymentMethod,
    delivery_address: order.deliveryAddress || '',
    delivery_slot: order.deliveryTimeSlot || '',
    is_wholesale: order.isWholesale ? 'true' : '',
    subtotal: order.wholesaleTotal.toFixed(2),
    savings: order.savings.toFixed(2),
    total: order.total.toFixed(2),
    tracking_number: order.trackingNumber || '',
    current_year: new Date().getFullYear().toString(),
    items_html: generateItemsHtml(order.items),
    to_email: userEmail,
  };
  
  return await sendEmail({
    to: userEmail,
    subject,
    html,
    text,
    templateParams,
  });
}

