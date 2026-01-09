import cron from 'node-cron';
import { AppDataSource } from '../config/db';
import { Contract } from '../models/contract.model';
import { LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { notifyAdmins } from '../services/notification.service';

let io: any;

export const setSocketIO = (socketIO: any) => {
  io = socketIO;
};

/**
 * Check for contracts expiring in the next 7 days
 * Runs daily at 9:00 AM
 */
export const scheduleExpiringContractsCheck = () => {
  // Run daily at 9 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('🔔 Checking for expiring contracts...');

    try {
      const contractRepository = AppDataSource.getRepository(Contract);
      
      const today = new Date();
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      // Find contracts expiring in the next 7 days
      const expiringContracts = await contractRepository
        .createQueryBuilder('contract')
        .leftJoinAndSelect('contract.customer', 'customer')
        .leftJoinAndSelect('contract.car', 'car')
        .where('contract.endDate BETWEEN :today AND :sevenDays', {
          today: today.toISOString(),
          sevenDays: sevenDaysFromNow.toISOString()
        })
        .andWhere('contract.notificationSent != :sent', { sent: true })
        .getMany();

      console.log(`Found ${expiringContracts.length} expiring contracts`);

      for (const contract of expiringContracts) {
        const daysUntilExpiry = Math.ceil(
          (contract.endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        const contractNumber = `${contract.car.manufacturer} ${contract.car.model} - ${contract.customer.name}`;
        const message = daysUntilExpiry === 0
          ? `Ugovor ${contractNumber} ističe danas!`
          : `Ugovor ${contractNumber} ističe za ${daysUntilExpiry} ${daysUntilExpiry === 1 ? 'dan' : 'dana'}`;

        await notifyAdmins(
          message,
          'contract-expiring',
          undefined,
          io
        );

        // Mark as notified
        contract.notificationSent = true;
        await contractRepository.save(contract);

        console.log(`✅ Sent expiring notification for contract: ${contractNumber}`);
      }

      console.log(`✅ Expiring contracts check complete. Sent ${expiringContracts.length} notifications.`);
    } catch (error) {
      console.error('Error checking expiring contracts:', error);
    }
  });

  console.log('✅ Scheduled task: Expiring contracts check (daily at 9 AM)');
};

/**
 * Check for expired contracts
 * Runs daily at 10:00 AM
 */
export const scheduleExpiredContractsCheck = () => {
  // Run daily at 10 AM
  cron.schedule('0 10 * * *', async () => {
    console.log('🔔 Checking for expired contracts...');

    try {
      const contractRepository = AppDataSource.getRepository(Contract);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Find contracts that expired yesterday (to avoid duplicate notifications)
      const expiredContracts = await contractRepository
        .createQueryBuilder('contract')
        .leftJoinAndSelect('contract.customer', 'customer')
        .leftJoinAndSelect('contract.car', 'car')
        .where('DATE(contract.endDate) = DATE(:yesterday)', {
          yesterday: yesterday.toISOString()
        })
        .getMany();

      console.log(`Found ${expiredContracts.length} newly expired contracts`);

      for (const contract of expiredContracts) {
        const contractNumber = `${contract.car.manufacturer} ${contract.car.model} - ${contract.customer.name}`;
        
        await notifyAdmins(
          `Ugovor ${contractNumber} je istekao`,
          'contract-expired',
          undefined,
          io
        );

        console.log(`✅ Sent expired notification for contract: ${contractNumber}`);
      }

      console.log(`✅ Expired contracts check complete. Sent ${expiredContracts.length} notifications.`);
    } catch (error) {
      console.error('Error checking expired contracts:', error);
    }
  });

  console.log('✅ Scheduled task: Expired contracts check (daily at 10 AM)');
};

/**
 * Manual trigger for testing (call this from a test endpoint)
 */
export const checkExpiringContractsNow = async () => {
  console.log('🔔 Manual check for expiring contracts...');
  
  try {
    const contractRepository = AppDataSource.getRepository(Contract);
    
    const today = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const expiringContracts = await contractRepository
      .createQueryBuilder('contract')
      .leftJoinAndSelect('contract.customer', 'customer')
      .leftJoinAndSelect('contract.car', 'car')
      .where('contract.endDate BETWEEN :today AND :sevenDays', {
        today: today.toISOString(),
        sevenDays: sevenDaysFromNow.toISOString()
      })
      .getMany();

    return {
      count: expiringContracts.length,
      contracts: expiringContracts.map(c => ({
        id: c.id,
        customer: c.customer.name,
        car: `${c.car.manufacturer} ${c.car.model}`,
        endDate: c.endDate,
        daysUntilExpiry: Math.ceil((c.endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      }))
    };
  } catch (error) {
    console.error('Error in manual check:', error);
    throw error;
  }
};
