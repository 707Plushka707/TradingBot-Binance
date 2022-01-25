Pendiente por escribir.

Para utilizar:

    git clone

    cd al repo 

    npm install

Si hay problemas:

    npm audit fix 

Luego para que entienda el commando:

    npm install -g .

Para utilizar la consola:

    TradingBotCLI --help

Para ver como se utiliza cada comando:

    TradingBotCLI comando --help

Para pasar ficheros por scp a la maquina

    scp -i key.pem C:/...pathlocal.../TradingBot/email_credentials/email_credentials.json ubuntu@ip:/home/ubuntu/TradingBot/email_credentials

Para lanzar una estrategia con parámetros customizados:

    TradingBotCLI launch --test 0 --tp 1.8 --sl 0.9 --quantity 0.075 --KLINE_INTERVAL "5m" --porcentajeRSIBear 41 --porcentajeRSIBull 60

Me debéis una comida :)