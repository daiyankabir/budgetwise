import { Router, Response } from 'express';
import { z } from 'zod';
import { getDatabase } from '../database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import {
  CurrencyCode,
  ExchangeRateUnavailableError,
  getConversionRate,
  getExchangeRateSnapshot,
  SUPPORTED_CURRENCIES,
} from '../services/currency.js';

const router = Router();

router.use(authMiddleware);

const currencySchema = z.object({
  displayCurrency: z.enum(SUPPORTED_CURRENCIES),
});

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const user = await getDatabase()
      .prepare('SELECT display_currency FROM users WHERE id = ?')
      .get(req.userId!) as { display_currency: CurrencyCode } | undefined;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const displayCurrency = user.display_currency;
    const snapshot = displayCurrency === 'USD' ? undefined : await getExchangeRateSnapshot();

    res.json({
      displayCurrency,
      supportedCurrencies: SUPPORTED_CURRENCIES,
      exchangeRate: {
        from: 'USD',
        to: displayCurrency,
        rate: displayCurrency === 'USD' ? 1 : getConversionRate('USD', displayCurrency, snapshot!.rates),
      },
      ratesUpdatedAt: snapshot?.updatedAt ?? null,
    });
  } catch (error) {
    sendError(error, res, 'Get settings error');
  }
});

router.put('/currency', async (req: AuthRequest, res: Response) => {
  try {
    const { displayCurrency } = currencySchema.parse(req.body);
    const snapshot = displayCurrency === 'USD' ? undefined : await getExchangeRateSnapshot();

    const result = await getDatabase()
      .prepare('UPDATE users SET display_currency = ? WHERE id = ?')
      .run(displayCurrency, req.userId!);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      displayCurrency,
      exchangeRate: {
        from: 'USD',
        to: displayCurrency,
        rate: displayCurrency === 'USD' ? 1 : getConversionRate('USD', displayCurrency, snapshot!.rates),
      },
      ratesUpdatedAt: snapshot?.updatedAt ?? null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    sendError(error, res, 'Update currency error');
  }
});

function sendError(error: unknown, res: Response, context: string) {
  if (error instanceof ExchangeRateUnavailableError) {
    return res.status(503).json({ error: error.message });
  }
  console.error(`${context}:`, error);
  return res.status(500).json({ error: 'Internal server error' });
}

export default router;
