exports.sendTelegramNotification = async (orderData) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
        console.log('Skipping Telegram notification (TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing).');
        return;
    }

    let total = orderData.shippingCost || 0;
    const itemsText = orderData.items.map(i => {
        total += i.price * i.quantity;
        return `• ${i.name} (${i.quantity}x) - ${i.price * i.quantity} Kč`;
    }).join('\n');

    const message = `
🎉 <b>Nová objednávka zaplacena!</b> (#${orderData.orderId})

<b>Zákazník:</b> ${orderData.customer.name} (${orderData.customer.email})
<b>Doprava:</b> ${orderData.shippingMethod}
<b>Hodnota:</b> ${total} Kč

<b>Položky:</b>
${itemsText}
`;

    try {
        const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML'
            })
        });

        if (!response.ok) {
            console.error('Chyba při odesílání zprávy na Telegram:', await response.text());
        } else {
            console.log('Notifikace na Telegram byla úspěšně odeslána.');
        }
    } catch (error) {
        console.error('Chyba komunikace s Telegram API:', error);
    }
};
