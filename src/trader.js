'use strict';

var compraVentas = {
    buy: async function ( monedasANegociar, cantidadANegociar, pairing, precioCompra) { 

        var minQty = parseFloat(global.filters[monedasANegociar].minQty);
        var minNotional = parseFloat(global.filters[monedasANegociar].minNotional);
        var stepSize =global.filters[monedasANegociar].stepSize;

        var amount = cantidadANegociar / precioCompra;

        // Set minimum order amount with minQty: La cantidad mínima a negociar en moneda a comprar.
        if ( amount < minQty ) amount = minQty;

        // Set minimum order amount with minNotional: La cantidad mínima a negociar en moneda contraria (pairing)
        if ( precioCompra * amount < minNotional ) {
            amount = minNotional / precioCompra;
        }

        // Round to stepSize: Ajustar los decimales de la cantidad
        amount = global.binance.roundStep(amount, stepSize);
        //log
        console.log('Comprando ', amount, " de la moneda ", monedasANegociar,  ". (", cantidadANegociar, " ",  pairing, ") Precio: ", precioCompra);

        try{
            var ordenCompra = await global.binance.marketBuy(monedasANegociar, amount); //(monedasANegociar, cantidadANegociar), (error, response) => { CON CALLBACK
            return ordenCompra;
        }catch ( e ) {
            if( e.statusCode ) {
              console.error( "something went wrong, statusCode isnt 200" )
              console.error( "e.statusCode:", e.statusCode )
              console.error( "e.message:", e.message )
            }
        }
    },
    sell: async function (monedasANegociar,   precioVenta){ 
        console.log('Vendiendo ', global.amount, " de la moneda ", monedasANegociar,  ". ) Precio: ", precioVenta);

        try{
            var ordenVenta = await global.binance.marketSell(monedasANegociar, parseFloat(global.amount)); //(monedasANegociar, cantidadANegociar), (error, response) => { CON CALLBACK
            return ordenVenta;
        }catch ( e ) {
            if( e.statusCode ) {
              console.error( "something went wrong, statusCode isnt 200" )
              console.error( "e.statusCode:", e.statusCode )
              console.error( "e.message:", e.message )
            }
        }
    },
    buy_future: async function ( monedasANegociar,  precioCompra, amount) {        
        //log
        console.log('Comprando ', amount, " de la moneda ", monedasANegociar,  ". Precio: ", precioCompra);

        try{
            // var ordenCompra = await global.binance.marketBuy(monedasANegociar, amount); //(monedasANegociar, cantidadANegociar), (error, response) => { CON CALLBACK
            var ordenCompra = await global.binance.futuresMarketBuy( monedasANegociar, amount ); //(monedasANegociar, cantidadANegociar), (error, response) => { CON CALLBACK
            return ordenCompra;
        }catch ( e ) {
            if( e.statusCode ) {
                console.error( "something went wrong, statusCode isnt 200" )
                console.error( "e.statusCode:", e.statusCode )
                console.error( "e.message:", e.message )
            }
        }
    },
    sell_future: async function (monedasANegociar,   precioVenta,  amount){ 

        console.log('Vendiendo ', amount, " de la moneda ", monedasANegociar,  ". ) Precio: ", precioVenta);

        try{
            var ordenVenta = await global.binance.futuresMarketSell(monedasANegociar, parseFloat(amount)); //(monedasANegociar, cantidadANegociar), (error, response) => { CON CALLBACK
            return ordenVenta;
        }catch ( e ) {
            if( e.statusCode ) {
                console.error( "something went wrong, statusCode isnt 200" )
                console.error( "e.statusCode:", e.statusCode )
                console.error( "e.message:", e.message )
            }
        }
    },

};

module.exports = compraVentas
