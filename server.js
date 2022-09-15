require('dotenv').config()
const axios = require('axios')
const express = require('express')
const mongoose = require('mongoose')
const authRoutes = require('./routes/authRoutes')
const yearRoutes = require('./routes/yearRoutes')
const liveApiRoutes = require('./routes/liveApiRoutes')
const cors = require('cors')
const cookieParser = require('cookie-parser')

const app = express()

//middleware
app.use(express.json()) 
app.use(cors({
     origin: true, 
     credentials: true 
}))
app.use(cookieParser())

//routes
app.use('/api/user', authRoutes)
app.use('/api/year', yearRoutes)
app.use('/api/liveData', liveApiRoutes)
app.use('/', async (req, res) => {
    res.send('Server Online')
})

const port = process.env.PORT || 8081

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('Connected to db')
        app.listen(port, () => {
            console.log('Listening on selected port')
        })
    })
    .catch((error) => {
        console.log(error)
    })


