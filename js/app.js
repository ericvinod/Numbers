(function(){
  // ---------- Persisted state (progress + stars) ----------
  const STORAGE_KEY = 'numberFriendsProgress_v1';
  let state = {
    stars: 0,
    visited: {},   // card number -> true (viewed)
    learned: {}    // card number -> true (heard both listen + sentence)
  };

  function loadState(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(raw){ state = Object.assign(state, JSON.parse(raw)); }
    }catch(e){ /* storage unavailable — continue with in-memory state */ }
  }
  function saveState(){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch(e){ /* ignore */ }
  }
  loadState();

  const IMG_PATH = 'images/';

  // ---------- Header stars ----------
  const starCountEl = document.getElementById('star-count');
  const starBadgeEl = document.getElementById('star-badge');
  function renderStars(){
    starCountEl.textContent = state.stars;
  }
  function addStars(n, x, y){
    state.stars += n;
    renderStars();
    saveState();
    starBadgeEl.classList.remove('pulse');
    void starBadgeEl.offsetWidth; // restart animation
    starBadgeEl.classList.add('pulse');
    Confetti.burst(x, y, 28);
  }
  renderStars();

  // ---------- Tabs ----------
  const tabButtons = document.querySelectorAll('nav.tabs button');
  const panels = document.querySelectorAll('section.panel');
  tabButtons.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      tabButtons.forEach(b=>b.classList.remove('active'));
      panels.forEach(p=>p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.target).classList.add('active');
    });
  });

  // =====================================================
  // LEARN PANEL
  // =====================================================
  let learnIndex = 0;
  const cardImg = document.getElementById('learn-img');
  const cardFrame = document.getElementById('flash-card');
  const sentenceBox = document.getElementById('sentence-box');
  const dotsWrap = document.getElementById('progress-dots');
  const learnedTag = document.getElementById('learned-tag');
  const btnListen = document.getElementById('btn-listen');
  const btnSentence = document.getElementById('btn-sentence');

  function buildDots(){
    dotsWrap.innerHTML = '';
    CARDS.forEach((c, i)=>{
      const d = document.createElement('span');
      d.className = 'dot';
      d.dataset.index = i;
      dotsWrap.appendChild(d);
    });
  }
  buildDots();

  function renderLearn(){
    const card = CARDS[learnIndex];
    cardImg.src = IMG_PATH + card.img;
    cardImg.alt = card.word;
    // restart pop animation
    cardImg.style.animation = 'none';
    void cardImg.offsetWidth;
    cardImg.style.animation = '';

    sentenceBox.textContent = '';

    const isLearned = !!state.learned[card.n];
    cardFrame.classList.toggle('learned', isLearned);

    state.visited[card.n] = true;
    saveState();

    // update dots
    [...dotsWrap.children].forEach((d,i)=>{
      d.classList.toggle('current', i === learnIndex);
      d.classList.toggle('visited', !!state.visited[CARDS[i].n]);
    });
  }

  function maybeMarkLearned(){
    const card = CARDS[learnIndex];
    if(card._heardWord && card._heardSentence && !state.learned[card.n]){
      state.learned[card.n] = true;
      saveState();
      cardFrame.classList.add('learned');
      const rect = cardFrame.getBoundingClientRect();
      addStars(1, rect.left + rect.width/2, rect.top + rect.height/2);
    }
  }

  document.getElementById('btn-prev').addEventListener('click', ()=>{
    learnIndex = (learnIndex - 1 + CARDS.length) % CARDS.length;
    renderLearn();
  });
  document.getElementById('btn-next').addEventListener('click', ()=>{
    learnIndex = (learnIndex + 1) % CARDS.length;
    renderLearn();
  });

  btnListen.addEventListener('click', ()=>{
    const card = CARDS[learnIndex];
    Speech.speak(card.word);
    card._heardWord = true;
    maybeMarkLearned();
  });

  btnSentence.addEventListener('click', ()=>{
    const card = CARDS[learnIndex];
    sentenceBox.textContent = card.sentence;
    Speech.speak(card.sentence, { rate: 0.82 });
    card._heardSentence = true;
    maybeMarkLearned();
  });

  dotsWrap.addEventListener('click', (e)=>{
    if(e.target.classList.contains('dot')){
      learnIndex = parseInt(e.target.dataset.index, 10);
      renderLearn();
    }
  });

  renderLearn();

  // =====================================================
  // PRACTICE PANEL (Listen & Tap quiz)
  // =====================================================
  const TOTAL_ROUNDS = 8;
  let quiz = { round: 0, score: 0, target: null, active: false };

  const practiceBody = document.getElementById('practice-body');
  const practiceStatus = document.getElementById('practice-status-text');

  function shuffle(arr){
    const a = arr.slice();
    for(let i=a.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i],a[j]] = [a[j],a[i]];
    }
    return a;
  }

  function startQuiz(){
    quiz = { round: 0, score: 0, target: null, active: true };
    nextRound();
  }

  function nextRound(){
    if(quiz.round >= TOTAL_ROUNDS){
      showEndScreen();
      return;
    }
    quiz.round++;
    const pool = shuffle(CARDS).slice(0,4);
    quiz.target = pool[Math.floor(Math.random()*pool.length)];
    renderRound(pool);
    // announce the number after a short beat
    setTimeout(()=> Speech.speak(quiz.target.word), 350);
  }

  function renderRound(pool){
    practiceStatus.textContent = `Round ${quiz.round} of ${TOTAL_ROUNDS}  •  Score: ${quiz.score}`;
    practiceBody.innerHTML = `
      <p class="practice-instruction">Listen carefully — tap the matching card!</p>
      <div class="btn-row">
        <button class="btn listen" id="replay-btn"><span class="speaker-icon"></span>Hear it Again</button>
      </div>
      <div class="choices-grid" id="choices-grid"></div>
      <p class="feedback-msg" id="feedback-msg"></p>
    `;
    const grid = document.getElementById('choices-grid');
    pool.forEach(card=>{
      const el = document.createElement('div');
      el.className = 'choice-card';
      el.dataset.n = card.n;
      el.innerHTML = `<img src="${IMG_PATH}${card.img}" alt="${card.word}">`;
      el.addEventListener('click', ()=> handleChoice(el, card));
      grid.appendChild(el);
    });
    document.getElementById('replay-btn').addEventListener('click', ()=>{
      Speech.speak(quiz.target.word);
    });
  }

  function handleChoice(el, card){
    if(!quiz.active) return;
    const grid = document.getElementById('choices-grid');
    const feedback = document.getElementById('feedback-msg');
    const correct = card.n === quiz.target.n;

    [...grid.children].forEach(c=>c.classList.add('disabled'));

    if(correct){
      el.classList.add('correct');
      feedback.textContent = 'Great job! That is correct!';
      feedback.className = 'feedback-msg good';
      quiz.score++;
      const rect = el.getBoundingClientRect();
      addStars(1, rect.left + rect.width/2, rect.top + rect.height/2);
      Speech.speak('Great job!');
      setTimeout(nextRound, 1300);
    } else {
      el.classList.add('wrong');
      feedback.textContent = `That's ${card.word}. Let's try again!`;
      feedback.className = 'feedback-msg bad';
      Speech.speak("Let's try again");
      setTimeout(()=>{
        [...grid.children].forEach(c=>c.classList.remove('disabled'));
        el.classList.remove('wrong');
        feedback.textContent = '';
      }, 1100);
    }
  }

  function showEndScreen(){
    quiz.active = false;
    practiceStatus.textContent = '';
    practiceBody.innerHTML = `
      <div class="end-screen">
        <h2>Wonderful Work!</h2>
        <p>You finished the number practice!</p>
        <div class="end-score">${quiz.score} / ${TOTAL_ROUNDS}</div>
        <button class="btn again" id="play-again-btn">Play Again</button>
      </div>
    `;
    document.getElementById('play-again-btn').addEventListener('click', startQuiz);
    Confetti.fullCelebration();
    Speech.speak('Wonderful work! You did it!');
  }

  document.getElementById('start-quiz-btn').addEventListener('click', startQuiz);

  // =====================================================
  // BONUS PANEL (31-50 posters)
  // =====================================================
  const bonusWrap = document.getElementById('bonus-wrap');
  BONUS.forEach(section=>{
    const el = document.createElement('div');
    el.className = 'bonus-card';
    el.innerHTML = `
      <img src="${IMG_PATH}${section.img}" alt="${section.label}">
      <h3>${section.label}</h3>
      <div class="btn-row">
        <button class="btn listen"><span class="speaker-icon"></span>Listen to These Numbers</button>
      </div>
    `;
    el.querySelector('button').addEventListener('click', (e)=>{
      Speech.speakSequence(section.words, { rate: 0.9 });
      const rect = el.getBoundingClientRect();
      if(!section._played){
        section._played = true;
        addStars(1, rect.left + rect.width/2, rect.top + rect.height/2);
      }
    });
    bonusWrap.appendChild(el);
  });

})();
