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

const createEmailTextLink = (token) => {
    const url = `http://localhost:3001/login?token=${token}`
    const emailText = `Hi,\n\nPlease click the link below for authorised access to the site. Please note, this access is valid for 30 minutes. Once this has expired you will need to request a new access link.\n\n${url}\n\nThanks for visiting!`
    return emailText
}

module.exports = {
    handleErrors,
    createToken,
    createGuestToken,
    createEmailTextLink
}