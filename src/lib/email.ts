import emailjs from '@emailjs/browser'

// EmailJS configuration
const EMAILJS_CONFIG = {
  serviceId: 'service_mp7nl2m',
  templateId: 'template_eotz387',
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
    
    const templateParams = {
      to_email: userEmail,
      to_name: userName || userEmail.split('@')[0],
      from_name: 'TallyStore',
      order_id: orderId,
      credentials: formattedCredentials,
      message: `Your TallyStore account credentials for order ${orderId} are ready!`,
      reply_to: 'support@tallystore.com'
    }

    console.log('📧 Sending credentials email...', { userEmail, orderId })

    const response = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      templateParams
    )

    console.log('✅ Email sent successfully:', response)
    
    return { success: true }
  } catch (error) {
    console.error('❌ Failed to send email:', error)
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
      to_email: 'support@tallystore.com',
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
