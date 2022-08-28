const express = require('express')
const yearController = require('../controllers/yearController')
const { auth } = require('../middleware/authMiddleware')

const router = express.Router()

router.get('/data', auth, yearController.get_all_data)
router.get('/data/:id', auth, yearController.get_year_data)
router.patch('/data/add-draft', yearController.add_draft_data)
router.patch('/update/:id', yearController.update_year_data)

module.exports = router