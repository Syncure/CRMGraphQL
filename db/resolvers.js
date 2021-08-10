const Usuario = require('../models/Usuarios');
const Producto = require('../models/Producto');
const Cliente = require('../models/Cliente');
const Pedido = require('../models/Pedido');

const bcryptjs = require('bcryptjs'); 

const jwt = require('jsonwebtoken')

require('dotenv').config({path: 'variables.env'});

const crearToken = (usuario, secreta, expiresIn) => {
    // console.log(usuario);
    const { id, email, nombre, apellido } = usuario;

    return jwt.sign( { id, email, nombre, apellido}, secreta, { expiresIn } )
}

// Resolver
const resolvers = {
    Query: {
        obtenerUsuario: async (_, {}, ctx) => { // Para el front end borro el token y pongo ctx
            return ctx.usuario;
        },
        obtenerProductos: async () => {
            try {
                const productos = await Producto.find({});
                return productos;
            } catch (error) {
                console.log(error.message);
            }
        },
        obtenerProductoPorId: async (_, { id } ) => {

            // Revisar si el producto existe
            const productoExiste = await Producto.findById(id)
            if(!productoExiste){
                throw Error('Producto no encontrado');
            }

            return productoExiste

        },
        obtenerClientes: async () => {
            try {
                const clientes = await Cliente.find({})
                return clientes;
            } catch (error) {
                console.log(error.message);
            } 
        },
        obtenerClientesVendedor: async (_, {}, ctx ) => {
            try {
                const clientes = await Cliente.find({ vendedor: ctx.usuario.id.toString() })
                return clientes;
            } catch (error) {
                console.log(error);
            }
        },
        obtenerCliente: async (_, { id }, ctx) => {

                try {
                // Revisar si el cliente existe o no
                    const respuesta = await Cliente.findById(id);
                    
                    if(!respuesta) {
                        throw new Error("Cliente no encontrado")
                    }
            
                // Quien lo creo puede verlo
                    if (respuesta.vendedor.toString() !== ctx.usuario.id){
                        throw new Error("No tiene acceso a la información del cliente")
                    } 
                    
                    return respuesta;
                } catch (error) {
                   console.log(error.message); 
                }
        },
        obtenerPedidos: async () => {
            try {
                const pedidos = await Pedido.find({});
                return pedidos  
            } catch (error) {
                console.log(error.message);
            }
        },
        obtenerPedidosVendedor: async(_, {}, ctx) => {
            try {
                const pedido = await Pedido.find({vendedor: ctx.usuario.id}).populate('cliente');
                return pedido;   
            } catch (error) {
                console.log(error.message);
            }
        },
        obtenerPedido: async(_, { id }, ctx) => {
            try {
                // Si el pedido existe o no
                const pedido = await Pedido.findById(id);
                if(!pedido){
                    throw new Error("El pedido no fue encontrado");
                }

                // Solo quien lo creo puede verlo
                if(pedido.vendedor.toString() !== ctx.usuario.id){
                    throw new Error("No tiene acceso para verificar el pedido");
                }

                // Retornar el resultado
                return pedido; 
            } catch (error) {
                console.log(error);
            }
        },
        obtenerPedidoEstado: async(_, { estado }, ctx) => {
            // Filtrar por estado
            const pedidos = await Pedido.find({vendedor: ctx.usuario.id , estado: estado});

            return pedidos

        },
        mejoresClientes: async() => {
            const clientes = await Pedido.aggregate([
                { $match: { estado: "COMPLETADO"}},
                { $group:{
                    _id:"$cliente",
                    total:{ $sum: '$total'}
                }},
                {
                    $lookup: {
                        from: 'clientes',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'cliente'
                    }
                },
                {
                    $limit: 10
                },
                {
                    $sort: {
                        total: -1
                    }
                }
            ]);

            return clientes;
        },

        mejoresVendedores: async() => {
            const vendedores = await Pedido.aggregate([
                {$match : {estado: "COMPLETADO"}},
                { $group : {
                    _id: "$vendedor",
                    total: {$sum : "$total"}
                }},
                {
                    $lookup: {
                        from: 'usuarios',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'vendedor'
                    }
                },
                {
                    $limit: 3
                },
                {
                    $sort: { total: -1 }
                }
            ]);
            return vendedores;
        },
        buscarProducto: async(_, { texto }) => {
            const productos = await Producto.find({ $text: { $search: texto} }).limit(10)
            return productos;
        }
    },
    Mutation: {
        // Usuario
        nuevoUsuario: async (_, {input}) => {
            
            const { email, password } = input;

            // Revisar si el usuario ya está registrado
            const existeUsuario = await Usuario.findOne({email})
            if(existeUsuario){
                throw new Error ("El usuario ya esta registrado")
            }

            // Hashear su password

            const salt = await bcryptjs.genSalt(10)
            input.password = await bcryptjs.hash(password, salt); 
            
            try {
                // Guardarlo en la base de datos
                const usuario = new Usuario(input);
                usuario.save();
                return usuario;
            } catch (error) {
                console.log(error);
            }
        },

        autenticarUsuario: async (_, {input}) => {
            
            
            const { email, password } = input;

            // Si el usuario existe
            const existeUsuario = await Usuario.findOne({email});
            
            if(!existeUsuario){
                throw new Error ("El usuario no existe")
            }

            // Revisar si el password es correcto
            const passwordCorrecto = await bcryptjs.compare(password, existeUsuario.password);
            if(!passwordCorrecto){
                throw new Error ("El password es incorrecto")
            }

            // Crear un JWT
            return {
                token: crearToken(existeUsuario, process.env.SECRETA, '24h' )
            }

        },

        // Producto
        nuevoProducto: async (_, { input }) => {
            const { nombre, existencia, precio } = input;

            // Revisar si el producto ya existe
            const productoExiste = await Producto.findOne({nombre});
            if(productoExiste){
                throw new Error ("El producto ya esta registrado")
            }

            // Registrar producto
            try {
                const producto = new Producto(input);
                const resultado = await producto.save();
                return resultado;
            } catch (error) {
                console.log(error.message);    
            }
        },
        actualizarProducto: async(_, { id, input }) => {
            
            // Revisar si el producto existe
            let producto = await Producto.findById(id)
            if(!producto){
                throw Error('Producto no encontrado');
            }  
            
            // guardar en la DB
            producto = await Producto.findOneAndUpdate({ _id: id }, input, { new: true });

            return producto;
        },
        eliminarProducto: async(_,{id}) => {
            // Revisar si el producto existe
            let producto = await Producto.findById(id)
            if(!producto){
                throw Error('Producto no encontrado');
            } 

            //Eliminar 
            try {
                await Producto.findOneAndDelete({_id: id});
                return "Producto Eliminado";       
            } catch (error) {
                console.log(error.message);
            }
        },

        // Cliente
        nuevoCliente: async(_,{ input }, ctx) => {
            
            console.log(ctx);

            const { email } = input;
            
            // Verificar que el cliente exista
            const cliente = await Cliente.findOne({email})
            
            if(cliente) {
                throw Error('El email pertence a un cliente registrado')
            }

            const nuevoCliente = new Cliente(input);
            // Asignar el vendedor
            nuevoCliente.vendedor = ctx.usuario.id;
            

            //Guardarlo en la base de datos
            try {
                const resultado = await nuevoCliente.save();
                return resultado;
            } catch (error) {
                console.log(error.message);
            }
        },

        actualizarCliente: async(_, {id, input}, ctx) => {
            // Verificar si existe o no
            let cliente = await Cliente.findById(id);
            if(!cliente){
                throw new Error("Cliente no encontrado")
            }
            // Si el vendedor es quien edita
            if(cliente.vendedor.toString() !== ctx.usuario.id){
                throw new Error("No tiene permiso para editar este cliente")
            }
            // guardar cliente
            cliente = await Cliente.findOneAndUpdate({_id: id}, input, { new: true});

            return cliente;
        },

        eliminarCliente: async (_,{id}, ctx) => {
            // Verificar si existe o no
            let cliente = await Cliente.findById(id);
            if(!cliente){
                throw new Error("Cliente no encontrado")
            }
            // Si el vendedor es quien edita
            if(cliente.vendedor.toString() !== ctx.usuario.id){
                throw new Error("No tiene permiso para eliminar este cliente")
            }

            // Eliminar el cliente
            await Cliente.findOneAndDelete({_id: id})

            return("El cliente fue eliminado satisfactoriamente")
        },

        // Pedido
        nuevoPedido: async (_, {input}, ctx) => {

            const { cliente } = input;

            // Verificar si el cliente existe
            let clienteExiste = await Cliente.findById(cliente);

            if(!clienteExiste) {
                throw new Error("El cliente no existe")
            }

            // Verificar si el cliente es del vendedor
            if(clienteExiste.vendedor.toString() !== ctx.usuario.id){
                throw new Error("No tiene permiso para comercializar con este cliente")
            }

            // Revisar que el stock está disponible
            for await ( const articulo of input.pedido ){
                const { id } = articulo;

                const producto = await Producto.findById(id);

                if(articulo.cantidad > producto.existencia) {
                    throw new Error(`El articulo: ${producto.nombre} excede la cantidad disponible`);
                } else {
                    // Restar la cantidad a lo disponible
                    producto.existencia = producto.existencia - articulo.cantidad;

                    await producto.save();
                }
            }

            // Crear un nuevo pedido
            const nuevoPedido = new Pedido(input);

            // Asignale un vendedor
            nuevoPedido.vendedor = ctx.usuario.id

            // Guardar en la base de datos
            const resultado = await nuevoPedido.save();
            return resultado;

        },
        actualizarPedido: async (_,{id, input}, ctx) => {

            const { cliente } = input;

            // Verificar si el pedido existe
            const existepedido = await Pedido.findById(id);
            if(!existepedido){
                throw new Error("Pedido no encontrado")
            }

            // Verificar si el cliente existe
            let existeCliente = await Cliente.findById(cliente);
            if(!existeCliente){
                throw new Error("Cliente no existe")
            }

            // Verificar si puede modificar el pedido
            if(existeCliente.vendedor.toString() !== ctx.usuario.id){
                throw new Error("No tiene acceso al pedido")
            }

            // Verificar Stock
            if( input.pedido ){
                for await ( const articulo of input.pedido ){
                    const { id } = articulo;
    
                    const producto = await Producto.findById(id);
    
                    if(articulo.cantidad > producto.existencia) {
                        throw new Error(`El articulo: ${producto.nombre} excede la cantidad disponible`);
                    } else {
                        // Restar la cantidad a lo disponible
                        producto.existencia = producto.existencia - articulo.cantidad;
    
                        await producto.save();
                    }
                }
            }
            

            

            // Modificar el pedido
            const resultado = await Pedido.findOneAndUpdate({ _id: id }, input, { new: true })
            return resultado;

        },
        eliminarPedido: async(_, {id}, ctx) => {
            
            // Verificar si el pedido existe
            const pedido = await Pedido.findById(id);
            if(!pedido){
                throw new Error("Pedido no encontrado")
            }

            // Verificar si puede modificar el pedido
            if(pedido.vendedor.toString() !== ctx.usuario.id){
                throw new Error("No tiene acceso al pedido")
            }

            // Eliminar pedido
            await Pedido.findOneAndDelete({ _id: id })
            return "Pedido Eliminado"
        }
    }
}

module.exports = resolvers;