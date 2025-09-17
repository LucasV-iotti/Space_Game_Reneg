// =============================
// Utils: CPF
// =============================
function onlyDigits(v){return (v||'').replace(/\D+/g,'')}
function maskCPF(v){
  const d = onlyDigits(v).slice(0,11)
  const p1=d.slice(0,3), p2=d.slice(3,6), p3=d.slice(6,9), p4=d.slice(9,11)
  let out=''
  if(p1) out+=p1
  if(p2) out+= '.'+p2
  if(p3) out+= '.'+p3
  if(p4) out+= '-'+p4
  return out
}
function validateCPF(cpf){
  let s = onlyDigits(cpf)
  if(s.length!==11) return false
  if(/^([0-9])\1+$/.test(s)) return false
  let sum=0
  for(let i=0;i<9;i++) sum += parseInt(s[i])*(10-i)
  let dv1 = 11 - (sum % 11); dv1 = dv1>9?0:dv1
  if(dv1 !== parseInt(s[9])) return false
  sum=0
  for(let i=0;i<10;i++) sum += parseInt(s[i])*(11-i)
  let dv2 = 11 - (sum % 11); dv2 = dv2>9?0:dv2
  if(dv2 !== parseInt(s[10])) return false
  return true
}
function maskCPFPublic(cpf){
  const s = onlyDigits(cpf)
  if(s.length!==11) return cpf
  return `***.***.${s.slice(6,9)}-${s.slice(9)}`
}

// =============================
// Game State
// =============================
const TOTAL_CASAS = 20
const state = { name:'', cpf:'', casa:1, pontos:0, perguntasResp:0, hasReachedGoal:false, asked:new Set(), lastRoll:null }

// Elements
const screenIdent = document.getElementById('screen-ident')
const screenGame  = document.getElementById('screen-game')
const screenEnd   = document.getElementById('screen-end')

const formIdent = document.getElementById('formIdent')
const inputName = document.getElementById('playerName')
const inputCPF  = document.getElementById('playerCPF')
const cpfHint   = document.getElementById('cpfHint')

const hudName = document.getElementById('hudName')
const hudCPF  = document.getElementById('hudCPF')
const hudCasa = document.getElementById('hudCasa')
const hudPontos = document.getElementById('hudPontos')
const hudPerguntas = document.getElementById('hudPerguntas')
const hudDado = document.getElementById('hudDado')

const btnRoll = document.getElementById('btnRoll')
const btnRestart = document.getElementById('btnRestart')
const diceEl = document.getElementById('dice')

const boardSVG = document.getElementById('boardSVG')
const trackPath = document.getElementById('trackPath')
const nodesG = document.getElementById('nodes')
const svgToken = document.getElementById('svgToken')

const modalRegras = document.getElementById('modalRegras')
const modalSobre = document.getElementById('modalSobre')
const modalQuiz = document.getElementById('modalQuiz')
const qTitle = document.getElementById('qTitle')
const qText = document.getElementById('qText')
const qOptions = document.getElementById('qOptions')
const qFeedback = document.getElementById('qFeedback')
const btnCloseQuiz = document.getElementById('btnCloseQuiz')

const btnRegras = document.getElementById('btnRegras')
const btnSobre = document.getElementById('btnSobre')

const endSummary = document.getElementById('endSummary')
const btnAgainSame = document.getElementById('btnAgainSame')
const btnAgainNew = document.getElementById('btnAgainNew')

