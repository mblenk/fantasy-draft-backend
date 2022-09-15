
const calculateTotalScoresFromWeeklyPoints = (data) => {
    const finalScores = Object.keys(data.scores.players).map(player => {
        const values = Object.values(data.scores.players[player])
        const score = values.reduce((a,b) => a + b)

        return ({ player, score, season: data.year, length: values.length })
    })
    finalScores.sort((a, b) => b.score - a.score)
    return finalScores
}

const maxMinScores = (data) => {
    const maxScore = Object.keys(data.scores.players).map(player => {
        const values = Object.values(data.scores.players[player])
        const maxScore = Math.max(...values)
        const filterZero = values.filter(value => value > 0)
        const minScore = Math.min(...filterZero)

        return { player, minScore, maxScore } 
    })
    maxScore.sort((a, b) => b.maxScore - a.maxScore)
    return maxScore
}

const gwkWinsLosses = (data) => {
   const weeks = Object.keys(data.scores.players.Matt)
   const weeklyPlayers = Object.keys(data.scores.players)

   if(weeklyPlayers.length === 8) {
        const weeklyPositions = weeks.map(week => {
            const weekByWeek = weeklyPlayers.map(player => {
                return { player, score: data.scores.players[player][week]}
            })    
            weekByWeek.sort((a,b) => b.score - a.score)
            return weekByWeek
        })

        const finalPositions = {}

        weeklyPlayers.forEach(player => {
                const playerPositions = weeklyPositions.map(week => {
                    const index = week.findIndex((name) => name.player === player)
                    const position = index + 1
                    return position
                })
                finalPositions[player] = playerPositions
        })
        return finalPositions
   }

   if(weeklyPlayers.length === 9) {
        const weeklyPositions = weeks.map(week => {
            const weekByWeek = weeklyPlayers.map(player => {
                const didPlayerPlay = data.scores.players[player].hasOwnProperty(week)
                if(didPlayerPlay) {
                    return { player, score: data.scores.players[player][week] }
                }
            })    
            weekByWeek.sort((a,b) => b.score - a.score)
            weekByWeek.pop()
            return weekByWeek
        })

        const finalPositions = {}

        weeklyPlayers.forEach(player => {
            const playerPositions = weeklyPositions.map(week => {
                const index = week.findIndex((name) => name.player === player)
                if(index !== -1) {
                    const position = index + 1
                    return position
                }
            })
            finalPositions[player] = playerPositions
        })
        return finalPositions
    }
}

const overallPosition = (data) => {
    const root = data.scores.players
    const weeks = Object.keys(root.Matt)
    const weeklyPlayers = Object.keys(root)

    if(weeklyPlayers.length === 8) {
        const playerProgressions = weeklyPlayers.map(player => {
            const values = Object.values(root[player])
            let totalScore = 0
            const progressiveScores = values.map((item, i) => {
                const score = item + totalScore
                totalScore = score
                return score 
            })
            return { player, scores: progressiveScores }
        })

        const weekByWeek = weeks.map((week, i) => {
            const weeklyCumulativeScores = playerProgressions.map(player => {
                const score = player.scores[i]
                return { player: player.player, score }
            })
            weeklyCumulativeScores.sort((a,b) => b.score - a.score)
            return weeklyCumulativeScores
        })

        const finalPositions = {}

        weeklyPlayers.forEach(player => {
            const playerPositions = weekByWeek.map(week => {
                const index = week.findIndex((name) => name.player === player)
                const position = index + 1
                return position
            })
            finalPositions[player] = playerPositions
        })
 
        return finalPositions
    }

    if(weeklyPlayers.length === 9) {
        const playerProgressions = weeklyPlayers.map(player => {
            // const gameweeks = Object.keys(root[player])
            let totalScore = 0
            const progressiveScores = weeks.map((item, i) => {
                if(root[player].hasOwnProperty(item)) {
                    const score = root[player][item] + totalScore
                    totalScore = score
                    return { [item]: score }
                }
                if(!root[player].hasOwnProperty(item)) {
                    const score = 0
                    return { [item]: score }
                }
            })
            return { player, scores: progressiveScores }
        })

        const weekByWeek = weeks.map((week, i) => {
            const weeklyCumulativeScores = playerProgressions.map(player => {
                const score = player.scores[i][week]
                return { player: player.player, score }
            })
            weeklyCumulativeScores.sort((a,b) => b.score - a.score)
            return weeklyCumulativeScores
        })

        const finalPositions = {}

        weeklyPlayers.forEach(player => {
            const playerPositions = weekByWeek.map(week => {
                const index = week.findIndex((name) => name.player === player)
                const position = index + 1
                return position
            })
            finalPositions[player] = playerPositions
        })
 
        return finalPositions
    }
}

