const { Schema, model } = require('mongoose')

const FileSchema = Schema(
    {
        process_user: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'User',
        },
        filename: {
            type: String,
            required: true,
        },
        originalimage: {
            type: String,
            required: true,
        },
        process_data: {
            type: String,
            default: '',
        },
        process_date: {
            type: Date,
            required: true,
        }
    },
    {
        timestamps: true,
        collection: process.env.DB_COLLECTION_PREFIX + 'files'
    }
)

model('File', FileSchema)