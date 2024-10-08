const { Schema, model } = require('mongoose')

const Feedback_Schema = Schema(
    {
        user: {
            type: String,
            required: true,
        },
        title : {
            type: String,
            required: true,
        },
        category : {
            type: String,
            required: true,
        },
        status : {
            type: String,
            required: true,
            default: 'OPEN',
        },
        content: {
            type: String,
            required: true,
            default: 'エラー',
        },
        creatdate: {
            type: Date,
            default: Date.now, // Set default to current date
        }
    }
)

model('Feedback', Feedback_Schema)