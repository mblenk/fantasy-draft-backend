const axios = require('axios')
const urlRoot = 'http://Fantasydraft-env.eba-bzdyrqru.eu-west-2.elasticbeanstalk.com/api'

const syncApiDataDaily = async () => {
    const { token } = await axios.post(`${urlRoot}/user/login`, {
        username: 'lambda',
        password: 'cardoghat'
    })
    console.log(token)
}

syncApiDataDaily()
