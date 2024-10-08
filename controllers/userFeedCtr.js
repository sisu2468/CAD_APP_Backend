const { model } = require('mongoose')
const path = require('path')
const config = require(path.resolve('./config.js'))

const Feedback = model('Feedback')

exports.add = async (req, res) => {
    try {
        const { user, title, category, content } = req.body
        console.log("data", req.body);
        const createdFeed = await Feedback.create({ user, title, category, content })
        if (createdFeed) {
            res.json({ message: 'user_Feedback_Created' })
        } else {
            res.status(500).json({ message: 'error' })
        }
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
}

exports.update = async (req, res) => {
    try {
        const userInfo = req.body
        if (req.body.paidstatus){
            userInfo.credit = req.user.credit + 20;
            userInfo.paid = req.user.paid + 100;
        }
        if (userInfo.pwd) {
            const salt = await bcrypt.genSalt(10);
            userInfo.pwd = await bcrypt.hash(userInfo.pwd, salt)
        }
        const result = await User.updateOne({ _id: req.user._id }, req.body)
        if (result.modifiedCount == 1) {
            res.json({ message: 'user_profile_updated' })
        } else {
            res.status(500).json({ message: 'error' })
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

exports.AllFeeds = async (req, res) => {
    try {
        const AllFeeds = await Feedback.find(); // Fetch all AllFeeds
        res.status(200).json(AllFeeds);     // Send AllFeeds data as JSON response
        console.log(AllFeeds);
    } catch (err) {
        res.status(500).json({ error: err.message }); // Handle errors
    }
}