const countGwkWins = (data) => {
    const players = Object.keys(data)
    const weeklyWins = players.map(player => {
        let counter = 0
        data[player].forEach(position => {
            if(position === 1){
                counter++
            }
        })
        return { player, wins: counter}
    })
    weeklyWins.sort((a, b) => b.wins - a.wins)
    return weeklyWins
}

const countGwkLosses = (data) => {
    const players = Object.keys(data)
    const weeklyLosses = players.map(player => {
        let counter = 0
        data[player].forEach(position => {
            if(position === 8){
                counter++
            }
        })
        return { player, losses: counter}
    })
    weeklyLosses.sort((a, b) => b.losses - a.losses)
    return weeklyLosses
}

const findAveragePosition = (data) => {
    const players = Object.keys(data)
    const averagePosition = players.map(player => {
        const length = data[player].length
        const total = data[player].reduce((a, b) => a + b, 0)
        const average = Math.round((total / length) * 100) / 100
        
        return { player, average }
    })
    averagePosition.sort((a, b) => a.average - b.average)
    return averagePosition
}

const gwksAtTop = (data) => {
    const players = Object.keys(data)

    const firstPosition = players.map(player => {
        let counter = 0
        data[player].forEach(position => {
            if(position === 1){
                counter++
            }
        })
        return { player, weeksAtTop: counter}
    })
    firstPosition.sort((a, b) => b.weeksAtTop - a.weeksAtTop)
    return firstPosition
}

const gwksAtBottom = (data) => {
    const players = Object.keys(data)
    const lastPosition = players.map(player => {
        let counter = 0
        data[player].forEach(position => {
            if(position === 8){
                counter++
            }
        })
        return { player, weeksAtBottom: counter}
    })
    lastPosition.sort((a, b) => b.weeksAtBottom - a.weeksAtBottom)
    return lastPosition
}

const calculateStatistics = (data) => {
    const maxAndMinScores = maxMinScores(data)
    const positions = gwkWinsLosses(data)
    const gwkWins = countGwkWins(positions)
    const gwkLosses = countGwkLosses(positions)
    const cumulativeTotals = overallPosition(data)
    const averagePosition = findAveragePosition(cumulativeTotals)
    const weeksAtTop = gwksAtTop(cumulativeTotals)
    const weeksAtBottom = gwksAtBottom(cumulativeTotals)

    return {
        maxAndMinScores,
        gwkLosses,
        gwkWins,
        averagePosition,
        weeksAtTop,
        weeksAtBottom
    }
}

const yearlyScoresAndPositionsByPlayer = (data, players) => {
    const dataObject = {}
    players.forEach(player => {
        dataObject[player] = {}
        data.forEach(season => {
            let year = season.year
            const playerCheck = season.scores.players.hasOwnProperty(player)
            if(playerCheck) {
                dataObject[player][year] = {}
                
                const seasonScores = Object.keys(season.scores.players).map(player => {
                    const values = Object.values(season.scores.players[player])
                    const score = values.reduce((a,b) => a + b)
            
                    return ({ player, score, season: season.year, length: values.length })
                })
                seasonScores.sort((a, b) => b.score - a.score)
                const position = seasonScores.map(item => item.player).indexOf(player) + 1

                dataObject[player][year].scores = season.scores.players[player]
                dataObject[player][year].position = position
            }
        })
    })
    return dataObject
}

