import { sleep, getProvinces, getCitys, getCountys, getTownships, getVillages } from './core'

const doGetProvinces = async _ => {
  await sleep()
  getProvinces()
    .then(async provinces => {
      doGetCitys()
    })
    .catch(err => {
      console.log(err)
      doGetProvinces()
    })
}

const doGetCitys = async _ => {
  await sleep()
  getCitys()
    .then(async ({ province }) => {
      if (province) {
        doGetCitys()
      } else {
        doGetCountys()
      }
    })
    .catch(err => {
      console.log(err)
      doGetCitys()
    })
}

const doGetCountys = async _ => {
  await sleep()
  getCountys()
    .then(async ({ city }) => {
      if (city) {
        doGetCountys()
      } else {
        doGetTownships()
      }
    })
    .catch(err => {
      console.log(err)
      doGetCountys()
    })
}

const doGetTownships = async _ => {
  await sleep()
  getTownships()
    .then(async ({ county }) => {
      if (county) {
        doGetTownships()
      } else {
        doGetVillages()
      }
    })
    .catch(err => {
      console.log(err)
      doGetTownships()
    })
}

const doGetVillages = async _ => {
  await sleep()
  getVillages()
    .then(async ({ township }) => {
      if (township) {
        doGetVillages()
      } else {
        process.exit(0)
      }
    })
    .catch(err => {
      console.log(err)
      doGetVillages()
    })
}

doGetProvinces()