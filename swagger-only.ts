import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './src/config/swagger';

const app = express();
const PORT = 3001;

// Serve Swagger UI
app.use('/api/swagger', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.listen(PORT, () => {
  console.log(`\n📚 Swagger-only server running at http://localhost:${PORT}`);
  console.log(`   - Swagger UI: http://localhost:${PORT}/api/swagger`);
  console.log(`   - OpenAPI JSON: http://localhost:${PORT}/api/swagger.json\n`);
});
