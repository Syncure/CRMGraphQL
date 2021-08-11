const { ApolloServer } = require('apollo-server');
const typeDefs = require('./db/schema');
const resolvers = require('./db/resolvers');

const conectarDB = require('./config/db');

const jwt = require('jsonwebtoken');

require('dotenv').config({path: 'variables.env'});

// Conectar DB
conectarDB();

// Servidor
const server = new ApolloServer({
    typeDefs,
    resolvers,
    cors: {
        credentials:true,
        origin: process.env.PAGINA,
        optionsSuccessStatus:204
    },
    context: ({req}) => {
        // console.log(req.headers['authorization']);

        // console.log(req.headers);

        const token = req.headers['authorization'] || '';
        if(token){
            try {
                const usuario = jwt.verify(token.replace('Bearer ', ''), process.env.SECRETA);
                console.log(usuario);  

                return {
                    usuario
                }
            } catch (error) {
                console.log(error.message);
            }
        }
    }
});


// Arrancar el servidor
server.listen({ port: process.env.PORT || 4000}).then(({url}) => {
    console.log(`Servidor corriendo ${url}`);
})