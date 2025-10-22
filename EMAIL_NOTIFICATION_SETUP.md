# Email Notification System Setup

## Overview

The email notification system automatically sends emails to users when tickets are created, updated, or when new messages are added. This system integrates with the ticket management system to provide real-time communication.

## Features

### 1. Ticket Creation Notifications
- **Creator Notification**: Email sent to the user who created the ticket
- **Agent Notification**: Email sent to the assigned support agent
- **Database Notifications**: In-app notifications stored in the database

### 2. Status Update Notifications
- Email notifications when ticket status changes
- In-app notifications for status updates

### 3. Message Notifications
- Email notifications when new messages are added to tickets
- In-app notifications for new messages

## Email Templates

### Ticket Creation Email (Creator)
- Professional HTML template
- Ticket details and tracking information
- Direct link to view the ticket
- Responsive design for mobile devices

### Ticket Assignment Email (Agent)
- Professional HTML template
- Ticket details and assignment information
- Action items for the agent
- Direct link to respond to the ticket
- Priority indicators for urgent tickets

## Configuration

### 1. Environment Variables

Add the following environment variables to your `.env` file:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_EMAIL=support@ynkap.com
SMTP_TEST_EMAIL=test@example.com

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:4200
```

### 2. SMTP Provider Setup

#### Gmail Setup
1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
3. Use the app password in `SMTP_PASS`

#### Other SMTP Providers
- **Outlook/Hotmail**: `smtp-mail.outlook.com:587`
- **Yahoo**: `smtp.mail.yahoo.com:587`
- **Custom SMTP**: Use your provider's SMTP settings

### 3. Keycloak Integration

The system uses the `TicketAssignmentService` to retrieve user email addresses from Keycloak, maintaining the principle of least privilege. The service automatically:

- Uses the dedicated ticket assignment client credentials
- Retrieves user details including email and name
- Handles authentication and token management
- Provides fallback values if user details are not available

The `getUserById` method in `TicketAssignmentService` handles all Keycloak interactions:

```typescript
async getUserById(userId: string): Promise<{ email: string; name: string } | null> {
    try {
        const token = await this.getAssignmentToken();
        const url = `${this.configService.get<string>('KEYCLOAK_SERVER_URI')}/admin/realms/${this.configService.get<string>('KEYCLOAK_SERVER_REALM')}/users/${userId}`;
        
        const response = await lastValueFrom(
            this.http.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            })
        );
        
        const user = response.data;
        return {
            email: user.email || '',
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || ''
        };
    } catch (error) {
        console.error(`Failed to get user details for ${userId}:`, error);
        return null;
    }
}
```

## Installation

### 1. Install Dependencies

```bash
npm install nodemailer @types/nodemailer
```

### 2. Update Configuration

The email configuration is automatically loaded from environment variables.

### 3. Test Email Configuration

You can test the email configuration by calling the test endpoint:

```typescript
// In your application startup
const emailService = app.get(EmailService);
await emailService.testEmailConfiguration();
```

## Usage

### Automatic Notifications

The system automatically sends notifications when:

1. **Ticket Created**: Both creator and assigned agent receive emails
2. **Status Updated**: Ticket owner receives email notification
3. **New Message**: Recipient receives email notification

### Manual Email Sending

```typescript
// Inject EmailService
constructor(private emailService: EmailService) {}

// Send custom email
await this.emailService.sendEmail(
    'user@example.com',
    'Custom Subject',
    '<h1>Custom HTML Content</h1>'
);
```

## Email Templates

### Customizing Templates

Email templates are defined in the `EmailService` class. You can customize:

1. **HTML Structure**: Modify the template HTML
2. **Styling**: Update CSS styles
3. **Content**: Change email content and messaging
4. **Branding**: Add your company logo and colors

### Template Variables

Available variables in templates:
- `${ticket.title}` - Ticket title
- `${ticket.description}` - Ticket description
- `${ticket.type}` - Ticket type
- `${ticket.status}` - Ticket status
- `${userName}` - Recipient name
- `${ticketUrl}` - Direct link to ticket

## Security Considerations

### 1. Email Security
- Use SMTP with TLS/SSL encryption
- Store SMTP credentials securely
- Use app passwords instead of account passwords
- Regularly rotate SMTP credentials

### 2. Data Protection
- Don't include sensitive information in emails
- Use secure links for ticket access
- Implement rate limiting for email sending
- Log email sending for audit purposes

### 3. Privacy Compliance
- Include unsubscribe options in emails
- Respect user email preferences
- Comply with GDPR and other privacy regulations
- Provide clear privacy notices

## Monitoring and Logging

### 1. Email Logging
The system logs all email activities:
- Successful email sends
- Failed email attempts
- Email configuration errors

### 2. Monitoring
Monitor the following metrics:
- Email delivery success rate
- Email bounce rate
- SMTP connection health
- Email sending latency

### 3. Error Handling
The system gracefully handles email failures:
- Email failures don't break ticket creation
- Failed emails are logged for debugging
- Retry mechanisms for transient failures

## Troubleshooting

### Common Issues

1. **SMTP Authentication Failed**
   - Check SMTP credentials
   - Verify 2FA is enabled (for Gmail)
   - Use app password instead of account password

2. **Emails Not Sending**
   - Check SMTP configuration
   - Verify network connectivity
   - Check firewall settings

3. **Emails Going to Spam**
   - Configure SPF records
   - Set up DKIM authentication
   - Use a reputable SMTP provider

4. **User Information Not Found**
   - Verify Keycloak integration
   - Check user exists in Keycloak
   - Ensure proper permissions

### Debug Mode

Enable debug logging by setting the log level to DEBUG:

```typescript
// In your application configuration
const app = await NestFactory.create(AppModule, {
  logger: ['error', 'warn', 'debug', 'log', 'verbose'],
});
```

## Best Practices

### 1. Email Design
- Use responsive HTML templates
- Keep emails concise and actionable
- Include clear call-to-action buttons
- Test emails across different email clients

### 2. Performance
- Use async/await for email sending
- Implement email queuing for high volume
- Cache user information to reduce API calls
- Use connection pooling for SMTP

### 3. User Experience
- Send emails immediately after actions
- Provide clear next steps in emails
- Include ticket tracking information
- Allow users to manage email preferences

## Future Enhancements

### 1. Email Preferences
- User-configurable email preferences
- Email frequency controls
- Unsubscribe functionality
- Email template customization

### 2. Advanced Features
- Email templates in multiple languages
- Rich text email editor
- Email scheduling
- Email analytics and tracking

### 3. Integration
- Slack notifications
- SMS notifications
- Push notifications
- Webhook integrations 