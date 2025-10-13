const https = require('https');
const http = require('http');
const zlib = require('zlib');
const { URL } = require('url');

// ==========================================
// HEADERS RÉALISTES COMPLETS
// ==========================================
const REALISTIC_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
    'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'DNT': '1',
    'Sec-GPC': '1',
    'Sec-Ch-Ua': '"Chromium";v="133", "Not-A.Brand";v="99"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
};

exports.handler = async (event) => {
    console.log('📥 Event reçu:', JSON.stringify(event, null, 2));
    
    try {
        // ========== EXTRACTION URL ==========
        let targetUrl, userHeaders = {};
        
        if (event.queryStringParameters) {
            targetUrl = event.queryStringParameters.url;
            if (event.queryStringParameters.userHeaders) {
                try {
                    userHeaders = JSON.parse(event.queryStringParameters.userHeaders);
                } catch (e) {
                    console.warn('⚠️ Impossible de parser userHeaders');
                }
            }
        }
        
        if (!targetUrl && event.body) {
            const body = JSON.parse(event.body);
            targetUrl = body.url;
            userHeaders = body.userHeaders || {};
        }
        
        if (!targetUrl && event.url) {
            targetUrl = event.url;
            userHeaders = event.userHeaders || {};
        }
        
        if (!targetUrl) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ 
                    error: 'Paramètre "url" manquant',
                    usage: 'GET /proxy?url=https://example.com'
                })
            };
        }
        
        console.log('🎯 URL cible:', targetUrl);
        
        // ========== FUSION DES HEADERS ==========
        const finalHeaders = {
            ...REALISTIC_HEADERS,
            ...userHeaders  // Les headers utilisateur écrasent les defaults
        };
        
        console.log('📋 Headers finaux:', JSON.stringify(finalHeaders, null, 2));
        
        // ========== REQUÊTE HTTP/HTTPS ==========
        const parsedUrl = new URL(targetUrl);
        const protocol = parsedUrl.protocol === 'https:' ? https : http;
        
        const html = await new Promise((resolve, reject) => {
            const options = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
                path: parsedUrl.pathname + parsedUrl.search,
                method: 'GET',
                headers: finalHeaders,
                timeout: 30000
            };
            
            const req = protocol.request(options, (res) => {
                console.log('📡 Status:', res.statusCode);
                console.log('📋 Response Headers:', JSON.stringify(res.headers, null, 2));
                
                let chunks = [];
                
                // Gérer la compression
                let stream = res;
                const encoding = res.headers['content-encoding'];
                
                if (encoding === 'gzip') {
                    stream = res.pipe(zlib.createGunzip());
                } else if (encoding === 'deflate') {
                    stream = res.pipe(zlib.createInflate());
                } else if (encoding === 'br') {
                    stream = res.pipe(zlib.createBrotliDecompress());
                }
                
                stream.on('data', chunk => chunks.push(chunk));
                stream.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    resolve(buffer.toString('utf-8'));
                });
                stream.on('error', reject);
            });
            
            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
            
            req.end();
        });
        
        console.log('✅ HTML récupéré, taille:', html.length, 'octets');
        
        // Vérifier si c'est un CAPTCHA
        if (html.includes('captcha-delivery') || html.includes('DataDome')) {
            console.warn('⚠️ CAPTCHA détecté !');
        }
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'X-Content-Length': html.length.toString(),
                'X-Has-Captcha': html.includes('captcha') ? 'true' : 'false'
            },
            body: html
        };
        
    } catch (error) {
        console.error('❌ Erreur:', error);
        
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
                error: error.message,
                stack: error.stack,
                type: error.constructor.name
            })
        };
    }
};
