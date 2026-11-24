import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authRouter } from './auth.js';
import { referenceRouter } from './reference.js';
import { inventoryRouter } from './inventory.js';
import { customerRouter } from './customers.js';
import { salesRouter } from './sales.js';
import { operationsRouter } from './operations.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);

// Everything below requires a valid session.
apiRouter.use(authenticate);
apiRouter.use(referenceRouter);
apiRouter.use(inventoryRouter);
apiRouter.use(customerRouter);
apiRouter.use(salesRouter);
apiRouter.use(operationsRouter);
