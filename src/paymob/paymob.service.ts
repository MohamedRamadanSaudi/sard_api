import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class PaymobService {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('PAYMOB_API_KEY');
    this.baseUrl = 'https://accept.paymob.com/api';
  }

  async authenticate(): Promise<string> {
    const response = await axios.post(`${this.baseUrl}/auth/tokens`, {
      api_key: this.apiKey,
    });
    return response.data.token;
  }

  async createPaymentOrder(
    amount: number,
    currency: string = 'EGP',
  ): Promise<string> {
    const authToken = await this.authenticate();
    const response = await axios.post(`${this.baseUrl}/ecommerce/orders`, {
      auth_token: authToken,
      amount_cents: amount * 100, // PayMob expects amount in cents
      currency,
    });
    return response.data.id;
  }

  async generatePaymentKey(
    orderId: string,
    amount: number,
    billingData: any,
  ): Promise<string> {
    const authToken = await this.authenticate();

    if (!orderId) {
      throw new Error('Invalid order ID from PayMob');
    }

    try {
      const response = await axios.post(`${this.baseUrl}/acceptance/payment_keys`, {
        auth_token: authToken,
        amount_cents: amount * 100,
        order_id: orderId,
        billing_data: {
          first_name: billingData.first_name || 'Test',
          last_name: billingData.last_name || 'User',
          email: billingData.email || 'test@example.com',
          phone_number: billingData.phone_number || '01012345678',
          country: billingData.country || 'EG',
          city: billingData.city || 'Cairo',
          street: billingData.street || '123 Street',
          building: billingData.building || '123',
          floor: billingData.floor || '1',
          apartment: billingData.apartment || '1',
        },
        currency: 'EGP',
        integration_id: this.configService.get<string>('PAYMOB_INTEGRATION_ID'),
      });

      return response.data.token;
    } catch (error) {
      console.error('Paymob Error:', error.response?.data || error.message);
      throw new Error('Failed to generate payment key');
    }
  }
}