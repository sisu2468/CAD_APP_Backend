const { Schema, model } = require('mongoose')

const PaymentModel = Schema({
    creator: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    method: {
        type: String,
        required: true,
    },
    price: {
        type: String,
        required: true,
    },
    paymentdate: {
        type: Number,
        required: true,
    },
    status: {
        type: Number,
        required: true,
    }
},{
    timestamps: true,
    collection: process.env.DB_COLLECTION_PREFIX + 'payments',
})

model('Payment', PaymentModel)