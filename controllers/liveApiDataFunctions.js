const axios = require('axios')

const calculateSquadWeeklyTotalsByPosition = (teams, elements, elementWeeks, week) => {
    const positionSummaries = teams.map(squad => {
        const teamScores = squad.team.map(player => {
            const findPlayer = elements.filter(element => player.element === element.id)
            const playerPosition = findPlayer[0].element_type
            const { total_points, goals_scored, assists, clean_sheets, goals_conceded, own_goals, penalties_saved, penalties_missed, yellow_cards, red_cards, saves, bonus, bps, minutes } = elementWeeks.elements[player.element].stats
            const onBench = player.position > 11 ? true : false
            
            return {
                element: player.element,
                position: playerPosition,
                score: total_points,
                goals_scored, assists, clean_sheets, goals_conceded, own_goals, penalties_saved, penalties_missed, yellow_cards, red_cards, saves, bonus, bps, minutes,
                onBench
            }
        })
        const offBench = squad.subs.map(player => {
            const findPlayer = elements.filter(element => player.element_in === element.id)
            const playerPosition = findPlayer[0].element_type
            const findScore = elementWeeks.elements[player.element_in].stats.total_points
            
            return {
                element: player.element,
                position: playerPosition,
                score: findScore
            }
        })

        return {
            player: squad.player,
            teamData: teamScores,
            offBench
        }
    })

    const scoresByPosition = positionSummaries.map(team => {
        const gk = team.teamData.filter(item => item.position === 1).reduce((a, b) => a + b.score, 0)
        const def = team.teamData.filter(item => item.position === 2).reduce((a, b) => a + b.score, 0)
        const mid = team.teamData.filter(item => item.position === 3).reduce((a, b) => a + b.score, 0)
        const fwd = team.teamData.filter(item => item.position === 4).reduce((a, b) => a + b.score, 0)
        const goals_scored = team.teamData.reduce((a, b) => a + b.goals_scored, 0)
        const assists = team.teamData.reduce((a, b) => a + b.assists, 0)
        const clean_sheets = team.teamData.filter(item => item.position === 1 || item.position === 2 || item.position == 3).reduce((a, b) => a + b.clean_sheets, 0)
        const goals_conceded = team.teamData.filter(item => item.position === 1 || item.position === 2).reduce((a, b) => a + b.goals_conceded, 0)
        const own_goals = team.teamData.reduce((a, b) => a + b.own_goals, 0)
        const penalties_saved = team.teamData.reduce((a, b) => a + b.penalties_saved, 0)
        const penalties_missed = team.teamData.reduce((a, b) => a + b.penalties_missed, 0)
        const yellow_cards = team.teamData.reduce((a, b) => a + b.yellow_cards, 0)
        const red_cards = team.teamData.reduce((a, b) => a + b.red_cards, 0)
        const saves = team.teamData.reduce((a, b) => a + b.saves, 0)
        const bonus = team.teamData.reduce((a, b) => a + b.bonus, 0)
        const bps = team.teamData.reduce((a, b) => a + b.bps, 0)
        const minutes = team.teamData.reduce((a, b) => a + b.minutes, 0)

        const pointsOffBench = team.offBench.reduce((a, b) => a + b.score, 0)

        const benchPoints = team.teamData.filter(item => item.onBench).reduce((a, b) => a + b.score, 0)
        
        return {
            player: team.player,
            gameweek: week,
            gk,
            def,
            mid,
            fwd,
            goals_scored, assists, clean_sheets, goals_conceded, own_goals, penalties_saved, penalties_missed, yellow_cards, red_cards, saves, bonus, bps, minutes,
            pointsOffBench,
            benchPoints
        }
    })
    return scoresByPosition
}

