const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Activer le mode furtif
puppeteer.use(StealthPlugin());

exports.handler = async (event, context) => {
    console.log('🚀 Lambda avec Stealth Mode');
    
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: getCorsHeaders(event),
            body: ''
        };
    }
    
    let browser = null;
    
    try {
        const targetUrl = event.queryStringParameters?.url || 
                         (event.body ? JSON.parse(event.body).url : null);
        
        if (!targetUrl) {
            return createErrorResponse(event, 400, 'URL manquante');
        }
        
        console.log('🌐 URL cible:', targetUrl);
        
        // Configuration avancée
        browser = await puppeteer.launch({
            args: [
                ...chromium.args,
                '--disable-blink-features=AutomationControlled',
                '--disable-features=IsolateOrigins,site-per-process',
                '--disable-web-security'
            ],
            defaultViewport: {
                width: 1920,
                height: 1080,
                deviceScaleFactor: 1,
                hasTouch: false,
                isLandscape: true,
                isMobile: false
            },
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });
        
        console.log('✅ Browser lancé (stealth mode)');
        
        const page = await browser.newPage();
        
        // User-Agent réaliste
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );
        
        // Headers réalistes
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0'
        });
        
        // Masquer les traces de Puppeteer
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
            });
            
            // Chrome specific fixes
            window.chrome = {
                runtime: {},
            };
            
            // Permissions fix
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery(parameters)
            );
        });
        
        console.log('📡 Navigation avec stealth...');
        
        // Navigation avec retry
        let response;
        let attempts = 0;
        const maxAttempts = 3;
        
        while (attempts < maxAttempts) {
            try {
                response = await page.goto(targetUrl, {
                    waitUntil: 'networkidle2',
                    timeout: 30000
                });
                break;
            } catch (error) {
                attempts++;
                console.log(`⚠️ Tentative ${attempts}/${maxAttempts} échouée`);
                if (attempts === maxAttempts) throw error;
                await page.waitForTimeout(2000);
            }
        }
        
        const statusCode = response.status();
        console.log('📊 Status:', statusCode);
        
        // Attendre plus longtemps pour le JavaScript
        await page.waitForTimeout(5000);
        
        // Scroller pour déclencher le lazy loading
        await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight / 2);
        });
        await page.waitForTimeout(2000);
        
        const htmlContent = await page.content();
        const title = await page.title();
        
        // Vérifier si on a un CAPTCHA
        const hasCaptcha = htmlContent.includes('captcha-delivery') || 
                          htmlContent.includes('DataDome');
        
        console.log('✅ Page récupérée:', {
            title: title.substring(0, 50),
            size: htmlContent.length,
            hasCaptcha
        });
        
        await browser.close();
        browser = null;
        
        return {
            statusCode: 200,
            headers: {
                ...getCorsHeaders(event),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: !hasCaptcha,
                url: targetUrl,
                title,
                statusCode,
                content: htmlContent,
                size: htmlContent.length,
                hasCaptcha,
                warning: hasCaptcha ? 'CAPTCHA détecté - Le site bloque les bots' : null,
                timestamp: new Date().toISOString()
            })
        };
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        console.error('Stack:', error.stack);
        
        if (browser) {
            try {
                await browser.close();
            } catch (e) {}
        }
        
        return createErrorResponse(event, 500, error.message);
    }
};

function getCorsHeaders(event) {
    const origin = event.headers?.origin || 
                   event.headers?.Origin || 
                   'http://localhost:3000';
    
    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true'
    };
}

function createErrorResponse(event, statusCode, message) {
    return {
        statusCode,
        headers: {
            ...getCorsHeaders(event),
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            success: false,
            error: message,
            statusCode,
            timestamp: new Date().toISOString()
        })
    };
}
