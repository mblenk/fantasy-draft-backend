const axios = require('axios')
const Year = require('../models/Year')
const { calculateSquadWeeklyTotalsByPosition, updateWeeklySquadTotalsByPosition, formatWaivers, formatTrades, formatNewWaiverDataAndMergeWithExistingData, trackWaivers, calculateWeeklyLeagueTable } = require('./liveApiDataFunctions')
const { playerIds, year, leagueCode } = require('./variableData')

module.exports.liveStats = async (req, res) => {
    try {
        const bonus = await axios('https://fantasy.premierleague.com/api/event-status/')
        const leagueDetails = await axios(`https://draft.premierleague.com/api/league/${leagueCode}/details`)
        const gwkFinished = await axios('https://draft.premierleague.com/api/game')
        const { current_event } = gwkFinished.data
        // const current_event = 2
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

        const data = await Year.updateOne({ year }, {
            // when updating squad scores the reset_transfers endpoint will also need to be called to reset the wavier data
            squadScores: updatedSquadScores
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
        res.status(400).send({ text: 'Error: Fantasy Football servers are down, please try again later.', message: error.message })
    }


    
}

module.exports.update_scores = async (req, res) => {
    const { playerIds, number, finished } = req.body

    if(playerIds) {
        try {
            const getPlayerScores = async (playerIds) => {
                const scores = { players: {} }
                
                const playerHistory = await Promise.all(
                    playerIds.map( async (player) => {
                        scores.players[player.name] = {}
                        const { data } = await axios(`https://draft.premierleague.com/api/entry/${player.entry_id}/history`)
    
                        const history = data.history
                        finished ? history.length = number : history.length = number - 1
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
            finished ? leagueTable[number] = finalScores : leagueTable
    
            const update = await Year.updateOne({ year }, {
                live: true,
                scores: result,
                players: playerIds,
                leagueTable
            })
            res.status(200)
            res.send('Success')
        } catch (error) {
            console.log(error)
            res.status(400).send({ text: 'Error, could not update', message: error.message })
        }
    } else {
        res.status(500).json({ error: 'Unable to update scores. Please provide valid player data'})
    }
}

module.exports.get_transfers = async (req, res) => {
    try {
        const [ newWaivers, newTrades, bootstrapStatic ] = await Promise.all([
            axios(`https://draft.premierleague.com/api/draft/league/${leagueCode}/transactions`),
            axios(`https://draft.premierleague.com/api/draft/league/${leagueCode}/trades`),
            axios('https://fantasy.premierleague.com/api/bootstrap-static/')
        ])
    
        const { transactions, draftPicks } = await Year.findOne({ year: year }).lean()
        
        const { combinedWaivers, combinedTrades } = formatNewWaiverDataAndMergeWithExistingData(newWaivers, newTrades, bootstrapStatic.data.elements, transactions, playerIds)
    
        //TRADES TRACKING
    
        const waiverTrackingUpdate = await trackWaivers(combinedWaivers)
    
        const data = await Year.updateOne({ year }, {
            transactions : {
                waivers: waiverTrackingUpdate,
                trades: combinedTrades
            }
        })
    
        res.send({ 
            waivers: waiverTrackingUpdate, 
            trades: combinedTrades,
            elementStats: bootstrapStatic.data.elements,
            draftPicks
        })
    } catch (error) {
        console.log(error)
        res.status(400).send({ text: 'Error, could not fetch scores', message: error.message })
    }
    
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
    
        //format new waivers and trades
        const formattedWaivers = formatWaivers(newWaivers.data.transactions, bootstrapStatic.data.elements, playerIds)
        const formattedTrades = formatTrades(newTrades.data.trades, bootstrapStatic.data.elements, playerIds)
    
        const update = await axios.patch(`http://localhost:5000/api/year/update/${year}`, {
                transactions: {
                    waivers: formattedWaivers, 
                    trades: formattedTrades,
                }
            }, 
            { 
                withCredentials: true, 
                credentials: 'include' 
            })
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