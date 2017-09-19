import { sleep, getProvinces, getCitys, getCountys, getTownships, getVillages } from './core'

const doGetProvinces = async _ => {
  try {
    await getProvinces()
    doGetCitys()
  } catch (err) {
    console.log(err)
    await sleep()
    doGetProvinces()
  }
}

const doGetCitys = async _ => {
  try {
    const citys = await getCitys()
    if (citys) {
      await sleep(3000)
      doGetCitys()
    } else {
      doGetCountys()
    }
  } catch (err) {
    console.log(err)
    await sleep()
    doGetCitys()
  }
}

const doGetCountys = async _ => {
  try {
    const countys = await getCountys()
    if (countys) {
      await sleep(3000)
      doGetCountys()
    } else {
      doGetTownships()
    }
  } catch (err) {
    console.log(err)
    await sleep()
    doGetCountys()
  }
}

const doGetTownships = async _ => {
  try {
    const townships = await getTownships()
    if (townships) {
      await sleep(3000)
      doGetTownships()
    } else {
      doGetVillages()
    }
  } catch (err) {
    console.log(err)
    await sleep()
    doGetTownships()
  }
}

const doGetVillages = async _ => {
  try {
    const villages = await getVillages()
    if (villages) {
      await sleep(3000)
      doGetVillages()
    } else {
      process.exit(0)
    }
  } catch (err) {
    console.log(err)
    await sleep()
    doGetVillages()
  }
}

doGetProvinces()