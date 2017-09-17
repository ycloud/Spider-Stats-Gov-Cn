import Koa from 'koa'
import Router from 'koa-router'
import Sequelize from 'sequelize'
import iconv from 'iconv-lite'
import req from 'request-promise'

const app = new Koa()
const db = new Sequelize({
  database: 'stats',
  dialect: 'sqlite',
  storage: './sqlite'
})
const router = new Router()
const spider = (url = '') => {
  url = `http://www.stats.gov.cn/tjsj/tjbz/tjyqhdmhcxhfdm/2016/${url}`
  return req
    .get({
      encoding: null,
      url
    })
    .then(res => iconv.decode(res, 'GBK'))
}
const autoReload = `<script>setTimeout(function () {location.reload()}, 5000)</script>`

db
  .authenticate()
  .then(() => {
    console.info('数据库存连接成功！')
  })
  .catch(err => {
    console.error('数据库存连接失败：', err)
    process.exit()
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
    process.exit()
  })

router.get('/', async ctx => {
  ctx.body = ''
})

router.get('/provinces', async ctx => {
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
  ctx.body = `<script>setTimeout(function () {
        location.href = '/citys'
      }, 3000)</script>${JSON.stringify(provinces)}`
})

router.get('/citys', async ctx => {
  const province = await Town
    .findOne({
      where: {
        type: 1,
        spied: false
      }
    })
  try {
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
      ctx.body = `
      ${autoReload}
      ${province.name}下城市信息采集完毕<br />
      ${JSON.stringify(citys)}`
    } else {
      ctx.body = `<script>setTimeout(function () {
        location.href = '/countys'
      }, 3000)</script>所有省份城市采集完毕`
    }
  } catch (err) {
    console.error(err)
    ctx.redirect('/citys')
  }
})

router.get('/countys', async ctx => {
  const city = await Town
    .findOne({
      where: {
        type: 2,
        spied: false
      }
    })
  try {
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
      ctx.body = `
      ${autoReload}
      ${city.name}下区县信息采集完毕<br />
      ${JSON.stringify(countys)}`
    } else {
      ctx.body = `<script>setTimeout(function () {
        location.href = '/townships'
      }, 3000)</script>所有区县信息采集完毕`
    }
  } catch (err) {
    console.error(err)
    ctx.redirect('/countys')
  }
})

router.get('/townships', async ctx => {
  const county = await Town
    .findOne({
      where: {
        type: 3,
        spied: false
      }
    })
  try {
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
      ctx.body = `
      ${autoReload}
      ${county.name}下乡镇信息采集完毕<br />
      ${JSON.stringify(townships)}`
    } else {
      ctx.body = `<script>setTimeout(function () {
        location.href = '/villages'
      }, 3000)</script>所有乡镇信息采集完毕`
    }
  } catch (err) {
    console.error(err)
    ctx.redirect('/townships')
  }
})

router.get('/villages', async ctx => {
  const township = await Town
    .findOne({
      where: {
        type: 4,
        spied: false
      }
    })
  try {
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
      ctx.body = `
      ${autoReload}
      ${township.name}下乡村信息采集完毕<br />
      ${JSON.stringify(villages)}`
    } else {
      ctx.body = `所有乡村信息采集完毕`
    }
  } catch (err) {
    console.error(err)
    ctx.redirect('/villages')
  }
})

app.use(router.routes())

app.listen(3000)