const combineYearlyScoresIntoTotalScore = (data) => {
    const finalScores = Object.keys(data).map(player => {
        const playerScores = Object.keys(data[player]).map(year => {
            const values = Object.values(data[player][year].scores)
            if(values.length === 38) {
                const position = data[player][year].position
                const hosed = position === 8 ? true : false
                const winner = position === 1 ? true : false
                const score = values.reduce((a,b) => a + b)
                return { player, score, season: year, length: values.length, position, hosed, winner }
            }
            if(values.length !== 38) {
                const score = values.reduce((a,b) => a + b)
                const predictedScore = (score / values.length) * 38
                const roundedScore = Math.round(predictedScore)
                return { player, score: roundedScore, season: year, length: values.length }
            }                   
        })
        return playerScores
    })
    const singleArray = finalScores.flat()
    return singleArray.sort((a, b) => b.score - a.score)
}

const calculatePositionsForEachSeason = (data, dataObject, players) => {
    const positionData = { players, years: [], positions: { } }
    data.forEach(season => {
        let year = season.year
        positionData.years.push(year)

        positionData.positions[year] = {}

        const playerNames = Object.keys(season.scores.players)
        playerNames.forEach(player => {
            
            const position = dataObject[player][year].position
            positionData.positions[year][player] = position
        })
    })
    return positionData
}

const averageAllTimePosition = (players, positionData) => {
    const averagePositions = players.map(player => {
        const positionEachSeason = positionData.years.map(year => {
            const playerCheck = positionData.positions[year].hasOwnProperty(player)
            if(playerCheck){ return positionData.positions[year][player] }
        })
        const filterBlankSeasons = positionEachSeason.filter(position => position !== undefined)
        const average = filterBlankSeasons.reduce((a,b) => a + b) / filterBlankSeasons.length
        const twoDecimalPlaces = Math.round(average * 100) / 100
        
        return { player, average: twoDecimalPlaces }
    })
    positionData.averagePositions = averagePositions
    return positionData
}

const consolidatePlayerScoresFromEachSeason = (players, data) => {
    const dataObject = { scores: { players: {} }, leagueTable: [] }
    players.forEach(player => {
        const allScores = []
        data.forEach(season => {
            const playerCheck = season.scores.players.hasOwnProperty(player)
            if(playerCheck) {
            const values = Object.values(season.scores.players[player])
            allScores.push(...values)
            }
        })

        dataObject.scores.players[player] = {}

        allScores.forEach((score, i) => {
        if( player === 'Sam') {
            const weekNumber = i + 115
            dataObject.scores.players[player][weekNumber] = score
        }
        if( player !== 'Sam') {
            const weekNumber = i + 1
            dataObject.scores.players[player][weekNumber] = score
        }
        })
    }) 
    return dataObject
}

const calculateGapToTheHose = (data) => {
    const { leagueTable } = data

    const weeks = Object.values(leagueTable)

    const gapsToHose = weeks.map((week, i) => {
        const weeklyGaps = week.map(player => {
            const gap = player.score - week[7].score
            return { player: player.player, gap}
        })

        return { week: i + 1, gaps: weeklyGaps }
    })
    return gapsToHose
}


module.exports = {
    calculateTotalScoresFromWeeklyPoints,
    calculateStatistics,
    yearlyScoresAndPositionsByPlayer,
    combineYearlyScoresIntoTotalScore,
    calculatePositionsForEachSeason,
    averageAllTimePosition,
    consolidatePlayerScoresFromEachSeason,
    calculateGapToTheHose
}