#!/usr/bin/env node

const clear = require('clear');
// chalk ha de estar en la version 2.4.1
const chalk = require('chalk');
const figlet = require('figlet');
const yargs = require("yargs");
const utils = require("../src/utils.js");

clear();

console.log(
  chalk.yellow(
    figlet.textSync('TradingBotCli', { horizontalLayout: 'full' })
  )
);

const options = yargs
    .usage("Uso: -TradingBotCLI <comando>")
    // El comando LAUNCH tiene que hacer lo siguiente:
    //      - Iniciar una nueva ejecución de una estrategia.
    //      - Crear el fichero status.json con la configuración indicada. 
    //      - Mostrar el output 
    .command(['launch', 'run', 'up'], 'Crea una nueva ejecución de una estrategias con parámetros concretos', 
        (yargs) => yargs.default('test', 1).default("pairing","USDT").default("monedasANegociar", ["BTCUSDT"]).default('tp', 0.5).default('sl',-0.5)
        .default('enable_tsl',false).default("ttp",2).default("tsl",2).default("quantity",0.05).default("callEMAInterval", 5000).default("KLINE_INTERVAL", "5m")
        .default("porcentajeRSIBear",50).default("porcentajeRSIBull", 50),
        (argv) => {
            // Crea la carpeta en runs si no existe. Parametros (argumentos, init =0/1 )
            // La variable init sirve para indicar si hay que lanzar la estrategia como tal
            utils.inicializaNuevaEstrategia(argv ); 
    })
    // El comando STOP tiene que hacer lo siguiente:
    //      - Parar la ejecucion de la estrategia indicada en el id
    //      - Escribir la diferencia de USDT en el fichero status.json 
    //      - Escribir el status del fichero status.json a 0 (ENDED)
    .command({
        command: 'stop <id>',
        aliases: ['stop', 'st'],
        desc: 'Parar una ejecución de una estrategia activa (id)',
        handler: (argv) => {
            // Aquí hay que entrar al fichero de la estrategia con el id, leer el pid de su status.json y parar el proceso.
            console.log(`Parando estrategia número: ${argv.id}`)
            utils.pararEstrategia(argv.id);
        }
    })
    // El comando SHOW tiene que hacer lo siguiente:
    //      - Leer el fichero json de status de la ejecución de estrategia con el id indicado
    //      - Leer el fichero de aperturas.json y cierres.json y mostrar los datos más relevantes en una tabla
    //      - Calcular la rentabilidad indicada en el id
    .command({
        command: 'show <id>',
        aliases: ['show', 'sh'],
        desc: 'Muestra información con detalle de una ejecución concreta de una estrategia (id)',
        handler: (argv) => {
            // Llamar al fichero de status.json, aperturas.json y cierres.json para ver el detalle, también mostrar la rentabilidad.
            console.log(`Mostrando información detallada de la ejecución número ${argv.id}`)
            utils.mostrarDetalleEstrategia(argv.id);
        }
    })
    .command({
    command: 'list',
    aliases: ['list', 'ls'],
    desc: 'Muestra un listado con información básica de las últimas ejecuciones',
    builder: (yargs) => yargs.default('value', 'true'),
    handler : (argv) => {
        utils.listarEstrategias();
    }
    })
    .command({
        command: 'balance <red>',
        aliases: ['balance', 'bal'],
        desc: 'Muestra el balance de la cuenta de Binance conectada a la CLI, especificando si es en la TESTNET o no. \n\n\t Real: 0  \n Testnet: 1',
        builder: (yargs) => yargs.default('red', 0),
        handler : (argv) => {      
                utils.verBanlanceEnBinance(argv.red);
        }
        })
    .command({
    command: 'about',
        desc: 'Ver información del equipo que ha trabajado en la aplicacion',
        handler : (argv) => {
            console.log('Somos un equipo de tres colegas a los que les gusta jugarse su preciado dinero en mercados especulativos... ' +
                        '\n\nEmpezamos más en serio con este proyecto a finales del año 2021.' + 
                        '\n\nNuestro propósito ese crear un fondo de inversores visbile a través de una interfaz web en el que, a futuro, podamos ' + 
                        '\ncolaborar con más usuarios, a los que se está pensando solicitar un ingreso mínimo\n\n' + 
                        'También se ha pensado que una forma más moderna y actual de invertir podría ser la posesión de un NFT de una serie que se creará a futuro ' + 
                        '\ny que podría constar hasta de 10.000 NFT únicos y distintos que se venderán en OpenSea. \n\n' + 
                        'Algunas ideas... @coolinvestors')
        }
    })
    // .option("help", { alias: "help", describe: "Muestra ayuda sobre un comando en específico", type: "string"})
    .demandCommand()
    .help()
    .argv