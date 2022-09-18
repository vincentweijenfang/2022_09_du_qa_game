// import $ from 'jquery'
// import gsap from 'gsap'

import './css/03-answer.styl'
import { main, consoleStyle } from '@/00-main'

// █████████████████████████████████████████████████████████████████████████

const init = function() {

  document.querySelector('.button-action-talking').addEventListener('click', () => {
    document.querySelector(`.${'talking'}-popup`).classList.add('is-visible')
  })
  document.querySelector(`.${'talking'}-popup .popup-icon`).addEventListener('click', () => {
    document.querySelector(`.${'talking'}-popup`).classList.remove('is-visible')
  })

}

// █████████████████████████████████████████████████████████████████████████

main(init)