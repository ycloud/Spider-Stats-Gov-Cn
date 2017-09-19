import Koa from 'koa'
import Router from 'koa-router'
import open from 'open'
import { sleep, getProvinces, getCitys, getCountys, getTownships, getVillages } from './core'

const app = new Koa()
const router = new Router()
const autoReload = `<script>setTimeout(function () {location.reload()}, 3000)</script>`

router.get('/', async ctx => {
  ctx.body = ''
})

router.get('/provinces', async ctx => {
  try {
    const provinces = await getProvinces()
    ctx.body = `<script>setTimeout(function () {
        location.href = '/citys'
      }, 3000)</script>${JSON.stringify(provinces)}`
  } catch (err) {
    console.error(err)
    await sleep()
    ctx.redirect('provinces')
  }
})

router.get('/citys', async ctx => {
  try {
    const { province, citys } = await getCitys()
    if (province) {
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
    await sleep()
    ctx.redirect('citys')
  }
})

router.get('/countys', async ctx => {
  try {
    const { city, countys } = await getCountys()
    if (city) {
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
    await sleep()
    ctx.redirect('countys')
  }
})

router.get('/townships', async ctx => {
  try {
    const { county, townships } = await getTownships()
    if (county) {
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
    await sleep()
    ctx.redirect('townships')
  }
})

router.get('/villages', async ctx => {
  try {
    const { township, villages } = await getVillages()
    if (township) {
      ctx.body = `
      ${autoReload}
      ${township.name}下乡村信息采集完毕<br />
      ${JSON.stringify(villages)}`
    } else {
      ctx.body = `所有乡村信息采集完毕`
    }
  } catch (err) {
    console.error(err)
    await sleep()
    ctx.redirect('villages')
  }
})

app.use(router.routes())

app.listen(3000)

open('http://127.0.0.1:3000')