// Questions (mantidas)
const QUESTIONS = [
  {id:1,text:'Qual sistema deve ser consultado antes de oferecer a renegociação ao cliente?',options:['OCC','CRM','RCB','BKO'],correct:2,explain:'O sistema RCB deve ser consultado para verificar se o cliente está apto à renegociação, pois a elegibilidade pode mudar diariamente.'},
  {id:2,text:'Qual é o prazo mínimo e máximo de carência após o pagamento da entrada da renegociação?',options:['15 a 30 dias','30 a 45 dias','45 a 60 dias','60 a 90 dias'],correct:1,explain:'A carência mínima é de 30 dias e a máxima de 45 dias após o vencimento da entrada, exceto para contratos fotovoltaicos (até 90 dias).'},
  {id:3,text:'Em que intervalo de dias o cliente pode escolher o vencimento das parcelas após a renegociação?',options:['Do dia 01 ao dia 24','Do dia 10 ao dia 30','Do dia 01 ao dia 31','Do dia 15 ao dia 25'],correct:0,explain:'O vencimento das parcelas deve estar entre os dias 01 e 24 de cada mês para que o sistema aceite a proposta.'},
  {id:4,text:'Quais benefícios são encerrados após a renegociação do contrato?',options:['Parcelamento em até 60 vezes','Seguro prestamista e cashback','Desconto sobre o valor principal','Direito a renegociar novamente'],correct:1,explain:'O cliente perde o seguro prestamista e o benefício de cashback por pagamento em dia via débito em conta.'},
  {id:5,text:'Em caso de falecimento do cliente sem avalista, quem pode renegociar o contrato?',options:['Qualquer familiar','O cônjuge','O inventariante legal','O gerente do banco'],correct:2,explain:'Quando não há avalista, apenas o inventariante legal pode renegociar o contrato, mediante apresentação dos documentos necessários.'},
  {id:6,text:'Quando uma proposta de renegociação exige assinatura e envio de documentos?',options:['Quando o valor é inferior aos limites definidos','Quando o cliente está com parcelas em dia','Quando o valor ultrapassa os limites de aprovação automática','Quando o cliente solicita antecipação de parcelas'],correct:2,explain:'Propostas acima de R$ 40.000 (SIM), R$ 30.000 (SIM Consumer) ou R$ 10.000 (Veículos) exigem assinatura e envio de documentos.'},
  {id:7,text:'O que deve ser feito antes de pagar o boleto da entrada em propostas sem aprovação automática?',options:['Confirmar o valor com o gerente','Assinar o aditivo e enviar os documentos','Aguardar o vencimento do boleto','Instalar o rastreador'],correct:1,explain:'O cliente só deve pagar o boleto após a validação da documentação e assinatura do aditivo.'},
  {id:8,text:'Qual é a condição obrigatória para liberar a renegociação em contratos com rastreador?',options:['Pagamento antecipado do boleto','Assinatura do contrato original','Instalação do rastreador e emissão do certificado','Aprovação do gerente'],correct:2,explain:'A renegociação só pode ser liberada após a instalação do rastreador e recebimento do certificado.'},
  {id:9,text:'Qual local é proibido para instalação do rastreador?',options:['Estacionamento ao ar livre','Garagem coberta','Subsolo','Área residencial'],correct:2,explain:'A instalação não pode ocorrer em locais subterrâneos, pois compromete a operação técnica.'},
  {id:10,text:'O que acontece se o veículo estiver em más condições e o técnico não conseguir instalar o rastreador?',options:['O cliente recebe um novo boleto','A renegociação é cancelada','A instalação é reagendada','O contrato é transferido'],correct:1,explain:'Se o rastreador não puder ser instalado por problemas no veículo, a renegociação será cancelada.'},
]

// =============================
// Init UI
// =============================
inputCPF.addEventListener('input', (e)=>{ e.target.value = maskCPF(e.target.value) })
btnRegras.addEventListener('click', ()=> modalRegras.showModal())
btnSobre.addEventListener('click', ()=> modalSobre.showModal())

formIdent.addEventListener('submit', (e)=>{
  e.preventDefault()
  const name = inputName.value.trim()
  const cpf = inputCPF.value.trim()
  if(!name){inputName.focus(); return}
  if(!validateCPF(cpf)){
    cpfHint.textContent = 'CPF inválido. Verifique os dígitos e tente novamente.'
    cpfHint.style.color = 'var(--bad)'
    inputCPF.focus(); return
  }
  state.name = name
  state.cpf = cpf
  resetGame(true)
  goTo('game')
})

btnRestart.addEventListener('click', ()=>{ if(confirm('Reiniciar a partida atual?')) resetGame(false) })
btnAgainSame.addEventListener('click', ()=>{ resetGame(false); goTo('game') })
btnAgainNew.addEventListener('click', ()=>{ inputName.value=''; inputCPF.value=''; cpfHint.textContent='Digite um CPF válido (apenas números, a máscara será aplicada automaticamente).'; cpfHint.style.color='var(--muted)'; goTo('ident') })

function goTo(screen){
  screenIdent.classList.remove('active'); screenGame.classList.remove('active'); screenEnd.classList.remove('active')
  if(screen==='ident') screenIdent.classList.add('active')
  if(screen==='game')  screenGame.classList.add('active')
  if(screen==='end')   screenEnd.classList.add('active')
}

function resetGame(keepIdentity){
  state.casa=1; state.pontos=0; state.perguntasResp=0; state.hasReachedGoal=false; state.asked=new Set(); state.lastRoll=null
  if(keepIdentity){ hudName.textContent = state.name; hudCPF.textContent = maskCPFPublic(state.cpf) }
  renderBoard()
  updateHUD()
  diceEl.textContent = '🎲'
}

function updateHUD(){
  hudCasa.textContent = state.casa
  hudPontos.textContent = state.pontos
  hudPerguntas.textContent = `${state.perguntasResp}/10`
  hudDado.textContent = state.lastRoll==null? '—': state.lastRoll
}

function renderBoard(){
  nodesG.innerHTML = ''
  const len = trackPath.getTotalLength()
  const radius = 16
  for(let i=1;i<=TOTAL_CASAS;i++){
    const p = trackPath.getPointAtLength((i-1)/(TOTAL_CASAS-1)*len)
    const g = document.createElementNS('http://www.w3.org/2000/svg','g')
    if(i===10) g.classList.add('badge10')
    if(i===20) g.classList.add('badge20')
    const c = document.createElementNS('http://www.w3.org/2000/svg','circle')
    c.setAttribute('cx', p.x); c.setAttribute('cy', p.y); c.setAttribute('r', radius)
    if(i%2===0) c.classList.add('question')
    const t = document.createElementNS('http://www.w3.org/2000/svg','text')
    t.setAttribute('x', p.x); t.setAttribute('y', p.y)
    t.textContent = i
    g.appendChild(c); g.appendChild(t)
    nodesG.appendChild(g)
  }
  moveTokenTo(state.casa)
}

