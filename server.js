require('dotenv').config()

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
    try {
        const bonus = await axios('https://fantasy.premierleague.com/api/event-status/')
        const leagueDetails = await axios(`https://draft.premierleague.com/api/league/${leagueCode}/details`)
        const gwkFinished = await axios('https://draft.premierleague.com/api/game')
        const { current_event } = gwkFinished.data
        // const current_event = 5
        const dreamTeam = await axios(`https://draft.premierleague.com/api/dreamteam/${current_event}`)
        const bootstrapStatic = await axios('https://fantasy.premierleague.com/api/bootstrap-static/')
        const { elements, phases, element_types } = bootstrapStatic.data
        const elementGwkStats = await axios(`https://draft.premierleague.com/api/event/${current_event}/live`)
        
        const playerTeams = await Promise.all(
            playerIds.map( async (player) => {
                const { data } = await axios(`https://draft.premierleague.com/api/entry/${player.entry_id}/event/${current_event}`)
                return { player: player.name, team: data.picks, gameweek: current_event, subs: data.subs }
            }) 
        )

        res.send({
            bonus: bonus.data,
            dreamTeam: dreamTeam.data
        })
    }
    catch (error) {
        console.log(error)
        res.status(400).send({ message: error.message, error })
    }
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


