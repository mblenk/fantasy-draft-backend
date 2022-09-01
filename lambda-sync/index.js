const axios = require('axios')
const urlRoot = 'http://Fantasydraft-env.eba-bzdyrqru.eu-west-2.elasticbeanstalk.com/api'
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
        password: process.env.LAMBA_PASSWORD
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

syncApiDataDaily()
