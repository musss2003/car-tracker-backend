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
        }
        .search-input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
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
                            
                            return `
                                <div class="route-card ${cardClass}" data-path="${route.path}" data-methods="${route.methods.join(' ')}">
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
        // Search functionality
        const searchInput = document.getElementById('searchInput');
        const groups = document.querySelectorAll('.group');
        
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            
            groups.forEach(group => {
                let visibleCards = 0;
                const cards = group.querySelectorAll('.route-card');
                
                cards.forEach(card => {
                    const path = card.dataset.path.toLowerCase();
                    const methods = card.dataset.methods.toLowerCase();
                    const text = card.textContent.toLowerCase();
                    
                    if (path.includes(searchTerm) || methods.includes(searchTerm) || text.includes(searchTerm)) {
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
