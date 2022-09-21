const express = require('express')
const userController = require('../controllers/userController')
const { userCheck } = require('../middleware/authMiddleware')

const router = express.Router()

router.post('/login', userController.login_user)
router.post('/signup', userController.create_user)
// router.patch('/update', userController.update_user)
router.get('/logout', userController.log_out)
router.get('/check', userCheck, userController.check_user)

module.exports = router