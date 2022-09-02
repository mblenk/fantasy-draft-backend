const { ObjectId } = require('mongodb')
const User = require('../models/User')
const jwt = require('jsonwebtoken')
require('dotenv').config()

const handleErrors = (err) => {
    console.log(err.message, err.code);
    let errors = { username: '', password: '' };

    // incorrect username
    if(err.message === 'Incorrect username') {
        errors.username = 'That username is not registered';
    }

    // incorrect password
    if(err.message === 'Incorrect password') {
        errors.password = 'Password is incorrect';
    }
  
    // duplicate username error
    if(err.code === 11000) {
      errors.username = 'That username is already registered';
      return errors;
    }
  
    // validation errors
    if(err.message.includes('user validation failed')) {
      Object.values(err.errors).forEach(({ properties }) => {
        errors[properties.path] = properties.message;
      });
    }

    return errors;
  }

const maxAge = 1 * 12 * 60 * 60 // days hours minutes seconds
const createToken = (id) => {
    return jwt.sign({ id }, process.env.SECRET, {
        expiresIn: maxAge
    })
}


module.exports.login_user = async (req, res) => {
    const { username, password } = req.body
    try {
        const user = await User.login(username, password)
        const token = createToken(user._id)
        res.cookie('jwt', token, { 
            httpOnly: true, 
            maxAge: maxAge * 1000,
        })
        res.status(200).json({ token })
    }
    catch(err) {
        const errors = handleErrors(err)
        res.status(400).json({ errors })
    }
}    


module.exports.create_user = async (req, res) => {
    const { name, username, password, visits, lastVisit } = req.body

    try {
        const user = await User.create({ 
            display_name: name, 
            username, 
            password, 
            visits, 
            lastVisit 
        })
        const token = createToken(user._id)
        res.cookie('jwt', token, { httpOnly: true, maxAge: maxAge * 1000 })
        res.status(201).json({ user })
    }
    catch(err) {
        const errors = handleErrors(err);
        res.status(400).json({ errors });
    }
}

module.exports.check_user = async (req, res) => {
    const { id } = res.locals.token

    if(ObjectId.isValid(id)) {
        try {
            const data = await User.findOne({ _id: ObjectId(id) })
            res.status(200).json(data)
        }
        catch(err) {
            console.log(err)
            res.status(400).send('No auth token found')
        }
    } else {
        res.status(200).json(null)
    }
}

module.exports.log_out = (req, res) => {
    console.log('fired logout')
    res.cookie('jwt', '', { httpOnly: true, maxAge: 1 })
    res.status(200).json({ mssg: 'User logged out'})
}

