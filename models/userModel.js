const { Schema, model } = require('mongoose')

const UserSchema = Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
        },
        name: {
            type: String,
            required: true,
        },
        companyname: {
            type: String,
        },
        pwd: {
            type: String,
            required: true,
        },
        birthdate: {
            type: Date,
            required: true,
        },
        avatar: {
            type: String,
            default: '',
        },
        credit: {
            type: Number,
            default: 20,
        },
        isAdmin: {
            type: Boolean,
            default: false,
        },
        createdate: {
            type: Date,
            required: true,
            default: Date.now, // Set default to current date
        }
    },
    {
        collection: process.env.DB_COLLECTION_PREFIX + 'users',
        timestamps: true,
    }
)

model('User', UserSchema)

const path = require('path')
const bcrypt = require('bcrypt')
const { type } = require('os')
const config = require(path.resolve('./config'))

const User = model("User");

const init = async () => {
    try {
        var admin = await User.findOne({ email: config.default_admin.email });

        if (admin) {

        } else {
            const salt = await bcrypt.genSalt(10);

            await User.create({
                email: config.default_admin.email,
                name: config.default_admin.name,
                pwd: await bcrypt.hash(config.default_admin.pwd, salt),
                birthdate: config.default_admin.birthdate,
                isAdmin: true
            })            
        }
    } catch (err) {
        console.log(err.message)
    }
}

init();