'use strict';

const fs = require('fs');
const Binance = require('node-binance-api');
var exec = require('child_process').exec;
// DECLARO DOS VARIABLES PARA BINANCE
// Lectura y aplicacion de los parametros de autenticacion
let auth = fs.readFileSync(__dirname +  '/../auth/auth.json');
let  CREDS= JSON.parse(auth);

let APIKEY = CREDS['api_futures' ];
let APISECRET = CREDS['secret_futures' ];


const binance = new Binance().options({
    APIKEY: APIKEY,
    APISECRET: APISECRET,
    useServerTime: true,
    recvWindow: 60000, // Set a higher recvWindow to increase response timeout
    verbose: true, // Add extra output when subscribing to WebSockets, etc
    log: log => {
        console.log(log); // You can create your own logger here, or disable console output
    }
  });

let APIKEYTEST = CREDS['api_futures_testnet'];
let APISECRETTEST = CREDS['secret_futures_testnet'];
const BinanceTest = require('node-binance-api-testnet');

const binanceTest = new BinanceTest().options({
    APIKEY: APIKEYTEST,
    APISECRET: APISECRETTEST,
    useServerTime: true,
    recvWindow: 60000, // Set a higher recvWindow to increase response timeout
    verbose: true, // Add extra output when subscribing to WebSockets, etc
    log: log => {
        console.log(log); // You can create your own logger here, or disable console output
    }
  });

global.binance = binance;
global.binanceTest = binanceTest;

