import { Router, Request, Response } from 'express';
import endPoints from 'express-list-endpoints';
import { Application } from 'express';

const router = Router();

/**
 * GET /routes
 * Returns all routes in JSON format
 */
export const getRoutesJSON = (app: Application) => (req: Request, res: Response) => {
    res.status(200).json(endPoints(app));
};

/**
 * GET /api-docs
 * Interactive HTML documentation page
 */
export const getAPIDocs = (app: Application) => (req: Request, res: Response) => {
    const routes = endPoints(app);
    
    // Group routes by base path
    const groupedRoutes: Record<string, any[]> = {};
    routes.forEach(route => {
        const basePath = route.path.split('/')[1] || 'root';
        if (!groupedRoutes[basePath]) {
            groupedRoutes[basePath] = [];
        }
        groupedRoutes[basePath].push(route);
    });

    // Helper function to map routes to TypeORM models
    const getModelFromPath = (path: string): string => {
        if (path.includes('/users')) return 'User';
        if (path.includes('/cars') && path.includes('/insurance')) return 'CarInsurance';
        if (path.includes('/cars') && path.includes('/issues')) return 'CarIssueReport';
        if (path.includes('/cars') && path.includes('/registrations')) return 'CarRegistration';
        if (path.includes('/cars') && path.includes('/service')) return 'CarServiceHistory';
        if (path.includes('/cars')) return 'Car';
        if (path.includes('/contracts')) return 'Contract';
        if (path.includes('/customers')) return 'Customer';
        if (path.includes('/notifications')) return 'Notification';
        if (path.includes('/countries')) return 'Country';
        if (path.includes('/audit-logs')) return 'AuditLog';
        if (path.includes('/auth')) return 'Auth';
        return 'Other';
    };

    // Helper function to determine response format based on path
    const getResponseFormat = (path: string, method: string): string => {
        // Auth endpoints return direct format
        if (path.includes('/auth/login') || path.includes('/auth/register')) {
            return JSON.stringify({
                id: 'string (UUID)',
                username: 'string',
                email: 'string',
                role: 'string ("user" | "admin" | "employee")',
                accessToken: 'string (JWT)'
            }, null, 2);
        }
        
        // Determine data type based on path
        let dataFormat = '{}';
        
        if (path.includes('/users')) {
            if (method === 'GET' && !path.includes(':id')) {
                dataFormat = JSON.stringify([{
                    id: 'string',
                    username: 'string',
                    email: 'string',
                    role: 'string',
                    name: 'string',
                    profilePhotoUrl: 'string (optional)',
                    lastActiveAt: 'string (ISO date)',
                    createdAt: 'string (ISO date)'
                }], null, 2);
            } else {
                dataFormat = JSON.stringify({
                    id: 'string',
                    username: 'string',
                    email: 'string',
                    role: 'string',
                    name: 'string',
                    phone: 'string (optional)',
                    address: 'string (optional)',
                    profilePhotoUrl: 'string (optional)',
                    lastActiveAt: 'string (ISO date)',
                    createdAt: 'string (ISO date)',
                    updatedAt: 'string (ISO date)'
                }, null, 2);
            }
        } else if (path.includes('/cars')) {
            if (method === 'GET' && !path.includes(':id')) {
                dataFormat = JSON.stringify([{
                    id: 'string',
                    licensePlate: 'string',
                    manufacturer: 'string',
                    model: 'string',
                    year: 'number',
                    color: 'string',
                    mileage: 'number',
                    status: 'string ("available" | "rented" | "maintenance")',
                    pricePerDay: 'number',
                    category: 'string',
                    fuelType: 'string',
                    transmission: 'string',
                    seats: 'number',
                    photoUrl: 'string (optional)',
                    createdAt: 'string (ISO date)'
                }], null, 2);
            } else {
                dataFormat = JSON.stringify({
                    id: 'string',
                    licensePlate: 'string',
                    manufacturer: 'string',
                    model: 'string',
                    year: 'number',
                    color: 'string',
                    mileage: 'number',
                    status: 'string',
                    pricePerDay: 'number',
                    category: 'string',
                    fuelType: 'string',
                    transmission: 'string',
                    seats: 'number',
                    photoUrl: 'string (optional)',
                    createdAt: 'string (ISO date)',
                    updatedAt: 'string (ISO date)'
                }, null, 2);
            }
        } else if (path.includes('/contracts')) {
            if (method === 'GET' && !path.includes(':id')) {
                dataFormat = JSON.stringify([{
                    id: 'string',
                    carId: 'string',
                    customerId: 'string',
                    startDate: 'string (ISO date)',
                    endDate: 'string (ISO date)',
                    totalAmount: 'number',
                    status: 'string ("active" | "completed" | "cancelled")',
                    notes: 'string (optional)',
                    documentUrl: 'string (optional)',
                    createdAt: 'string (ISO date)'
                }], null, 2);
            } else {
                dataFormat = JSON.stringify({
                    id: 'string',
                    carId: 'string',
                    customerId: 'string',
                    startDate: 'string (ISO date)',
                    endDate: 'string (ISO date)',
                    totalAmount: 'number',
                    status: 'string',
                    notes: 'string (optional)',
                    documentUrl: 'string (optional)',
                    createdAt: 'string (ISO date)',
                    updatedAt: 'string (ISO date)'
                }, null, 2);
            }
        } else if (path.includes('/customers')) {
            if (method === 'GET' && !path.includes(':id')) {
                dataFormat = JSON.stringify([{
                    id: 'string',
                    name: 'string',
                    email: 'string',
                    phone: 'string',
                    address: 'string',
                    city: 'string',
                    country: 'string',
                    idOfPerson: 'string (optional)',
                    createdAt: 'string (ISO date)'
                }], null, 2);
            } else {
                dataFormat = JSON.stringify({
                    id: 'string',
                    name: 'string',
                    email: 'string',
                    phone: 'string',
                    address: 'string',
                    city: 'string',
                    country: 'string',
                    passportNumber: 'string (optional)',
                    driverLicenseNumber: 'string (optional)',
                    idOfPerson: 'string (optional)',
                    createdAt: 'string (ISO date)',
                    updatedAt: 'string (ISO date)'
                }, null, 2);
            }
        } else if (path.includes('/notifications')) {
            dataFormat = JSON.stringify([{
                id: 'string',
                recipientId: 'string',
                senderId: 'string (optional)',
                type: 'string',
                message: 'string',
                status: 'string ("unread" | "read")',
                createdAt: 'string (ISO date)'
            }], null, 2);
        } else if (path.includes('/audit-logs')) {
            dataFormat = JSON.stringify({
                logs: [{
                    id: 'string',
                    userId: 'string',
                    action: 'string',
                    resourceType: 'string',
                    resourceId: 'string (optional)',
                    details: 'object (optional)',
                    ipAddress: 'string',
                    userAgent: 'string',
                    createdAt: 'string (ISO date)'
                }],
                pagination: {
                    page: 'number',
                    limit: 'number',
                    total: 'number',
                    totalPages: 'number'
                }
            }, null, 2);
        } else if (method === 'DELETE') {
            dataFormat = JSON.stringify({
                message: 'string',
                deletedId: 'string'
            }, null, 2);
        } else if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
            dataFormat = JSON.stringify({
                id: 'string',
                message: 'string (optional)',
                createdAt: 'string (ISO date, optional)',
                updatedAt: 'string (ISO date, optional)'
            }, null, 2);
        }
        
        // Wrap in standard API response format (except auth endpoints)
        if (path.includes('/auth/login') || path.includes('/auth/register')) {
            return dataFormat;
        }
        
        return JSON.stringify({
            success: 'boolean',
            data: JSON.parse(dataFormat),
            message: 'string (optional)',
            timestamp: 'string (ISO 8601)'
        }, null, 2);
    };

    // Response format mappings with basic data types
    const responseFormats: Record<string, any> = {
        // Standard API Response
        'standard': {
            success: 'boolean',
            data: 'T (varies by endpoint)',
            message: 'string (optional)',
            timestamp: 'string (ISO 8601)'
        },
        // Auth endpoints
        'auth': {
            id: 'string (UUID)',
            username: 'string',
            email: 'string',
            role: 'string ("user" | "admin" | "employee")',
            accessToken: 'string (JWT)'
        },
        // User object
        'user': {
            id: 'string (UUID)',
            username: 'string',
            email: 'string',
            name: 'string',
            role: 'string',
            profilePhotoUrl: 'string (optional)',
            phone: 'string (optional)',
            address: 'string (optional)',
            lastActiveAt: 'string (ISO date)',
            createdAt: 'string (ISO date)',
            updatedAt: 'string (ISO date)'
        },
        // Car object
        'car': {
            id: 'string (UUID)',
            licensePlate: 'string',
            manufacturer: 'string',
            model: 'string',
            year: 'number',
            color: 'string',
            mileage: 'number',
            status: 'string ("available" | "rented" | "maintenance")',
            pricePerDay: 'number',
            category: 'string',
            fuelType: 'string',
            transmission: 'string',
            seats: 'number',
            photoUrl: 'string (optional)',
            createdAt: 'string (ISO date)',
            updatedAt: 'string (ISO date)'
        },
        // Contract object
        'contract': {
            id: 'string (UUID)',
            carId: 'string (UUID)',
            customerId: 'string (UUID)',
            startDate: 'string (ISO date)',
            endDate: 'string (ISO date)',
            totalAmount: 'number',
            status: 'string ("active" | "completed" | "cancelled")',
            notes: 'string (optional)',
            documentUrl: 'string (optional)',
            createdAt: 'string (ISO date)',
            updatedAt: 'string (ISO date)'
        },
        // Customer object
        'customer': {
            id: 'string (UUID)',
            name: 'string',
            email: 'string',
            phone: 'string',
            address: 'string',
            city: 'string',
            country: 'string',
            passportNumber: 'string (optional)',
            driverLicenseNumber: 'string (optional)',
            idOfPerson: 'string (optional)',
            createdAt: 'string (ISO date)',
            updatedAt: 'string (ISO date)'
        },
        // Notification object
        'notification': {
            id: 'string (UUID)',
            recipientId: 'string (UUID)',
            senderId: 'string (UUID, optional)',
            type: 'string',
            message: 'string',
            status: 'string ("unread" | "read")',
            createdAt: 'string (ISO date)'
        },
        // Pagination format
        'pagination': {
            page: 'number',
            limit: 'number',
            total: 'number',
            totalPages: 'number'
        }
    };

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Car Tracker API Documentation</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            line-height: 1.6;
            padding: 20px;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            font-weight: 700;
        }
        .header p {
            font-size: 1.1em;
            opacity: 0.9;
        }
        .stats {
            display: flex;
            justify-content: space-around;
            padding: 30px;
            background: #f8f9fa;
            border-bottom: 2px solid #e9ecef;
        }
        .stat {
            text-align: center;
        }
        .stat-number {
            font-size: 2.5em;
            font-weight: bold;
            color: #667eea;
        }
        .stat-label {
            color: #6c757d;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .content {
            padding: 40px;
        }
        .search-box {
            margin-bottom: 30px;
            position: sticky;
            top: 0;
            background: white;
            z-index: 100;
            padding: 20px 0;
            border-bottom: 2px solid #e9ecef;
        }
        .search-input {
            width: 100%;
            padding: 15px 20px;
            font-size: 16px;
            border: 2px solid #dee2e6;
            border-radius: 8px;
            transition: all 0.3s;
            margin-bottom: 15px;
        }
        .search-input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        .filters {
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
            align-items: center;
        }
        .filter-group {
            display: flex;
            gap: 8px;
            align-items: center;
        }
        .filter-label {
            font-weight: 600;
            color: #495057;
            font-size: 0.9em;
        }
        .filter-btn {
            padding: 8px 16px;
            border: 2px solid #dee2e6;
            background: white;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.85em;
            font-weight: 500;
            transition: all 0.3s;
        }
        .filter-btn:hover {
            border-color: #667eea;
            background: #f8f9fa;
        }
        .filter-btn.active {
            background: #667eea;
            color: white;
            border-color: #667eea;
        }
        .response-format {
            margin-top: 15px;
            padding: 12px;
            background: #ffffff;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            font-size: 0.85em;
        }
        .response-format-title {
            font-weight: 600;
            color: #495057;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 5px;
        }
        .response-format pre {
            background: #f8f9fa;
            padding: 10px;
            border-radius: 4px;
            overflow-x: auto;
            margin: 0;
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 0.9em;
            line-height: 1.5;
        }
        .group {
            margin-bottom: 40px;
        }
        .group-title {
            font-size: 1.8em;
            color: #667eea;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 3px solid #667eea;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .group-title .count {
            background: #667eea;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.6em;
            font-weight: normal;
        }
        .route-card {
            background: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 20px;
            margin-bottom: 15px;
            border-radius: 8px;
            transition: all 0.3s;
        }
        .route-card:hover {
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            transform: translateX(5px);
        }
        .route-path {
            font-size: 1.2em;
            font-weight: 600;
            color: #212529;
            margin-bottom: 10px;
            font-family: 'Monaco', 'Courier New', monospace;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .methods {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }
        .method {
            padding: 6px 12px;
            border-radius: 5px;
            font-size: 0.85em;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .method.get { background: #28a745; color: white; }
        .method.post { background: #007bff; color: white; }
        .method.put { background: #ffc107; color: #333; }
        .method.patch { background: #17a2b8; color: white; }
        .method.delete { background: #dc3545; color: white; }
        .middlewares {
            margin-top: 10px;
            font-size: 0.9em;
            color: #6c757d;
        }
        .middleware-tag {
            display: inline-block;
            background: #e9ecef;
            padding: 4px 8px;
            border-radius: 4px;
            margin-right: 5px;
            margin-top: 5px;
            font-size: 0.85em;
        }
        .auth-required {
            background: #fff3cd;
            border-left-color: #ffc107;
        }
        .admin-only {
            background: #f8d7da;
            border-left-color: #dc3545;
        }
        .no-auth {
            background: #d1ecf1;
            border-left-color: #17a2b8;
        }
        .footer {
            text-align: center;
            padding: 30px;
            background: #f8f9fa;
            color: #6c757d;
            border-top: 2px solid #e9ecef;
        }
        .copy-btn {
            background: #667eea;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 0.85em;
            transition: all 0.3s;
            white-space: nowrap;
        }
        .copy-btn:hover {
            background: #5568d3;
            transform: scale(1.05);
        }
        .hidden { display: none; }
        .link-group {
            display: flex;
            gap: 20px;
            justify-content: center;
            flex-wrap: wrap;
        }
        .link-group a {
            color: #667eea;
            text-decoration: none;
            font-weight: 500;
            transition: all 0.3s;
        }
        .link-group a:hover {
            color: #5568d3;
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚗 Car Tracker API</h1>
            <p>Interactive API Documentation & Route Explorer</p>
        </div>
        
        <div class="stats">
            <div class="stat">
                <div class="stat-number">${routes.length}</div>
                <div class="stat-label">Total Routes</div>
            </div>
            <div class="stat">
                <div class="stat-number">${Object.keys(groupedRoutes).length}</div>
                <div class="stat-label">Resource Groups</div>
            </div>
            <div class="stat">
                <div class="stat-number">${routes.reduce((acc, r) => acc + r.methods.length, 0)}</div>
                <div class="stat-label">Total Endpoints</div>
            </div>
        </div>
        
        <div class="content">
            <div class="search-box">
                <input 
                    type="text" 
                    class="search-input" 
                    id="searchInput" 
                    placeholder="🔍 Search routes, methods, or paths... (e.g., 'GET /api/cars' or 'authentication')"
                >
                
                <div class="filters">
                    <div class="filter-group">
                        <span class="filter-label">Method:</span>
                        <button class="filter-btn active" data-filter="method" data-value="all">All</button>
                        <button class="filter-btn" data-filter="method" data-value="get">GET</button>
                        <button class="filter-btn" data-filter="method" data-value="post">POST</button>
                        <button class="filter-btn" data-filter="method" data-value="put">PUT</button>
                        <button class="filter-btn" data-filter="method" data-value="patch">PATCH</button>
                        <button class="filter-btn" data-filter="method" data-value="delete">DELETE</button>
                    </div>
                    
                    <div class="filter-group">
                        <span class="filter-label">Auth:</span>
                        <button class="filter-btn active" data-filter="auth" data-value="all">All</button>
                        <button class="filter-btn" data-filter="auth" data-value="public">Public</button>
                        <button class="filter-btn" data-filter="auth" data-value="authenticated">Authenticated</button>
                        <button class="filter-btn" data-filter="auth" data-value="admin">Admin Only</button>
                    </div>
                    
                    <div class="filter-group">
                        <span class="filter-label">Sort:</span>
                        <button class="filter-btn active" data-filter="sort" data-value="group">By Group</button>
                        <button class="filter-btn" data-filter="sort" data-value="alpha">Alphabetical</button>
                        <button class="filter-btn" data-filter="sort" data-value="model">By Model</button>
                    </div>
                </div>
            </div>
            
            <div id="routeGroups">
                ${Object.entries(groupedRoutes).map(([group, groupRoutes]) => `
                    <div class="group" data-group="${group}">
                        <h2 class="group-title">
                            <span>${group === 'api' ? '🔌 API Routes' : group === 'root' ? '🏠 Root Routes' : '📁 ' + group.toUpperCase()}</span>
                            <span class="count">${groupRoutes.length}</span>
                        </h2>
                        ${groupRoutes.map(route => {
                            const isAuthRequired = route.middlewares?.some((m: string) => 
                                m.includes('verifyJWT') || m.includes('authenticate')
                            );
                            const isAdminOnly = route.middlewares?.some((m: string) => 
                                m.includes('admin') || m.includes('verifyRole')
                            );
                            const isNoAuth = route.middlewares?.some((m: string) => 
                                m.includes('anonymous')
                            );
                            
                            const cardClass = isAdminOnly ? 'admin-only' : isNoAuth ? 'no-auth' : isAuthRequired ? 'auth-required' : '';
                            
                            const modelName = getModelFromPath(route.path);
                            
                            return `
                                <div class="route-card ${cardClass}" data-path="${route.path}" data-methods="${route.methods.join(' ')}" data-auth="${isAdminOnly ? 'admin' : isNoAuth ? 'public' : isAuthRequired ? 'authenticated' : 'public'}" data-model="${modelName}">
                                    <div class="route-path">
                                        <span>${route.path}</span>
                                        <button class="copy-btn" onclick="copyToClipboard('${route.path}')">📋 Copy</button>
                                    </div>
                                    <div class="methods">
                                        ${route.methods.map((method: string) => `
                                            <span class="method ${method.toLowerCase()}">${method}</span>
                                        `).join('')}
                                    </div>
                                    ${route.middlewares && route.middlewares.length > 0 ? `
                                        <div class="middlewares">
                                            <strong>Middlewares:</strong>
                                            ${route.middlewares.map((mw: string) => `
                                                <span class="middleware-tag">${mw}</span>
                                            `).join('')}
                                        </div>
                                    ` : ''}
                                    <div class="response-format">
                                        <div class="response-format-title">📤 Response Format:</div>
                                        <pre>${getResponseFormat(route.path, route.methods[0]).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="footer">
            <p><strong>Car Tracker API</strong> - Built with Express.js & TypeORM</p>
            <p style="margin-top: 15px;" class="link-group">
                <a href="/routes">📄 View JSON</a>
                <a href="/health">🏥 Health Check</a>
                <a href="https://github.com/musss2003/car-tracker-backend" target="_blank">📚 GitHub</a>
            </p>
        </div>
    </div>
    
    <script>
        // Filter state
        let filters = {
            method: 'all',
            auth: 'all',
            sort: 'group',
            search: ''
        };
        
        // Store original HTML for restoration
        const routeGroupsContainer = document.getElementById('routeGroups');
        const originalGroupsHTML = routeGroupsContainer.innerHTML;
        
        // Elements
        const searchInput = document.getElementById('searchInput');
        const filterButtons = document.querySelectorAll('.filter-btn');
        
        // Apply all filters
        function applyFilters() {
            // First, restore original grouping or apply sort
            if (filters.sort === 'alpha') {
                applySortAlphabetical();
            } else if (filters.sort === 'model') {
                applySortByModel();
            } else {
                // Restore original grouping if currently showing custom sort
                if (routeGroupsContainer.querySelector('[data-group="all"]') || routeGroupsContainer.querySelector('[data-group="model-"]')) {
                    routeGroupsContainer.innerHTML = originalGroupsHTML;
                }
            }
            
            // Now apply search and filters
            const groups = document.querySelectorAll('.group');
            groups.forEach(group => {
                let visibleCards = 0;
                const cards = group.querySelectorAll('.route-card');
                
                cards.forEach(card => {
                    let visible = true;
                    
                    // Search filter
                    if (filters.search) {
                        const path = card.dataset.path.toLowerCase();
                        const methods = card.dataset.methods.toLowerCase();
                        const text = card.textContent.toLowerCase();
                        visible = visible && (path.includes(filters.search) || methods.includes(filters.search) || text.includes(filters.search));
                    }
                    
                    // Method filter
                    if (filters.method !== 'all') {
                        const methods = card.dataset.methods.toLowerCase();
                        visible = visible && methods.includes(filters.method);
                    }
                    
                    // Auth filter
                    if (filters.auth !== 'all') {
                        const auth = card.dataset.auth;
                        visible = visible && auth === filters.auth;
                    }
                    
                    if (visible) {
                        card.classList.remove('hidden');
                        visibleCards++;
                    } else {
                        card.classList.add('hidden');
                    }
                });
                
                // Hide group if no visible cards
                if (visibleCards === 0) {
                    group.classList.add('hidden');
                } else {
                    group.classList.remove('hidden');
                }
            });
        }
        
        // Apply alphabetical sorting
        function applySortAlphabetical() {
            const groups = routeGroupsContainer.querySelectorAll('.group');
            const allCards = [];
            
            groups.forEach(group => {
                const cards = Array.from(group.querySelectorAll('.route-card'));
                allCards.push(...cards);
            });
            
            // Sort cards alphabetically by path
            allCards.sort((a, b) => {
                return a.dataset.path.localeCompare(b.dataset.path);
            });
            
            // Create a single group with sorted cards
            routeGroupsContainer.innerHTML = \`
                <div class="group" data-group="all">
                    <h2 class="group-title">
                        <span>📋 All Routes (Alphabetical)</span>
                        <span class="count">\${allCards.length}</span>
                    </h2>
                    \${allCards.map(card => card.outerHTML).join('')}
                </div>
            \`;
        }
        
        // Apply model-based sorting
        function applySortByModel() {
            const groups = routeGroupsContainer.querySelectorAll('.group');
            const allCards = [];
            
            groups.forEach(group => {
                const cards = Array.from(group.querySelectorAll('.route-card'));
                allCards.push(...cards);
            });
            
            // Group by model
            const modelGroups = {};
            allCards.forEach(card => {
                const model = card.dataset.model || 'Other';
                if (!modelGroups[model]) {
                    modelGroups[model] = [];
                }
                modelGroups[model].push(card);
            });
            
            // Sort models alphabetically
            const sortedModels = Object.keys(modelGroups).sort();
            
            // Model icons
            const modelIcons = {
                'User': '👤',
                'Car': '🚗',
                'CarInsurance': '🛡️',
                'CarIssueReport': '⚠️',
                'CarRegistration': '📋',
                'CarServiceHistory': '🔧',
                'Contract': '📄',
                'Customer': '👥',
                'Notification': '🔔',
                'Country': '🌍',
                'AuditLog': '📊',
                'Auth': '🔐',
                'Other': '📦'
            };
            
            // Create groups by model
            const html = sortedModels.map(model => {
                const cards = modelGroups[model];
                const icon = modelIcons[model] || '📦';
                return \`
                    <div class="group" data-group="model-\${model}">
                        <h2 class="group-title">
                            <span>\${icon} \${model} Model</span>
                            <span class="count">\${cards.length}</span>
                        </h2>
                        \${cards.map(card => card.outerHTML).join('')}
                    </div>
                \`;
            }).join('');
            
            routeGroupsContainer.innerHTML = html;
        }
        
        // Search functionality
        searchInput.addEventListener('input', (e) => {
            filters.search = e.target.value.toLowerCase();
            applyFilters();
        });
        
        // Filter button handling
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                const filterType = button.dataset.filter;
                const filterValue = button.dataset.value;
                
                // Update filter state
                filters[filterType] = filterValue;
                
                // Update active state for buttons in same group
                const sameGroupButtons = document.querySelectorAll(\`[data-filter="\${filterType}"]\`);
                sameGroupButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // Apply filters
                applyFilters();
            });
        });
        
        // Copy to clipboard
        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                const btn = event.target;
                const originalText = btn.textContent;
                btn.textContent = '✓ Copied!';
                btn.style.background = '#28a745';
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.background = '#667eea';
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy:', err);
                alert('Copied: ' + text);
            });
        }
    </script>
</body>
</html>
    `;
    
    res.send(html);
};

export default router;
