const mongoose = require('mongoose')
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    display_name: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: [true, 'Please enter a username'],
        unique: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: [true, 'Please enter a password'],
        minlength: [6, 'Minimum password length is 6 characters'],
    },
    visits: {
        type: Number
    },
    lastVisit: {
        type: Date
    }
})


userSchema.pre('save', async function(next) {
    const salt = await bcrypt.genSalt();
    this.password = await bcrypt.hash(this.password, salt);
    next();
});
  

userSchema.statics.login = async function(username, password) {
    const user = await this.findOne({ username });
    if (user) {
        const newVisits = user.visits + 1
        const lastVisit = new Date()
        const update = await this.updateOne({ username }, {
            visits: newVisits,
            lastVisit
        })
        const auth = await bcrypt.compare(password, user.password);
        if (auth) {
        return user;
        }
        throw Error('Incorrect password');
    }
    throw Error('Incorrect username');
};

const User = mongoose.model('user', userSchema)

module.exports = User