const axios = require('axios')
const urlRoot = 'https://fantasy-draft-backend-2ta2q.ondigitalocean.app/api'
// const urlRoot = 'http://localhost:5000/api'


const sendRequestWithAuthentication = async (url, token) => {
    await axios(`${urlRoot}/liveData/${url}`, {
        headers: {
            authorization: `${token}`
        }
    })
}

exports.handler = async () => {
    const { data } = await axios.post(`${urlRoot}/user/login`, {
        username: process.env.LAMBDA_USERNAME,
        password: process.env.LAMBDA_PASSWORD
    })
    const token = data.token

    await Promise.all(
        [
            sendRequestWithAuthentication('liveStats', token),
            sendRequestWithAuthentication('updateScores', token),
            sendRequestWithAuthentication('getTransfers', token),
            sendRequestWithAuthentication('getAndUpdateMonths', token),
        ]
    )
}

