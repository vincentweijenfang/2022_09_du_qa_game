// import $ from 'jquery'
import './css/common.styl'
import './common'

// █████████████████████████████████████████████████████████████████████████

// loading
function loadImg(url) {
  const img = new Image()
  img.src = url
  return new Promise((resolve, reject) => {
    img.onload = () => {
      resolve(img)
    }
    img.onerror = (e) => {
      reject(e)
    }
  })
}
function preloadImgs() {
  const result = []
  const loadimgs = document.querySelectorAll('main img[data-preload]')
  const urls = []
  loadimgs.forEach((element) => {
    urls.push(element.getAttribute('src'))
  })
  urls.forEach((url) => {
    const p = loadImg(url).then((img) => {
      // console.log(img, 'was loaded.')
      result.push(p)
    })
  })
  Promise.all(result).then(() => {
    // all complete
    console.log('all imgs were loaded.')
    initAnimation()
  }).catch((err) => {
    console.log(err)
  })
}

// █████████████████████████████████████████████████████████████████████████

export const consoleStyle = {
  default: "background: #0B6123; color: #FFF8D3; padding: 5px 10px; font-size: 14px",
}

export const main = async (cb) => {
  // document.querySelector('.loading').classList.add('is-visible')
  await preloadImgs()
  // document.querySelector('.loading').classList.remove('is-visible')
  window.setTimeout(() => {
    document.querySelectorAll('.intro').forEach((target) => {
      // console.log(target)
      target.classList.add('is-active')
    })
    cb()
  }, 10)
}

