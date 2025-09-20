import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { KeyAudit, KeyAuditDocument, AuditEventType } from '../models/key-audit.schema';

@Injectable()
export class KeyAuditService {
  constructor(
    @InjectModel(KeyAudit.name) private keyAuditModel: Model<KeyAuditDocument>
  ) {}

  async logAuthAttempt(data: {
    applicationId: string;
    clientId: string;
    environment: 'test' | 'prod';
    ipAddress: string;
    userAgent: string;
    success: boolean;
    errorMessage?: string;
    metadata?: Record<string, any>;
  }) {
    const auditLog = new this.keyAuditModel({
      ...data,
      eventType: data.success ? AuditEventType.LOGIN_SUCCESS : AuditEventType.LOGIN_FAILED,
      timestamp: new Date()
    });

    return await auditLog.save();
  }

  async logKeyRegeneration(data: {
    applicationId: string;
    clientId: string;
    environment: 'test' | 'prod';
    ipAddress: string;
    userAgent: string;
    userId: string;
  }) {
    const auditLog = new this.keyAuditModel({
      ...data,
      eventType: AuditEventType.KEY_REGENERATED,
      success: true,
      metadata: { userId: data.userId },
      timestamp: new Date()
    });

    return await auditLog.save();
  }

  async logCredentialsAccess(data: {
    applicationId: string;
    clientId: string;
    environment: 'test' | 'prod';
    ipAddress: string;
    userAgent: string;
    userId: string;
  }) {
    const auditLog = new this.keyAuditModel({
      ...data,
      eventType: AuditEventType.CREDENTIALS_ACCESSED,
      success: true,
      metadata: { userId: data.userId },
      timestamp: new Date()
    });

    return await auditLog.save();
  }

  async logKeyRotation(data: {
    applicationId: string;
    clientId: string;
    environment: 'test' | 'prod';
    ipAddress: string;
    userAgent: string;
    userId: string;
    previousClientId: string;
    gracePeriodHours: number;
  }) {
    const auditLog = new this.keyAuditModel({
      ...data,
      eventType: AuditEventType.KEY_ROTATED,
      success: true,
      metadata: { 
        userId: data.userId,
        previousClientId: data.previousClientId,
        gracePeriodHours: data.gracePeriodHours
      },
      timestamp: new Date()
    });

    return await auditLog.save();
  }

  async getAuditLogs(
    applicationId: string,
    options: {
      limit?: number;
      skip?: number;
      startDate?: Date;
      endDate?: Date;
      eventType?: AuditEventType;
      environment?: 'test' | 'prod';
    } = {}
  ) {
    const {
      limit = 50,
      skip = 0,
      startDate,
      endDate,
      eventType,
      environment
    } = options;

    const filter: any = { applicationId };

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = startDate;
      if (endDate) filter.timestamp.$lte = endDate;
    }

    if (eventType) filter.eventType = eventType;
    if (environment) filter.environment = environment;

    const [logs, total] = await Promise.all([
      this.keyAuditModel
        .find(filter)
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(skip)
        .lean(),
      this.keyAuditModel.countDocuments(filter)
    ]);

    return { logs, total };
  }

  async getAuditStats(applicationId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await this.keyAuditModel.aggregate([
      {
        $match: {
          applicationId,
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            eventType: '$eventType',
            environment: '$environment',
            success: '$success'
          },
          count: { $sum: 1 },
          lastOccurrence: { $max: '$timestamp' }
        }
      },
      {
        $group: {
          _id: null,
          totalAttempts: { $sum: '$count' },
          events: {
            $push: {
              eventType: '$_id.eventType',
              environment: '$_id.environment',
              success: '$_id.success',
              count: '$count',
              lastOccurrence: '$lastOccurrence'
            }
          }
        }
      }
    ]);

    return stats[0] || { totalAttempts: 0, events: [] };
  }
}

