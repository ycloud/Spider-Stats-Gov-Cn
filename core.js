import Sequelize from 'sequelize'
import iconv from 'iconv-lite'
import req from 'request-promise'

const db = new Sequelize({
  database: 'stats',
  dialect: 'sqlite',
  storage: './db.sqlite'
})
const limit = 6
const sleep = (time = 6000) => {
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
      timeout: 3000,
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
  code: {
    type: Sequelize.INTEGER,
    unique: true
  },
  name: Sequelize.STRING,
  type: Sequelize.INTEGER,
  hasChild: {
    type: Sequelize.BOOLEAN,
    defaultValue: true
  },
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
    console.info('开始采集省份信息')
    provinces = await spider().then(res => {
      return res.match(/<td><a.*?>.*?<\/td>/g).map(td => {
        const [code] = td.match(/\d+/)
        const name = td.replace(/<.*?>/g, '')
        return { code, name, type: 1 }
      })
    })
    console.info('省份信息采集完成，开始保存到数据库...')
    await Town
      .bulkCreate(provinces)
      .then(_ => {
        console.log('数据保存成功！')
      })
  }
  return provinces
}

const getCitys = async _ => {
  const provinces = await Town
    .findAll({
      limit,
      where: {
        type: 1,
        spied: false
      }
    })
  if (provinces.length > 0) {
    let citys = provinces.map(province => {
      return spider(`${province.code}.html`).then(res => {
        return res.match(/<tr class='citytr'>.*?<\/tr>/g).map(tr => {
          const [code, name] = tr.match(/<td>.*?<\/td>/g).map(td => td.replace(/<.*?>/g, ''))
          return { code, name, type: 2 }
        })
      })
    })
    citys = [].concat(...await Promise.all(citys))
    await Promise.all([
      Town
      .bulkCreate(citys)
      .then(_ => {
        console.log('数据保存成功！')
      }),
      ...provinces.map(province => province.update({
        spied: true
      }))
    ])
    return citys
  }
}

const getCountys = async _ => {
  const citys = await Town
    .findAll({
      limit,
      where: {
        type: 2,
        spied: false
      }
    })
  if (citys.length > 0) {
    let countys = citys.map(city => {
      const code = '' + city.code
      return spider(`${code.substring(0, 2)}/${code.substring(0, 4)}.html`).then(res => {
        return res.match(/<tr class='(county|town)tr'>.*?<\/tr>/g).map(tr => {
          const hasChild = /<a href/.test(tr)
          const type = /class='countytr'/.test(tr) ? 3 : 4
          const [code, name] = tr.match(/<td>.*?<\/td>/g).map(td => td.replace(/<.*?>/g, ''))
          return { code, name, type, spied: !hasChild, hasChild }
        })
      })
    })
    countys = [].concat(...await Promise.all(countys))
    await Promise.all([
      Town
      .bulkCreate(countys)
      .then(_ => {
        console.log('数据保存成功！')
      }),
      ...citys.map(city => city.update({
        spied: true
      }))
    ])
    return countys
  }
}

const getTownships = async _ => {
  const countys = await Town
    .findAll({
      limit,
      where: {
        type: 3,
        spied: false
      }
    })
  if (countys.length > 0) {
    let townships = countys.map(county => {
      const code = '' + county.code
      return spider(`${code.substring(0, 2)}/${code.substring(2, 4)}/${code.substring(0, 6)}.html`).then(res => {
        return res.match(/<tr class='towntr'>.*?<\/tr>/g).map(tr => {
          const [code, name] = tr.match(/<td>.*?<\/td>/g).map(td => td.replace(/<.*?>/g, ''))
          return { code, name, type: 4 }
        })
      })
    })
    townships = [].concat(...await Promise.all(townships))
    await Promise.all([
      Town
      .bulkCreate(townships)
      .then(_ => {
        console.log('数据保存成功！')
      }),
      ...countys.map(county => county.update({
        spied: true
      }))
    ])
    return townships
  }
}

const getVillages = async _ => {
  const townships = await Town
    .findAll({
      limit,
      where: {
        type: 4,
        spied: false
      }
    })
  if (townships.length > 0) {
    let villages = townships.map(township => {
      const code = '' + township.code
      const isCityVillage = ['4419', '4420', '4604'].includes(code.substring(0, 4))
      const townCode = !isCityVillage ? `${code.substring(4, 6)}/` : ''
      return spider(`${code.substring(0, 2)}/${code.substring(2, 4)}/${townCode}${code.substring(0, 9)}.html`).then(res => {
        return res.match(/<tr class='villagetr'>.*?<\/tr>/g).map(tr => {
          const [code, type, name] = tr.match(/<td>.*?<\/td>/g).map(td => td.replace(/<.*?>/g, ''))
          return { code, name, type }
        })
      })
    })
    villages = [].concat(...await Promise.all(villages))
    await Promise.all([
      Town
      .bulkCreate(villages)
      .then(_ => {
        console.log('数据保存成功！')
      }),
      ...townships.map(township => township.update({
        spied: true
      }))
    ])
    return villages
  }
}

export { sleep, getProvinces, getCitys, getCountys, getTownships, getVillages }