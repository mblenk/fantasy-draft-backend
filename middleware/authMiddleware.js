const jwt = require('jsonwebtoken')
require('dotenv').config()
//METRIC BRANCH

const auth = (req, res, next) => {
    // const cookieToken = req.cookies.jwt 
    const authHeaderToken = req.headers.authorization
    // const token = cookieToken ?? authHeaderToken
    const token = authHeaderToken

    if(token) {
        jwt.verify(token, process.env.SECRET, (err, decodedToken) => {
            if(err) {
                console.log('JWT Error', err.message)
                res.status(403).send('JWT Expired')
                throw new Error('Issue with token')
            }
            if(decodedToken) {
                res.locals.user = decodedToken
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
                console.log('JWT Error', err)
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


