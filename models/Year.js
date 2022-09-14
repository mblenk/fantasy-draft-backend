const mongoose = require('mongoose')


const yearSchema = new mongoose.Schema({
    year: {
        type: String,
        required: true,
    },
    live: {
        type: Boolean,
        required: true
    },
    scores: {
        type: Map,
    },
    players: {
        type: [Map]
    },
    transactions: {
        type: Map
    },
    squadScores: {
        type: Map
    },
    draftPicks: {
        type: Array
    },
    months: {
        type: Map
    },
    leagueTable: {
        type: Map
    },
    lastUpdated: {
        type: Date
    }
})

const Year = mongoose.model('year', yearSchema)

module.exports = Year