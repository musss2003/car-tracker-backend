import express, { Request, Response } from 'express';
import { getCustomer, getCustomers, updateCustomer, deleteCustomer, createCustomer, searchCustomersByName } from '../controllers/customer';
import authenticate from '../middlewares/verifyJWT';

const router = express.Router();

// Middleware to verify JWT for all routes
router.use(authenticate);


// Route to search customers by name
router.get('/search', async (req: Request, res: Response) => {
    await searchCustomersByName(req, res);
});

// Route to get a single customer by ID
router.get('/:id', async (req: Request, res: Response) => {
    await getCustomer(req, res);
});

// Route to get all customers
router.get('/', async (req: Request, res: Response) => {
    await getCustomers(req, res);
});

// Route to create a new contract
router.post('/', async (req: Request, res: Response) => {
    await createCustomer(req, res);
});

// Route to update a customer by ID
router.put('/:id', async (req: Request, res: Response) => {
    await updateCustomer(req, res);
});

// Route to delete a customer by ID
router.delete('/:id', async (req: Request, res: Response) => {
    await deleteCustomer(req, res);
});

export default router;
