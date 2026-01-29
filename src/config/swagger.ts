import swaggerJsdoc from 'swagger-jsdoc';
import { swaggerSchemas } from './swagger-schemas';

// Once the backend is running in development mode:

// - **Swagger UI**: http://localhost:5001/api/swagger
// - **OpenAPI JSON**: http://localhost:5001/api/swagger.json
// - **Routes List**: http://localhost:5001/routes
// - **HTML Docs**: http://localhost:5001/api-docs

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Car Tracker API',
      version: '1.0.0',
      description:
        'API documentation for Car Tracker application - manage cars, contracts, customers, and more',
      contact: {
        name: 'Car Tracker Support',
        email: 'support@cartracker.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:5001/api',
        description: 'Development server',
      },
      // Production server removed for security - Swagger is dev-only
      // Never test against production from Swagger UI
    ],
    tags: [
      { name: 'Authentication', description: 'User authentication and session management' },
      { name: 'Users', description: 'User management endpoints' },
      { name: 'Cars', description: 'Car inventory management' },
      { name: 'Customers', description: 'Customer management' },
      { name: 'Contracts', description: 'Rental contract operations' },
      { name: 'Notifications', description: 'Notification system' },
      { name: 'Car Insurance', description: 'Car insurance records' },
      { name: 'Car Registration', description: 'Car registration renewals' },
      { name: 'Car Service', description: 'Car service and maintenance history' },
      { name: 'Car Issue Reports', description: 'Car issue and problem reporting' },
      { name: 'Countries', description: 'Country data' },
      { name: 'Activity', description: 'User activity and online status' },
      { name: 'Audit Logs', description: 'System audit logs and activity tracking' },
      { name: 'File Upload', description: 'Document upload and download operations' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'accessToken',
        },
      },
      schemas: swaggerSchemas,
    },
    security: [
      {
        bearerAuth: [],
      },
      {
        cookieAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts', './src/models/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
