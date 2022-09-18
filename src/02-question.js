// import $ from 'jquery'
// import gsap from 'gsap'

import './css/02-question.styl'
import { main, consoleStyle } from '@/00-main'

// █████████████████████████████████████████████████████████████████████████

const init = function() {

  if (document.querySelector('.question-text').offsetHeight <= 32 * 3) {
    document.querySelector('.question-body').classList.add('h2_34')
    document.querySelector('.question-body').classList.remove('h4_24')
  }
  
  document.querySelector('.button-action-go').addEventListener('click', () => {
    const $checkedOption = document.querySelector('.answer-option-checked:checked')
    const resolveStatus = !$checkedOption ? 'oops' : $checkedOption.value
    console.log(resolveStatus)
    document.querySelector(`.${resolveStatus}-popup`).classList.add('is-visible')
    document.querySelector(`.section`).classList.add(`is-${resolveStatus}`)
    setTimeout(() => {
      document.querySelector(`.${resolveStatus}-popup`).classList.remove('is-visible')
      if (resolveStatus == 'oops') {
        document.querySelector(`.section`).classList.remove(`is-${resolveStatus}`)
      }
    }, 1000)
  })

}

// █████████████████████████████████████████████████████████████████████████

main(init)