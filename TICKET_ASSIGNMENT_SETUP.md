# Ticket Assignment Using Keycloak Admin API

## Overview

The ticket assignment system now uses the Keycloak Admin API directly through the `KeycloakApiService`. This approach leverages the existing Keycloak configuration and admin permissions.

## Keycloak Configuration

### 1. Create a New Client

Create a new client in Keycloak specifically for ticket assignment:

1. Go to Keycloak Admin Console
2. Navigate to Clients → Create
3. Set the following configuration:
   - **Client ID**: `ticket-assignment-client`
   - **Client Protocol**: `openid-connect`
   - **Access Type**: `confidential`
   - **Valid Redirect URIs**: `*` (or your specific URLs)
   - **Web Origins**: `*` (or your specific origins)

### 2. Configure Client Roles

The client should have the following roles assigned:
- `view-users` - To read user information
- `view-clients` - To access client information
- `view-realm` - To access realm information

### 3. User Account Roles

Assign the following roles to the ticket assignment user:
- `realm-management` → `view-users`
- `realm-management` → `view-clients`
- `realm-management` → `view-realm`

### 4. Configure User Account

1. Create a dedicated user account in Keycloak for ticket assignment
2. Assign the required roles to this user:
   - `view-users` - To read user information
   - `view-clients` - To access client information
   - `view-realm` - To access realm information
3. Note the username and password for this account

## Environment Variables

Add the following environment variables to your `.env` file:

```env
# Ticket Assignment Service Configuration
TICKET_ASSIGNMENT_CLIENT_ID=your-main-client-id
TICKET_ASSIGNMENT_USERNAME=ticket-assignment-user
TICKET_ASSIGNMENT_PASSWORD=your-user-password

# Additional Keycloak Configuration (if not already set)
KEYCLOAK_SERVER_REALM=your-realm-name
KEYCLOAK_CLIENT_UUID=your-main-client-uuid
```

## Service Features

### 1. Token Management
- Automatic token refresh
- Caching to reduce API calls
- Error handling for authentication failures

### 2. Agent Assignment
- Role-based agent selection
- Random distribution for load balancing
- Verification of actual role assignments

### 3. Error Handling
- Graceful fallbacks when no agents are available
- Detailed error logging
- Retry mechanisms for transient failures

## Usage

The service is automatically injected into the `TicketService` and used in the `createTicket` method:

```typescript
// Old approach (using admin API)
const userSolvers = await this.keycloakApiService.getUsersByRole(ticketRole, req);

// New approach (using dedicated service)
const solver = await this.ticketAssignmentService.selectRandomAgent(createTicketDto.type);
```

## Security Benefits

1. **Principle of Least Privilege**: The assignment service has only the minimum required permissions
2. **Separation of Concerns**: Ticket assignment logic is isolated from admin operations
3. **Audit Trail**: Dedicated service makes it easier to track assignment operations
4. **Reduced Attack Surface**: No need for admin-level permissions in ticket operations

## Monitoring

Monitor the following metrics:
- Token refresh frequency
- Agent assignment success rate
- API call latency
- Error rates for different ticket types

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Check client credentials
   - Verify client is enabled
   - Ensure service account roles are assigned

2. **No Agents Found**
   - Verify users have the correct roles
   - Check role mappings in Keycloak
   - Ensure the client has view-users permission

3. **Token Expiration**
   - Check token refresh logic
   - Verify clock synchronization
   - Monitor token expiration times

### Debug Mode

Enable debug logging by setting the log level to DEBUG in your application configuration. 