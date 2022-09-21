const axios = require('axios')
const { ObjectId } = require('mongodb')
const User = require('../models/User')
const Year = require('../models/Year')
const { calculateSquadWeeklyTotalsByPosition, updateWeeklySquadTotalsByPosition, formatNewWaiverDataAndMergeWithExistingData, trackWaivers, trackTrades, calculateWeeklyLeagueTable, calculateWaiverStats, formatRandomLeagueTrades, getRandomInt } = require('./liveApiDataFunctions')
const { playerIds, year, leagueCode } = require('./variableData')


module.exports.liveStats = async (req, res) => {
    try {
        const bonus = await axios('https://fantasy.premierleague.com/api/event-status/')
        const leagueDetails = await axios(`https://draft.premierleague.com/api/league/${leagueCode}/details`)
        const gwkFinished = await axios('https://draft.premierleague.com/api/game')
        const { current_event } = gwkFinished.data
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

        const scoresByPosition = calculateSquadWeeklyTotalsByPosition(playerTeams, elements, elementGwkStats.data, current_event)

        const { squadScores, scores:weeklyScores } = await Year.findOne({ year }).lean()

        const updatedSquadScores = updateWeeklySquadTotalsByPosition(playerIds, squadScores, scoresByPosition, current_event)
        const timeOfUpdate = new Date()

        const data = await Year.updateOne({ year }, {
            // when updating squad scores the reset_transfers endpoint will also need to be called to reset the waiver data
            squadScores: updatedSquadScores,
            lastUpdated: timeOfUpdate
        })

        const { requests } = await User.findOne({ _id: ObjectId(res.locals.user.id)}).lean()
        const increment = requests.live_gwk + 1
        requests.live_gwk =  increment
        const updateUser = await User.updateOne({ _id: ObjectId(res.locals.user.id)}, {
            requests
        })

        res.send({ 
            bonus: bonus.data, 
            leagueDetails: leagueDetails.data, 
            gwkStatus: gwkFinished.data, 
            dreamTeam: dreamTeam.data,
            elementStats: elements,
            element_types,
            gwkTeams: playerTeams,
            elementGwkStats: elementGwkStats.data,
            scoresByPosition,
            squadScores,
            weeklyScores,
            phases, 
        })
    } catch (error) {
        console.log(error)
        res.status(400).send({ text: 'Error: Fantasy Football servers are down, please try again later.', message: error.message, error })
    }    
}

module.exports.update_scores = async (req, res) => {
    if(playerIds) {
        try {
            const gwkFinished = await axios('https://draft.premierleague.com/api/game')
            const { current_event, current_event_finished } = gwkFinished.data

            const getPlayerScores = async (playerIds) => {
                const scores = { players: {} }
                
                const playerHistory = await Promise.all(
                    playerIds.map( async (player) => {
                        scores.players[player.name] = {}
                        const { data } = await axios(`https://draft.premierleague.com/api/entry/${player.entry_id}/history`)

                        const history = data.history
                        current_event_finished ? history.length = current_event : history.length = current_event - 1
                        history.forEach(week => {
                            scores.players[player.name][week.event] = week.points
                        })
                    })
                )
                return scores
            }
            const result = await getPlayerScores(playerIds)
            const finalScores = calculateWeeklyLeagueTable(result)
    
            const { leagueTable } = await Year.findOne({ year }).lean()
            current_event_finished ? leagueTable[current_event] = finalScores : leagueTable
    
            const update = await Year.updateOne({ year }, {
                live: true,
                scores: result,
                players: playerIds,
                leagueTable
            })
            res.status(200)
            res.send('Success')
        } catch (error) {
            console.log(error.message)
            res.status(400).send({ text: 'Error, could not update', message: error.message })
        }
    } else {
        res.status(500).json({ error: 'Unable to update scores. Please provide valid player data'})
    }
}

