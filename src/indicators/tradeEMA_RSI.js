'use-strict';

// REFEENCE Node Binance API: https://www.npmjs.com/package/node-binance-api
const nodemailer = require("nodemailer");
const fs = require('fs');
const EMA = require('technicalindicators').EMA;
const RSI = require('technicalindicators').RSI;
const trader= require("../trader.js");

// Ejecuta la última estrategia creada en runs
var folder = '/../../runs';
var files = fs.readdirSync(__dirname.concat(folder));  

var runID = files.length;
pathname = __dirname.concat(folder).concat('/').concat(runID);

global.pathname = pathname;

// Lectura y aplicacion de los parámetros de configuracion
let config = fs.readFileSync(pathname.concat('/').concat('status.json'));
let  CONFIG= JSON.parse(config);
let pairing = CONFIG.pairing;
let tp = CONFIG.tp;
let sl = CONFIG.sl;
let ttp = CONFIG.ttp;
let tsl = CONFIG.tsl
let enable_tsl = CONFIG.enable_tsl;
let test = CONFIG.test;
let quantity = CONFIG.quantity;
let callEMAInterval = CONFIG.callEMAInterval;
let monedasANegociar = CONFIG.monedasANegociar;
let KLINE_INTERVAL = CONFIG.KLINE_INTERVAL
let porcentajeRSIBear = CONFIG.porcentajeRSIBear
let porcentajeRSIBull = CONFIG.porcentajeRSIBull

// Lectura y aplicacion de los parametros de autenticacion
let auth = fs.readFileSync(__dirname +  '/../../auth/auth.json');
let  CREDS= JSON.parse(auth);

var add = '';
if(test) add = '_testnet' 
let APIKEY = CREDS['api_futures' + add];
let APISECRET = CREDS['secret_futures' + add];

// Cambios para no tener que importar "a mano" el módulo con las url de la testnet.
// Se declaran las url en funcion de la red Testnet true false.
let fapi = CREDS['fapi' + add];
let dapi = CREDS['dapi' + add];

// Require del módulo npm de Binance 
const Binance = require('node-binance-api');

// Declaración de la clase Binance con las url y APIKEY y SECRET correctas.
const binance = new Binance().options({
    APIKEY: APIKEY,
    APISECRET: APISECRET,
    useServerTime: true,
    recvWindow: 60000, // Set a higher recvWindow to increase response timeout
    verbose: true, // Add extra output when subscribing to WebSockets, etc
    urls:{
        fapi: fapi,
        dapi: dapi,
        base : 'https://api.binance.com/api/',
        wapi : 'https://api.binance.com/wapi/',
        sapi : 'https://api.binance.com/sapi/',
        fapiTest : 'https://testnet.binancefuture.com/fapi/',
        dapiTest : 'https://testnet.binancefuture.com/dapi/',
        fstream : 'wss://fstream.binance.com/stream?streams=',
        fstreamSingle : 'wss://fstream.binance.com/ws/',
        fstreamSingleTest : 'wss://stream.binancefuture.com/ws/',
        fstreamTest : 'wss://stream.binancefuture.com/stream?streams=',
        dstream : 'wss://dstream.binance.com/stream?streams=',
        dstreamSingle : 'wss://dstream.binance.com/ws/',
        dstreamSingleTest : 'wss://dstream.binancefuture.com/ws/',
        dstreamTest : 'wss://dstream.binancefuture.com/stream?streams=',
        stream : 'wss://stream.binance.com:9443/ws/',
        combineStream :'wss://stream.binance.com:9443/stream?streams='
    },
    log: log => {
        console.log(log); // You can create your own logger here, or disable console output
    }
  });
global.binance = binance;

// Lecturad de los datos del correo electrónico
let emailConfig = fs.readFileSync(__dirname +  '/../../email_credentials/email_credentials.json');
let EMAILCONFIG= JSON.parse(emailConfig);
let EMAIL= EMAILCONFIG.email;
let EMAILPASSWORD = EMAILCONFIG.password;
let EMAILTARGETS = EMAILCONFIG.targets;

// Modulo de transportes de emails
let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: EMAIL, 
      pass: EMAILPASSWORD, 
    },
  });

async function sendEmail(SUBJECT, TEXT) {
    let info = await transporter.sendMail({
        from: "Notificaciones Trading Bot EMA (" + EMAIL + ")",                        
        to: EMAILTARGETS, 
        subject: SUBJECT, // Subject line
        text: TEXT
    });  
    console.log(info);  
}

