import Sequelize from 'sequelize'
import iconv from 'iconv-lite'
import req from 'request-promise'

const db = new Sequelize({
  database: 'stats',
  dialect: 'sqlite',
  storage: './sqlite'
})
const sleep = (time = 3000) => {
  return new Promise((resolve, reject) => {
    setTimeout(_ => {
      resolve()
    }, time)
  })
}
const spider = (url = '') => {
  url = `http://www.stats.gov.cn/tjsj/tjbz/tjyqhdmhcxhfdm/2016/${url}`
  return req
    .get({
      encoding: null,
      url
    })
    .then(res => iconv.decode(res, 'GBK'))
}

db
  .authenticate()
  .then(() => {
    console.info('数据库存连接成功！')
  })
  .catch(err => {
    console.error('数据库存连接失败：', err)
    process.exit(1)
  })

const Town = db.define('town', {
  code: Sequelize.INTEGER,
  name: Sequelize.STRING,
  type: Sequelize.INTEGER,
  spied: {
    type: Sequelize.BOOLEAN,
    defaultValue: false
  },
  fixed: {
    type: Sequelize.BOOLEAN,
    defaultValue: false
  }
})

// {force: true}
Town
  .sync()
  .then(() => {
    console.info('数据表town同步成功！')
  })
  .catch(err => {
    console.error('数据表town同步失败：', err)
    process.exit(1)
  })

const getProvinces = async _ => {
  let provinces = await Town.findAll({
    where: {
      type: 1
    }
  })
  if (provinces.length === 0) {
    console.info('开始采集')
    provinces = await spider().then(res => {
      return res.match(/<td><a.*?>.*?<\/td>/g).map(td => {
        const [code] = td.match(/\d+/)
        const name = td.replace(/<.*?>/g, '')
        return { code, name, type: 1 }
      })
    })
    console.info('采集完成，开始保存到数据库...')
    await Town
      .bulkCreate(provinces)
      .then(_ => {
        console.log('数据保存成功！')
      })
  }
  return provinces
}

const getCitys = async _ => {
  const province = await Town
    .findOne({
      where: {
        type: 1,
        spied: false
      }
    })
  if (province) {
    console.log(`开始采集${province.name}下城市`)
    const citys = await spider(`${province.code}.html`).then(res => {
      return res.match(/<tr class='citytr'>.*?<\/tr>/g).map(tr => {
        const [code, name] = tr.match(/<td>.*?<\/td>/g).map(td => td.replace(/<.*?>/g, ''))
        return { code, name, type: 2 }
      })
    })
    console.info(`${province.name}下城市采集完成，开始保存到数据库...`)
    await Town
      .bulkCreate(citys)
      .then(_ => {
        console.log('数据保存成功！')
      })
    await province.update({
      spied: true
    })
    console.log(`${province.name}下城市信息采集完毕`)
    return { province, citys }
  }
  return {}
}

const getCountys = async _ => {
  const city = await Town
    .findOne({
      where: {
        type: 2,
        spied: false
      }
    })
  if (city) {
    const code = '' + city.code
    console.log(`开始采集${city.name}下区县信息`)
    const countys = await spider(`${code.substring(0, 2)}/${code.substring(0, 4)}.html`).then(res => {
      return res.match(/<tr class='(county|town)tr'>.*?<\/tr>/g).map(tr => {
        const spied = !/<a href/.test(tr)
        const type = /class='countytr'/.test(tr) ? 3 : 4
        const [code, name] = tr.match(/<td>.*?<\/td>/g).map(td => td.replace(/<.*?>/g, ''))
        return { code, name, type, spied }
      })
    })
    console.info(`${city.name}下区县信息采集完成，开始保存到数据库...`)
    await Town
      .bulkCreate(countys)
      .then(_ => {
        console.log('数据保存成功！')
      })
    await city.update({
      spied: true
    })
    console.log(`{city.name}下区县信息采集完毕`)
    return { city, countys }
  }
  return {}
}

const getTownships = async _ => {
  const county = await Town
    .findOne({
      where: {
        type: 3,
        spied: false
      }
    })
  if (county) {
    const code = '' + county.code
    console.log(`开始采集${county.name}下乡镇信息`)
    const townships = await spider(`${code.substring(0, 2)}/${code.substring(2, 4)}/${code.substring(0, 6)}.html`).then(res => {
      return res.match(/<tr class='towntr'>.*?<\/tr>/g).map(tr => {
        const [code, name] = tr.match(/<td>.*?<\/td>/g).map(td => td.replace(/<.*?>/g, ''))
        return { code, name, type: 4 }
      })
    })
    console.info(`${county.name}下乡镇信息采集完成，开始保存到数据库...`)
    await Town
      .bulkCreate(townships)
      .then(_ => {
        console.log('数据保存成功！')
      })
    await county.update({
      spied: true
    })
    console.log(`${county.name}下乡镇信息采集完毕`)
    return { county, townships }
  }
  return {}
}

const getVillages = async _ => {
  const township = await Town
    .findOne({
      where: {
        type: 4,
        spied: false
      }
    })
  if (township) {
    const code = '' + township.code
    console.log(`开始采集${township.name}下乡村信息`)
    const isCityVillage = ['4419', '4420', '4604'].includes(code.substring(0, 4))
    const townCode = !isCityVillage ? `${code.substring(4, 6)}/` : ''
    const villages = await spider(`${code.substring(0, 2)}/${code.substring(2, 4)}/${townCode}${code.substring(0, 9)}.html`).then(res => {
      return res.match(/<tr class='villagetr'>.*?<\/tr>/g).map(tr => {
        const [code, type, name] = tr.match(/<td>.*?<\/td>/g).map(td => td.replace(/<.*?>/g, ''))
        return { code, name, type }
      })
    })
    console.info(`${township.name}下乡村信息采集完成，开始保存到数据库...`)
    await Town
      .bulkCreate(villages)
      .then(_ => {
        console.log('数据保存成功！')
      })
    await township.update({
      spied: true
    })
    console.log(`${township.name}下乡村信息采集完毕`)
    return { township, villages }
  }
  return {}
}

export { sleep, getProvinces, getCitys, getCountys, getTownships, getVillages }