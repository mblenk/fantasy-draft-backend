const jwt = require('jsonwebtoken')

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

const maxGuestAge = 1 * 1 * 30 * 60 // days hours minutes seconds
const createGuestToken = (id) => {
    return jwt.sign({ id }, process.env.SECRET, {
        expiresIn: maxGuestAge
    })
}


module.exports = {
    handleErrors,
    createToken,
    createGuestToken
}