import { Injectable, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { TicketStatus } from '../enums/ticket-status.enum';
import { TicketTypes } from '../enums/ticket-types.enum';

export interface StatusTransitionRule {
  from: TicketStatus;
  to: TicketStatus;
  requiredRoles: string[];
  conditions?: (ticket: any, user: any) => boolean;
  description: string;
}

export interface StatusChangeRequest {
  ticketId: string;
  currentStatus: TicketStatus;
  newStatus: TicketStatus;
  reason?: string;
  resolutionNotes?: string;
  rejectionReason?: string;
}

export interface UserPermissions {
  canChangeStatus: boolean;
  allowedTransitions: TicketStatus[];
  role: string;
  isOwner: boolean;
  isAssigned: boolean;
}

@Injectable()
export class TicketStatusManagementService {
  private readonly logger = new Logger(TicketStatusManagementService.name);

  // Define status transition rules with role-based permissions
  private readonly statusTransitionRules: StatusTransitionRule[] = [
    // OPEN transitions
    {
      from: TicketStatus.OPEN,
      to: TicketStatus.IN_PROGRESS,
      requiredRoles: ['bugs-solver', 'transactions-solver', 'other-problems-solver', 'manager'],
      description: 'Start working on the ticket'
    },
    {
      from: TicketStatus.OPEN,
      to: TicketStatus.CLOSE,
      requiredRoles: ['manager'],
      description: 'Close ticket without resolution (manager only)'
    },

    // IN_PROGRESS transitions
    {
      from: TicketStatus.IN_PROGRESS,
      to: TicketStatus.SOLVE,
      requiredRoles: ['bugs-solver', 'transactions-solver', 'other-problems-solver', 'manager'],
      conditions: (ticket, user) => {
        // Only assigned solver or manager can mark as solved
        return ticket.assignTo === user.sub || user.roles.includes('manager');
      },
      description: 'Mark ticket as solved'
    },
    {
      from: TicketStatus.IN_PROGRESS,
      to: TicketStatus.OPEN,
      requiredRoles: ['bugs-solver', 'transactions-solver', 'other-problems-solver', 'manager'],
      description: 'Reopen ticket for further investigation'
    },
    {
      from: TicketStatus.IN_PROGRESS,
      to: TicketStatus.CLOSE,
      requiredRoles: ['bugs-solver', 'transactions-solver', 'other-problems-solver', 'manager'],
      conditions: (ticket, user) => {
        // Only assigned solver or manager can close from in-progress
        return ticket.assignTo === user.sub || user.roles.includes('manager');
      },
      description: 'Close ticket without resolution (requires rejection reason)'
    },

    // SOLVE transitions
    {
      from: TicketStatus.SOLVE,
      to: TicketStatus.CLOSE,
      requiredRoles: ['bugs-solver', 'transactions-solver', 'other-problems-solver','manager'],
      description: 'Close solved ticket '
    },
    {
      from: TicketStatus.SOLVE,
      to: TicketStatus.IN_PROGRESS,
      requiredRoles: ['bugs-solver', 'transactions-solver', 'other-problems-solver', 'manager'],
      description: 'Reopen solved ticket for additional work'
    },

    // CLOSE transitions (limited)
    {
      from: TicketStatus.CLOSE,
      to: TicketStatus.OPEN,
      requiredRoles: ['manager'],
      description: 'Reopen closed ticket (manager only)'
    }
  ];

  /**
   * Get allowed status transitions for a user and ticket
   */
  getAllowedTransitions(
    currentStatus: TicketStatus,
    userRoles: string[],
    ticket: any,
    user: any
  ): TicketStatus[] {
    const allowedTransitions: TicketStatus[] = [];

    for (const rule of this.statusTransitionRules) {
      if (rule.from === currentStatus) {
        // Check if user has required role
        const hasRequiredRole = rule.requiredRoles.some(role => userRoles.includes(role));
        
        if (hasRequiredRole) {
          // Check additional conditions if any
          if (rule.conditions) {
            if (rule.conditions(ticket, user)) {
              allowedTransitions.push(rule.to);
            }
          } else {
            allowedTransitions.push(rule.to);
          }
        }
      }
    }

    return allowedTransitions;
  }

  /**
   * Validate status transition
   */
  validateStatusTransition(
    request: StatusChangeRequest,
    userRoles: string[],
    ticket: any,
    user: any
  ): { isValid: boolean; error?: string; rule?: StatusTransitionRule } {
    // Find the applicable rule
    const rule = this.statusTransitionRules.find(
      r => r.from === request.currentStatus && r.to === request.newStatus
    );

    if (!rule) {
      return {
        isValid: false,
        error: `Invalid status transition from ${request.currentStatus} to ${request.newStatus}`
      };
    }

    // Check role permissions
    const hasRequiredRole = rule.requiredRoles.some(role => userRoles.includes(role));
    if (!hasRequiredRole) {
      return {
        isValid: false,
        error: `Insufficient permissions. Required roles: ${rule.requiredRoles.join(', ')}`
      };
    }

    // Check additional conditions
    if (rule.conditions && !rule.conditions(ticket, user)) {
      return {
        isValid: false,
        error: 'Additional conditions not met for this status transition'
      };
    }

    // Validate required fields based on status
    if (request.newStatus === TicketStatus.SOLVE && !request.resolutionNotes) {
      return {
        isValid: false,
        error: 'Resolution notes are required when marking ticket as solved'
      };
    }

    if (request.newStatus === TicketStatus.CLOSE && request.currentStatus !== TicketStatus.SOLVE) {
      if (!request.rejectionReason) {
        return {
          isValid: false,
          error: 'Rejection reason is required when closing unsolved ticket'
        };
      }
    }

    return { isValid: true, rule };
  }

  /**
   * Get user permissions for a specific ticket
   */
  getUserPermissions(
    ticket: any,
    userRoles: string[],
    userId: string
  ): UserPermissions {
    const isOwner = ticket.user === userId;
    const isAssigned = ticket.assignTo === userId;
    const isManager = userRoles.includes('manager');
    const isSolver = userRoles.some(role => 
      ['bugs-solver', 'transactions-solver', 'other-problems-solver'].includes(role)
    );

    // Determine if user can change status
    const canChangeStatus = isManager || (isSolver && isAssigned);

    // Get allowed transitions
    const allowedTransitions = canChangeStatus 
      ? this.getAllowedTransitions(ticket.status, userRoles, ticket, { sub: userId, roles: userRoles })
      : [];

    // Determine primary role
    let role = 'user';
    if (isManager) role = 'manager';
    else if (isSolver) role = 'solver';

    return {
      canChangeStatus,
      allowedTransitions,
      role,
      isOwner,
      isAssigned
    };
  }

  /**
   * Get status transition rules for frontend
   */
  getStatusTransitionRules(): StatusTransitionRule[] {
    return this.statusTransitionRules.map(rule => ({
      ...rule,
      // Remove conditions function for serialization
      conditions: undefined
    }));
  }

  /**
   * Get status workflow information
   */
  getStatusWorkflow(): any {
    const workflow = {
      statuses: Object.values(TicketStatus).map(status => ({
        value: status,
        label: this.getStatusLabel(status),
        color: this.getStatusColor(status),
        icon: this.getStatusIcon(status)
      })),
      transitions: this.statusTransitionRules.map(rule => ({
        from: rule.from,
        to: rule.to,
        requiredRoles: rule.requiredRoles,
        description: rule.description
      }))
    };

    return workflow;
  }

  /**
   * Get human-readable status label
   */
  private getStatusLabel(status: TicketStatus): string {
    const labels = {
      [TicketStatus.OPEN]: 'Open',
      [TicketStatus.IN_PROGRESS]: 'In Progress',
      [TicketStatus.SOLVE]: 'Solved',
      [TicketStatus.CLOSE]: 'Closed'
    };
    return labels[status] || status;
  }

  /**
   * Get status color for UI
   */
  private getStatusColor(status: TicketStatus): string {
    const colors = {
      [TicketStatus.OPEN]: '#007bff',      // Blue
      [TicketStatus.IN_PROGRESS]: '#ffc107', // Yellow
      [TicketStatus.SOLVE]: '#28a745',     // Green
      [TicketStatus.CLOSE]: '#6c757d'      // Gray
    };
    return colors[status] || '#6c757d';
  }

  /**
   * Get status icon for UI
   */
  private getStatusIcon(status: TicketStatus): string {
    const icons = {
      [TicketStatus.OPEN]: 'fas fa-folder-open',
      [TicketStatus.IN_PROGRESS]: 'fas fa-spinner',
      [TicketStatus.SOLVE]: 'fas fa-check-circle',
      [TicketStatus.CLOSE]: 'fas fa-times-circle'
    };
    return icons[status] || 'fas fa-question-circle';
  }

  /**
   * Log status change for audit
   */
  logStatusChange(
    ticketId: string,
    fromStatus: TicketStatus,
    toStatus: TicketStatus,
    userId: string,
    reason?: string
  ): void {
    this.logger.log(
      `Status change: Ticket ${ticketId} changed from ${fromStatus} to ${toStatus} by user ${userId}` +
      (reason ? ` - Reason: ${reason}` : '')
    );
  }
}
