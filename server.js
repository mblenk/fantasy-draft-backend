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

const leagueCode = 8548

const playerIds = [
    {
        name:"Matt",
        entry_id:75081,
        id:75140
    },
    {
        name:"Tom",
        entry_id:74697,
        id:74756
    },
    {
        name:"Dan",
        entry_id:138413,
        id:138578
    },
    {
        name:"Nick",
        entry_id:72961,
        id:73019
    },
    {
        name:"James",
        entry_id:184489,
        id:184752
    },
    {
        name:"Sam",
        entry_id:143292,
        id:143463
    },
    {
        name:"Ollie",
        entry_id:62522,
        id:62565
    },
    {
        name:"Doug",
        entry_id:28784,
        id:28800
    }
]

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