function moveTokenTo(idx){
  const len = trackPath.getTotalLength()
  const p = trackPath.getPointAtLength((idx-1)/(TOTAL_CASAS-1)*len)
  svgToken.setAttribute('x', p.x)
  svgToken.setAttribute('y', p.y)
}

// =============================
// Dice + Turn (1..2)
// =============================
btnRoll.addEventListener('click', onRoll)
const DICE_EMOJIS = ['⚀','⚁'] // apenas 1 e 2
let rollingTimer = null
function animateDice(finalNumber){
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if(prefersReduced){ diceEl.classList.remove('rolling'); diceEl.textContent = DICE_EMOJIS[finalNumber-1]; return Promise.resolve() }
  diceEl.classList.add('rolling')
  return new Promise(resolve=>{
    rollingTimer = setInterval(()=>{ diceEl.textContent = DICE_EMOJIS[Math.floor(Math.random()*2)] }, 80)
    setTimeout(()=>{ clearInterval(rollingTimer); diceEl.textContent = DICE_EMOJIS[finalNumber-1]; diceEl.classList.remove('rolling'); resolve() }, 900)
  })
}

async function onRoll(){
  btnRoll.disabled = true
  const roll = Math.floor(Math.random()*2)+1 // 1..2
  state.lastRoll = roll
  await animateDice(roll)

  let target = state.casa + roll
  if(target >= TOTAL_CASAS){ state.hasReachedGoal = true }
  if(target > TOTAL_CASAS){ target = ((target - 1) % TOTAL_CASAS) + 1 }
  state.casa = target
  moveTokenTo(state.casa); updateHUD()

  if((state.casa % 2 === 0) && state.perguntasResp < 10){
    setTimeout(()=> openQuestion(), 220)
  } else {
    btnRoll.disabled = false
    maybeEndGame()
  }
}

// =============================
// Quiz
// =============================
function openQuestion(){
  const pool = QUESTIONS.filter(q=> !state.asked.has(q.id))
  if(pool.length===0){ btnRoll.disabled = false; maybeEndGame(); return }
  const q = pool[Math.floor(Math.random()*pool.length)]; state.asked.add(q.id)

  qTitle.textContent = `Pergunta ${state.perguntasResp+1}`
  qText.textContent = q.text
  qFeedback.hidden = true; qFeedback.className = 'q-feedback'
  btnCloseQuiz.disabled = true

  qOptions.innerHTML = ''
  q.options.forEach((opt, idx)=>{
    const b = document.createElement('button')
    b.type = 'button'; const letter = String.fromCharCode(65+idx)
    b.textContent = `(${letter}) ${opt}`
    b.addEventListener('click', ()=> handleAnswer(idx, q))
    qOptions.appendChild(b)
  })

  modalQuiz.showModal()
}

function handleAnswer(idx, q){
  const buttons = Array.from(qOptions.querySelectorAll('button'))
  buttons.forEach((b,i)=>{ b.disabled = true; if(i===q.correct) b.classList.add('correct') })

  const correct = idx===q.correct
  if(correct){ state.pontos += 1; qFeedback.textContent = `✅ Correto! ${q.explain}`; qFeedback.classList.add('good') }
  else { buttons[idx].classList.add('wrong'); qFeedback.textContent = `❌ Resposta incorreta. ${q.explain}`; qFeedback.classList.add('bad'); state.casa = Math.max(1, state.casa - 2); moveTokenTo(state.casa) }

  state.perguntasResp += 1
  updateHUD()

  qFeedback.hidden = false
  btnCloseQuiz.disabled = false
}

btnCloseQuiz.addEventListener('click', ()=>{ modalQuiz.close(); btnRoll.disabled = false; maybeEndGame() })

function maybeEndGame(){
  const cond1 = state.perguntasResp >= 10
  const cond2 = state.hasReachedGoal && state.perguntasResp >= 8
  if(cond1 || cond2){ endGame() }
}

function endGame(){
  const estrelas = state.pontos >= 9 ? '🏆 Ouro Galáctico' : state.pontos >= 8 ? '🥈 Prata Estelar' : state.pontos >= 6 ? '🥉 Bronze Cósmico' : '🎖️ Cadete Espacial'
  const linhas = [
    `Piloto: <strong>${state.name}</strong> | CPF: <strong>${maskCPFPublic(state.cpf)}</strong>`,
    `Casa final: <strong>${state.casa}</strong> ${state.hasReachedGoal? ' (meta alcançada)': ''}`,
    `Pontuação: <strong>${state.pontos}</strong>`,
    `Perguntas respondidas: <strong>${state.perguntasResp}</strong> de 10`,
    `Condecoração: <strong>${estrelas}</strong>`
  ]
  endSummary.innerHTML = linhas.map(l=>`<div>${l}</div>`).join('')
  goTo('end')
}