async function checkEMAs(monedasANegociar, KLINE_INTERVAL) {
    // Intervals: 1m,3m,5m,15m,30m,1h,2h,4h,6h,8h,12h,1d,3d,1w,1M
    ticks = await binance.futuresCandles(monedasANegociar, KLINE_INTERVAL);
    // ticks = await binance.candlesticks(monedasANegociar, KLINE_INTERVAL ); //, (error, ticks, symbol) => {
    // console.info("candlesticks()", ticks);
    var closePrices = ticks.map(x => parseFloat(x[4]));                     
    var EMA3 =EMA.calculate({period : 3, values : closePrices});   
    var EMA6 = EMA.calculate({period : 6, values : closePrices});   
    var EMA9 = EMA.calculate({period : 9, values : closePrices});   
    return  [EMA3, EMA6, EMA9];
    // Orden de las columnas que devuleve el cliente de binance para candlesticks
    // [time, open, high, low, close, volume, closeTime, assetVolume, trades, buyBaseVolume, buyAssetVolume, ignored] = last_tick;

}

async function checkRSI(monedasANegociar, KLINE_INTERVAL) {
    // Intervals: 1m,3m,5m,15m,30m,1h,2h,4h,6h,8h,12h,1d,3d,1w,1M
    // ticks = await binance.candlesticks(monedasANegociar, KLINE_INTERVAL ); //, (error, ticks, symbol) => {
    // console.info("candlesticks()", ticks);
    ticks = await binance.futuresCandles(monedasANegociar, KLINE_INTERVAL );
    var closePrices = ticks.map(x => parseFloat(x[4]));                     
    var RSIs =RSI.calculate({period : 7, values : closePrices});   
  
    return  RSIs;
    // Orden de las columnas que devuleve el cliente de binance para candlesticks
    // [time, open, high, low, close, volume, closeTime, assetVolume, trades, buyBaseVolume, buyAssetVolume, ignored] = last_tick;

}

async function comprobarPrecio(symbol) {
    // ticker = await binance.prices(symbol, (error, ticker) => {
    //     console.info("Price of BNB: ", ticker[symbol]);
    //   });
    // ticker = await binance.prices(symbol);
    // ticker = await binance.futuresMarkPrice(symbol); ---> Esto no sabemos realmente para que se utiliza, creemos que para hacer una comparativa
    // y prevenir trampas con otros exchanges, pero no para precio real
    precio = await binance.futuresPrices();
    return precio[symbol];
}

// Esta funcion hace el calculo de la cantidad a invertir en funcion del balance y del precio actual
async function calcularAmount(cantidadANegociar, monedasANegociar, precio){

    var minQty = parseFloat(global.filters[monedasANegociar].minQty);
    var minNotional = parseFloat(global.filters[monedasANegociar].minNotional);
    var stepSize =global.filters[monedasANegociar].stepSize;

    var amount = cantidadANegociar / precio;

    // Set minimum order amount with minQty: La cantidad mínima a negociar en moneda a comprar.
    if ( amount < minQty ) amount = minQty;

    // Set minimum order amount with minNotional: La cantidad mínima a negociar en moneda contraria (pairing)
    if ( precio * amount < minNotional ) {
        amount = minNotional / precio;
    }

    // Round to stepSize: Ajustar los decimales de la cantidad
    amount = global.binance.roundStep(amount, stepSize);

    return amount;
}

