const axios = require('axios')
const Year = require('../models/Year')
const { ObjectId } = require('mongodb')
const User = require('../models/User')
const jwt = require('jsonwebtoken')
require('dotenv').config()
const { playerIds, year, leagueCode } = require('./variableData')
const { calculateTotalScoresFromWeeklyPoints, calculateStatistics, yearlyScoresAndPositionsByPlayer, combineYearlyScoresIntoTotalScore, calculatePositionsForEachSeason, averageAllTimePosition, consolidatePlayerScoresFromEachSeason, calculateGapToTheHose } = require('./yearDataFunctions')


module.exports.get_all_data = async (req, res) => {
    try {
        const { requests } = await User.findOne({ _id: ObjectId(res.locals.user.id)}).lean()
        const increment = requests.all_time + 1
        requests.all_time =  increment
        const updateUser = await User.updateOne({ _id: ObjectId(res.locals.user.id)}, {
            requests
        })

        const query = req.query
        const data = await Year.find().lean()
        const players = ['Matt', 'Sam', 'Devan', 'Doug', 'Nick', 'Ollie', 'Dan', 'James', 'Tom']
        if(data && query.type === 'table') {
            const dataObject = yearlyScoresAndPositionsByPlayer(data, players)
            const finalScores = combineYearlyScoresIntoTotalScore(dataObject)
            const findPositions = calculatePositionsForEachSeason(data, dataObject, players)
            const positionData = averageAllTimePosition(players, findPositions)

            res.status(200).json({ tableData: finalScores, positionData })
        }
        if(data && query.type === 'stats') {
            const dataObject = consolidatePlayerScoresFromEachSeason(players, data)
            const statistics = calculateStatistics(dataObject)
            const finalScores = calculateTotalScoresFromWeeklyPoints(dataObject)
            const hoseGaps = calculateGapToTheHose(dataObject)

            dataObject.leagueTable = finalScores
            dataObject.statistics = statistics
            dataObject.hoseGaps = hoseGaps

            res.status(200).json(dataObject)
        }
    }
    catch(err) {
        console.log(err)
        res.status(400).json({ err })
    }
    
}

module.exports.get_year_data = async (req, res) => {
    if(req.params.id){
        try {
            const { requests } = await User.findOne({ _id: ObjectId(res.locals.user.id)}).lean()
            const increment = requests.previous_year + 1
            requests.previous_year =  increment
            const updateUser = await User.updateOne({ _id: ObjectId(res.locals.user.id)}, {
                requests
            })

            const data = await Year.findOne({ year: req.params.id }).lean()
            if(data) {
                const years = ['2017-18', '2018-19', '2019-20', '2020-21', '2021-22']
                const response = {}
                const finalScores = calculateTotalScoresFromWeeklyPoints(data)
                const statistics = calculateStatistics(data)
                const hoseGaps = calculateGapToTheHose(data)

                if(years.includes(req.params.id)) {
                    response.leagueTable = finalScores
                    response.statistics = statistics
                    response.hoseGaps = hoseGaps
                    res.status(200).json(response)
                }
                if(!years.includes(req.params.id)) {
                    response.leagueTable = finalScores
                    response.statistics = statistics
                    response.hoseGaps = hoseGaps
                    response.waivers = data.transactions.waivers,
                    response.trades = data.transactions.trades
                    response.draftPicks = data.draftPicks
                    response.transactionStats = data.transactions.transactionStats
                    res.status(200).json(response)
                }
            }
        }
        catch(err) {
            console.log(err)
            res.status(400).send('error, not found')
        }
    } else {
        res.status(500).json({ error: 'Not a valid year'})
    }
}

module.exports.update_year_data = async (req, res) => {
    if(req.params.id){
        try {
            const data = await Year.updateOne({ year: req.params.id }, req.body)
            res.status(200).json(data)
        }
        catch(err) {
            console.log(err)
            res.status(400).send('Error, could not update')
        }
    } else {
        res.status(500).json({ error: 'Not a valid year'})
    }
}

module.exports.add_draft_data = async (req, res) => {
    try {
        const draft = await axios(`https://draft.premierleague.com/api/draft/${leagueCode}/choices`)
        const bootstrapStatic = await axios('https://draft.premierleague.com/api/bootstrap-static')

        const draftData = draft.data.choices

        const draftPicks = draftData.map(pick => {
            const findPlayer = bootstrapStatic.data.elements.filter(element => pick.element === element.id)
            const element_name = findPlayer[0].web_name
            const findManager = playerIds.filter(player => player.entry_id === pick.entry)
            const manager = findManager[0].name

            return {
                pick: pick.index,
                round: pick.round,
                roundPick: pick.pick,
                manager, 
                element: pick.element,
                element_name,
                choice_time: pick.choice_time,
            }
        })

        const data = await Year.updateOne({ year }, {
            draftPicks
        })
        res.status(200).json(data)
    } catch(err) {
        console.log(err)
        res.status(400).send(`Error, could not update: ${err.message}`)
    }
}





//Reset League Table Values
 // const update = {}
                // const filteredObject = { scores: { players: {}}}
                // for(let i = 1; i < 39; i++){
                //     const filteredObject = { scores: { players: {}}}
                //     const keys = Object.keys(data.scores.players)
                //     keys.forEach(player => {
                //         const array = Object.entries(data.scores.players[player])
                //         const filter = array.filter(([key, value]) => key <= i)
                //         const backToObject = Object.fromEntries(filter)
                //         filteredObject.scores.players[player] = backToObject
                //     })
                //     const finalScores = calculateTotalScoresFromWeeklyPoints(filteredObject)
                //     update[i] = finalScores
                // }



                // const updatedfgg = await Year.updateOne({ year: req.params.id }, {
                //     leagueTable: update
                // })