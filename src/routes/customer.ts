import express, { Request, Response } from 'express';
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
  getRecentCustomers
} from '../controllers/customer.controller';
import authenticate from '../middlewares/verifyJWT';

const router = express.Router();

// Middleware to verify JWT for all routes
router.use(authenticate);

// Route to get all customers
router.get('/', getCustomers);

// Route to create a new customer
router.post('/', createCustomer);

// Route to search customers by name (query param)
router.get('/search', searchCustomersByName);

// Route to search customers by email (query param)
router.get('/search-email', searchCustomersByEmail);

// Route to search customers by phone (query param)
router.get('/search-phone', searchCustomersByPhone);

// Route to get recent customers
router.get('/recent', getRecentCustomers);

// Route to get customers by country
router.get('/country/:country', getCustomersByCountry);

// Route to get customers by city
router.get('/city/:city', getCustomersByCity);

// Route to get customer by passport number
router.get('/passport/:passportNumber', getCustomerByPassportNumber);

// Route to get customer by driver license number
router.get('/license/:driverLicenseNumber', getCustomerByDriverLicense);

// Route to get customer by ID of person
router.get('/id-person/:idOfPerson', getCustomerByIdOfPerson);

// Route to get a single customer by ID
router.get('/:id', getCustomer);

// Route to update a customer by ID
router.put('/:id', updateCustomer);

// Route to delete a customer by ID
router.delete('/:id', deleteCustomer);

export default router;