var utils = {
    
    // Esta función comprueba la rentabilidad de las órdenes que se han ejecutado durante la prueba de la estrategia
    // El beneficio o pérdida de cada operacion es el valor realizedPnl de la operación de cierre, es la segunda de cada par.
    // Cada operacion lleva su propia comision
    // La variable log es un bool que sirve para mostrar o no los output de la consola
    obtenerDetalleDeUnaEjecucionEnCurso : async function  (runID, log){

        var folder = '/../runs';

        var pathname = __dirname.concat(folder).concat('/').concat(runID);

        var statusFile = fs.readFileSync(pathname.concat('/status.json'));
        var balanceInicial = JSON.parse(statusFile).BalanceInicial;
        var monedasANegociar = JSON.parse(statusFile).monedasANegociar;

        var sumaComisiones = 0 ;
        var sumaPnl = 0;
        
        var modoPrueba = JSON.parse(statusFile).test;
        
        var binance = global.binance;
        
        if (modoPrueba) {
            binance = global.binanceTest;
        }

        var trades = await binance.futuresUserTrades(monedasANegociar[0]);
        var tradesJSON =  JSON.parse('[]');

        try {
            
            var aperturas = fs.readFileSync(pathname.concat('/aperturas.json'));
            var APERTURAS = JSON.parse(aperturas);

            APERTURAS.forEach(element => {
                var trade = trades.filter(function(s) {
                    return s.orderId === element.orderId
                });
                tradesJSON.push(trade);
                sumaComisiones  = sumaComisiones + parseFloat(trade[0].commission);
            });
        } catch(error){
            if(log){
                console.log('No se ha producido ninguna apertura');
            }
        }

        try {
            var cierres = fs.readFileSync(pathname.concat('/cierres.json'));
            var CIERRES = JSON.parse(cierres);

            CIERRES.forEach(element => {
                var trade = trades.filter(function(s) {
                    return s.orderId === element.orderId
                });
                tradesJSON.push(trade);
                sumaComisiones  = sumaComisiones + parseFloat(trade[0].commission);
                sumaPnl = sumaPnl + parseFloat(trade[0].realizedPnl);
            });
        } catch(error){
            if(log){
                console.log('No se ha producido ningún cierre');
            }
        }

        var diferenciaUSDT = sumaPnl - sumaComisiones;

        var rentabilidadPrueba = (parseFloat(diferenciaUSDT)/ parseFloat(balanceInicial));
        
        if (log) {
            console.log('Balance antes de la ejecucion de la estrategia: ' + balanceInicial + ' USDT' );
            console.log("Variación Total: " + diferenciaUSDT + " USDT." );
            console.log("Rentabilidad de la prueba actual : " + rentabilidadPrueba + " %")
        }

        var datosActuales = {
            "Rentabilidad": rentabilidadPrueba,
            "VariacionMonetaria": diferenciaUSDT,
            "trades": tradesJSON,
        };
        return datosActuales;
    },
    // Esta función muestra el detalle de parámetros de una ejecución concreta
    // El workflow es el siguiente: 
    //      - Primero lee el fichero status.json y comprueba el status de una estrategia, si el status = 0 directamente muestra la información del fichero
    //      - Si el status es 1 se llama a la fucnion de obtenerDetalleDeUnaEjecucionEnCurso
    //      - Despues se muestra toda la información igual que en el caso status=0.
    mostrarDetalleEstrategia: async function (runID){

        var folder = '/../runs';
        var pathname = __dirname.concat(folder).concat('/').concat(runID);

        // La carpeta no existe, en este caso aquí acaba el workflow
        if (!fs.existsSync(pathname)){

            console.log('La estrategia indicada no existe en el sistema');
        
        } else {
            
            var status = fs.readFileSync(pathname +  '/status.json');
            var  STATUS = JSON.parse(status);

            if(STATUS.test){
                var red = 'TESTNET';
            } else {
                var red = 'REAL';
            }

            if (STATUS.status){
                console.log('La ejecución con ID ' + runID + ' está RUNNING (STATUS = 1)');
                var datosActuales = await utils.obtenerDetalleDeUnaEjecucionEnCurso(runID, false);

                console.log('PROCESO EJECUCIÓN DE ESTRATEGIA: ', STATUS.IdEstrategia);
                console.log("\n");
                console.log("RED: ", red );
                console.log("\n");
                console.log("TIPO DE ESTRATEGIA --> ", STATUS.tipoEstrategia);
                console.log('PERIODO DE PRUEBAS : ', STATUS.FECHA_HORA_INICIO, ' --> Running Ahora');
                console.log('BALANCE INICIAL: ', STATUS.BalanceInicial);
                console.log('RENTABILIDAD: ', datosActuales.Rentabilidad * 100 ,  ' %');
                console.log('VARIACION MONETARIA: ', datosActuales.VariacionMonetaria, ' USDT' );
                console.log('\n');
                console.log('PARAMETROS CONFIGURABLES: ');
                console.log('\n');
                console.log('TAKE PROFIT FIJO (TP): ', STATUS.tp);
                console.log('STOP LOSS FIJO (SL): ', STATUS.sl);
                console.log('TRAILING ENABLED: ', STATUS.enable_tsl);
                console.log('TRAILING TAKE PROFIT (TTP): ', STATUS.ttp);
                console.log('TRAILING STOP LOSS (TSL): ', STATUS.tsl);
                console.log('PORCENTAJE DEL BALANCE A NEGOCIAR POR OPARACION (ONB): ', (STATUS.quantity *100) , ' %');
                console.log('INTERVALO ENTRE LLAMADAS A LA API BINANCE: ', (STATUS.callEMAInterval /1000));
                console.log('PAR DE MONEDAS A NEGOCIAR : ', STATUS.monedasANegociar[0]);
                console.log('INTERVALO DE MINUTOS POR CANDLE (KLINE): ', STATUS.KLINE_INTERVAL);
                console.log('RSI Limite Mercado Bajista: ', STATUS.porcentajeRSIBear);
                console.log('RSI Limite Mercado Alcista: ', STATUS.porcentajeRSIBull);
                console.log('\n');
                
                if(datosActuales.trades.length > 0){
                    console.log('OPERACIONES PRODUCIDAS DURANTE LA EJECUCION: ');
                    console.log('\n');
                    datosActuales.trades.forEach(element => {
                        console.table(element);
                    });
                } else {
                    console.log('LA EJECUCION AUN NO HA HECHO NINGUNA OPERACION');
                }

            } else {
                
                console.log('PROCESO EJECUCIÓN DE ESTRATEGIA: ', STATUS.IdEstrategia);
                console.log('La ejecución con ID ' + runID + ' está PARADA (STATUS = 0)');
                console.log("\n");
                console.log("RED: ", red );
                console.log("\n");
                console.log("TIPO DE ESTRATEGIA --> ", STATUS.tipoEstrategia);
                console.log('PERIODO DE PRUEBAS : ', STATUS.FECHA_HORA_INICIO, ' --> ', STATUS.FECHA_HORA_FIN);
                console.log('BALANCE INICIAL: ', STATUS.BalanceInicial);
                console.log('RENTABILIDAD: ', STATUS.Rentabilidad *100 , ' %');
                console.log('VARIACION MONETARIA: ', STATUS.VariacionMonetaria, ' USDT' );
                console.log('\n');
                console.log('PARAMETROS CONFIGURABLES: ');
                console.log('\n');
                console.log('TAKE PROFIT FIJO (TP): ', STATUS.tp);
                console.log('STOP LOSS FIJO (SL): ', STATUS.sl);
                console.log('TRAILING ENABLED: ', STATUS.enable_tsl);
                console.log('TRAILING TAKE PROFIT (TTP): ', STATUS.ttp);
                console.log('TRAILING STOP LOSS (TSL): ', STATUS.tsl);
                console.log('PORCENTAJE DEL BALANCE A NEGOCIAR POR OPARACION (ONB): ', (STATUS.quantity *100) , ' %');
                console.log('INTERVALO ENTRE LLAMADAS A LA API BINANCE: ', (STATUS.callEMAInterval /1000));
                console.log('PAR DE MONEDAS A NEGOCIAR : ', STATUS.monedasANegociar[0]);
                console.log('INTERVALO DE MINUTOS POR CANDLE (KLINE): ', STATUS.KLINE_INTERVAL);
                console.log('RSI Limite Mercado Bajista: ', STATUS.porcentajeRSIBear);
                console.log('RSI Limite Mercado Alcista: ', STATUS.porcentajeRSIBull);
                console.log('\n');

                if( STATUS.trades.length > 0){
                    console.log('OPERACIONES PRODUCIDAS DURANTE LA EJECUCION: ');
                    console.log('\n');

                    //ordeno las operaciones por timestamp
                    STATUS.trades.sort(function(x, y){
                        return x[0].time - y[0].time;
                    })
                    // STATUS.trades.forEach(element => {
                    //     element[0].date = new Date(element[0].time)
                    //     console.log(element[0].buyer, element[0].date)
                    // });
                    // STATUS.trades.forEach(element => {
                    //     console.table(element);
                    // });
                    // console.log("-------0-------")
                    function aPares(arr, func){
                        for(var i=0; i < arr.length - 1; i++){
                            func(arr[i], arr[i + 1])
                            arr.shift();
                            // arr.shift();
                        }
                    }
                    var operaciones_en_parejas = STATUS.trades
                    aPares(operaciones_en_parejas, function(current, next){
                        console.table([current[0], next[0]])
                    })


                } else {
                    console.log('LA EJECUCION AUN NO HA HECHO NINGUNA OPERACION');
                }
            }
        }

    },
    // Esta función ejecuta el siguiente workflow para para una estrategia:
    //      - Primero lee el fichero de status.json de una estrategia en concreto
    //      - Si la estrategia no existe se muestra un mensaje de que no existe
    //      - Si el status de la estrategia es 0 se muestra un mensaje de que la estrategia ha parado.
    //      - Si la estrategia tiene status = 1 se llama a la función obtener rentabilidad y obtener trades de dicha estrategia
    //      - Se escribe en el fichero status.json { status = 0, rentabilidad = x, trades= trades}
    //      - Después se ejecuta el comando para parar.
    pararEstrategia: async function(runID){

        var folder = '/../runs';
        var pathname = __dirname.concat(folder).concat('/').concat(runID);

        // La carpeta no existe, en este caso aquí acaba el workflow
        if (!fs.existsSync(pathname)){

            console.log('La estrategia indicada no existe en el sistema');
        
        } else {
            
            var status = fs.readFileSync(pathname +  '/status.json');
            var  STATUS = JSON.parse(status);

            if (STATUS.status){
                var datosActuales = await utils.obtenerDetalleDeUnaEjecucionEnCurso(runID, false);
                STATUS.uidRun = STATUS.IdEstrategia;
                STATUS.Rentabilidad = datosActuales.Rentabilidad;
                STATUS.status = 0;
                STATUS.VariacionMonetaria = datosActuales.VariacionMonetaria;
                STATUS.trades = datosActuales.trades;
                STATUS.FECHA_HORA_FIN = new Date();
                
                utils.escribeEnFicheroStatus(STATUS,  pathname);
                utils.ejecutaFin(STATUS.IdEstrategia);

            } else {
                console.log('La ejecución con ID ' + runID + ' ya está parada (STATUS = 0)');
            }
        }
    },
    // Esta funcion muestra una lista de las ultimas ejecuciones de estrategias.
    // El worflow que sigue es el siguiente. 
    //      - Primero lee todos los ficheros status.json dentro de las carpetas de runs. 
    //      - Guarda un array de objetos con 7 columnas: | ID | FECHAHORAINICIO | FECHAHORAFIN | +/- VARIACION USDT | TIPOESTRATEGIA | % RENTABILIDAD | STATUS |
    //      - Si alguno de los status del array es 1 obtiene la rentabilidad en directo.
    //      - Después muestra el resultado en una lista.
    //      - También muestra el resultado del comando forever list, que es una forma de comprobar que está bien integrado.
    listarEstrategias: async function (){

        var folder = '/../runs';
        var pathname = __dirname.concat(folder);

        if (!fs.existsSync(pathname)){

            console.log('No hay estrategias paradas ni en ejecución actualmente.');
        
        } else {

            fs.readdir(pathname, (err, files) => {
                if (err)
                    console.log(err);
                else {
                    var runs = (files.length);
                    
                    if(runs > 0){
                        console.log('Hay un total de ', runs, ' estrategias en el sistema.')
                        utils.loggearLista(runs);

                    } else {
                        console.log('Aun no hay ninguna estrategia en el sistema.')
                    }
                }
            })
        }
    },
    // Logear lista, esta funcion se necesita por ser asyncrona
    loggearLista: async function (runs){
        var folder = '/../runs';
        var pathname = __dirname.concat(folder);

        var listaEjecuciones = JSON.parse('[]');

        var rentabilidad = 0;
        var VariacionMonetaria = 0;
        var estado = '';

        for(var i=1; i< runs + 1; i++){
            
            // Aquí hay que validar que la carpeta runs existe para listar las estrategias y sino dar un error
            var statusFile = fs.readFileSync(pathname.concat('/').concat(i).concat('/').concat('/status.json'));
            var STATUS = JSON.parse(statusFile);
            
            if(STATUS.status){
                var datosActuales = await this.obtenerDetalleDeUnaEjecucionEnCurso(i, false);
                rentabilidad = datosActuales.Rentabilidad;
                VariacionMonetaria = datosActuales.VariacionMonetaria;
                estado = 'RUNNING'; 
            } else {
                rentabilidad = STATUS.Rentabilidad;
                VariacionMonetaria = STATUS.VariacionMonetaria;
                estado = 'PARADA'
            }

            var datosListado = {
                'ID': STATUS.IdEstrategia,
                'FECHA_HORA_INICIO': STATUS.FECHA_HORA_INICIO,
                'FECHA_HORA_FIN': STATUS.FECHA_HORA_FIN,
                'Variacion Monetaria': VariacionMonetaria,
                'TIPO Estrategia': STATUS.tipoEstrategia,
                '% RENTABILIDAD': rentabilidad * 100,
                'STATUS': estado
            };
            listaEjecuciones.push(datosListado);
        }
        console.table(listaEjecuciones);
    },
    verBanlanceEnBinance: async function (red){
        
        if(red){
            var red = 'TESTNET';
            var binance = global.binanceTest;
        } else {
            var red = 'REAL';
            var binance = global.binance;
        }
        console.log('Mostrando balances en la cuenta de futuros de BINANCE asociada.... RED: ', red );
        
        var futuresBalance = await binance.futuresBalance();

        console.log('BALANCES PRINCIPALES:');

        futuresBalance.forEach(element => {
            console.log('ASSET: ', element.asset, ' --> BALANCE: ', element.availableBalance);
        });
    },
    inicializaNuevaEstrategia: async function(argv){

        var folder = '/../runs';
        var runID = '/1';
        var pathname = __dirname.concat(folder);

        if(argv.test){
            var binance = global.binanceTest;
            argv.test = true;
        } else {
            var binance = global.binance;
            argv.test = false;
        }

        var futuresBalance = await binance.futuresBalance();
        var balanceUSDT = futuresBalance.filter(function(s) {
            return s.asset === 'USDT'
        });
        balanceUSDT = balanceUSDT.reduce(x => x[0]);

        argv.Rentabilidad = 0;
        argv.BalanceInicial = parseFloat(balanceUSDT.availableBalance);
        argv.status = 1;
        argv.VariacionMonetaria = 0;
        argv.FECHA_HORA_INICIO = new Date();
        argv.FECHA_HORA_FIN = "";
        argv.trades = [];

        if (!fs.existsSync(pathname)){

            pathname = __dirname.concat(folder).concat(runID);
            
            fs.mkdirSync(pathname, { recursive: true });
            console.log("\Lanzando la estrategia :" +  runID.replace('/', ''));
            var uidRun = 'p001';

            argv.uidRun = uidRun;
            
            utils.escribeEnFicheroStatus(argv,  pathname);
            utils.ejecutaInicio(uidRun);
        
        } else {
            
            fs.readdir(pathname, (err, files) => {
                if (err)
                    console.log(err);
                else {
                    runID = (files.length +1 );
                    console.log("\Lanzando la estrategia :" +  runID);
                    pathname = __dirname.concat(folder).concat('/' + runID);
                    fs.mkdirSync(pathname, { recursive: true });

                    var uidRun = 'p';
                    if(runID < 10){ 
                        uidRun = uidRun.concat('00').concat(runID);
                    } else if (runID < 100){
                        uidRun = uidRun.concat('0').concat(runID);
                    } else if (runID < 1000){
                        uidRun = uidRun.concat(runID);
                    }                    
                    
                    argv.uidRun = uidRun;
                    
                    utils.escribeEnFicheroStatus(argv,  pathname);
                    utils.ejecutaInicio(uidRun);
                }
              })
        }

    },
    // Está función actualiza el fichero de status json con un json que recibe de entrada
    escribeEnFicheroStatus: async function (CONFIG, pathname)  {

        var status = {
            'status': CONFIG.status,
            'tipoEstrategia' : 'INDICADORES',
            'FECHA_HORA_INICIO': CONFIG.FECHA_HORA_INICIO,
            'FECHA_HORA_FIN': CONFIG.FECHA_HORA_FIN,
            'BalanceInicial':  CONFIG.BalanceInicial, 
            'Rentabilidad': CONFIG.Rentabilidad,
            'VariacionMonetaria': CONFIG.VariacionMonetaria,
            'IdEstrategia': CONFIG.uidRun,
            'pairing' : CONFIG.pairing,
            'tp' : CONFIG.tp,
            'sl' : CONFIG.sl,
            'ttp' : CONFIG.ttp,
            'tsl' : CONFIG.tsl,
            'enable_tsl' : CONFIG.enable_tsl,
            'test' : CONFIG.test,
            'quantity' : CONFIG.quantity,
            'callEMAInterval' : CONFIG.callEMAInterval,
            'monedasANegociar' : CONFIG.monedasANegociar,
            'KLINE_INTERVAL' : CONFIG.KLINE_INTERVAL,
            'porcentajeRSIBear' : CONFIG.porcentajeRSIBear,
            'porcentajeRSIBull' : CONFIG.porcentajeRSIBull,
            'trades': CONFIG.trades
        };

        // Escritura del fichero de status de la estrategia en curso 
        fs.writeFileSync(pathname.concat('/status.json'), JSON.stringify(status) );

    },
    // Esta función ejecuta el comando forever con un UID de ejecución de estrategia concreto para luego poder matarlo e identificarlo
    ejecutaInicio: async function (uid){

        console.log('Lanzando proceso: ', uid);

        exec('forever start -a --uid ' + uid + '  src/indicators/tradeEMA_RSI.js', (error, stdout, stderr) => {
            // exec('node C:/Users/jaime.hernandez/Desktop/Crypto/Binance/TradingBot/src/indicators/tradeEMA_RSI.js', (error, stdout, stderr) => {    
            if (error) {
            console.error(`error: ${error.message}`);
            return;
            }
        
            if (stderr) {
            console.error(`stderr: ${stderr}`);
            return;
            }
            // (stdout));
            console.log(`stdout:\n${stdout}`);
            
        });
    },
    ejecutaFin: async function (uid){
        
        console.log('Parando proceso: ', uid);

        exec('forever stop ' + uid , (error, stdout, stderr) => {
            if (error) {
            console.error(`error: ${error.message}`);
            return;
            }
        
            if (stderr) {
            console.error(`stderr: ${stderr}`);
            return;
            }
            // (stdout));
            console.log(`stdout:\n${stdout}`);
            
        });
    }

};

module.exports = utils