const updateWeeklySquadTotalsByPosition = (playerIds, squadScores, scoresByPosition, current_event) => {
    playerIds.forEach(player => {
        const currentWeeklyData = squadScores.weekly[player.name]

        const findPlayersData = currentWeeklyData.filter(score => score.player === player.name)
        const removedOutOfDateDataForCurrentWeek = findPlayersData.filter(item => item.gameweek !== current_event)
        const filterNewDataToFindPlayer = scoresByPosition.filter(score => score.player === player.name)
        const newData = filterNewDataToFindPlayer[0]

        const combinedData = [...removedOutOfDateDataForCurrentWeek, newData]
        const sortedByGameweek = combinedData.sort((a, b) => a.gameweek - b.gameweek)

        squadScores.weekly[player.name] = sortedByGameweek

        squadScores.totalStats[player.name].goals_scored = sortedByGameweek.reduce((a, b) => a + b.goals_scored, 0)
        squadScores.totalStats[player.name].assists = sortedByGameweek.reduce((a, b) => a + b.assists, 0)
        squadScores.totalStats[player.name].clean_sheets = sortedByGameweek.reduce((a, b) => a + b.clean_sheets, 0)
        squadScores.totalStats[player.name].goals_conceded = sortedByGameweek.reduce((a, b) => a + b.goals_conceded, 0)
        squadScores.totalStats[player.name].own_goals = sortedByGameweek.reduce((a, b) => a + b.own_goals, 0)
        squadScores.totalStats[player.name].penalties_saved = sortedByGameweek.reduce((a, b) => a + b.penalties_saved, 0)
        squadScores.totalStats[player.name].penalties_missed = sortedByGameweek.reduce((a, b) => a + b.penalties_missed, 0)
        squadScores.totalStats[player.name].yellow_cards = sortedByGameweek.reduce((a, b) => a + b.yellow_cards, 0)
        squadScores.totalStats[player.name].red_cards = sortedByGameweek.reduce((a, b) => a + b.red_cards, 0)
        squadScores.totalStats[player.name].saves = sortedByGameweek.reduce((a, b) => a + b.saves, 0)
        squadScores.totalStats[player.name].bonus = sortedByGameweek.reduce((a, b) => a + b.bonus, 0)
        squadScores.totalStats[player.name].bps = sortedByGameweek.reduce((a, b) => a + b.bps, 0)
        squadScores.totalStats[player.name].minutes = sortedByGameweek.reduce((a, b) => a + b.minutes, 0)

    }) 
    return squadScores
}

const formatWaivers = (waivers, elementStats, playerIds) => {
    const formattedWaivers = waivers.map(transaction => {
        let type = ''
        let result = ''
        
        transaction.kind === "f" ? type = "Free Agent" : type = "Waiver"
        transaction.result === "a" ? result = "Successful" : transaction.result === "di" ? result = "Player in unavailable" : result = "Player out unavailable"

        const playerInFilter = elementStats.filter(element => element.id === transaction.element_in)
        const player_in_name = playerInFilter[0].web_name
        const playerOutFilter = elementStats.filter(element => element.id === transaction.element_out)
        const player_out_name = playerOutFilter[0].web_name
        const player_out_status = playerOutFilter[0].status === "u" ? playerOutFilter[0].news : ""
        const managerFilter = playerIds.filter(player => player.entry_id === transaction.entry)
        const manager = managerFilter[0].name

        return {
            added: transaction.added,
            player_in_id: transaction.element_in,
            player_out_id: transaction.element_out,
            player_in_name, 
            player_out_name,
            gameweek: transaction.event,
            type, 
            result, 
            manager,
            manager_id: transaction.entry,
            // waiver_tracking_active: false,
            // tracked: false,
            id: transaction.id,
            player_in_retained: true,
            player_in_released: null,
            profit: 0,
            player_in_score: 0,
            player_out_score: 0,
            player_out_status
        }
    })
    return formattedWaivers
}

