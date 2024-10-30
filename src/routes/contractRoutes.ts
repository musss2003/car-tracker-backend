import express, { Request, Response } from 'express';
import {
  getContract,
  createContract,
  updateContract,
  deleteContract,
  getContracts,
  getActiveContracts,
  getContractsPopulated,
  getTotalRevenue,
} from '../controllers/contractController';
import authenticate from '../middlewares/verifyJWT';

const router = express.Router();

// Middleware to verify JWT for all contract routes
router.use(authenticate);

// Route to get all contracts
router.get('/', async (req: Request, res: Response) => {
  await getContracts(req, res);
});

// Route to get all contracts
router.get('/populated', async (req: Request, res: Response) => {
  await getContractsPopulated(req, res);
});

// Route to get all contracts
router.get('/active', async (req: Request, res: Response) => {
  await getActiveContracts(req, res);
});

// Route to get all contracts
router.get('/revenue', async (req: Request, res: Response) => {
  await getTotalRevenue(req, res);
});


// Route to get contract by ID
router.get('/:id', async (req: Request, res: Response) => {
  await getContract(req, res);
});

// Route to create a new contract
router.post('/', async (req: Request, res: Response) => {
  await createContract(req, res);
});

// Route to update contract by ID
router.put('/:id', async (req: Request, res: Response) => {
  await updateContract(req, res);
});

// Route to delete contract by ID
router.delete('/:id', async (req: Request, res: Response) => {
  await deleteContract(req, res);
});

export default router;