// Calculo de la cantidad a invertir en función del balance
async function bloquePrincipal (quantity, pairing, monedasANegociar ,KLINE_INTERVAL) {
    // balances = await binance.balance();  
    futuresBalance = await binance.futuresBalance();
    var balanceUSDT = futuresBalance.filter(function(s) {
        return s.asset === 'USDT'
      });
    balanceUSDT = balanceUSDT.reduce(x => x[0]);

    cantidadANegociar = Math.round(quantity * balanceUSDT.availableBalance);

    // Obtención de las 3 EMA por períodos
    EMAs = await checkEMAs(monedasANegociar, KLINE_INTERVAL);

    lastEMA3 = EMAs[0][EMAs[0].length -1]
    lastEMA6 = EMAs[1][EMAs[1].length -1]
    lastEMA9 = EMAs[2][EMAs[2].length -1]

    //  Crear la variable precioInicial, en productivo tiene que ser la respuesta de la compra de la api TO DO
    precio = await comprobarPrecio(monedasANegociar);
    precio = parseFloat(precio);
    // POSIBLE FACTOR DE REFUERZO DE LA COMPRA. Meter un factor que mida la brusquedad del cruce? Pendientes? Angulo de cruce?
    // TODO: Hay que pensar si conviene meter un factor de seguridad. EJ: lastEMA3 * 1,00X > lastEMA9. 
    // También se podría mirar el RSI u otro indicador que confirme el cambio de tendencia
    // Podríoa ser buena que si el RSI está por debajo de 50% compramos 

    // Debajo se calcula el RSI de 7 períodos para el intervalo 3 minutos.
    RSIs = await checkRSI(monedasANegociar, KLINE_INTERVAL);
    lastRSI = RSIs[[RSIs.length -1]]

    // console.log("RSI 7 periodos: ", lastRSI);

    // console.log("Precio actual: ", precio, ". Monedas: ", monedasANegociar);
    
    // BLOQUE 1: APERTURAS
    if( (lastEMA3 >lastEMA6 & lastEMA3 > lastEMA9 & !global.deshacerPosicion & lastRSI < porcentajeRSIBull)  ){
            console.log("La EMA de 3 períodos está por ENCIMA de la EMA de 6 y 9 períodos (EMA3: ", lastEMA3, ", EMA6: ", lastEMA6, ", EMA9: " , lastEMA9 , 
                    "), y el RSI (7) es el  ", lastRSI, " %");
            
            var amount = await calcularAmount(cantidadANegociar, monedasANegociar, precio);

            var orden = await trader.buy_future(monedasANegociar, precio, amount); 

            // Esta variable writeJsonFromPreviousOpen sirve para saber si hay que parsear las aperturas del fichero previo o crear el fichero desde 0.
            if (global.writeJsonFromPreviousOpen) {
                APERTURAS = fs.readFileSync(global.pathname.concat('/aperturas.json'));
                aperturas= JSON.parse(APERTURAS);
            } else {
                aperturas = JSON.parse('[]');
            }
            aperturas.push(orden);
            fs.writeFileSync(global.pathname.concat('/aperturas.json'), JSON.stringify(aperturas) );
            // Es el campo executedQty para Spot y el origQty para futuros cuando abres la posicion
            // global.amount = parseFloat(orden.executedQty); // Spot
            global.amount = parseFloat(orden.origQty);          // Futuros
            global.precioApertura = precio;
            global.deshacerPosicion = true;
            global.side = 'BULL';
        
    } else if(lastEMA3  < lastEMA6 & lastEMA3 < lastEMA9 & !global.deshacerPosicion & lastRSI > porcentajeRSIBear) {
            console.log("La EMA de 3 períodos está por DEBAJO de la EMA de 6 y 9 períodos (EMA3: ", lastEMA3, ", EMA6: ", lastEMA6, ", EMA9: " , lastEMA9 , 
                    "), y el RSI (7) es el  ", lastRSI, " %");
            
            var amount = await calcularAmount(cantidadANegociar, monedasANegociar, precio);

            var orden = await trader.sell_future(monedasANegociar, precio, amount); 

            // Esta variable writeJsonFromPreviousOpen sirve para saber si hay que parsear las aperturas del fichero previo o crear el fichero desde 0.
            if (global.writeJsonFromPreviousOpen) {
                APERTURAS = fs.readFileSync(global.pathname.concat('/aperturas.json'));
                aperturas= JSON.parse(APERTURAS);
            } else {
                aperturas = JSON.parse('[]');
            }
            aperturas.push(orden);
            fs.writeFileSync(global.pathname.concat('/aperturas.json'), JSON.stringify(aperturas) );
            // Es el campo executedQty para Spot y el origQty para futuros cuando abres la posicion
            // global.amount = parseFloat(orden.executedQty); // Spot
            global.amount = parseFloat(orden.origQty);          // Futuros
            global.precioApertura = precio;
            global.deshacerPosicion = true;
            global.side = 'BEAR';
        
    } else {
        // console.log("No se dan condiciones de compra venta (EMA3: ", lastEMA3, ", EMA6: ", lastEMA6, ", EMA9: " , lastEMA9 , "), RSI (7) : ", lastRSI, " %");
    }
    // TODO:
    // Configurar logica TP y SL, trailing, orden fija? Utilizamos un json o variables en memoria? Que es más rápido?
    
    // BLOQUE 2: CIERRES
    if (global.deshacerPosicion & global.side == 'BULL'){
        precioApertura = global.precioApertura;
        precioActual = await comprobarPrecio (monedasANegociar);
        precioActual = parseFloat(precioActual);
        // Variable que comprueba el movimiento relativo == Ganancia o Pérdida (precioActual - precioApertura)/ precioApertura
        diferencia = (precioActual - precioApertura) / precioApertura;

        if ((tp/100) <= diferencia || (-sl/100) >= diferencia ) {
            
            var orden = await trader.sell_future(monedasANegociar,   precioActual, global.amount);
            
            if (global.writeJsonFromPreviousOpen) {
                CIERRES = fs.readFileSync(global.pathname.concat('/cierres.json'));
                cierres = JSON.parse(CIERRES);
            } else {
                cierres = JSON.parse('[]');
            }
            cierres.push(orden);
            fs.writeFileSync(global.pathname.concat('/cierres.json'), JSON.stringify(cierres) );
            
            global.writeJsonFromPreviousOpen = true;
            global.deshacerPosicion = false;

        }
    } else if (global.deshacerPosicion & global.side == 'BEAR'){
        precioApertura = global.precioApertura;
        precioActual = await comprobarPrecio (monedasANegociar);
        precioActual = parseFloat(precioActual);
        // Variable que comprueba el movimiento relativo == Ganancia o Pérdida (precioActual - precioApertura)/ precioApertura
        diferencia = (precioApertura - precioActual) / precioApertura;

        if ((tp/100) <= diferencia || (-sl/100) >= diferencia ) {
            
            var orden = await trader.buy_future(monedasANegociar,   precioActual, global.amount);
            
            if (global.writeJsonFromPreviousOpen) {
                CIERRES = fs.readFileSync(global.pathname.concat('/cierres.json'));
                cierres = JSON.parse(CIERRES);
            } else {
                cierres = JSON.parse('[]');
            }
            cierres.push(orden);
            fs.writeFileSync(global.pathname.concat('/cierres.json'), JSON.stringify(cierres) );
            
            global.writeJsonFromPreviousOpen = true;
            global.deshacerPosicion = false;
        }
    }
    // Logica con varias monedas, por rapidez meteria unas 5-10, si conseguimos que sean parametrizables por consola mejor
    // Ejemplo comando: Node start --coins 'DOGE, BTC, SHIBA, ADA, ENJ' --strategy EMA
}

