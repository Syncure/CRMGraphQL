const mongoose = require('mongoose')

const ProductosSchema = mongoose.Schema({
    nombre:{
        type: String,
        require: true,
        trim: true
    },
    existencia: {
        type: Number,
        required: true,
        trim: true
    },
    precio: {
        type: Number,
        trim: true
    },
    creado:{
        type: Date,
        default: Date.now()
    }
});

ProductosSchema.index({ nombre: 'text' });

module.exports = mongoose.model('Producto', ProductosSchema);