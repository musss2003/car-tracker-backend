import express from 'express';
import {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  searchCustomersByName,
  getCustomerByPassportNumber,
  getCustomerByDriverLicense,
  getCustomerByIdOfPerson,
  searchCustomersByEmail,
  searchCustomersByPhone,
  getCustomersByCountry,
  getCustomersByCity,
  getRecentCustomers,
  getCustomerContracts,
} from '../controllers/customer.controller';
import authenticate from '../middlewares/verify-jwt.middleware';

const router = express.Router();

// Middleware to verify JWT for all routes
router.use(authenticate);

/**
 * @swagger
 * /api/customers:
 *   get:
 *     tags: [Customers]
 *     summary: Get all customers
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all customers
 */
router.get('/', getCustomers);

/**
 * @swagger
 * /api/customers:
 *   post:
 *     tags: [Customers]
 *     summary: Create a new customer
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCustomerDto'
 *     responses:
 *       201:
 *         description: Customer created successfully
 */
router.post('/', createCustomer);

/**
 * @swagger
 * /api/customers/search:
 *   get:
 *     tags: [Customers]
 *     summary: Search customers by name
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of matching customers
 */
router.get('/search', searchCustomersByName);

/**
 * @swagger
 * /api/customers/search-email:
 *   get:
 *     tags: [Customers]
 *     summary: Search customers by email
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of matching customers
 */
router.get('/search-email', searchCustomersByEmail);

/**
 * @swagger
 * /api/customers/search-phone:
 *   get:
 *     tags: [Customers]
 *     summary: Search customers by phone
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: phone
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of matching customers
 */
router.get('/search-phone', searchCustomersByPhone);

/**
 * @swagger
 * /api/customers/recent:
 *   get:
 *     tags: [Customers]
 *     summary: Get recently created customers
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of recent customers
 */
router.get('/recent', getRecentCustomers);

/**
 * @swagger
 * /api/customers/country/{country}:
 *   get:
 *     tags: [Customers]
 *     summary: Get customers by country
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: country
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of customers from specified country
 */
router.get('/country/:country', getCustomersByCountry);

/**
 * @swagger
 * /api/customers/city/{city}:
 *   get:
 *     tags: [Customers]
 *     summary: Get customers by city
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: city
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of customers from specified city
 */
router.get('/city/:city', getCustomersByCity);

/**
 * @swagger
 * /api/customers/passport/{passportNumber}:
 *   get:
 *     tags: [Customers]
 *     summary: Get customer by passport number
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: passportNumber
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Customer details
 *       404:
 *         description: Customer not found
 */
router.get('/passport/:passportNumber', getCustomerByPassportNumber);

/**
 * @swagger
 * /api/customers/license/{driverLicenseNumber}:
 *   get:
 *     tags: [Customers]
 *     summary: Get customer by driver license number
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: driverLicenseNumber
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Customer details
 *       404:
 *         description: Customer not found
 */
router.get('/license/:driverLicenseNumber', getCustomerByDriverLicense);

/**
 * @swagger
 * /api/customers/id-person/{idOfPerson}:
 *   get:
 *     tags: [Customers]
 *     summary: Get customer by ID of person
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: idOfPerson
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Customer details
 *       404:
 *         description: Customer not found
 */
router.get('/id-person/:idOfPerson', getCustomerByIdOfPerson);

/**
 * @swagger
 * /api/customers/{id}/contracts:
 *   get:
 *     tags: [Customers]
 *     summary: Get all contracts for a specific customer
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: List of customer contracts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Contract'
 *       400:
 *         description: Invalid customer ID format
 *       404:
 *         description: Customer not found
 */
router.get('/:id/contracts', getCustomerContracts);

/**
 * @swagger
 * /api/customers/{id}:
 *   get:
 *     tags: [Customers]
 *     summary: Get customer by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Customer details
 *       404:
 *         description: Customer not found
 */
router.get('/:id', getCustomer);

/**
 * @swagger
 * /api/customers/{id}:
 *   put:
 *     tags: [Customers]
 *     summary: Update customer by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCustomerDto'
 *     responses:
 *       200:
 *         description: Customer updated successfully
 */
router.put('/:id', updateCustomer);

/**
 * @swagger
 * /api/customers/{id}:
 *   delete:
 *     tags: [Customers]
 *     summary: Delete customer by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Customer deleted successfully
 */
router.delete('/:id', deleteCustomer);

export default router;
