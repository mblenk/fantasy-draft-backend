const jwt = require('jsonwebtoken')
require('dotenv').config()


const auth = (req, res, next) => {
    const token = req.cookies.jwt
    console.log('auth fired')
    if(token) {
        jwt.verify(token, process.env.SECRET, (err, decodedToken) => {
            if(err) {
                console.log(err)
            }
            if(decodedToken) {
                console.log('auth:', decodedToken)
                next()
            }
        })
    } else {
        console.log(token)
    }
}

const userCheck = (req, res, next) => {
    const token = req.cookies.jwt
    if(token) {
        jwt.verify(token, process.env.SECRET, (err, decodedToken) => {
            if(err) {
                console.log(err)
            }
            if(decodedToken) {
                console.log('user check', decodedToken)
                res.locals.token = decodedToken
                next()
            }
        })
    } else {
        res.locals.token = { id: null }
        next()
    }
}

module.exports = { auth, userCheck }


