import axios from 'axios';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { PUSHINPAY_CONFIG, NOWPAYMENTS_CONFIG } from '../config/payment.config';

export class PaymentManager {
  private transactions: Map<string, any>;

  constructor() {
    this.transactions = new Map();
  }

  async createPayment(method: 'pix' | 'crypto', amount: number, description?: string) {
    try {
      switch (method) {
        case 'pix':
          return await this.createPixPayment(amount, description);
        case 'crypto':
          return await this.createCryptoPayment(amount);
        default:
          throw new Error(`Método de pagamento não suportado: ${method}`);
      }
    } catch (error) {
      logger.error('Error creating payment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async createPixPayment(amount: number, description?: string) {
    try {
      const response = await axios.post(
        `${PUSHINPAY_CONFIG.apiUrl}/pix/cashIn`,
        {
          value: Math.round(amount * 100), // Convert to cents
          description: description || 'Pagamento VIP'
        },
        {
          headers: {
            'Authorization': `Bearer ${PUSHINPAY_CONFIG.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const paymentData = response.data;

      // Generate QR code
      const qrCodePath = path.join(process.cwd(), `temp_qr_${Date.now()}.png`);
      await QRCode.toFile(qrCodePath, paymentData.qrCode);

      // Store transaction
      this.transactions.set(paymentData.transactionId, {
        amount,
        status: 'pending',
        created_at: new Date().toISOString()
      });

      return {
        success: true,
        transactionId: paymentData.transactionId,
        qrCodePath,
        copyPaste: paymentData.pixKey
      };
    } catch (error) {
      logger.error('Error creating PIX payment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async createCryptoPayment(amount: number) {
    try {
      const response = await axios.post(
        `${NOWPAYMENTS_CONFIG.apiUrl}/payment`,
        {
          price_amount: amount,
          price_currency: 'BRL',
          pay_currency: 'BTC',
          order_description: 'Pagamento VIP'
        },
        {
          headers: {
            'x-api-key': NOWPAYMENTS_CONFIG.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      const paymentData = response.data;

      // Store transaction
      this.transactions.set(paymentData.payment_id, {
        amount: paymentData.pay_amount,
        currency: paymentData.pay_currency,
        status: paymentData.payment_status,
        created_at: new Date().toISOString()
      });

      return {
        success: true,
        paymentId: paymentData.payment_id,
        payAddress: paymentData.pay_address,
        amount: paymentData.pay_amount
      };
    } catch (error) {
      logger.error('Error creating crypto payment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async checkPaymentStatus(method: 'pix' | 'crypto', paymentId: string) {
    try {
      switch (method) {
        case 'pix':
          return await this.checkPixStatus(paymentId);
        case 'crypto':
          return await this.checkCryptoStatus(paymentId);
        default:
          throw new Error(`Método não suportado para verificação: ${method}`);
      }
    } catch (error) {
      logger.error('Error checking payment status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkPixStatus(transactionId: string) {
    try {
      const response = await axios.get(
        `${PUSHINPAY_CONFIG.apiUrl}/pix/transaction/${transactionId}`,
        {
          headers: {
            'Authorization': `Bearer ${PUSHINPAY_CONFIG.token}`
          }
        }
      );

      return {
        success: true,
        status: response.data.status,
        paid: response.data.status === 'COMPLETED'
      };
    } catch (error) {
      logger.error('Error checking PIX status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkCryptoStatus(paymentId: string) {
    try {
      const response = await axios.get(
        `${NOWPAYMENTS_CONFIG.apiUrl}/payment/${paymentId}`,
        {
          headers: {
            'x-api-key': NOWPAYMENTS_CONFIG.apiKey
          }
        }
      );

      return {
        success: true,
        status: response.data.payment_status,
        paid: ['finished', 'confirmed'].includes(response.data.payment_status)
      };
    } catch (error) {
      logger.error('Error checking crypto status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  cleanup(qrCodePath: string) {
    try {
      if (fs.existsSync(qrCodePath)) {
        fs.unlinkSync(qrCodePath);
      }
    } catch (error) {
      logger.error('Error cleaning up temporary file:', error);
    }
  }
}