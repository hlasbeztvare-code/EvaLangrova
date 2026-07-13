const nodemailer = require('nodemailer');

exports.sendInvoiceEmail = async (orderData, pdfBuffer) => {
    // V produkci by se bralo z process.env.SMTP_USER, SMTP_PASS atd.
    // Zde používáme Ethereal pro testování, nebo mock
    const user = process.env.SMTP_USER || 'test@example.com';
    const pass = process.env.SMTP_PASS || 'password';
    const host = process.env.SMTP_HOST || 'smtp.ethereal.email';
    const port = process.env.SMTP_PORT || 587;

    const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port == 465,
        auth: {
            user,
            pass
        }
    });

    const mailOptions = {
        from: '"Fotofiltry.cz" <info@fotofiltry.cz>',
        to: orderData.customer.email,
        subject: `Potvrzení objednávky ${orderData.orderId} a faktura`,
        html: `
            <h3>Dobrý den, ${orderData.customer.name},</h3>
            <p>děkujeme za Vaši objednávku <strong>${orderData.orderId}</strong>.</p>
            <p>V příloze naleznete fakturu k Vašemu nákupu.</p>
            <br>
            <p>S pozdravem,</p>
            <p>Tým Fotofiltry.cz</p>
        `,
        attachments: [
            {
                filename: `Faktura_${orderData.orderId}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf'
            }
        ]
    };

    try {
        if (!process.env.SMTP_USER) {
            console.log('Skipping real email send because SMTP_USER is not set. Simulating success.');
            console.log('Email to:', orderData.customer.email);
            return { success: true, simulated: true };
        }
        const info = await transporter.sendMail(mailOptions);
        console.log('Message sent: %s', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};
