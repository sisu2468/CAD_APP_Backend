const { Schema, model } = require('mongoose')

const Credit_Schema = Schema(
    {
        user : {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'User',
        },
        title : {
            type: String,
            required: true,
        },
        category : {
            type: String,
            required: true,
            default: 'Open'
        },
        content: {
            type: String,
            required: true,
            default: 'エラー',
        },
        creatate: {
            type: Date,
            default: Date.now, // Set default to current date
        }
    }
)

model('Credit', Credit_Schema)