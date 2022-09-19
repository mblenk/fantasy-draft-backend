const express = require('express')
const liveApiController = require('../controllers/liveApiController')
const { auth } = require('../middleware/authMiddleware')


const router = express.Router()

router.get('/liveStats', auth, liveApiController.liveStats)
router.get('/updateScores', auth, liveApiController.update_scores)
router.get('/getTransfers', auth, liveApiController.get_transfers)
router.get('/getRandomTrades', auth, liveApiController.get_random_league_trades)
router.get('/getRandomDraft', auth, liveApiController.get_random_draft)
router.patch('/updateTransfers', auth, liveApiController.update_transfers)
router.patch('/updateTransferTracking', auth, liveApiController.update_transfer_tracking)
router.patch('/resetTransfers', liveApiController.reset_transfers)
router.get('/getAndUpdateMonths', auth, liveApiController.get_monthly_data)






module.exports = router