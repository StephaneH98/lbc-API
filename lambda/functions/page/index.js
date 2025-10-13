const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

/**
 * Fetch avec Puppeteer (vrai navigateur)
 */
async function fetchWithPuppeteer(targetUrl) {
  console.log('\n═══ PUPPETEER BROWSER ═══');
  console.log(`URL cible: ${targetUrl}`);
  
  let browser = null;
  
  try {
    // Lancer Chrome headless
    console.log('→ Lancement Chrome...');
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });
    
    console.log('✓ Chrome lancé');
    
    // Ouvrir une page
    const page = await browser.newPage();
    
    // Headers réalistes
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'fr-FR,fr;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    });
    
    // Naviguer vers la page
    console.log('→ Navigation...');
    await page.goto(targetUrl, {
      waitUntil: 'networkidle2',
      timeout: 20000
    });
    
    console.log('✓ Page chargée');
    
    // Récupérer le HTML complet
    const html = await page.content();
    
    console.log(`✓ HTML récupéré: ${html.length} bytes`);
    
    return {
      success: true,
      html,
      size: html.length
    };
    
  } catch (error) {
    console.log(`❌ Erreur Puppeteer: ${error.message}`);
    
    return {
      success: false,
      error: error.message
    };
    
  } finally {
    if (browser) {
      console.log('→ Fermeture Chrome...');
      await browser.close();
    }
  }
}

/**
 * Handler Lambda
 */
exports.handler = async (event) => {
  console.log('═══════════════════════════════════════');
  console.log('LAMBDA PUPPETEER PROXY');
  console.log('═══════════════════════════════════════');

  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  // CORS Preflight
  const method = event.requestContext?.http?.method || event.httpMethod;
  if (method === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  try {
    // Extraire URL
    const qsp = event.queryStringParameters || {};
    const targetUrl = qsp.url;

    if (!targetUrl) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Paramètre "url" manquant',
          usage: 'GET /proxy?url=https://example.com'
        })
      };
    }

    // Valider URL
    try {
      new URL(targetUrl);
    } catch (e) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'URL invalide',
          details: e.message
        })
      };
    }

    // Fetch avec Puppeteer
    const startTime = Date.now();
    const result = await fetchWithPuppeteer(targetUrl);
    const duration = Date.now() - startTime;
    
    console.log(`\n⏱ Durée totale: ${duration}ms`);

    // Échec
    if (!result.success) {
      return {
        statusCode: 502,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Échec du scraping',
          details: result.error,
          duration: `${duration}ms`
        })
      };
    }

    // Succès
    console.log('✅ SUCCÈS');
    console.log('═══════════════════════════════════════\n');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'X-Proxy-Method': 'puppeteer',
        'X-Response-Size': result.size.toString(),
        'X-Duration-Ms': duration.toString()
      },
      body: result.html
    };

  } catch (error) {
    console.error('💥 ERREUR:', error);

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Erreur serveur',
        message: error.message
      })
    };
  }
};
