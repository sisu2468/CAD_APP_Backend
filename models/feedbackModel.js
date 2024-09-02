const { Schema, model } = require('mongoose')

const Credit_Schema = Schema(
    {
        user : {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'User',
        },
        text: [{
            type: String,
            required: true,
            default: 'エラー',
        }],
        creatate: {
            type: Date,
            required: true,
        }
    }
)

model('Credit', Credit_Schema)