module.exports.get_transfers = async (req, res) => {
    try {
        const [ newWaivers, newTrades, bootstrapStatic, gwkFinished ] = await Promise.all([
            axios(`https://draft.premierleague.com/api/draft/league/${leagueCode}/transactions`),
            axios(`https://draft.premierleague.com/api/draft/league/${leagueCode}/trades`),
            axios('https://fantasy.premierleague.com/api/bootstrap-static/'),
            axios('https://draft.premierleague.com/api/game')
        ])
        const { current_event } = gwkFinished.data
    
        const { transactions, draftPicks } = await Year.findOne({ year: year }).lean()
        
        const { combinedWaivers, combinedTrades } = formatNewWaiverDataAndMergeWithExistingData(newWaivers, newTrades, bootstrapStatic, transactions, playerIds)
    
        const tradesTrackingUpdate = await trackTrades(combinedTrades, current_event)
    
        const removeNewWaiversWithNoTeamDataForTracking = combinedWaivers.filter(waiver => waiver.gameweek <= current_event)
        const removedWaivers = combinedWaivers.filter(waiver => waiver.gameweek > current_event)
        const waiverTrackingUpdate = await trackWaivers(removeNewWaiversWithNoTeamDataForTracking, current_event, bootstrapStatic)
        const combineTrackedWaivers = [...waiverTrackingUpdate, ...removedWaivers]

        const transactionStats = calculateWaiverStats(combineTrackedWaivers, playerIds)
    
        const data = await Year.updateOne({ year }, {
            transactions : {
                waivers: combineTrackedWaivers,
                trades: tradesTrackingUpdate,
                transactionStats 
            }
        })

        const { requests } = await User.findOne({ _id: ObjectId(res.locals.user.id)}).lean()
        const increment = requests.transfers + 1
        requests.transfers =  increment
        const updateUser = await User.updateOne({ _id: ObjectId(res.locals.user.id)}, {
            requests
        })
    
        res.send({ 
            waivers: combineTrackedWaivers, 
            trades: combinedTrades,
            elementStats: bootstrapStatic.data.elements,
            draftPicks,
            transactionStats
        })
    } catch (error) {
        console.log(error)
        res.status(400).send({ text: 'Error, could not fetch transfers', message: error.message })
    }
    
}

module.exports.get_random_league_trades = async (req, res) => {
    let trades = {}

    const { requests } = await User.findOne({ _id: ObjectId(res.locals.user.id)}).lean()
    const increment = requests.random_trades + 1
    requests.random_trades =  increment
    const updateUser = await User.updateOne({ _id: ObjectId(res.locals.user.id)}, {
        requests
    })

    const findRandomLeague = async (trades) => {
        if(trades.trades) return

        const num = getRandomInt(1, 250000)
        try {
            const { data } = await axios(`https://draft.premierleague.com/api/draft/league/${num}/trades`)
            if(data.trades.length === 0) throw new Error('No trades')
            if(data) {
                trades = data
                console.log(num, 'Trades')

                const bootstrapStatic = await axios('https://fantasy.premierleague.com/api/bootstrap-static/')
                const gwkFinished = await axios('https://draft.premierleague.com/api/game')
                const { current_event } = gwkFinished.data
            
                const formattedTrades = formatRandomLeagueTrades(data.trades, bootstrapStatic.data.elements)
            
                const trackingUpdate = await trackTrades(formattedTrades, current_event)
            
                res.send({
                    trades: trackingUpdate,
                    leagueId: num
                })
            }
        } catch (error) {
            console.log(num, error.message)
        }
        
        findRandomLeague(trades)
    }
    findRandomLeague(trades)
}

