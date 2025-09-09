import emailjs from '@emailjs/browser'

// EmailJS configuration
const EMAILJS_CONFIG = {
  serviceId: 'service_mp7nl2m',
  templateId: 'template_eotz387', // This might need to be a credentials-specific template
  publicKey: '_UHN5HZe4-ufjrQaL'
}

// Initialize EmailJS
emailjs.init(EMAILJS_CONFIG.publicKey)

interface EmailCredentialsParams {
  userEmail: string
  userName?: string
  credentials: any
  orderId: string
}

export const sendCredentialsEmail = async ({
  userEmail,
  userName,
  credentials,
  orderId
}: EmailCredentialsParams): Promise<{ success: boolean; error?: string }> => {
  try {
    // Format credentials for email
    const formattedCredentials = JSON.stringify(credentials, null, 2)
    
    // Template parameters - make sure to_email goes to customer, not admin
    const templateParams = {
      to_email: userEmail, // CUSTOMER EMAIL - not admin!
      to_name: userName || userEmail.split('@')[0],
      from_name: 'TallyStore Support',
      from_email: 'noreply@tallystore.com',
      subject: `Your TallyStore Credentials - Order ${orderId}`,
      order_id: orderId,
      credentials: formattedCredentials,
      message: `Your account credentials for order ${orderId} are ready! Please keep this information secure.`,
      // Don't include admin email in any field that might override to_email
    }

    console.log('📧 Sending credentials email to customer:', userEmail)
    console.log('📧 Template params:', { ...templateParams, credentials: '[HIDDEN]' })

    const response = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      templateParams
    )

    console.log('✅ Email sent successfully to customer:', response)
    
    return { success: true }
  } catch (error) {
    console.error('❌ Failed to send customer email:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send email'
    }
  }
}

export const sendSupportEmail = async ({
  userEmail,
  userName,
  subject,
  message
}: {
  userEmail: string
  userName: string
  subject: string
  message: string
}): Promise<{ success: boolean; error?: string }> => {
  try {
    const templateParams = {
      to_email: 'tallystoreorg@gmail.com', // Admin email for support
      from_email: userEmail,
      from_name: userName,
      subject: subject,
      message: message,
      reply_to: userEmail
    }

    const response = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      templateParams
    )

    console.log('✅ Support email sent successfully:', response)
    return { success: true }
  } catch (error) {
    console.error('❌ Failed to send support email:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send support email'
    }
  }
}
