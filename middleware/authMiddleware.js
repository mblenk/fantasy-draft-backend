const jwt = require('jsonwebtoken')
require('dotenv').config()


const auth = (req, res, next) => {
    const cookieToken = req.cookies.jwt 
    const authHeaderToken = req.headers.authorization
    const token = cookieToken ?? authHeaderToken

    if(token) {
        jwt.verify(token, process.env.SECRET, (err, decodedToken) => {
            if(err) {
                console.log(err)
            }
            if(decodedToken) {
                next()
            }
        })
    } else {
        console.log(token)
        throw new Error('Missing token')
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


