const { ObjectId } = require('mongodb')
const User = require('../models/User')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')
require('dotenv').config()
const {
    handleErrors,
    createToken,
    createGuestToken,
    createEmailTextLink
} = require('./userFunctions')


module.exports.login_user = async (req, res) => {
    const { username, password } = req.body
    try {
        const user = await User.login(username, password)
        const token = createToken(user._id)
        // res.cookie('jwt', token, { 
        //     httpOnly: true, 
        //     maxAge: maxAge * 1000,
        // })
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
        // res.cookie('jwt', token, { httpOnly: true, maxAge: maxAge * 1000 })
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
    // res.cookie('jwt', '', { httpOnly: true, maxAge: 1 })
    res.status(200).json({ mssg: 'User logged out'})
}



module.exports.create_guest_user = async (req, res) => {
    const { email } = req.body
    const host = req.get('host')

    // if(host !== 'localhost:3000') {
    //     console.log('Access blocked, invalid host')
    //     res.status(400).send('Invalid host')
    //     return
    // }

    if(!email){
        res.status(400).send('No email provided')
        return
    }

    const guestUserIdNumber = Math.floor(Math.random() * (50 - 1 + 1) + 1)
    const passwordKeyOne = Math.floor(Math.random() * (50 - 1 + 1) + 1)
    const passwordKeyTwo = Math.floor(Math.random() * (50 - 1 + 1) + 1)

    const timeNow = Date.now()
    const expiryTime = new Date(timeNow + 30 * 60000)

    try {
        const user = await User.create({ 
            display_name: `portfolioGuest${guestUserIdNumber}`, 
            username: `portfolioGuest${guestUserIdNumber}`, 
            password: `gup${guestUserIdNumber}${passwordKeyOne}${passwordKeyTwo}`, 
            visits: 0, 
            lastVisit: "01/01/2022", 
            expiresAt: expiryTime,
            requests: {
                live_gwk: 0,
                transfers: 0,
                months: 0,
                previous_year: 0,
                all_time: 0,
                random_trades: 0,
                random_draft: 0
            }
        })
        const token = createGuestToken(user._id)

        const emailText = createEmailTextLink(token)

        const transporter = nodemailer.createTransport("SMTP", {
            service:"hotmail",
            auth: {
                user: process.env.EMAIL,
                pass: process.env.PASSWORD
            }
        })

        const nodemailerOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: "Your authorised access link",
            text: emailText
        }

        transporter.sendMail(nodemailerOptions, (err, info) => {
            if(err){
                console.log(err)
                return
            }
            console.log(info.response)
        })

        res.status(200).send('Access created')

    }
    catch(err) {
        res.status(400).send(err.message);
    }
    
    
}

module.exports.check_guest_user = async (req, res) => {
    const { token } = req.body

    jwt.verify(token, process.env.SECRET, (err, decodedToken) => {
        if(err) {
            console.log('JWT Error', err.message)
            res.status(403).send(err.message)
            throw new Error('Issue with auth token')
        }
        if(decodedToken) {
            res.status(200).json({ token })
        }  
    })  
}

// module.exports.update_user = async (req, res) => {
//     const { username, data } = req.body

//     try {
//         const update = await User.updateOne({ username }, {
//             requests: data,
//         })
//         res.status(200).send('Updated')
//     } catch (error) {
//         console.log(error)
//     }
// }