module.exports.get_random_draft = async (req, res) => {
    let draft = {}

    const { requests } = await User.findOne({ _id: ObjectId(res.locals.user.id)}).lean()
    const increment = requests.random_draft + 1
    requests.random_draft =  increment
    const updateUser = await User.updateOne({ _id: ObjectId(res.locals.user.id)}, {
        requests
    })

    const findRandomLeague = async (draft) => {
        if(draft.choices) return

        const num = getRandomInt(1, 250000)
        try {
            const { data } = await axios(`https://draft.premierleague.com/api/draft/${num}/choices`)
            if(data.choices.length === 0) throw new Error('Draft not done')
            if(data) {
                draft = data
                console.log(num, 'Draft')
                const bootstrapStatic = await axios('https://draft.premierleague.com/api/bootstrap-static')

                const leagueSize = data.choices.filter(pick => pick.round === 1).length
                const managersOdd = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P']
                managersOdd.length = leagueSize
                const managersEven = managersOdd.map((item, i) => managersOdd[leagueSize - 1 - i])

                const draftPicks = data.choices.map(pick => {
                    const findPlayer = bootstrapStatic.data.elements.filter(element => pick.element === element.id)
                    const element_name = findPlayer[0].web_name
                   
                    
                    const manager = pick.round % 2 === 0 ? managersEven[pick.pick - 1] : managersOdd[pick.pick - 1]

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

                res.send({
                    draft: draftPicks,
                    leagueId: num
                })
            }
        } catch (error) {
            console.log(num, error.message)
        }
        
        findRandomLeague(draft)
    }
    findRandomLeague(draft)
}

module.exports.update_transfers = async (req, res) => {
    const { transactions } = req.body
    if(transactions) {
        try {
            const update = await axios.patch(`http://localhost:5000/api/year/update/${year}`, {
                transactions
            }, 
            { 
                withCredentials: true, 
                credentials: 'include' 
            })
            res.status(200)
            res.send('Success')
        } catch (error) {
            console.log(error)
            res.status(400).send({ text: 'Error, could not update', message: error.message })
        }
    } else {
        res.status(500).json({ error: 'No transaction data received'})
    }
}

module.exports.get_monthly_data = async (req, res) => {
    try {
        const bootstrapStatic = await axios('https://fantasy.premierleague.com/api/bootstrap-static/')
        const { phases } = bootstrapStatic.data
        const gwkFinished = await axios('https://draft.premierleague.com/api/game')
        const { current_event } = gwkFinished.data
        const { scores:weeklyScores, months } = await Year.findOne({ year }).lean()
        const deletedOverallPhase = phases.filter(phase => phase.name !== "Overall")

        const currentMonth = deletedOverallPhase.find(phase => phase.start_event <= current_event && current_event <= phase.stop_event)

        deletedOverallPhase.forEach(phase => {
            months[phase.name].start_event = phase.start_event
            months[phase.name].stop_event = phase.stop_event
            months[phase.name].live_month = false
        })
        months[currentMonth.name].live_month = true

        const monthlyTotals = playerIds.map(player => {
            const weekNumbers = Object.keys(weeklyScores.players[player.name])
            const findWeeksInCurrentMonth = weekNumbers.filter(week => currentMonth.start_event <= week && week <= currentMonth.stop_event)

            const playerScoresInMonth = findWeeksInCurrentMonth.map(week => {
                return weeklyScores.players[player.name][week]
            })
            const playerMonthlyTotal = playerScoresInMonth.reduce((a,b) => a + b)

            return { player: player.name, score: playerMonthlyTotal }
        })

        months[currentMonth.name].scores = monthlyTotals.sort((a, b) => b.score - a.score)
        months.liveMonth = { 
            month: currentMonth.name,
            scores: monthlyTotals.sort((a, b) => b.score - a.score),
            start_event: currentMonth.start_event, 
            stop_event: currentMonth.stop_event,
            current_event 
        }

        const data = await Year.updateOne({ year }, {
            months
        })

        const { requests } = await User.findOne({ _id: ObjectId(res.locals.user.id)}).lean()
        const increment = requests.months + 1
        requests.months =  increment
        const updateUser = await User.updateOne({ _id: ObjectId(res.locals.user.id)}, {
            requests
        })

        res.status(200).send(months)
    } catch (error) {
        console.log(error)
        res.status(400).send({ text: 'Error, could not update data', message: error.message })
    }
    
}

module.exports.update_transfer_tracking = async (req, res) => {
    // console.log('fired')
    // const { waivers, waiverToUpdate } = req.body
    // if(waivers && waiverToUpdate) {
    //     const updatedWaivers = waivers.map(waiver => {
    //         if(waiver.id === waiverToUpdate.id) {
    //             waiver.tracked = true
    //             waiver.waiver_tracking_active = true
    //             console.log(waiver)
    //             return waiver
    //         }
    //         if(waiver.id !== waiverToUpdate.id) {
    //             return waiver
    //         } 
    //     })

    //     const update = await axios.patch(`http://localhost:5000/api/year/update/${year}`, {
    //         transactions: {
    //             waivers: updatedWaivers
    //         }
    //     }, 
    //     { 
    //         withCredentials: true, 
    //         credentials: 'include' 
    //     })
    //     res.status(200)
    //     res.send('Success')
    // }
}

module.exports.reset_transfers = async (req, res) => {
    try {
        const [ newWaivers, newTrades, bootstrapStatic ] = await Promise.all([
            axios(`https://draft.premierleague.com/api/draft/league/${leagueCode}/transactions`),
            axios(`https://draft.premierleague.com/api/draft/league/${leagueCode}/trades`),
            axios('https://fantasy.premierleague.com/api/bootstrap-static/')
        ])
        const findLatestGameweek = newWaivers.data.transactions.sort((a, b) => b.event - a.event)
        const current_event = findLatestGameweek[0].event

        for(let i = 1; i <= current_event; i++){
            const filterByGwk = newWaivers.data.transactions.filter(waiver => waiver.event <= i)
            const matchFormatToLiveVersion = { data: { transactions: filterByGwk } }

            const { transactions, draftPicks } = await Year.findOne({ year: year }).lean()

            const { combinedWaivers, combinedTrades } = formatNewWaiverDataAndMergeWithExistingData(matchFormatToLiveVersion, newTrades, bootstrapStatic, transactions, playerIds)

            const removeNewWaiversWithNoTeamDataForTracking = combinedWaivers.filter(waiver => waiver.gameweek < i)
            const waiverTrackingUpdate = await trackWaivers(removeNewWaiversWithNoTeamDataForTracking, i - 1, bootstrapStatic)

            const transactionStats = calculateWaiverStats(waiverTrackingUpdate, playerIds)

            const data = await Year.updateOne({ year }, {
                transactions : {
                    waivers: waiverTrackingUpdate,
                    trades: combinedTrades,
                    transactionStats
                    // waivers: [],
                    // trades: [],
                    // transactionStats: []
                }
            })
        }

        res.send('reset')
    } catch (error) {
        console.log(error)
        res.status(400).send({ text: 'Error, could not reset', message: error.message })
    }
}






// Reset Squad scores
// {
//             weekly: {
//                 Matt: [],
//                 Tom: [],
//                 Dan: [],
//                 Nick: [],
//                 James: [],
//                 Sam: [],
//                 Ollie: [],
//                 Doug: []
//             },
//             totalStats: {
//                 Matt: {
//                     goals_scored: 0, 
//                     assists: 0, 
//                     clean_sheets: 0, 
//                     goals_conceded: 0, 
//                     own_goals: 0, 
//                     penalties_saved: 0, 
//                     penalties_missed: 0, 
//                     yellow_cards: 0, 
//                     red_cards: 0, 
//                     saves: 0, 
//                     bonus: 0, 
//                     bps: 0, 
//                     minutes: 0
//                 },
//                 Tom: {
//                      goals_scored: 0, 
//         assists: 0, 
//         clean_sheets: 0, 
//         goals_conceded: 0, 
//         own_goals: 0, 
//         penalties_saved: 0, 
//         penalties_missed: 0, 
//         yellow_cards: 0, 
//         red_cards: 0, 
//         saves: 0, 
//         bonus: 0, 
//         bps: 0, 
//         minutes: 0
//                 },
//                 Dan: {
//                      goals_scored: 0, 
//         assists: 0, 
//         clean_sheets: 0, 
//         goals_conceded: 0, 
//         own_goals: 0, 
//         penalties_saved: 0, 
//         penalties_missed: 0, 
//         yellow_cards: 0, 
//         red_cards: 0, 
//         saves: 0, 
//         bonus: 0, 
//         bps: 0, 
//         minutes: 0
//                 },
//                 Nick: {
//                      goals_scored: 0, 
//         assists: 0, 
//         clean_sheets: 0, 
//         goals_conceded: 0, 
//         own_goals: 0, 
//         penalties_saved: 0, 
//         penalties_missed: 0, 
//         yellow_cards: 0, 
//         red_cards: 0, 
//         saves: 0, 
//         bonus: 0, 
//         bps: 0, 
//         minutes: 0
//                 },
//                 James: {
//                      goals_scored: 0, 
//         assists: 0, 
//         clean_sheets: 0, 
//         goals_conceded: 0, 
//         own_goals: 0, 
//         penalties_saved: 0, 
//         penalties_missed: 0, 
//         yellow_cards: 0, 
//         red_cards: 0, 
//         saves: 0, 
//         bonus: 0, 
//         bps: 0, 
//         minutes: 0
//                 },
//                 Sam: {
//                      goals_scored: 0, 
//         assists: 0, 
//         clean_sheets: 0, 
//         goals_conceded: 0, 
//         own_goals: 0, 
//         penalties_saved: 0, 
//         penalties_missed: 0, 
//         yellow_cards: 0, 
//         red_cards: 0, 
//         saves: 0, 
//         bonus: 0, 
//         bps: 0, 
//         minutes: 0
//                 },
//                 Ollie: {
//                      goals_scored: 0, 
//         assists: 0, 
//         clean_sheets: 0, 
//         goals_conceded: 0, 
//         own_goals: 0, 
//         penalties_saved: 0, 
//         penalties_missed: 0, 
//         yellow_cards: 0, 
//         red_cards: 0, 
//         saves: 0, 
//         bonus: 0, 
//         bps: 0, 
//         minutes: 0
//                 },
//                 Doug: {
//                      goals_scored: 0, 
//         assists: 0, 
//         clean_sheets: 0, 
//         goals_conceded: 0, 
//         own_goals: 0, 
//         penalties_saved: 0, 
//         penalties_missed: 0, 
//         yellow_cards: 0, 
//         red_cards: 0, 
//         saves: 0, 
//         bonus: 0, 
//         bps: 0, 
//         minutes: 0
//                 }
//             } 
//         }

//Reset Months
// {
//     August: {

//     },
//     September: {

//     },
//     October: {

//     },
//     November: {

//     },
//     December: {

//     },
//     January: {

//     },
//     February: {

//     },
//     March: {

//     },
//     April: {

//     },
//     May: {

//     }
// }