const formatTrades = (trades, elementStats, playerIds) => {
    const formattedTrades = trades.map(trade => {
        const playersInvolved = trade.tradeitem_set.map(playerSwap => {
            const findPlayerIn = elementStats.filter(element => element.id === playerSwap.element_in )
            const findPlayerOut = elementStats.filter(element => element.id === playerSwap.element_out )
            const player_in = findPlayerIn[0].web_name
            const player_out = findPlayerOut[0].web_name

            return { player_in, player_out }
        })

        const findOfferingManager = playerIds.filter(manager => manager.entry_id === trade.offered_entry)
        const findReceivingManager = playerIds.filter(manager => manager.entry_id === trade.received_entry)
        const offering_manager = findOfferingManager[0].name
        const receiving_manager = findReceivingManager[0].name

        return {
            gameweek: trade.event,
            offering_manager, 
            receiving_manager,
            offer_time: trade.offer_time,
            response_time: trade.response_time,
            trade_content: playersInvolved,
            id: trade.id 
        }

    })
    return formattedTrades
}

const formatNewWaiverDataAndMergeWithExistingData = (newWaivers, newTrades, elements, transactions, playerIds) => {
    const removeExistingWaivers = newWaivers.data.transactions.filter((item, i) => {
        return transactions.waivers.filter(waiver => waiver.id === item.id).length === 0
    }) 
    const removeExistingTrades = newTrades.data.trades.filter((item, i) => {
        return transactions.trades.filter(trade => trade.id === item.id).length === 0
    })

    //format new waivers and trades
    const formattedWaivers = formatWaivers(removeExistingWaivers, elements, playerIds)
    const formattedTrades = formatTrades(removeExistingTrades, elements, playerIds)

    //combine old and new data
    const combinedWaivers = [...transactions.waivers, ...formattedWaivers]
    const combinedTrades = [...formattedTrades]

    return { combinedWaivers, combinedTrades }
}

const trackWaivers = async (combinedWaivers, latestGameweek) => {
    const waiverTrackingUpdate = await Promise.all(
        combinedWaivers.map( async (waiver) => {
            if(waiver.result !== 'Successful' || !waiver.player_in_retained) {
                // waiver.profit = waiver.player_out_status ? "N/A" : waiver.profit
                return waiver
            }
            if(waiver.result === 'Successful' && waiver.player_in_retained) {
                const { data:playerInScores } = await axios(`https://draft.premierleague.com/api/element-summary/${waiver.player_in_id}`)
                const { data:playerOutScores } = await axios(`https://draft.premierleague.com/api/element-summary/${waiver.player_out_id}`)
                
                const playerInValidScores = playerInScores.history.filter(week => week.event >= waiver.gameweek && week.event <= latestGameweek)
                const playerOutValidScores = playerOutScores.history.filter(week => week.event >= waiver.gameweek && week.event <= latestGameweek)

                const { data:team } = await axios(`https://draft.premierleague.com/api/entry/${waiver.manager_id}/event/${latestGameweek}`)

                const isPlayerStillInTeam = team.picks.filter(pick => pick.element === waiver.player_in_id)
    
                if(isPlayerStillInTeam.length === 0) {
                    waiver.waiver_tracking_active = false
                    waiver.player_in_retained = false
                    waiver.player_in_released = latestGameweek
                    return waiver
                }
                if(isPlayerStillInTeam.length !== 0) {
                    const playerInSum = playerInValidScores.reduce((a, { total_points }) => a + total_points, 0)
                    const playerOutSum = playerOutValidScores.reduce((a, { total_points }) => a + total_points, 0)
                    const delta = playerInSum - playerOutSum
                    waiver.player_in_score = playerInSum
                    waiver.player_out_score = playerOutSum
                    waiver.profit = waiver.player_out_status ? "N/A" : delta
                    return waiver
                }
            }
        })
    )
    return waiverTrackingUpdate
}

const calculateWeeklyLeagueTable = (data) => {
    const finalScores = Object.keys(data.players).map(player => {
        const values = Object.values(data.players[player])
        const score = values.reduce((a,b) => a + b)

        return ({ player, score })
    })
    finalScores.sort((a, b) => b.score - a.score)
    return finalScores
}

module.exports = {
   calculateSquadWeeklyTotalsByPosition,
   updateWeeklySquadTotalsByPosition,
   formatWaivers,
   formatTrades,
   formatNewWaiverDataAndMergeWithExistingData,
   trackWaivers,
   calculateWeeklyLeagueTable
} 