// Funcion que devuelve los parámetros de mercado del par de monedas.
async function getExchangeInfo (monedasANegociar) {
    var data  = await binance.futuresExchangeInfo(); //function(error, data) {
    let minimums = {};
    let obj = data.symbols.find( record => record.symbol === monedasANegociar);
    let filters = {status: obj.status};
    for ( let filter of obj.filters ) {
        if ( filter.filterType == "MIN_NOTIONAL" ) {
            filters.minNotional = filter.notional;
        } else if ( filter.filterType == "PRICE_FILTER" ) {
            filters.minPrice = filter.minPrice;
            filters.maxPrice = filter.maxPrice;
            filters.tickSize = filter.tickSize;
        } else if ( filter.filterType == "LOT_SIZE" ) {
            filters.stepSize = filter.stepSize;
            filters.minQty = filter.minQty;
            filters.maxQty = filter.maxQty;
        }
    }
    //filters.baseAssetPrecision = obj.baseAssetPrecision;
    //filters.quoteAssetPrecision = obj.quoteAssetPrecision;
    filters.orderTypes = obj.orderTypes;
    filters.icebergAllowed = obj.icebergAllowed;
    minimums[obj.symbol] = filters;
    
    console.log(minimums);
    global.filters = minimums;
    //fs.writeFile("minimums.json", JSON.stringify(minimums, null, 4), function(err){});
    // });

};

global.primeraVez = true;
getExchangeInfo(monedasANegociar[0]);

// Crear el intervalo de llamadas para el calculo de EMA
const POLLING_INTERVAL =  callEMAInterval || 1000  // Lo que venga por configuracion o un segundo.

priceMonitor = setInterval(async () => { await bloquePrincipal(quantity, pairing, monedasANegociar[0], KLINE_INTERVAL) }, POLLING_INTERVAL)
